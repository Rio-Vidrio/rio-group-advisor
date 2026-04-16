"use client";

import React, { useMemo, useState } from "react";

/* =============================================================================
   Work History Assessment
   ─────────────────────────────────────────────────────────────────────────────
   Flow:
     Step 1 — Build the 2-year employment timeline (visual bar)
     Step 2 — Current employment type + follow-up questions (informed by timeline)
     Step 3 — Multiple income source combinations
     Step 4 — Gap resolution (conditional on gaps ≥ 6 months)
     Step 5 — Verdict: Clean / Workable / Complex
   ========================================================================== */

// ─── Types ────────────────────────────────────────────────────────────────────

type CurrentStatus = "w2ft" | "w2pt" | "se" | "contract" | "none";
type Tenure = "<30d" | "1-6m" | "6-12m" | "1-2y" | "2+y";
type YesNo = "yes" | "no";
type IncomeChange = "increased" | "decreased" | "same" | "first";
type TaxYears = "<1" | "1" | "2+";
type PreSE = "w2-same" | "w2-diff" | "se" | "gap" | "none";
type ContractActive = "yes" | "no";
type NoneDuration = "<30d" | "1-6m" | "6+m";
type MultiDuration = "<2y" | "2+y";

type PeriodType =
  | "w2" | "se" | "1099" | "gig" | "contract" | "seasonal"
  | "cash" | "foreign" | "gap" | "other";

type Documented = "yes" | "no" | "partial";
type CashDoc = "letter" | "amend" | "cannot";

type Period = {
  id: string;
  type: PeriodType;
  startYM: string;
  endYM: string | "present";
  industry: string;
  documented: Documented;
  cashDoc?: CashDoc;
  foreignLetter?: YesNo;
};

type State = {
  periods: Period[];
  current: CurrentStatus | null;
  w2Tenure: Tenure | null;
  w2Offer: YesNo | null;
  w2Raise: YesNo | null;
  w2IncomeChange: IncomeChange | null;
  seTaxYears: TaxYears | null;
  sePrior: PreSE | null;
  contractPattern: YesNo | null;
  contractActive: ContractActive | null;
  contractExpires: YesNo | null;
  noneDuration: NoneDuration | null;
  backOnJobMonths: string;
  multiIncome: YesNo | null;
  multiTwoW2: boolean;
  multiW2SE: boolean;
  multiW2Gig: boolean;
  multiMultiSE: boolean;
  multiDuration: MultiDuration | null;
};

