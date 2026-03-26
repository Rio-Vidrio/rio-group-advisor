"use client";

import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { getRates, saveRates, Rates, defaultRates } from "@/lib/rateStore";

// All FRED data flows through our own Vercel API routes:
//   /api/fred-rates   → chart history (104 weekly observations, ≈ 2 years)
//   /api/fred-current → latest single rate (used by Refresh Rates button)
// The browser never calls FRED directly — no CORS or IP-block issues possible.

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistoryPoint {
  date: string;
  conventional: number;
  fha: number;
  va: number;
}

type Range = "3months" | "6months" | "1year" | "2years";

const RANGE_LABELS: Record<Range, string> = {
  "3months": "3 Months",
  "6months": "6 Months",
  "1year":   "1 Year",
  "2years":  "2 Years",
};

const RANGE_DAYS: Record<Range, number> = {
  "3months": 91,
  "6months": 182,
  "1year":   365,
  "2years":  730,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });
}

function formatDateShort(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    month: "short", year: "2-digit",
  });
}

/** Convert raw FRED observations → typed HistoryPoint array with FHA/VA derived */
function toHistoryPoints(
  observations: Array<{ date: string; value: string }>
): HistoryPoint[] {
  return observations
    .filter((o) => o.value && o.value !== ".")
    .map((o) => {
      const conventional = parseFloat(o.value);
      return {
        date: o.date,
        conventional,
        fha: parseFloat((conventional - 0.25).toFixed(2)),
        va:  parseFloat((conventional - 0.50).toFixed(2)),
      };
    })
    .filter((p) => !isNaN(p.conventional) && p.conventional > 0);
}

