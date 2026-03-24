import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Fetch 30-year conventional from Freddie Mac PMMS via FRED
    const res = await fetch(
      "https://fred.stlouisfed.org/graph/fredgraph.csv?id=MORTGAGE30US",
      {
        next: { revalidate: 43200 }, // cache server-side for 12 hours
        headers: { "User-Agent": "RioGroupAdvisor/1.0" },
      }
    );

    if (!res.ok) throw new Error(`FRED returned ${res.status}`);

    const text = await res.text();
    const lines = text.trim().split("\n").filter((l) => l && !l.startsWith("DATE"));
    const lastLine = lines[lines.length - 1];
    const [date, rateStr] = lastLine.split(",");
    const conventional = parseFloat(rateStr);

    if (isNaN(conventional) || conventional <= 0) {
      throw new Error("Invalid rate value from FRED");
    }

    // FHA typically runs ~0.25% below conventional (MIP offsets rate difference)
    // VA typically runs ~0.50% below conventional
    // These are standard industry approximations — agent can override in Settings
    const fha = parseFloat((conventional - 0.25).toFixed(3));
    const va = parseFloat((conventional - 0.5).toFixed(3));

    return NextResponse.json({
      conventional,
      fha,
      va,
      lastUpdated: new Date().toISOString(),
      source: "Freddie Mac PMMS via FRED",
      asOf: date.trim(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Rate fetch failed:", message);
    return NextResponse.json(
      { error: "Could not fetch live rates", detail: message },
      { status: 500 }
    );
  }
}
