import { NextResponse } from "next/server";

// Returns only the single most recent PMMS rate from FRED.
// Used by the "Refresh Rates" button — fast, minimal payload.
// Derives FHA (conv − 0.25%) and VA (conv − 0.50%) server-side.

export async function GET() {
  const apiKey = process.env.FRED_API_KEY;

  // ── Step 1: key presence check ─────────────────────────────────────────────
  if (!apiKey || apiKey.trim() === "") {
    console.error("[fred-current] FRED_API_KEY is missing or empty");
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
  // Fetch a small window in case the very latest entry is a "." placeholder
  const url =
    `https://api.stlouisfed.org/fred/series/observations` +
    `?series_id=MORTGAGE30US` +
    `&api_key=${apiKey}` +
    `&file_type=json` +
    `&sort_order=desc` +
    `&limit=5`;

  console.log(`[fred-current] Calling FRED: series_id=MORTGAGE30US limit=5 key=${maskedKey}`);

  // ── Step 2: fetch from FRED ────────────────────────────────────────────────
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": "RioGroupAdvisor/1.0" },
    });
  } catch (fetchErr) {
    const message = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    console.error("[fred-current] fetch() threw:", message);
    return NextResponse.json(
      { error: "Network error calling FRED API", step: "fetch", detail: message },
      { status: 500 }
    );
  }

  // ── Step 3: check HTTP status ──────────────────────────────────────────────
  if (!res.ok) {
    let body = "";
    try { body = await res.text(); } catch { /* ignore */ }
    console.error(`[fred-current] FRED returned HTTP ${res.status}: ${body.slice(0, 200)}`);
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
    console.error("[fred-current] JSON parse error:", message);
    return NextResponse.json(
      { error: "Could not parse FRED response as JSON", step: "json_parse", detail: message },
      { status: 500 }
    );
  }

  // ── Step 5: find latest valid value ───────────────────────────────────────
  const observations = data.observations ?? [];
  let conventional = NaN;
  let asOf = "";
  for (const obs of observations) {
    if (obs.value && obs.value !== ".") {
      const parsed = parseFloat(obs.value);
      if (!isNaN(parsed) && parsed > 0) {
        conventional = parsed;
        asOf = obs.date;
        break;
      }
    }
  }

  if (isNaN(conventional)) {
    console.error("[fred-current] No valid numeric rate found in observations:", JSON.stringify(observations));
    return NextResponse.json(
      {
        error: "No valid rate found in FRED response",
        step: "parse_value",
        detail: `Received ${observations.length} observations, none had a valid numeric value`,
        rawObservations: observations,
      },
      { status: 500 }
    );
  }

  const fha = parseFloat((conventional - 0.25).toFixed(3));
  const va  = parseFloat((conventional - 0.50).toFixed(3));

  console.log(`[fred-current] Success — conventional=${conventional} asOf=${asOf}`);
  return NextResponse.json({
    conventional,
    fha,
    va,
    asOf,
    lastUpdated: new Date().toISOString(),
    source: "Freddie Mac PMMS via FRED API",
  });
}
