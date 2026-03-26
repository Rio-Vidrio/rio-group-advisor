import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "FRED_API_KEY not configured", detail: "Add FRED_API_KEY to Vercel environment variables" },
      { status: 500 }
    );
  }

  try {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);
    const cosd = startDate.toISOString().split("T")[0];

    const url =
      `https://api.stlouisfed.org/fred/series/observations` +
      `?series_id=MORTGAGE30US` +
      `&api_key=${apiKey}` +
      `&file_type=json` +
      `&observation_start=${cosd}` +
      `&sort_order=desc` +
      `&limit=20`;

    const res = await fetch(url, {
      headers: { "User-Agent": "RioGroupAdvisor/1.0" },
    });

    if (!res.ok) throw new Error(`FRED API returned ${res.status}`);

    const data = await res.json();
    const observations: Array<{ date: string; value: string }> = data.observations ?? [];

    // Walk forward through desc-sorted results to find latest valid value
    let conventional = NaN;
    let date = "";
    for (const obs of observations) {
      if (obs.value && obs.value !== ".") {
        const parsed = parseFloat(obs.value);
        if (!isNaN(parsed) && parsed > 0) {
          conventional = parsed;
          date = obs.date;
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
      lastUpdated: new Date().toISOString(),
      source: "Freddie Mac PMMS via FRED API",
      asOf: date,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Could not fetch live rates", detail: message },
      { status: 500 }
    );
  }
}
