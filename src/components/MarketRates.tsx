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
    <div style={{ background: "#FFFFFF", border: "1px solid #E8E8E8", borderRadius: "10px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", padding: "12px 16px", fontSize: "0.8125rem" }}>
      <p style={{ fontWeight: 600, color: "#111111", marginBottom: "6px" }}>{label}</p>
      {payload.map((p) => (
        <div key={p.name} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", display: "inline-block", background: p.color, flexShrink: 0 }} />
          <span style={{ color: "#6B6B6B" }}>{p.name}:</span>
          <span style={{ fontWeight: 700, color: p.color }}>{p.value.toFixed(2)}%</span>
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
    <div>
      <div style={{ marginBottom: "28px" }}>
        <h2 style={{ fontSize: "1.375rem", fontWeight: 700, color: "#111111", margin: "0 0 4px 0" }}>Market Rates</h2>
        <p style={{ color: "#6B6B6B", fontSize: "0.875rem", margin: 0 }}>
          30-year mortgage rate trends — Freddie Mac PMMS via Federal Reserve (FRED).
          {dataUpdated && (
            <span style={{ marginLeft: "4px", color: "#9B9B9B" }}>
              Chart data as of {new Date(dataUpdated + "T12:00:00").toLocaleDateString("en-US", {
                month: "long", day: "numeric", year: "numeric",
              })}.
            </span>
          )}
        </p>
      </div>

      {/* ── Chart Card ────────────────────────────────────────────────────── */}
      <div style={{ background: "#FFFFFF", borderRadius: "16px", border: "1px solid #E8E8E8", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", padding: "28px", marginBottom: "20px" }}>

        {/* Range toggles + updated badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", gap: "6px" }}>
            {(Object.entries(RANGE_LABELS) as [Range, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setRange(key)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "8px",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  border: range === key ? "1.5px solid #C8202A" : "1.5px solid #E8E8E8",
                  background: range === key ? "#C8202A" : "#FFFFFF",
                  color: range === key ? "#FFFFFF" : "#6B6B6B",
                  cursor: "pointer",
                  transition: "background 100ms, border-color 100ms, color 100ms",
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {dataUpdated && (
            <span style={{ fontSize: "0.75rem", color: "#9B9B9B" }}>
              Updated {new Date(dataUpdated + "T12:00:00").toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
              })}
            </span>
          )}
        </div>

        {/* Loading state */}
        {!dataLoaded && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "256px" }}>
            <div style={{ textAlign: "center", color: "#9B9B9B" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: "8px" }}>📈</div>
              <div style={{ fontSize: "0.875rem" }}>Loading rate history…</div>
            </div>
          </div>
        )}

        {/* Error state */}
        {dataLoaded && chartError && history.length === 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "256px" }}>
            <div style={{ background: "#FFFBEB", borderLeft: "4px solid #F59E0B", borderRadius: "0 10px 10px 0", padding: "16px 20px", fontSize: "0.875rem", color: "#92400E", textAlign: "center" }}>
              <div style={{ fontWeight: 600, marginBottom: "4px" }}>Could not load rate history</div>
              <div style={{ fontSize: "0.75rem", color: "#B45309" }}>{chartError}</div>
            </div>
          </div>
        )}

        {/* Empty state (no error, just no data for this range) */}
        {dataLoaded && !chartError && history.length === 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "256px" }}>
            <div style={{ background: "#F7F6F4", border: "1px solid #E8E8E8", borderRadius: "10px", padding: "16px 20px", fontSize: "0.875rem", color: "#6B6B6B", textAlign: "center" }}>
              <div style={{ fontWeight: 600, marginBottom: "4px" }}>No data for this range yet</div>
              <div style={{ fontSize: "0.75rem" }}>Rate history will refresh automatically on the next scheduled run.</div>
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
          <p style={{ fontSize: "0.75rem", color: "#9B9B9B", marginTop: "12px", textAlign: "center" }}>
            FHA and VA derived from Freddie Mac conventional PMMS (−0.25% / −0.50%). Override below if needed.
          </p>
        )}
      </div>

      {/* ── Today's Rate Cards ─────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "16px" }}>
        {[
          { label: "Conventional 30yr", key: "conventional" as keyof Rates, color: "#C8202A", override: overrideConv, setOverride: setOverrideConv, current: rates.conventional, note: "Source: Freddie Mac PMMS" },
          { label: "FHA 30yr",          key: "fha"          as keyof Rates, color: "#333333", override: overrideFHA,  setOverride: setOverrideFHA,  current: rates.fha,          note: "Derived: Conv − 0.25%" },
          { label: "VA 30yr",           key: "va"           as keyof Rates, color: "#888888", override: overrideVA,   setOverride: setOverrideVA,   current: rates.va,           note: "Derived: Conv − 0.50%" },
        ].map((card) => (
          <div
            key={card.key}
            style={{ background: "#FFFFFF", borderRadius: "16px", border: "1px solid #E8E8E8", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", padding: "24px", borderTop: `4px solid ${card.color}` }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
              <div style={{ fontSize: "0.6875rem", fontWeight: 600, color: "#9B9B9B", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {card.label}
              </div>
              {refreshing && (
                <span style={{ fontSize: "0.75rem", color: "#D1D5DB" }}>updating…</span>
              )}
            </div>
            <div style={{ fontSize: "3rem", fontWeight: 700, marginBottom: "4px", fontVariantNumeric: "tabular-nums", color: card.color, lineHeight: 1 }}>
              {card.current.toFixed(2)}
              <span style={{ fontSize: "1.25rem", fontWeight: 600, color: "#9B9B9B" }}>%</span>
            </div>
            <div style={{ fontSize: "0.75rem", color: "#9B9B9B", marginBottom: "16px" }}>
              {card.note}
              {lastUpdated && (
                <span style={{ display: "block", marginTop: "2px" }}>
                  As of {new Date(lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              )}
            </div>
            <div style={{ borderTop: "1px solid #E8E8E8", paddingTop: "12px" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#6B6B6B", marginBottom: "6px" }}>Manual Override</label>
              <div style={{ position: "relative" }}>
                <input
                  type="number"
                  step="0.125"
                  min="0"
                  max="20"
                  value={card.override}
                  onChange={(e) => card.setOverride(e.target.value)}
                  style={{ width: "100%", border: "1.5px solid #E8E8E8", borderRadius: "8px", padding: "8px 32px 8px 12px", fontSize: "0.875rem", fontWeight: 600, outline: "none", boxSizing: "border-box", color: "#111111" }}
                  placeholder={card.current.toFixed(3)}
                />
                <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "#9B9B9B", fontSize: "0.75rem" }}>%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Save / Refresh Controls ─────────────────────────────────────────── */}
      <div style={{ background: "#FFFFFF", borderRadius: "16px", border: "1px solid #E8E8E8", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", padding: "20px 24px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
        <div style={{ fontSize: "0.875rem", color: "#6B6B6B" }}>
          <span style={{ fontWeight: 600, color: "#111111" }}>Manual override</span> — edit the rates above and save to update all calculators instantly.
          <span style={{ display: "block", fontSize: "0.75rem", color: "#9B9B9B", marginTop: "2px" }}>
            Rates auto-refresh on page load. Use <strong>Refresh Rates</strong> to pull the latest from Freddie Mac PMMS on demand.
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {(saveMsg || refreshMsg) && (
            <span style={{ fontSize: "0.875rem", fontWeight: 500, color: (saveMsg || refreshMsg).startsWith("⚠️") ? "#D97706" : "#16A34A" }}>
              {saveMsg || refreshMsg}
            </span>
          )}
          <button
            onClick={handleRefreshRates}
            disabled={refreshing}
            style={{ padding: "10px 20px", borderRadius: "10px", fontSize: "0.875rem", fontWeight: 600, border: "1.5px solid #E8E8E8", background: "#FFFFFF", color: "#111111", cursor: refreshing ? "not-allowed" : "pointer", opacity: refreshing ? 0.5 : 1 }}
          >
            {refreshing ? "Refreshing…" : "↻ Refresh Live Rates"}
          </button>
          <button
            onClick={handleSaveRates}
            style={{ padding: "10px 24px", borderRadius: "10px", fontSize: "0.875rem", fontWeight: 600, background: "#C8202A", color: "#FFFFFF", border: "none", cursor: "pointer" }}
          >
            Save Rates
          </button>
        </div>
      </div>
    </div>
  );
}
