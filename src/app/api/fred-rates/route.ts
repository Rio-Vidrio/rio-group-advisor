import { NextResponse } from "next/server";

// Returns the last 104 weekly PMMS observations from FRED (≈ 2 years).
// The browser calls /api/fred-rates — our own Vercel server — never FRED directly.
// Vercel → FRED is a server-to-server call with no IP restrictions.

export async function GET() {
  const apiKey = process.env.FRED_API_KEY;

  // ── Step 1: key presence check ─────────────────────────────────────────────
  if (!apiKey || apiKey.trim() === "") {
    console.error("[fred-rates] FRED_API_KEY is missing or empty");
    return NextResponse.json(
      {
        error: "FRED_API_KEY not found in environment variables",
        step: "env_check",
        detail: "Add FRED_API_KEY to Vercel → Settings → Environment Variables, then redeploy.",
      },
      { status: 500 }
    );
  }

  const maskedKey = apiKey.slice(0, 4) + "****" + apiKey.slice(-4);
  const url =
    `https://api.stlouisfed.org/fred/series/observations` +
    `?series_id=MORTGAGE30US` +
    `&api_key=${apiKey}` +
    `&file_type=json` +
    `&sort_order=desc` +
    `&limit=104`;

  // Log the URL with the key masked so we can see it in Vercel function logs
  console.log(`[fred-rates] Calling FRED: series_id=MORTGAGE30US limit=104 key=${maskedKey}`);

  // ── Step 2: fetch from FRED ────────────────────────────────────────────────
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": "RioGroupAdvisor/1.0" },
    });
  } catch (fetchErr) {
    const message = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    console.error("[fred-rates] fetch() threw:", message);
    return NextResponse.json(
      { error: "Network error calling FRED API", step: "fetch", detail: message },
      { status: 500 }
    );
  }

  // ── Step 3: check HTTP status ──────────────────────────────────────────────
  if (!res.ok) {
    let body = "";
    try { body = await res.text(); } catch { /* ignore */ }
    console.error(`[fred-rates] FRED returned HTTP ${res.status}: ${body.slice(0, 200)}`);
    return NextResponse.json(
      {
        error: `FRED API returned HTTP ${res.status}`,
        step: "http_status",
        detail: body.slice(0, 400),
        fredStatus: res.status,
      },
      { status: 500 }
    );
  }

  // ── Step 4: parse JSON ─────────────────────────────────────────────────────
  let data: { observations?: Array<{ date: string; value: string }> };
  try {
    data = await res.json();
  } catch (parseErr) {
    const message = parseErr instanceof Error ? parseErr.message : String(parseErr);
    console.error("[fred-rates] JSON parse error:", message);
    return NextResponse.json(
      { error: "Could not parse FRED response as JSON", step: "json_parse", detail: message },
      { status: 500 }
    );
  }

  const observations = data.observations ?? [];
  if (observations.length === 0) {
    console.error("[fred-rates] FRED returned 0 observations");
    return NextResponse.json(
      { error: "FRED returned empty observations array", step: "empty_data" },
      { status: 500 }
    );
  }

  // Filter out placeholder "." values, reverse to ascending order for the chart
  const valid = observations
    .filter((o) => o.value && o.value !== ".")
    .reverse();

  console.log(`[fred-rates] Success — ${valid.length} valid observations`);
  return NextResponse.json({ observations: valid, count: valid.length });
}