const initialState: State = {
  periods: [],
  current: null,
  w2Tenure: null, w2Offer: null, w2Raise: null, w2IncomeChange: null,
  seTaxYears: null, sePrior: null,
  contractPattern: null, contractActive: null, contractExpires: null,
  noneDuration: null, backOnJobMonths: "",
  multiIncome: null, multiTwoW2: false, multiW2SE: false, multiW2Gig: false,
  multiMultiSE: false, multiDuration: null,
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

function todayYM(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function ymToIndex(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  return y * 12 + (m - 1);
}
function indexToYM(idx: number): string {
  const y = Math.floor(idx / 12);
  const m = (idx % 12) + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}
function ymLabel(ym: string): string {
  if (ym === "present") return "Present";
  const [y, m] = ym.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[Number(m) - 1]} ${y}`;
}
function addMonths(ym: string, n: number): string {
  return indexToYM(ymToIndex(ym) + n);
}

// ─── Coverage analysis ────────────────────────────────────────────────────────

type Gap = { startYM: string; endYM: string; months: number };

function analyzeCoverage(periods: Period[]): {
  documentedMonths: number; partialMonths: number;
  gaps: Gap[]; longestGap: number;
  windowStartYM: string; windowEndYM: string;
} {
  const windowEnd = todayYM();
  const windowStart = addMonths(windowEnd, -23);
  const wStart = ymToIndex(windowStart);
  const wEnd = ymToIndex(windowEnd);
  const slots: number[] = new Array(24).fill(0);

  for (const p of periods) {
    if (!p.startYM) continue;
    const sIdx = Math.max(ymToIndex(p.startYM), wStart);
    const eIdx = Math.min(ymToIndex(p.endYM === "present" ? windowEnd : p.endYM), wEnd);
    if (eIdx < wStart || sIdx > wEnd) continue;
    const score = p.type === "gap" ? 0 : p.documented === "yes" ? 2 : p.documented === "partial" ? 1 : 0;
    for (let i = sIdx; i <= eIdx; i++) {
      if (score > slots[i - wStart]) slots[i - wStart] = score;
    }
  }

  const documentedMonths = slots.filter((s) => s === 2).length;
  const partialMonths = slots.filter((s) => s === 1).length;
  const gaps: Gap[] = [];
  let runStart = -1;
  for (let i = 0; i <= slots.length; i++) {
    const inGap = i < slots.length && slots[i] === 0;
    if (inGap && runStart === -1) runStart = i;
    if (!inGap && runStart !== -1) {
      gaps.push({ startYM: indexToYM(wStart + runStart), endYM: indexToYM(wStart + i - 1), months: i - runStart });
      runStart = -1;
    }
  }
  const longestGap = gaps.reduce((m, g) => Math.max(m, g.months), 0);
  return { documentedMonths, partialMonths, gaps, longestGap, windowStartYM: windowStart, windowEndYM: windowEnd };
}

// ─── Verdict ──────────────────────────────────────────────────────────────────

type VerdictLevel = "green" | "amber" | "red";
type Verdict = { level: VerdictLevel; title: string; message: string; needs: string[]; earliestEligibleYM?: string };

function computeVerdict(s: State): Verdict {
  const needs: string[] = [];
  let level: VerdictLevel = "green";
  let earliest: string | undefined;
  const bump = (next: VerdictLevel) => {
    const rank: Record<VerdictLevel, number> = { green: 0, amber: 1, red: 2 };
    if (rank[next] > rank[level]) level = next;
  };

  if (s.current === "w2ft" || s.current === "w2pt") {
    if (s.w2Tenure === "<30d" && s.w2Offer === "no") { bump("amber"); needs.push("Offer letter or first pay stub required before closing"); }
    if (s.w2IncomeChange === "decreased") needs.push("Must qualify on new lower income — prior cannot be averaged");
  }
  if (s.current === "se") {
    if (s.seTaxYears === "<1") { bump("red"); needs.push("At least 1 year of filed taxes required before SE income can be used"); }
    else if (s.seTaxYears === "1") {
      bump("amber");
      if (s.sePrior === "w2-diff") { bump("red"); needs.push("Two full years of SE taxes required — prior W2 industry differs"); }
      else needs.push("Gray-area underwrite — verify prior W2 industry matches current self-employment");
    }
  }
  if (s.current === "contract") {
    if (s.contractPattern === "no") { bump("amber"); needs.push("2 years of documented contract/seasonal pattern required"); }
    if (s.contractActive === "yes" && s.contractExpires === "yes") { bump("red"); needs.push("Contract expires before closing — renewal required"); }
    if (s.contractActive === "no") { bump("amber"); needs.push("Confirm next contract start date"); }
  }
  if (s.current === "none") {
    if (s.noneDuration === "1-6m") { bump("amber"); needs.push("Must be back on the job 6 full months before closing"); }
    if (s.noneDuration === "6+m") {
      const monthsBack = Number(s.backOnJobMonths || 0);
      if (monthsBack < 6) {
        bump("red");
        earliest = addMonths(todayYM(), Math.max(0, 6 - monthsBack));
        needs.push(`6 months continuous employment required — eligible ${ymLabel(earliest)}`);
      }
    }
  }

  const a = analyzeCoverage(s.periods);
  if (s.periods.length > 0) {
    if (a.longestGap >= 6) { bump("red"); needs.push(`${a.longestGap}-month undocumented gap must be resolved`); }
    else if (a.documentedMonths + a.partialMonths < 24) {
      bump("amber");
      if (a.partialMonths > 0) needs.push(`${a.partialMonths} month(s) of partial documentation — firm up before closing`);
      const uncovered = 24 - a.documentedMonths - a.partialMonths;
      if (uncovered > 0) needs.push(`${uncovered} month(s) still uncovered in the 2-year window`);
    }
  }

  for (const p of s.periods) {
    if (p.type === "cash") {
      if (p.cashDoc === "letter" || p.cashDoc === "amend") {
        bump("amber");
        needs.push(`Cash period (${ymLabel(p.startYM)}–${ymLabel(p.endYM)}): ${p.cashDoc === "letter" ? "get employer verification letter" : "amend taxes"} before closing`);
      }
      if (p.cashDoc === "cannot") { bump("red"); needs.push(`Cash period (${ymLabel(p.startYM)}–${ymLabel(p.endYM)}) cannot be documented — treated as gap`); }
    }
    if (p.type === "foreign" && p.foreignLetter === "no") { bump("red"); needs.push(`Foreign employment (${ymLabel(p.startYM)}–${ymLabel(p.endYM)}): no verification letter — treated as gap`); }
  }

  if (s.multiIncome === "yes" && s.multiDuration === "<2y") {
    bump("amber"); needs.push("Newer income stream has <2 years simultaneous history — use only older stream for qualifying");
  }

  const TITLES: Record<VerdictLevel, string> = {
    green: "Clean File",
    amber: "Workable File",
    red: "Complex File",
  };
  const MESSAGES: Record<VerdictLevel, string> = {
    green: "Client meets the 2-year employment history requirement. Proceed with standard qualification.",
    amber: "This file is workable but requires the following before closing:",
    red: "Client does not currently meet the 2-year employment history requirement.",
  };

  return { level, title: TITLES[level], message: MESSAGES[level], needs, earliestEligibleYM: earliest };
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function SectionConnector() {
  return <div style={{ height: "1px", background: "#E8E8E8", margin: "28px 0" }} />;
}

function StepHeader({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
      <span style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#C8202A", color: "#FFFFFF", fontSize: "0.75rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {n}
      </span>
      <div>
        <h3 style={{ fontWeight: 700, color: "#111111", fontSize: "1rem", margin: 0 }}>{title}</h3>
        {hint && <p style={{ fontSize: "0.75rem", color: "#6B6B6B", margin: 0, marginTop: "2px" }}>{hint}</p>}
      </div>
    </div>
  );
}

function SelectionCard({ title, note, selected, onClick, compact = false }: {
  title: string; note?: string; selected: boolean; onClick: () => void; compact?: boolean;
}) {
  return (
    <button onClick={onClick} style={{
      width: "100%", textAlign: "left", padding: compact ? "12px 14px" : "18px 20px",
      borderRadius: "12px", border: selected ? "2px solid #C8202A" : "1.5px solid #E8E8E8",
      background: selected ? "#FFF8F8" : "#FFFFFF", cursor: "pointer",
      transition: "border-color 100ms, background 100ms",
      boxShadow: selected ? "none" : "0 1px 4px rgba(0,0,0,0.04)", minHeight: compact ? "0" : "60px",
    }}>
      <div style={{ fontWeight: 600, fontSize: compact ? "0.8125rem" : "0.9375rem", color: selected ? "#C8202A" : "#111111", lineHeight: 1.3 }}>{title}</div>
      {note && <div style={{ fontSize: "0.75rem", color: "#9B9B9B", marginTop: "4px" }}>{note}</div>}
    </button>
  );
}

function OptionRow({ options, value, onChange, columns = 2 }: {
  options: { value: string; label: string; note?: string }[];
  value: string | null; onChange: (v: string) => void; columns?: number;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: "10px" }}>
      {options.map((o) => (
        <SelectionCard key={o.value} title={o.label} note={o.note} selected={value === o.value} onClick={() => onChange(o.value)} compact />
      ))}
    </div>
  );
}

function Flag({ level, children }: { level: "green" | "amber" | "red"; children: React.ReactNode }) {
  const p = { green: { bg: "#F0FDF4", border: "#22C55E", color: "#166534", icon: "✓" }, amber: { bg: "#FFFBEB", border: "#F59E0B", color: "#92400E", icon: "!" }, red: { bg: "#FFF5F5", border: "#C8202A", color: "#7F1D1D", icon: "✗" } }[level];
  return (
    <div style={{ background: p.bg, borderLeft: `4px solid ${p.border}`, borderRadius: "0 8px 8px 0", padding: "10px 14px", display: "flex", gap: "10px", alignItems: "flex-start", fontSize: "0.8125rem", color: p.color }}>
      <span style={{ fontWeight: 700, flexShrink: 0 }}>{p.icon}</span>
      <div style={{ lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

function TimelineBar({ periods }: { periods: Period[] }) {
  const a = analyzeCoverage(periods);
  const wStart = ymToIndex(a.windowStartYM);
  const cells = Array.from({ length: 24 }, (_, i) => {
    const idx = wStart + i;
    let status: 0 | 1 | 2 = 0;
    for (const p of periods) {
      if (!p.startYM) continue;
      const pStart = ymToIndex(p.startYM);
      const pEnd = ymToIndex(p.endYM === "present" ? a.windowEndYM : p.endYM);
      if (idx >= pStart && idx <= pEnd) {
        const score: 0 | 1 | 2 = p.type === "gap" ? 0 : p.documented === "yes" ? 2 : p.documented === "partial" ? 1 : 0;
        if (score > status) status = score;
      }
    }
    return status === 2 ? "#22C55E" : status === 1 ? "#F59E0B" : "#E8E8E8";
  });
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(24, 1fr)", gap: "2px", height: "26px" }}>
        {cells.map((color, i) => <div key={i} style={{ background: color, borderRadius: "3px" }} />)}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.6875rem", color: "#9B9B9B", marginTop: "6px" }}>
        <span>{ymLabel(a.windowStartYM)}</span><span>{ymLabel(a.windowEndYM)}</span>
      </div>
      <div style={{ display: "flex", gap: "16px", fontSize: "0.75rem", color: "#4B4B4B", marginTop: "10px", flexWrap: "wrap" }}>
        {([ ["#22C55E","Documented"], ["#F59E0B","Partial"], ["#E8E8E8","Gap"] ] as [string,string][]).map(([color, label]) => (
          <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: color }} />{label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: "#6B6B6B", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
      {children}
    </label>
  );
}

function PeriodRow({ period, onChange, onRemove }: { period: Period; onChange: (p: Period) => void; onRemove: () => void }) {
  const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #E8E8E8", fontSize: "0.8125rem", color: "#111111", background: "#FFFFFF" };
  return (
    <div style={{ background: "#FAF8F3", border: "1px solid #E8E8E8", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#C8202A", letterSpacing: "0.1em", textTransform: "uppercase" }}>Period</span>
        <button onClick={onRemove} style={{ background: "transparent", border: "1px solid #E8E8E8", color: "#6B6B6B", padding: "4px 10px", fontSize: "0.75rem", borderRadius: "20px", cursor: "pointer" }}>Remove</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px" }}>
        <Field label="Type">
          <select value={period.type} onChange={(e) => onChange({ ...period, type: e.target.value as PeriodType })} style={inp}>
            <option value="w2">W2</option>
            <option value="se">Self-Employed</option>
            <option value="1099">1099</option>
            <option value="gig">Gig</option>
            <option value="contract">Contract</option>
            <option value="seasonal">Seasonal</option>
            <option value="cash">Cash</option>
            <option value="foreign">Foreign</option>
            <option value="gap">Gap</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Start (month)">
          <input type="month" value={period.startYM} onChange={(e) => onChange({ ...period, startYM: e.target.value })} style={inp} />
        </Field>
        <Field label="End (month)">
          <div style={{ display: "flex", gap: "6px" }}>
            <input type="month" value={period.endYM === "present" ? "" : period.endYM} disabled={period.endYM === "present"} onChange={(e) => onChange({ ...period, endYM: e.target.value })} style={{ ...inp, flex: 1 }} />
            <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", color: "#4B4B4B" }}>
              <input type="checkbox" checked={period.endYM === "present"} onChange={(e) => onChange({ ...period, endYM: e.target.checked ? "present" : todayYM() })} />
              Present
            </label>
          </div>
        </Field>
        <Field label="Industry (optional)">
          <input type="text" placeholder="e.g. Healthcare" value={period.industry} onChange={(e) => onChange({ ...period, industry: e.target.value })} style={inp} />
        </Field>
        <Field label="Documented">
          <select value={period.documented} onChange={(e) => onChange({ ...period, documented: e.target.value as Documented })} style={inp}>
            <option value="yes">Yes</option>
            <option value="partial">Partial</option>
            <option value="no">No</option>
          </select>
        </Field>
      </div>
      {period.type === "cash" && (
        <Field label="Can this cash period be documented?">
          <select value={period.cashDoc || ""} onChange={(e) => onChange({ ...period, cashDoc: e.target.value as CashDoc })} style={inp}>
            <option value="">Select…</option>
            <option value="letter">Employer verification letter</option>
            <option value="amend">Amend taxes</option>
            <option value="cannot">Cannot be documented</option>
          </select>
        </Field>
      )}
      {period.type === "foreign" && (
        <Field label="Verification letter from foreign employer?">
          <select value={period.foreignLetter || ""} onChange={(e) => onChange({ ...period, foreignLetter: e.target.value as YesNo })} style={inp}>
            <option value="">Select…</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </Field>
      )}
    </div>
  );
}

function VerdictCard({ v }: { v: Verdict }) {
  const pal = { green: { bg: "#F0FDF4", border: "#22C55E", label: "Clean File", color: "#166534" }, amber: { bg: "#FFFBEB", border: "#F59E0B", label: "Workable File", color: "#92400E" }, red: { bg: "#FFF5F5", border: "#C8202A", label: "Complex File", color: "#7F1D1D" } }[v.level];
  return (
    <div style={{ background: pal.bg, borderLeft: `6px solid ${pal.border}`, borderRadius: "0 14px 14px 0", padding: "22px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ background: pal.border, color: "#FFFFFF", fontSize: "0.6875rem", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", letterSpacing: "0.1em", textTransform: "uppercase" }}>{pal.label}</span>
        <h3 style={{ margin: 0, fontSize: "1.0625rem", fontWeight: 700, color: "#111111" }}>{v.title}</h3>
      </div>
      <p style={{ margin: 0, fontSize: "0.9375rem", color: "#111111", lineHeight: 1.5 }}>{v.message}</p>
      {v.needs.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
          {v.needs.map((n, i) => <li key={i} style={{ fontSize: "0.875rem", color: pal.color, lineHeight: 1.5 }}>{n}</li>)}
        </ul>
      )}
      {v.earliestEligibleYM && <div style={{ fontSize: "0.875rem", color: pal.color, fontWeight: 600 }}>Earliest eligible: {ymLabel(v.earliestEligibleYM)}</div>}
      {v.level !== "green" && (
        <div style={{ background: "#FFFFFF", border: "1px solid #E8E8E8", borderRadius: "12px", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#C8202A", letterSpacing: "0.12em", textTransform: "uppercase" }}>Referral Option</span>
          <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111" }}>Consider our lending partner for manual underwriting</div>
          <p style={{ fontSize: "0.8125rem", color: "#4B4B4B", margin: 0, lineHeight: 1.5 }}>
            Our lending partner offers manual underwriting for complex employment histories. When a file doesn&apos;t fit the standard 2-year requirement, their team may still be able to move the client forward.
          </p>
        </div>
      )}
    </div>
  );
}

function MultiCheck({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "10px", border: checked ? "2px solid #C8202A" : "1.5px solid #E8E8E8", background: checked ? "#FFF8F8" : "#FFFFFF", cursor: "pointer", fontSize: "0.8125rem", color: checked ? "#C8202A" : "#111111", fontWeight: 600 }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ accentColor: "#C8202A" }} />
      {label}
    </label>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function WorkHistory() {
  const [state, setState] = useState<State>(initialState);
  const coverage = useMemo(() => analyzeCoverage(state.periods), [state.periods]);
  const verdict = useMemo(() => computeVerdict(state), [state]);

  const reset = () => setState(initialState);
  const update = <K extends keyof State>(key: K, value: State[K]) =>
    setState((prev) => ({ ...prev, [key]: value }));

  const selectCurrent = (v: CurrentStatus) =>
    setState((prev) => ({
      ...prev,
      current: prev.current === v ? null : v,
      w2Tenure: null, w2Offer: null, w2Raise: null, w2IncomeChange: null,
      seTaxYears: null, sePrior: null, contractPattern: null, contractActive: null,
      contractExpires: null, noneDuration: null, backOnJobMonths: "",
    }));

  const addPeriod = () => {
    if (state.periods.length >= 6) return;
    const now = todayYM();
    setState((prev) => ({
      ...prev,
      periods: [...prev.periods, { id: Math.random().toString(36).slice(2), type: "w2", startYM: addMonths(now, -6), endYM: "present", industry: "", documented: "yes" }],
    }));
  };

  const updatePeriod = (id: string, next: Period) =>
    setState((prev) => ({ ...prev, periods: prev.periods.map((p) => (p.id === id ? next : p)) }));

  const removePeriod = (id: string) =>
    setState((prev) => ({ ...prev, periods: prev.periods.filter((p) => p.id !== id) }));

  const showStep2 = state.periods.length > 0;
  const showStep3 = state.current !== null;
  // Step 4 only appears after Step 3 is answered — never mid-flow
  const showStep4 = state.multiIncome !== null && coverage.gaps.some((g) => g.months >= 6);
  const showVerdict = state.current !== null && state.multiIncome !== null;

  return (
    <div style={{ background: "#FFFFFF", borderRadius: "16px", border: "1px solid #E8E8E8", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", padding: "32px" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#111111", margin: 0 }}>Work History Assessment</h2>
          <p style={{ fontSize: "0.875rem", color: "#6B6B6B", margin: "4px 0 0" }}>Determine if the client meets the 2-year employment history requirement</p>
        </div>
        {(state.current || state.periods.length > 0) && (
          <button onClick={reset} style={{ padding: "6px 14px", borderRadius: "20px", border: "1px solid #E8E8E8", background: "#FFFFFF", color: "#4B4B4B", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>↺ Start Over</button>
        )}
      </div>
      <p style={{ fontSize: "0.8125rem", color: "#9B9B9B", margin: "0 0 24px", lineHeight: 1.6 }}>
        Start by mapping the full 2-year employment picture, then answer questions about the current position.
      </p>

      {/* ═══ STEP 1 — Timeline ═══ */}
      <StepHeader n={1} title="Employment History — Last 2 Years" hint="Add every job, gap, or income period over the past 24 months" />

      <div style={{ background: "#FAF8F3", borderRadius: "12px", padding: "16px", marginTop: "14px", marginBottom: "14px" }}>
        <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#111111", marginBottom: "10px" }}>
          {coverage.documentedMonths} of 24 months documented
          {coverage.partialMonths > 0 && <span style={{ color: "#92400E", fontWeight: 500 }}> · {coverage.partialMonths} partial</span>}
          {coverage.gaps.length > 0 && <span style={{ color: "#C8202A", fontWeight: 500 }}> · {coverage.gaps.length} gap{coverage.gaps.length > 1 ? "s" : ""} (longest {coverage.longestGap}m)</span>}
          {state.periods.length === 0 && <span style={{ color: "#9B9B9B", fontWeight: 400 }}> · Add periods below to begin</span>}
        </div>
        <TimelineBar periods={state.periods} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {state.periods.map((p) => <PeriodRow key={p.id} period={p} onChange={(np) => updatePeriod(p.id, np)} onRemove={() => removePeriod(p.id)} />)}
        {state.periods.length < 6 && (
          <button onClick={addPeriod} style={{ padding: "12px 16px", borderRadius: "10px", border: "1.5px dashed #C8202A", background: "#FFFFFF", color: "#C8202A", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer" }}>
            + Add employment period
          </button>
        )}
        {state.periods.length >= 6 && <div style={{ fontSize: "0.75rem", color: "#9B9B9B", textAlign: "center" }}>Maximum 6 periods</div>}
      </div>

      {state.periods.length > 0 && coverage.documentedMonths === 24 && (
        <div style={{ marginTop: "12px" }}><Flag level="green">Full 24-month window documented — timeline complete.</Flag></div>
      )}
      {state.periods.length > 0 && coverage.longestGap >= 6 && (
        <div style={{ marginTop: "12px" }}>
          <Flag level="red">
            {coverage.longestGap}-month gap detected. Add another employment period above to cover this window — the goal is a complete, unbroken 24-month history.
          </Flag>
        </div>
      )}
      {state.periods.length > 0 && coverage.longestGap > 0 && coverage.longestGap < 6 && coverage.documentedMonths + coverage.partialMonths < 24 && (
        <div style={{ marginTop: "12px" }}>
          <Flag level="amber">
            {24 - coverage.documentedMonths - coverage.partialMonths} month(s) still uncovered. Add another period to complete the 2-year history.
          </Flag>
        </div>
      )}

      {/* ═══ STEP 2 — Current Employment ═══ */}
      {showStep2 && (
        <>
          <SectionConnector />
          <StepHeader n={2} title="Current Employment Status" hint="What type of income does the client currently have?" />
          <div style={{ marginTop: "14px" }}>
            <OptionRow
              columns={1}
              options={[
                { value: "w2ft",     label: "W2 Full-Time" },
                { value: "w2pt",     label: "W2 Part-Time" },
                { value: "se",       label: "Self-Employed / 1099 / Gig Work" },
                { value: "contract", label: "Contract / Seasonal" },
                { value: "none",     label: "Not Currently Working" },
              ]}
              value={state.current}
              onChange={(v) => selectCurrent(v as CurrentStatus)}
            />
          </div>

          {/* W2 follow-ups */}
          {(state.current === "w2ft" || state.current === "w2pt") && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "16px" }}>
              <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: 0 }}>How long has the client been at their current job?</p>
              <OptionRow columns={3} options={[{ value: "<30d", label: "Less than 30 days" }, { value: "1-6m", label: "1–6 months" }, { value: "6-12m", label: "6–12 months" }, { value: "1-2y", label: "1–2 years" }, { value: "2+y", label: "2+ years" }]} value={state.w2Tenure} onChange={(v) => update("w2Tenure", v as Tenure)} />

              {state.w2Tenure === "<30d" && (
                <>
                  <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: 0 }}>Do they have an offer letter or signed contract?</p>
                  <OptionRow options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]} value={state.w2Offer} onChange={(v) => update("w2Offer", v as YesNo)} />
                  {state.w2Offer === "no" && <Flag level="amber">Need at least one pay stub or offer letter to use this income.</Flag>}
                  {state.w2Offer === "yes" && <Flag level="green">Offer letter acceptable — income can be used.</Flag>}
                </>
              )}

              {state.w2Tenure && (
                <>
                  <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: 0 }}>Did the client receive a raise or promotion recently?</p>
                  <OptionRow options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]} value={state.w2Raise} onChange={(v) => update("w2Raise", v as YesNo)} />
                  {state.w2Raise === "yes" && <Flag level="green">New income level usable immediately.</Flag>}
                </>
              )}

              {state.w2Tenure && state.w2Raise && (
                <>
                  <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: 0 }}>Did income increase or decrease from previous job?</p>
                  <OptionRow columns={2} options={[{ value: "increased", label: "Increased" }, { value: "decreased", label: "Decreased" }, { value: "same", label: "Same" }, { value: "first", label: "First job" }]} value={state.w2IncomeChange} onChange={(v) => update("w2IncomeChange", v as IncomeChange)} />
                  {state.w2IncomeChange === "decreased" && <Flag level="amber">Must use the new lower income for qualification — prior higher income cannot be averaged in.</Flag>}
                </>
              )}
            </div>
          )}

          {/* SE follow-ups */}
          {state.current === "se" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "16px" }}>
              <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: 0 }}>How many years of tax returns does the client have for this income?</p>
              <OptionRow columns={3} options={[{ value: "<1", label: "Less than 1 year" }, { value: "1", label: "1 year" }, { value: "2+", label: "2+ years" }]} value={state.seTaxYears} onChange={(v) => update("seTaxYears", v as TaxYears)} />
              {state.seTaxYears === "<1" && <Flag level="red">Cannot use SE income yet. At least 1 year of filed taxes required.</Flag>}
              {state.seTaxYears === "1" && <Flag level="amber">One year may be acceptable if prior W2 was in the same industry. If industry differs, 2 full years required.</Flag>}
              {state.seTaxYears === "2+" && <Flag level="green">Two-year average of Schedule C Line 31 net income can be used for qualifying.</Flag>}

              <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: 0 }}>What was the client doing before self-employment?</p>
              <OptionRow columns={2} options={[{ value: "w2-same", label: "W2 — same industry" }, { value: "w2-diff", label: "W2 — different industry" }, { value: "se", label: "Also self-employed" }, { value: "gap", label: "Gap" }, { value: "none", label: "Nothing prior (new to workforce)" }]} value={state.sePrior} onChange={(v) => update("sePrior", v as PreSE)} />
            </div>
          )}

          {/* Contract follow-ups */}
          {state.current === "contract" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "16px" }}>
              <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: 0 }}>Does the client have 2 years of the same seasonal or contract pattern documented?</p>
              <OptionRow options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]} value={state.contractPattern} onChange={(v) => update("contractPattern", v as YesNo)} />
              {state.contractPattern === "no" && <Flag level="amber">Need 2 years of documented pattern before seasonal income can be used.</Flag>}
              {state.contractPattern === "yes" && <Flag level="green">Established seasonal pattern — income usable.</Flag>}

              <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: 0 }}>Is the client currently on an active contract?</p>
              <OptionRow options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]} value={state.contractActive} onChange={(v) => update("contractActive", v as ContractActive)} />
              {state.contractActive === "yes" && (
                <>
                  <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: 0 }}>Does the contract expire before or at the expected closing date?</p>
                  <OptionRow options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]} value={state.contractExpires} onChange={(v) => update("contractExpires", v as YesNo)} />
                  {state.contractExpires === "yes" && <Flag level="red">Hard stop — must have renewal or new contract before proceeding.</Flag>}
                  {state.contractExpires === "no" && <Flag level="green">Contract extends past closing — no issue.</Flag>}
                </>
              )}
              {state.contractActive === "no" && <Flag level="amber">Between contracts. Short gaps are acceptable if pattern is consistent. Confirm next start date.</Flag>}
            </div>
          )}

          {/* Not Working follow-ups */}
          {state.current === "none" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "16px" }}>
              <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: 0 }}>How long has the client been without work?</p>
              <OptionRow columns={3} options={[{ value: "<30d", label: "Less than 30 days" }, { value: "1-6m", label: "1–6 months" }, { value: "6+m", label: "6+ months" }]} value={state.noneDuration} onChange={(v) => update("noneDuration", v as NoneDuration)} />
              {state.noneDuration === "<30d" && <Flag level="amber">Short break — acceptable. Confirm new employment start date.</Flag>}
              {state.noneDuration === "1-6m" && <Flag level="amber">Gap in progress. If back 4+ months, can start process now and close after the 6th month back.</Flag>}
              {state.noneDuration === "6+m" && (
                <>
                  <Flag level="red">Gap of 6+ months. Client must be back on the job 6 full months before qualifying.</Flag>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                    <label style={{ fontSize: "0.8125rem", color: "#111111", fontWeight: 600 }}>How long have they been back (months)?</label>
                    <input type="number" min="0" value={state.backOnJobMonths} onChange={(e) => update("backOnJobMonths", e.target.value)} style={{ width: "80px", padding: "8px 10px", borderRadius: "8px", border: "1px solid #E8E8E8", fontSize: "0.8125rem" }} />
                  </div>
                  {state.backOnJobMonths !== "" && Number(state.backOnJobMonths) >= 6 && <Flag level="green">Clear to proceed — 6+ months back on the job.</Flag>}
                  {state.backOnJobMonths !== "" && Number(state.backOnJobMonths) < 6 && (
                    <Flag level="red">Earliest eligible to close: <strong>{ymLabel(addMonths(todayYM(), Math.max(0, 6 - Number(state.backOnJobMonths))))}</strong></Flag>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* ═══ STEP 3 — Income Combinations ═══ */}
      {showStep3 && (
        <>
          <SectionConnector />
          <StepHeader n={3} title="Income Type Combinations" hint="Does the client have more than one income source?" />
          <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <OptionRow options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]} value={state.multiIncome} onChange={(v) => update("multiIncome", v as YesNo)} />
            {state.multiIncome === "yes" && (
              <>
                <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: 0 }}>What combination? (select all that apply)</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "10px" }}>
                  <MultiCheck label="Two W2 jobs simultaneously"      checked={state.multiTwoW2}   onChange={(v) => update("multiTwoW2", v)} />
                  <MultiCheck label="W2 + self-employment / 1099"     checked={state.multiW2SE}    onChange={(v) => update("multiW2SE", v)} />
                  <MultiCheck label="W2 + gig income"                 checked={state.multiW2Gig}   onChange={(v) => update("multiW2Gig", v)} />
                  <MultiCheck label="Multiple self-employment streams" checked={state.multiMultiSE} onChange={(v) => update("multiMultiSE", v)} />
                </div>
                <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: 0 }}>How long has the client been doing both simultaneously?</p>
                <OptionRow options={[{ value: "<2y", label: "Less than 2 years" }, { value: "2+y", label: "2+ years" }]} value={state.multiDuration} onChange={(v) => update("multiDuration", v as MultiDuration)} />
                {state.multiDuration === "<2y" && <Flag level="amber">Cannot use the newer income stream yet. Use only the stream with 2+ year history.</Flag>}
                {state.multiDuration === "2+y" && <Flag level="green">Both income streams can be used for qualifying.</Flag>}
              </>
            )}
          </div>
        </>
      )}

      {/* ═══ STEP 4 — Gap Resolution ═══ */}
      {showStep4 && (
        <>
          <SectionConnector />
          <StepHeader n={4} title="Gap Resolution" hint="Unresolved gaps of 6+ months will block qualification — scroll up to Step 1 and fill them in" />
          <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <Flag level="red">
              The goal is a complete, unbroken 2-year employment history. Every gap below needs to be covered before this file can move forward. Go back to Step 1 and add the missing period — W2, self-employed, gig, or seasonal — that covers the window.
            </Flag>
            {coverage.gaps.filter((g) => g.months >= 6).map((g, i) => (
              <div key={i} style={{ background: "#FFF5F5", border: "1px solid #FECACA", borderRadius: "10px", padding: "14px 16px" }}>
                <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "#7F1D1D", marginBottom: "10px" }}>
                  Gap: {ymLabel(g.startYM)} – {ymLabel(g.endYM)} ({g.months} months)
                </div>
                <div style={{ fontSize: "0.8125rem", color: "#111111", fontWeight: 600, marginBottom: "6px" }}>
                  Was the client working during this time?
                </div>
                <ul style={{ margin: 0, paddingLeft: "20px", color: "#4B4B4B", fontSize: "0.8125rem", lineHeight: 1.8 }}>
                  <li><strong>W2, self-employed, gig, or contract</strong> — go to Step 1 and add that employment period. This is the primary resolution.</li>
                  <li><strong>Paid cash / off the books</strong> — obtain a written employer verification letter, or amend prior year taxes to include the income. Either makes the period documentable.</li>
                  <li><strong>Truly not working</strong> — client does not currently qualify. Must return to work and maintain continuous employment for 6 months before the file can move forward.</li>
                </ul>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ═══ STEP 5 — Verdict ═══ */}
      {showVerdict && (
        <>
          <SectionConnector />
          <StepHeader n={5} title="Verdict" />
          <div style={{ marginTop: "14px" }}>
            <VerdictCard v={verdict} />
          </div>
        </>
      )}
    </div>
  );
}
