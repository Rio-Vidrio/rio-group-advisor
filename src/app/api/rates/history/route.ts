import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface RateHistoryPoint {
  date: string;      // "YYYY-MM-DD"
  conventional: number;
  fha: number;
  va: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const months = parseInt(searchParams.get("months") || "12", 10);

  try {
    const res = await fetch(
      "https://fred.stlouisfed.org/graph/fredgraph.csv?id=MORTGAGE30US",
      {
        next: { revalidate: 43200 },
        headers: { "User-Agent": "RioGroupAdvisor/1.0" },
      }
    );

    if (!res.ok) throw new Error(`FRED returned ${res.status}`);

    const text = await res.text();
    const lines = text
      .trim()
      .split("\n")
      .filter((l) => l && !l.startsWith("DATE"));

    // Cut to requested window
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);

    const points: RateHistoryPoint[] = lines
      .map((line) => {
        const [date, rateStr] = line.split(",");
        const conventional = parseFloat(rateStr);
        if (!date || isNaN(conventional) || conventional <= 0) return null;
        if (new Date(date.trim()) < cutoff) return null;
        return {
          date: date.trim(),
          conventional,
          fha: parseFloat((conventional - 0.25).toFixed(3)),
          va: parseFloat((conventional - 0.5).toFixed(3)),
        };
      })
      .filter(Boolean) as RateHistoryPoint[];

    return NextResponse.json({ points, count: points.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Could not fetch rate history", detail: message },
      { status: 500 }
    );
  }
}