/** Filter a full HistoryPoint array down to the last N days */
function sliceByDays(all: HistoryPoint[], days: number): HistoryPoint[] {
  const cutoff = Date.now() - days * 86_400_000;
  return all.filter((p) => new Date(p.date).getTime() >= cutoff);
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: p.color }} />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-bold" style={{ color: p.color }}>{p.value.toFixed(2)}%</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MarketRates() {
  const [range, setRange]           = useState<Range>("1year");
  const [allPoints, setAllPoints]   = useState<HistoryPoint[]>([]);   // full 2-yr dataset
  const [dataLoaded, setDataLoaded] = useState(false);
  const [dataUpdated, setDataUpdated] = useState("");
  const [chartError, setChartError]   = useState("");

  // Rate card state
  const [rates, setRates]             = useState<Rates>(defaultRates);
  const [lastUpdated, setLastUpdated] = useState("");
  const [overrideConv, setOverrideConv] = useState("");
  const [overrideFHA, setOverrideFHA]   = useState("");
  const [overrideVA, setOverrideVA]     = useState("");
  const [saveMsg, setSaveMsg]           = useState("");
  const [refreshing, setRefreshing]     = useState(false);
  const [refreshMsg, setRefreshMsg]     = useState("");

  // ── On mount: seed rate cards from localStorage ──────────────────────────────
  useEffect(() => {
    const saved = getRates();
    setRates(saved);
    setOverrideConv(saved.conventional.toFixed(3));
    setOverrideFHA(saved.fha.toFixed(3));
    setOverrideVA(saved.va.toFixed(3));
    if (saved.lastUpdated) setLastUpdated(saved.lastUpdated);
  }, []);

  // ── On mount: load chart history from /api/fred-rates ────────────────────────
  useEffect(() => {
    // Step 1: Try the pre-built static JSON first (instant, served from CDN)
    fetch("/rate-history.json")
      .then((r) => r.ok ? r.json() : null)
      .then((file) => {
        if (file?.["2years"]?.length) {
          // Static file has pre-sliced ranges — flatten 2years as the full dataset
          setAllPoints(file["2years"]);
          setDataUpdated(file.updated || "");
          setDataLoaded(true);
        }
      })
      .catch(() => {});

    // Step 2: Fetch fresh data from our own proxy route (Vercel → FRED server-side)
    fetch("/api/fred-rates", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((data) => {
        if (!data.observations?.length) throw new Error("Empty response");
        const points = toHistoryPoints(data.observations);
        if (points.length === 0) throw new Error("No valid data points");
        setAllPoints(points);
        setDataUpdated(new Date().toISOString().split("T")[0]);
        setDataLoaded(true);
        setChartError("");
      })
      .catch((err) => {
        // Static JSON may already be showing — only surface error if we have nothing
        setDataLoaded(true);
        if (allPoints.length === 0) {
          setChartError(err.message || "Could not load rate history");
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Refresh Rates button — calls /api/fred-current ───────────────────────────
  async function handleRefreshRates() {
    setRefreshing(true);
    setRefreshMsg("");
    try {
      const res = await fetch("/api/fred-current", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error || !data.conventional) throw new Error(data.detail || data.error || "No rate returned");

      const updated: Rates = {
        conventional: data.conventional,
        fha: data.fha,
        va:  data.va,
        lastUpdated: data.lastUpdated,
      };
      saveRates(updated);
      setRates(updated);
      setOverrideConv(updated.conventional.toFixed(3));
      setOverrideFHA(updated.fha.toFixed(3));
      setOverrideVA(updated.va.toFixed(3));
      setLastUpdated(updated.lastUpdated);
      setRefreshMsg(`✓ Rates updated — as of ${data.asOf}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setRefreshMsg(`⚠️ ${msg}`);
    } finally {
      setRefreshing(false);
      setTimeout(() => setRefreshMsg(""), 5000);
    }
  }

  // ── Slice current range from full dataset — instant, no fetch ────────────────
  const history: HistoryPoint[] =
    range === "2years" ? allPoints : sliceByDays(allPoints, RANGE_DAYS[range]);

  // ── Chart axis helpers ───────────────────────────────────────────────────────
  const isShortRange  = range === "3months" || range === "6months";
  const tickFormatter = (v: string) => isShortRange ? formatDate(v) : formatDateShort(v);
  const tickCount     = range === "3months" ? 6 : range === "6months" ? 8 : 10;
  const tickInterval  = Math.max(1, Math.floor((history.length - 1) / tickCount));
  const allVals       = history.flatMap((p) => [p.conventional, p.fha, p.va]).filter(Boolean);
  const yMin          = allVals.length ? Math.floor(Math.min(...allVals) * 4) / 4 - 0.25 : 4;
  const yMax          = allVals.length ? Math.ceil(Math.max(...allVals)  * 4) / 4 + 0.25 : 8;

  // ── Save manual overrides ────────────────────────────────────────────────────
  function handleSaveRates() {
    const conv = parseFloat(overrideConv);
    const fha  = parseFloat(overrideFHA);
    const va   = parseFloat(overrideVA);
    if (isNaN(conv) || isNaN(fha) || isNaN(va)) {
      setSaveMsg("⚠️ Enter valid numbers for all three rates.");
      return;
    }
    const updated: Rates = { conventional: conv, fha, va, lastUpdated: new Date().toISOString() };
    saveRates(updated);
    setRates(updated);
    setLastUpdated(updated.lastUpdated);
    setSaveMsg("✓ Rates saved — all calculators updated.");
    setTimeout(() => setSaveMsg(""), 3000);
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1">Market Rates</h2>
        <p className="text-gray-500 text-sm">
          30-year mortgage rate trends — Freddie Mac PMMS via Federal Reserve (FRED).
          {dataUpdated && (
            <span className="ml-1 text-gray-400">
              Chart data as of {new Date(dataUpdated + "T12:00:00").toLocaleDateString("en-US", {
                month: "long", day: "numeric", year: "numeric",
              })}.
            </span>
          )}
        </p>
      </div>

      {/* ── Chart Card ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">

        {/* Range toggles + updated badge */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-1">
            {(Object.entries(RANGE_LABELS) as [Range, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setRange(key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                  range === key
                    ? "bg-rio-red text-white border-rio-red"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {dataUpdated && (
            <span className="text-xs text-gray-400">
              Updated {new Date(dataUpdated + "T12:00:00").toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
              })}
            </span>
          )}
        </div>

        {/* Loading state */}
        {!dataLoaded && (
          <div className="flex items-center justify-center h-64 text-gray-400">
            <div className="text-center">
              <div className="text-2xl mb-2 animate-pulse">📈</div>
              <div className="text-sm">Loading rate history…</div>
            </div>
          </div>
        )}

        {/* Error state */}
        {dataLoaded && chartError && history.length === 0 && (
          <div className="flex items-center justify-center h-64">
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-5 py-4 text-sm text-amber-800 text-center">
              <div className="font-semibold mb-1">Could not load rate history</div>
              <div className="text-xs text-amber-600">{chartError}</div>
            </div>
          </div>
        )}

        {/* Empty state (no error, just no data for this range) */}
        {dataLoaded && !chartError && history.length === 0 && (
          <div className="flex items-center justify-center h-64">
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-5 py-4 text-sm text-gray-500 text-center">
              <div className="font-semibold mb-1">No data for this range yet</div>
              <div className="text-xs">Rate history will refresh automatically on the next scheduled run.</div>
            </div>
          </div>
        )}

        {/* Chart */}
        {dataLoaded && history.length > 0 && (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={history} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tickFormatter={tickFormatter}
                interval={tickInterval}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={{ stroke: "#e5e7eb" }}
                tickLine={false}
              />
              <YAxis
                domain={[yMin, yMax]}
                tickFormatter={(v) => `${v.toFixed(2)}%`}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: "16px", fontSize: "12px", fontWeight: 600 }}
                formatter={(value) =>
                  value === "conventional" ? "Conventional 30yr" :
                  value === "fha" ? "FHA 30yr" : "VA 30yr"
                }
              />
              <Line type="monotone" dataKey="conventional" stroke="#C8202A" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: "#C8202A" }} />
              <Line type="monotone" dataKey="fha"          stroke="#333333" strokeWidth={2}   dot={false} activeDot={{ r: 4, fill: "#333333" }} />
              <Line type="monotone" dataKey="va"           stroke="#888888" strokeWidth={2}   dot={false} activeDot={{ r: 4, fill: "#888888" }} strokeDasharray="5 3" />
            </LineChart>
          </ResponsiveContainer>
        )}

        {dataLoaded && (
          <p className="text-xs text-gray-400 mt-3 text-center">
            FHA and VA derived from Freddie Mac conventional PMMS (−0.25% / −0.50%). Override below if needed.
          </p>
        )}
      </div>

      {/* ── Today's Rate Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        {[
          { label: "Conventional 30yr", key: "conventional" as keyof Rates, color: "#C8202A", override: overrideConv, setOverride: setOverrideConv, current: rates.conventional, note: "Source: Freddie Mac PMMS" },
          { label: "FHA 30yr",          key: "fha"          as keyof Rates, color: "#333333", override: overrideFHA,  setOverride: setOverrideFHA,  current: rates.fha,          note: "Derived: Conv − 0.25%" },
          { label: "VA 30yr",           key: "va"           as keyof Rates, color: "#888888", override: overrideVA,   setOverride: setOverrideVA,   current: rates.va,           note: "Derived: Conv − 0.50%" },
        ].map((card) => (
          <div
            key={card.key}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
            style={{ borderTopWidth: "3px", borderTopColor: card.color }}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {card.label}
              </div>
              {refreshing && (
                <span className="text-xs text-gray-300 animate-pulse">updating…</span>
              )}
            </div>
            <div className="text-5xl font-bold mb-1 tabular-nums" style={{ color: card.color }}>
              {card.current.toFixed(2)}
              <span className="text-xl font-semibold text-gray-400">%</span>
            </div>
            <div className="text-xs text-gray-400 mb-4">
              {card.note}
              {lastUpdated && (
                <span className="block mt-0.5">
                  As of {new Date(lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              )}
            </div>
            <div className="border-t border-gray-100 pt-3">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Manual Override</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.125"
                  min="0"
                  max="20"
                  value={card.override}
                  onChange={(e) => card.setOverride(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold focus:border-rio-red focus:ring-1 focus:ring-rio-red outline-none"
                  placeholder={card.current.toFixed(3)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Save / Refresh Controls ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="text-sm text-gray-600">
          <span className="font-semibold">Manual override</span> — edit the rates above and save to update all calculators instantly.
          <span className="block text-xs text-gray-400 mt-0.5">
            Rates auto-refresh on page load. Use <strong>Refresh Rates</strong> to pull the latest from Freddie Mac PMMS on demand.
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {(saveMsg || refreshMsg) && (
            <span className={`text-sm font-medium ${
              (saveMsg || refreshMsg).startsWith("⚠️") ? "text-amber-600" : "text-green-600"
            }`}>
              {saveMsg || refreshMsg}
            </span>
          )}
          <button
            onClick={handleRefreshRates}
            disabled={refreshing}
            className="px-5 py-2 rounded-lg text-sm font-semibold border border-gray-300 text-gray-700 hover:border-gray-500 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {refreshing ? "Refreshing…" : "Refresh Rates"}
          </button>
          <button
            onClick={handleSaveRates}
            className="px-6 py-2 rounded-lg text-sm font-semibold bg-rio-red text-white hover:bg-red-700 transition-colors"
          >
            Save Rates
          </button>
        </div>
      </div>
    </div>
  );
}
