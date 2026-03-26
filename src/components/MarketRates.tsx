"use client";

import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { getRates, saveRates, fetchLiveRates, Rates, defaultRates } from "@/lib/rateStore";

// All FRED data flows through our own Vercel API routes (/api/rates, /api/rates/history).
// The browser never calls FRED directly — no CORS or IP-block issues possible.

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistoryPoint {
  date: string;
  conventional: number;
  fha: number;
  va: number;
}

interface RateHistoryFile {
  updated?: string;
  "3months": HistoryPoint[];
  "6months": HistoryPoint[];
  "1year":   HistoryPoint[];
  "2years":  HistoryPoint[];
}

type Range = "3months" | "6months" | "1year" | "2years";

const RANGE_LABELS: Record<Range, string> = {
  "3months": "3 Months",
  "6months": "6 Months",
  "1year":   "1 Year",
  "2years":  "2 Years",
};

const EMPTY_FILE: RateHistoryFile = {
  "3months": [], "6months": [], "1year": [], "2years": [],
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
  const [allData, setAllData]       = useState<RateHistoryFile>(EMPTY_FILE);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [dataUpdated, setDataUpdated] = useState("");

  // Rate card state
  const [rates, setRates]           = useState<Rates>(defaultRates);
  const [lastUpdated, setLastUpdated] = useState("");
  const [overrideConv, setOverrideConv] = useState("");
  const [overrideFHA, setOverrideFHA]   = useState("");
  const [overrideVA, setOverrideVA]     = useState("");
  const [saveMsg, setSaveMsg]           = useState("");
  const [ratesRefreshing, setRatesRefreshing] = useState(false);

  // ── On mount: seed from localStorage, then auto-refresh from our API route ──
  useEffect(() => {
    // 1. Immediately show whatever is cached in localStorage
    const saved = getRates();
    setRates(saved);
    setOverrideConv(saved.conventional.toFixed(3));
    setOverrideFHA(saved.fha.toFixed(3));
    setOverrideVA(saved.va.toFixed(3));
    if (saved.lastUpdated) setLastUpdated(saved.lastUpdated);

    // 2. Silently refresh rate cards from /api/rates (Vercel → FRED, no blocking)
    setRatesRefreshing(true);
    fetchLiveRates()
      .then((live) => {
        if (live) {
          saveRates(live);
          setRates(live);
          setOverrideConv(live.conventional.toFixed(3));
          setOverrideFHA(live.fha.toFixed(3));
          setOverrideVA(live.va.toFixed(3));
          setLastUpdated(live.lastUpdated);
        }
      })
      .finally(() => setRatesRefreshing(false));
  }, []);

  // ── On mount: load chart — static JSON first, then refresh from /api/rates/history ──
  useEffect(() => {
    // Step 1: Load the pre-built static JSON instantly (served from CDN)
    fetch("/rate-history.json")
      .then((r) => r.json())
      .then((data: RateHistoryFile) => {
        setAllData(data);
        setDataUpdated(data.updated || "");
        setDataLoaded(true);
      })
      .catch(() => setDataLoaded(true));

    // Step 2: Fetch fresh history from our API route (Vercel → FRED, server-side)
    fetch("/api/rates/history?months=24", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((histData) => {
        if (!histData?.points?.length) return;
        const all: HistoryPoint[] = histData.points;
        const now = Date.now();
        const slice = (days: number) =>
          all.filter((p) => new Date(p.date).getTime() >= now - days * 86400000);
        setAllData({
          updated: new Date().toISOString().split("T")[0],
          "3months": slice(91),
          "6months": slice(182),
          "1year":   slice(365),
          "2years":  all,
        });
        setDataUpdated(new Date().toISOString().split("T")[0]);
        setDataLoaded(true);
      })
      .catch(() => { /* static JSON already loaded above — silent fail is fine */ });
  }, []);

  // ── Current range data — instant switch, no fetch ───────────────────────────
  const history: HistoryPoint[] = allData[range] ?? [];

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

        {/* Range toggles */}
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

        {/* Chart or empty state */}
        {!dataLoaded && (
          <div className="flex items-center justify-center h-64 text-gray-400">
            <div className="text-center">
              <div className="text-2xl mb-2 animate-pulse">📈</div>
              <div className="text-sm">Loading rate history…</div>
            </div>
          </div>
        )}

        {dataLoaded && history.length === 0 && (
          <div className="flex items-center justify-center h-64">
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-5 py-4 text-sm text-gray-500 text-center">
              <div className="font-semibold mb-1">No chart data available</div>
              <div className="text-xs">Rate history will refresh automatically on the next scheduled run.</div>
            </div>
          </div>
        )}

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
              {ratesRefreshing && (
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

      {/* ── Save Controls ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="text-sm text-gray-600">
          <span className="font-semibold">Manual override</span> — edit the rates above and save to update all calculators instantly.
          <span className="block text-xs text-gray-400 mt-0.5">
            Live rates auto-refresh from Freddie Mac PMMS each time this page loads.
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {saveMsg && (
            <span className={`text-sm font-medium ${saveMsg.startsWith("⚠️") ? "text-amber-600" : "text-green-600"}`}>
              {saveMsg}
            </span>
          )}
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
