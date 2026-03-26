import { NextResponse } from "next/server";

// Returns the last 104 weekly PMMS observations from FRED (≈ 2 years).
// The browser calls /api/fred-rates — our own Vercel server — never FRED directly.
// Vercel → FRED is a server-to-server call with no IP restrictions.

export async function GET() {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "FRED_API_KEY not configured", detail: "Add FRED_API_KEY to Vercel environment variables" },
      { status: 500 }
    );
  }

  try {
    const url =
      `https://api.stlouisfed.org/fred/series/observations` +
      `?series_id=MORTGAGE30US` +
      `&api_key=${apiKey}` +
      `&file_type=json` +
      `&sort_order=desc` +
      `&limit=104`;

    const res = await fetch(url, {
      headers: { "User-Agent": "RioGroupAdvisor/1.0" },
    });

    if (!res.ok) throw new Error(`FRED API returned ${res.status}`);

    const data = await res.json();
    const observations: Array<{ date: string; value: string }> = data.observations ?? [];

    // Filter out placeholder "." values, reverse to ascending order for the chart
    const valid = observations
      .filter((o) => o.value && o.value !== ".")
      .reverse();

    return NextResponse.json({ observations: valid, count: valid.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Could not fetch rate history", detail: message },
      { status: 500 }
    );
  }
}
