import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  try {
    // Fetch 30-year conventional from Freddie Mac PMMS via FRED
    const res = await fetch(
      "https://fred.stlouisfed.org/graph/fredgraph.csv?id=MORTGAGE30US",
      {
        headers: { "User-Agent": "RioGroupAdvisor/1.0" },
      }
    );

    if (!res.ok) throw new Error(`FRED returned ${res.status}`);

    const text = await res.text();
    const lines = text.trim().split("\n").filter((l) => l && !l.startsWith("DATE"));

    // Walk backwards to find the latest valid data point (FRED uses "." for missing)
    let conventional = NaN;
    let date = "";
    for (let i = lines.length - 1; i >= 0; i--) {
      const [d, rateStr] = lines[i].split(",");
      const trimmed = rateStr?.trim();
      if (trimmed && trimmed !== ".") {
        const parsed = parseFloat(trimmed);
        if (!isNaN(parsed) && parsed > 0) {
          conventional = parsed;
          date = d.trim();
          break;
        }
      }
    }

    if (isNaN(conventional) || conventional <= 0) {
      throw new Error("Invalid rate value from FRED");
    }

    // FHA typically runs ~0.25% below conventional (MIP offsets rate difference)
    // VA typically runs ~0.50% below conventional
    const fha = parseFloat((conventional - 0.25).toFixed(3));
    const va = parseFloat((conventional - 0.5).toFixed(3));

    return NextResponse.json({
      conventional,
      fha,
      va,
      lastUpdated: new Date().toISOString(),
      source: "Freddie Mac PMMS via FRED",
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
