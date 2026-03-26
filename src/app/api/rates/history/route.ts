import { NextResponse } from "next/server";

export const runtime = "edge";

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
    // Calculate start date and pad by 1 month for safety
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months - 1);
    const cosd = startDate.toISOString().split("T")[0];

    // Use browser-like headers — FRED blocks non-browser User-Agents from cloud IPs
    const res = await fetch(
      `https://fred.stlouisfed.org/graph/fredgraph.csv?id=MORTGAGE30US&cosd=${cosd}`,
      {
        headers: {
          "Accept": "text/csv,text/plain,*/*",
          "Accept-Language": "en-US,en;q=0.9",
        },
      }
    );

    if (!res.ok) throw new Error(`FRED returned ${res.status}`);

    const text = await res.text();
    const lines = text
      .trim()
      .split("\n")
      .filter((l) => l && !l.startsWith("DATE"));

    // Cut to exact requested window
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);

    const points: RateHistoryPoint[] = lines
      .map((line) => {
        const [date, rateStr] = line.split(",");
        const trimmed = rateStr?.trim();
        // FRED uses "." for missing data points
        if (!date || !trimmed || trimmed === ".") return null;
        const conventional = parseFloat(trimmed);
        if (isNaN(conventional) || conventional <= 0) return null;
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
