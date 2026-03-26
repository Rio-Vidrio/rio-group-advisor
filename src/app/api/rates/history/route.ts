import { NextResponse } from "next/server";

export const runtime = "edge";

export interface RateHistoryPoint {
  date: string;
  conventional: number;
  fha: number;
  va: number;
}

export async function GET(request: Request) {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "FRED_API_KEY not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const months = parseInt(searchParams.get("months") || "24", 10);

  try {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months - 1); // pad 1 month
    const cosd = startDate.toISOString().split("T")[0];

    const url =
      `https://api.stlouisfed.org/fred/series/observations` +
      `?series_id=MORTGAGE30US` +
      `&api_key=${apiKey}` +
      `&file_type=json` +
      `&observation_start=${cosd}` +
      `&sort_order=asc`;

    const res = await fetch(url, {
      headers: { "User-Agent": "RioGroupAdvisor/1.0" },
    });

    if (!res.ok) throw new Error(`FRED API returned ${res.status}`);

    const data = await res.json();
    const observations: Array<{ date: string; value: string }> = data.observations ?? [];

    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);

    const points: RateHistoryPoint[] = observations
      .filter((obs) => obs.value && obs.value !== "." && new Date(obs.date) >= cutoff)
      .map((obs) => {
        const conventional = parseFloat(obs.value);
        return {
          date: obs.date,
          conventional,
          fha: parseFloat((conventional - 0.25).toFixed(2)),
          va:  parseFloat((conventional - 0.50).toFixed(2)),
        };
      })
      .filter((p) => !isNaN(p.conventional) && p.conventional > 0);

    return NextResponse.json({ points, count: points.length, updated: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Could not fetch rate history", detail: message },
      { status: 500 }
    );
  }
}
