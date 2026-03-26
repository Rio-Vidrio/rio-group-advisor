import { NextResponse } from "next/server";

// Returns only the single most recent PMMS rate from FRED.
// Used by the "Refresh Rates" button — fast, minimal payload.
// Derives FHA (conv − 0.25%) and VA (conv − 0.50%) server-side.

export async function GET() {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "FRED_API_KEY not configured", detail: "Add FRED_API_KEY to Vercel environment variables" },
      { status: 500 }
    );
  }

  try {
    // Fetch a small window in case the very latest entry is a "." placeholder
    const url =
      `https://api.stlouisfed.org/fred/series/observations` +
      `?series_id=MORTGAGE30US` +
      `&api_key=${apiKey}` +
      `&file_type=json` +
      `&sort_order=desc` +
      `&limit=5`;

    const res = await fetch(url, {
      headers: { "User-Agent": "RioGroupAdvisor/1.0" },
    });

    if (!res.ok) throw new Error(`FRED API returned ${res.status}`);

    const data = await res.json();
    const observations: Array<{ date: string; value: string }> = data.observations ?? [];

    // Walk forward (desc order) to find the first valid numeric value
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

    if (isNaN(conventional)) throw new Error("No valid rate found in FRED response");

    const fha = parseFloat((conventional - 0.25).toFixed(3));
    const va  = parseFloat((conventional - 0.50).toFixed(3));

    return NextResponse.json({
      conventional,
      fha,
      va,
      asOf,
      lastUpdated: new Date().toISOString(),
      source: "Freddie Mac PMMS via FRED API",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Could not fetch current rate", detail: message },
      { status: 500 }
    );
  }
}
