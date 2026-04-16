"use client";

import React, { useMemo, useState } from "react";

/* =============================================================================
   Work History Assessment
   ─────────────────────────────────────────────────────────────────────────────
   Single-page expanding flow that determines whether a client has sufficient
   verifiable employment history to qualify for a mortgage. Verdict at the end:
   Clean File (green) / Workable File (amber) / Complex File (red).
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
  | "w2"
  | "se"
  | "1099"
  | "gig"
  | "contract"
  | "seasonal"
  | "cash"
  | "foreign"
  | "gap"
  | "other";

type Documented = "yes" | "no" | "partial";

type CashDoc = "letter" | "amend" | "cannot";

type Period = {
  id: string;
  type: PeriodType;
  startYM: string; // "YYYY-MM"
  endYM: string | "present";
  industry: string;
  documented: Documented;
  cashDoc?: CashDoc;
  foreignLetter?: YesNo;
};

type State = {
  // Step 1
  current: CurrentStatus | null;
  // W2 branch
  w2Tenure: Tenure | null;
  w2Offer: YesNo | null;
  w2Raise: YesNo | null;
  w2IncomeChange: IncomeChange | null;
  // Self-Employed branch
  seTaxYears: TaxYears | null;
  sePrior: PreSE | null;
  // Contract branch
  contractPattern: YesNo | null;
  contractActive: ContractActive | null;
  contractExpires: YesNo | null;
  // Not Working branch
  noneDuration: NoneDuration | null;
  backOnJobMonths: string; // allow input
  // Step 2
  periods: Period[];
  // Step 3
  multiIncome: YesNo | null;
  multiTwoW2: boolean;
  multiW2SE: boolean;
  multiW2Gig: boolean;
  multiMultiSE: boolean;
  multiDuration: MultiDuration | null;
};

const initialState: State = {
  current: null,
  w2Tenure: null,
  w2Offer: null,
  w2Raise: null,
  w2IncomeChange: null,
  seTaxYears: null,
  sePrior: null,
  contractPattern: null,
  contractActive: null,
  contractExpires: null,
  noneDuration: null,
  backOnJobMonths: "",
  periods: [],
  multiIncome: null,
  multiTwoW2: false,
  multiW2SE: false,
  multiW2Gig: false,
  multiMultiSE: false,
  multiDuration: null,
};

// ─── Date helpers (YYYY-MM arithmetic) ────────────────────────────────────────

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
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[Number(m) - 1]} ${y}`;
}

function addMonths(ym: string, n: number): string {
  return indexToYM(ymToIndex(ym) + n);
}

// ─── Gap + coverage analysis over the 2-year window ───────────────────────────

type Gap = { startYM: string; endYM: string; months: number };

function analyzeCoverage(periods: Period[]): {
  documentedMonths: number;
  partialMonths: number;
  gaps: Gap[];
  longestGap: number;
  windowStartYM: string;
  windowEndYM: string;
} {
  const windowEnd = todayYM();
  const windowStart = addMonths(windowEnd, -23); // 24-month window inclusive
  const wStart = ymToIndex(windowStart);
  const wEnd = ymToIndex(windowEnd);

  // Paint a 24-slot array. 0 = no coverage, 1 = partial, 2 = full doc.
  const slots: number[] = new Array(24).fill(0);

  for (const p of periods) {
    if (!p.startYM) continue;
    const sIdx = Math.max(ymToIndex(p.startYM), wStart);
    const eIdx = Math.min(
      ymToIndex(p.endYM === "present" ? windowEnd : p.endYM),
      wEnd
    );
    if (eIdx < wStart || sIdx > wEnd) continue;
    const score =
      p.type === "gap"
        ? 0
        : p.documented === "yes"
        ? 2
        : p.documented === "partial"
        ? 1
        : 0;
    for (let i = sIdx; i <= eIdx; i++) {
      if (score > slots[i - wStart]) slots[i - wStart] = score;
    }
  }

  const documentedMonths = slots.filter((s) => s === 2).length;
  const partialMonths = slots.filter((s) => s === 1).length;

  // Detect gap runs (score 0) of length >= 1
  const gaps: Gap[] = [];
  let runStart = -1;
  for (let i = 0; i <= slots.length; i++) {
    const inGap = i < slots.length && slots[i] === 0;
    if (inGap && runStart === -1) runStart = i;
    if (!inGap && runStart !== -1) {
      const gapStart = indexToYM(wStart + runStart);
      const gapEnd = indexToYM(wStart + i - 1);
      gaps.push({ startYM: gapStart, endYM: gapEnd, months: i - runStart });
      runStart = -1;
    }
  }
  const longestGap = gaps.reduce((m, g) => Math.max(m, g.months), 0);
  return {
    documentedMonths,
    partialMonths,
    gaps,
    longestGap,
    windowStartYM: windowStart,
    windowEndYM: windowEnd,
  };
}

// ─── Verdict ──────────────────────────────────────────────────────────────────

type VerdictLevel = "green" | "amber" | "red";
type Verdict = {
  level: VerdictLevel;
  title: string;
  message: string;
  needs: string[];
  earliestEligibleYM?: string;
};

function computeVerdict(s: State): Verdict {
  const needs: string[] = [];
  let level: VerdictLevel = "green";
  let title = "Clean File";
  let message =
    "Client meets the 2-year employment history requirement. Proceed with standard qualification.";
  let earliest: string | undefined;

  const bump = (next: VerdictLevel) => {
    const rank: Record<VerdictLevel, number> = { green: 0, amber: 1, red: 2 };
    if (rank[next] > rank[level]) level = next;
  };

  // Step 1 flags
  if (s.current === "w2ft" || s.current === "w2pt") {
    if (s.w2Tenure === "<30d" && s.w2Offer === "no") {
      bump("amber");
      needs.push("Offer letter or first pay stub before closing");
    }
    if (s.w2IncomeChange === "decreased") {
      needs.push("Qualify on new (lower) income — prior income cannot be averaged");
    }
  }
  if (s.current === "se") {
    if (s.seTaxYears === "<1") {
      bump("red");
      needs.push("At least 1 year of filed taxes before self-employment income can be used");
    } else if (s.seTaxYears === "1") {
      bump("amber");
      if (s.sePrior === "w2-diff") {
        bump("red");
        needs.push("Two full years of self-employment taxes — prior W2 industry differs");
      } else {
        needs.push("Gray-area underwrite — verify prior W2 industry matches current self-employment");
      }
    }
  }
  if (s.current === "contract") {
    if (s.contractPattern === "no") {
      bump("amber");
      needs.push("2 years of documented seasonal/contract pattern");
    }
    if (s.contractActive === "yes" && s.contractExpires === "yes") {
      bump("red");
      needs.push("Contract renewal or new contract must be in hand before closing");
    }
    if (s.contractActive === "no") {
      bump("amber");
      needs.push("Confirm next contract start date (short between-contract gaps acceptable)");
    }
  }
  if (s.current === "none") {
    if (s.noneDuration === "1-6m") {
      bump("amber");
      needs.push("Must be back on the job 6 full months before closing");
    }
    if (s.noneDuration === "6+m") {
      const monthsBack = Number(s.backOnJobMonths || 0);
      if (monthsBack >= 6) {
        // clear to proceed
      } else {
        bump("red");
        const remaining = Math.max(0, 6 - monthsBack);
        earliest = addMonths(todayYM(), remaining);
        needs.push(`Client must be continuously employed 6 months — eligible ${ymLabel(earliest)}`);
      }
    }
  }

  // Step 2 — timeline gaps
  const a = analyzeCoverage(s.periods);
  if (s.periods.length > 0) {
    if (a.longestGap >= 6) {
      bump("red");
      needs.push(`${a.longestGap}-month undocumented gap must be closed (prior employment, employer letter, or amended taxes)`);
    } else if (a.documentedMonths + a.partialMonths < 24 && s.periods.length > 0) {
      bump("amber");
      if (a.partialMonths > 0) needs.push(`${a.partialMonths} month(s) of partial documentation — firm up records before closing`);
      if (24 - a.documentedMonths - a.partialMonths > 0) {
        needs.push(`${24 - a.documentedMonths - a.partialMonths} month(s) still uncovered in the 2-year window`);
      }
    }
  }

  // Per-period flags
  for (const p of s.periods) {
    if (p.type === "cash") {
      if (p.cashDoc === "letter" || p.cashDoc === "amend") {
        bump("amber");
        needs.push(
          `Cash period (${ymLabel(p.startYM)}–${ymLabel(p.endYM)}): ${p.cashDoc === "letter" ? "obtain employer verification letter" : "amend taxes"} before closing`
        );
      }
      if (p.cashDoc === "cannot") {
        bump("red");
        needs.push(`Cash period (${ymLabel(p.startYM)}–${ymLabel(p.endYM)}) cannot be documented — treated as gap`);
      }
    }
    if (p.type === "foreign" && p.foreignLetter === "no") {
      bump("red");
      needs.push(`Foreign employment (${ymLabel(p.startYM)}–${ymLabel(p.endYM)}): no verification letter — treated as gap`);
    }
  }

  // Step 3 — multiple income
  if (s.multiIncome === "yes" && s.multiDuration === "<2y") {
    bump("amber");
    needs.push("Second income stream has <2 years simultaneous history — use only the older stream for qualifying");
  }

  const finalLevel = level as VerdictLevel;
  if (finalLevel === "amber") {
    title = "Workable File";
    message = "This file is workable but requires the following before closing:";
  } else if (finalLevel === "red") {
    title = "Complex File";
    message = "Client does not currently meet the 2-year employment history requirement.";
  }

  return { level: finalLevel, title, message, needs, earliestEligibleYM: earliest };
}

// ─── Small UI primitives ──────────────────────────────────────────────────────

function SectionConnector() {
  return <div style={{ height: "1px", background: "#E8E8E8", margin: "24px 0" }} />;
}

function StepHeader({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
      <span
        style={{
          width: "28px",
          height: "28px",
          borderRadius: "50%",
          background: "#C8202A",
          color: "#FFFFFF",
          fontSize: "0.75rem",
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {n}
      </span>
      <div>
        <h3 style={{ fontWeight: 700, color: "#111111", fontSize: "1rem", margin: 0 }}>{title}</h3>
        {hint && <p style={{ fontSize: "0.75rem", color: "#6B6B6B", margin: 0, marginTop: "2px" }}>{hint}</p>}
      </div>
    </div>
  );
}

function SelectionCard({
  title,
  note,
  selected,
  onClick,
  compact = false,
}: {
  title: string;
  note?: string;
  selected: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        padding: compact ? "12px 14px" : "18px 20px",
        borderRadius: "12px",
        border: selected ? "2px solid #C8202A" : "1.5px solid #E8E8E8",
        background: selected ? "#FFF8F8" : "#FFFFFF",
        cursor: "pointer",
        transition: "border-color 100ms, background 100ms, box-shadow 100ms",
        boxShadow: selected ? "none" : "0 1px 4px rgba(0,0,0,0.04)",
        minHeight: compact ? "0" : "60px",
      }}
    >
      <div style={{ fontWeight: 600, fontSize: compact ? "0.8125rem" : "0.9375rem", color: selected ? "#C8202A" : "#111111", lineHeight: 1.3 }}>
        {title}
      </div>
      {note && <div style={{ fontSize: "0.75rem", color: "#9B9B9B", marginTop: "4px" }}>{note}</div>}
    </button>
  );
}

function OptionRow({
  options,
  value,
  onChange,
  columns = 2,
}: {
  options: { value: string; label: string; note?: string }[];
  value: string | null;
  onChange: (v: string) => void;
  columns?: number;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: "10px" }}>
      {options.map((o) => (
        <SelectionCard
          key={o.value}
          title={o.label}
          note={o.note}
          selected={value === o.value}
          onClick={() => onChange(o.value)}
          compact
        />
      ))}
    </div>
  );
}

function Flag({
  level,
  children,
}: {
  level: "green" | "amber" | "red";
  children: React.ReactNode;
}) {
  const palette = {
    green: { bg: "#F0FDF4", border: "#22C55E", color: "#166534", icon: "✓" },
    amber: { bg: "#FFFBEB", border: "#F59E0B", color: "#92400E", icon: "!" },
    red: { bg: "#FFF5F5", border: "#C8202A", color: "#7F1D1D", icon: "✗" },
  }[level];
  return (
    <div
      style={{
        background: palette.bg,
        borderLeft: `4px solid ${palette.border}`,
        borderRadius: "0 8px 8px 0",
        padding: "10px 14px",
        display: "flex",
        gap: "10px",
        alignItems: "flex-start",
        fontSize: "0.8125rem",
        color: palette.color,
      }}
    >
      <span style={{ fontWeight: 700, flexShrink: 0 }}>{palette.icon}</span>
      <div style={{ lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

// ─── Timeline bar ─────────────────────────────────────────────────────────────

function TimelineBar({ periods }: { periods: Period[] }) {
  const a = analyzeCoverage(periods);
  const wStart = ymToIndex(a.windowStartYM);

  const cells: { color: string }[] = [];
  for (let i = 0; i < 24; i++) {
    const idx = wStart + i;
    // Determine status from periods
    let status: 0 | 1 | 2 = 0;
    for (const p of periods) {
      if (!p.startYM) continue;
      const pStart = ymToIndex(p.startYM);
      const pEnd = ymToIndex(p.endYM === "present" ? a.windowEndYM : p.endYM);
      if (idx >= pStart && idx <= pEnd) {
        const score: 0 | 1 | 2 =
          p.type === "gap"
            ? 0
            : p.documented === "yes"
            ? 2
            : p.documented === "partial"
            ? 1
            : 0;
        if (score > status) status = score;
      }
    }
    const color = status === 2 ? "#22C55E" : status === 1 ? "#F59E0B" : "#E8E8E8";
    cells.push({ color });
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(24, 1fr)", gap: "2px", height: "26px" }}>
        {cells.map((c, i) => (
          <div key={i} style={{ background: c.color, borderRadius: "3px" }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.6875rem", color: "#9B9B9B", marginTop: "6px" }}>
        <span>{ymLabel(a.windowStartYM)}</span>
        <span>{ymLabel(a.windowEndYM)}</span>
      </div>
      <div style={{ display: "flex", gap: "16px", fontSize: "0.75rem", color: "#4B4B4B", marginTop: "10px", flexWrap: "wrap" }}>
        <LegendDot color="#22C55E" label="Documented" />
        <LegendDot color="#F59E0B" label="Partial" />
        <LegendDot color="#E8E8E8" label="Gap" />
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
      <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: color }} />
      {label}
    </span>
  );
}

// ─── Period editor row ────────────────────────────────────────────────────────

function PeriodRow({
  period,
  onChange,
  onRemove,
}: {
  period: Period;
  onChange: (p: Period) => void;
  onRemove: () => void;
}) {
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: "8px",
    border: "1px solid #E8E8E8",
    fontSize: "0.8125rem",
    color: "#111111",
    background: "#FFFFFF",
  };
  return (
    <div style={{ background: "#FAF8F3", border: "1px solid #E8E8E8", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#C8202A", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Period
        </span>
        <button
          onClick={onRemove}
          style={{
            background: "transparent",
            border: "1px solid #E8E8E8",
            color: "#6B6B6B",
            padding: "4px 10px",
            fontSize: "0.75rem",
            borderRadius: "20px",
            cursor: "pointer",
          }}
        >
          Remove
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px" }}>
        <Field label="Type">
          <select
            value={period.type}
            onChange={(e) => onChange({ ...period, type: e.target.value as PeriodType })}
            style={inputStyle}
          >
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
          <input
            type="month"
            value={period.startYM}
            onChange={(e) => onChange({ ...period, startYM: e.target.value })}
            style={inputStyle}
          />
        </Field>

        <Field label="End (month)">
          <div style={{ display: "flex", gap: "6px" }}>
            <input
              type="month"
              value={period.endYM === "present" ? "" : period.endYM}
              disabled={period.endYM === "present"}
              onChange={(e) => onChange({ ...period, endYM: e.target.value })}
              style={{ ...inputStyle, flex: 1 }}
            />
            <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", color: "#4B4B4B" }}>
              <input
                type="checkbox"
                checked={period.endYM === "present"}
                onChange={(e) => onChange({ ...period, endYM: e.target.checked ? "present" : todayYM() })}
              />
              Present
            </label>
          </div>
        </Field>

        <Field label="Industry (optional)">
          <input
            type="text"
            placeholder="e.g. Healthcare"
            value={period.industry}
            onChange={(e) => onChange({ ...period, industry: e.target.value })}
            style={inputStyle}
          />
        </Field>

        <Field label="Documented">
          <select
            value={period.documented}
            onChange={(e) => onChange({ ...period, documented: e.target.value as Documented })}
            style={inputStyle}
          >
            <option value="yes">Yes</option>
            <option value="partial">Partial</option>
            <option value="no">No</option>
          </select>
        </Field>
      </div>

      {period.type === "cash" && (
        <Field label="Can this be documented?">
          <select
            value={period.cashDoc || ""}
            onChange={(e) => onChange({ ...period, cashDoc: e.target.value as CashDoc })}
            style={inputStyle}
          >
            <option value="">Select…</option>
            <option value="letter">Employer verification letter</option>
            <option value="amend">Amend taxes</option>
            <option value="cannot">Cannot be documented</option>
          </select>
        </Field>
      )}

      {period.type === "foreign" && (
        <Field label="Verification letter from foreign employer?">
          <select
            value={period.foreignLetter || ""}
            onChange={(e) => onChange({ ...period, foreignLetter: e.target.value as YesNo })}
            style={inputStyle}
          >
            <option value="">Select…</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </Field>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: "#6B6B6B", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

// ─── Verdict card + CCM referral ──────────────────────────────────────────────

function VerdictCard({ v }: { v: Verdict }) {
  const palette = {
    green: { bg: "#F0FDF4", border: "#22C55E", label: "Clean File", color: "#166534" },
    amber: { bg: "#FFFBEB", border: "#F59E0B", label: "Workable File", color: "#92400E" },
    red: { bg: "#FFF5F5", border: "#C8202A", label: "Complex File", color: "#7F1D1D" },
  }[v.level];

  return (
    <div
      style={{
        background: palette.bg,
        borderLeft: `6px solid ${palette.border}`,
        borderRadius: "0 14px 14px 0",
        padding: "22px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span
          style={{
            background: palette.border,
            color: "#FFFFFF",
            fontSize: "0.6875rem",
            fontWeight: 700,
            padding: "3px 10px",
            borderRadius: "20px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {palette.label}
        </span>
        <h3 style={{ margin: 0, fontSize: "1.0625rem", fontWeight: 700, color: "#111111" }}>{v.title}</h3>
      </div>
      <p style={{ margin: 0, fontSize: "0.9375rem", color: "#111111", lineHeight: 1.5 }}>{v.message}</p>
      {v.needs.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
          {v.needs.map((n, i) => (
            <li key={i} style={{ fontSize: "0.875rem", color: palette.color, lineHeight: 1.5 }}>
              {n}
            </li>
          ))}
        </ul>
      )}
      {v.earliestEligibleYM && (
        <div style={{ fontSize: "0.875rem", color: palette.color, fontWeight: 600 }}>
          Earliest eligible: {ymLabel(v.earliestEligibleYM)}
        </div>
      )}
      {v.level !== "green" && <CrossCountryCard />}
    </div>
  );
}

function CrossCountryCard() {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E8E8E8",
        borderRadius: "12px",
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
      }}
    >
      <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#C8202A", letterSpacing: "0.12em", textTransform: "uppercase" }}>
        Referral Option
      </span>
      <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111" }}>
        Consider Cross Country Mortgage for manual underwriting
      </div>
      <p style={{ fontSize: "0.8125rem", color: "#4B4B4B", margin: 0, lineHeight: 1.5 }}>
        Cross Country Mortgage offers manual underwriting for complex employment histories. When a file
        doesn&apos;t fit the standard 2-year requirement, their team may still be able to move the client forward.
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WorkHistory() {
  const [state, setState] = useState<State>(initialState);
  const coverage = useMemo(() => analyzeCoverage(state.periods), [state.periods]);
  const verdict = useMemo(() => computeVerdict(state), [state]);

  const reset = () => setState(initialState);

  const update = <K extends keyof State>(key: K, value: State[K]) =>
    setState((prev) => ({ ...prev, [key]: value }));

  const selectCurrent = (v: CurrentStatus) => {
    setState((prev) =>
      prev.current === v
        ? { ...initialState, periods: prev.periods } // preserve timeline if toggled off
        : {
            ...prev,
            current: v,
            // Reset branch answers when status changes
            w2Tenure: null,
            w2Offer: null,
            w2Raise: null,
            w2IncomeChange: null,
            seTaxYears: null,
            sePrior: null,
            contractPattern: null,
            contractActive: null,
            contractExpires: null,
            noneDuration: null,
            backOnJobMonths: "",
          }
    );
  };

  const addPeriod = () => {
    if (state.periods.length >= 6) return;
    const now = todayYM();
    setState((prev) => ({
      ...prev,
      periods: [
        ...prev.periods,
        {
          id: Math.random().toString(36).slice(2),
          type: "w2",
          startYM: addMonths(now, -6),
          endYM: "present",
          industry: "",
          documented: "yes",
        },
      ],
    }));
  };

  const updatePeriod = (id: string, next: Period) =>
    setState((prev) => ({
      ...prev,
      periods: prev.periods.map((p) => (p.id === id ? next : p)),
    }));

  const removePeriod = (id: string) =>
    setState((prev) => ({ ...prev, periods: prev.periods.filter((p) => p.id !== id) }));

  const showStep2 = state.current !== null;
  const showStep3 = state.current !== null;
  const showStep4 = state.periods.length > 0 && coverage.gaps.some((g) => g.months >= 6);
  const showVerdict = state.current !== null;

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: "16px",
        border: "1px solid #E8E8E8",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        padding: "32px",
      }}
    >
      {/* Intro */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#111111", margin: 0 }}>Work History Assessment</h2>
          <p style={{ fontSize: "0.875rem", color: "#6B6B6B", margin: "4px 0 0" }}>
            Determine if the client meets the 2-year employment history requirement
          </p>
        </div>
        {(state.current || state.periods.length > 0) && (
          <button
            onClick={reset}
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              border: "1px solid #E8E8E8",
              background: "#FFFFFF",
              color: "#4B4B4B",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ↺ Start Over
          </button>
        )}
      </div>
      <p style={{ fontSize: "0.8125rem", color: "#9B9B9B", margin: "0 0 24px", lineHeight: 1.6 }}>
        Answer each question as accurately as possible. The app will map the client&apos;s history and flag any qualifying issues.
      </p>

      {/* ═════ STEP 1 ═════ */}
      <StepHeader n={1} title="Current Employment Status" hint="What is the client's current employment situation?" />
      <div style={{ marginTop: "14px" }}>
        <OptionRow
          columns={1}
          options={[
            { value: "w2ft", label: "W2 Full-Time" },
            { value: "w2pt", label: "W2 Part-Time" },
            { value: "se", label: "Self-Employed / 1099 / Gig Work" },
            { value: "contract", label: "Contract / Seasonal" },
            { value: "none", label: "Not Currently Working" },
          ]}
          value={state.current}
          onChange={(v) => selectCurrent(v as CurrentStatus)}
        />
      </div>

      {/* W2 follow-ups */}
      {(state.current === "w2ft" || state.current === "w2pt") && (
        <>
          <SectionConnector />
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: 0 }}>
              How long has the client been at their current job?
            </p>
            <OptionRow
              columns={3}
              options={[
                { value: "<30d", label: "Less than 30 days" },
                { value: "1-6m", label: "1–6 months" },
                { value: "6-12m", label: "6–12 months" },
                { value: "1-2y", label: "1–2 years" },
                { value: "2+y", label: "2+ years" },
              ]}
              value={state.w2Tenure}
              onChange={(v) => update("w2Tenure", v as Tenure)}
            />

            {state.w2Tenure === "<30d" && (
              <>
                <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: 0 }}>
                  Do they have an offer letter or signed contract?
                </p>
                <OptionRow
                  options={[
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" },
                  ]}
                  value={state.w2Offer}
                  onChange={(v) => update("w2Offer", v as YesNo)}
                />
                {state.w2Offer === "no" && (
                  <Flag level="amber">Need at least one pay stub or offer letter to use this income.</Flag>
                )}
                {state.w2Offer === "yes" && (
                  <Flag level="green">Offer letter is acceptable — income can be used.</Flag>
                )}
              </>
            )}

            {state.w2Tenure && (
              <>
                <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: 0 }}>
                  Did the client receive a raise or promotion recently?
                </p>
                <OptionRow
                  options={[
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" },
                  ]}
                  value={state.w2Raise}
                  onChange={(v) => update("w2Raise", v as YesNo)}
                />
                {state.w2Raise === "yes" && <Flag level="green">New income level usable immediately.</Flag>}
              </>
            )}

            {state.w2Tenure && state.w2Raise && (
              <>
                <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: 0 }}>
                  Did income increase or decrease from previous job?
                </p>
                <OptionRow
                  columns={2}
                  options={[
                    { value: "increased", label: "Increased" },
                    { value: "decreased", label: "Decreased" },
                    { value: "same", label: "Same" },
                    { value: "first", label: "First job" },
                  ]}
                  value={state.w2IncomeChange}
                  onChange={(v) => update("w2IncomeChange", v as IncomeChange)}
                />
                {state.w2IncomeChange === "decreased" && (
                  <Flag level="amber">
                    Must use the new lower income for qualification — prior higher income cannot be averaged in.
                  </Flag>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Self-Employed follow-ups */}
      {state.current === "se" && (
        <>
          <SectionConnector />
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: 0 }}>
              How many years of tax returns does the client have for this income?
            </p>
            <OptionRow
              columns={3}
              options={[
                { value: "<1", label: "Less than 1 year" },
                { value: "1", label: "1 year" },
                { value: "2+", label: "2+ years" },
              ]}
              value={state.seTaxYears}
              onChange={(v) => update("seTaxYears", v as TaxYears)}
            />
            {state.seTaxYears === "<1" && (
              <Flag level="red">
                Cannot use self-employment income for qualifying yet. Must have at least 1 year of filed
                taxes. If client has prior W2 history in same industry, 1 year may be acceptable — agent
                discretion.
              </Flag>
            )}
            {state.seTaxYears === "1" && (
              <Flag level="amber">
                One year of self-employment taxes may be acceptable if prior W2 was in same or similar
                industry. If industry is completely different, 2 full years are required.
              </Flag>
            )}
            {state.seTaxYears === "2+" && (
              <Flag level="green">
                Two-year average of Schedule C Line 31 net income can be used for qualifying.
              </Flag>
            )}

            <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: 0 }}>
              What was the client doing before self-employment?
            </p>
            <OptionRow
              columns={2}
              options={[
                { value: "w2-same", label: "W2 — same industry" },
                { value: "w2-diff", label: "W2 — different industry" },
                { value: "se", label: "Also self-employed" },
                { value: "gap", label: "Gap" },
                { value: "none", label: "Nothing prior (new to workforce)" },
              ]}
              value={state.sePrior}
              onChange={(v) => update("sePrior", v as PreSE)}
            />
          </div>
        </>
      )}

      {/* Contract / Seasonal follow-ups */}
      {state.current === "contract" && (
        <>
          <SectionConnector />
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: 0 }}>
              Does the client have 2 years of the same seasonal or contract pattern documented?
            </p>
            <OptionRow
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
              value={state.contractPattern}
              onChange={(v) => update("contractPattern", v as YesNo)}
            />
            {state.contractPattern === "no" && (
              <Flag level="amber">
                Need 2 years of documented pattern before seasonal income can be used for qualifying.
              </Flag>
            )}
            {state.contractPattern === "yes" && (
              <Flag level="green">
                Established seasonal pattern — income usable. Teachers and similar guaranteed seasonal roles
                qualify immediately.
              </Flag>
            )}

            <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: 0 }}>
              Is the client currently on an active contract?
            </p>
            <OptionRow
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
              value={state.contractActive}
              onChange={(v) => update("contractActive", v as ContractActive)}
            />

            {state.contractActive === "yes" && (
              <>
                <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: 0 }}>
                  Does the contract expire before or at the expected closing date?
                </p>
                <OptionRow
                  options={[
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" },
                  ]}
                  value={state.contractExpires}
                  onChange={(v) => update("contractExpires", v as YesNo)}
                />
                {state.contractExpires === "yes" && (
                  <Flag level="red">
                    Hard stop — lender cannot close if contract expires before closing. Client must have a
                    renewal or new contract in hand before proceeding.
                  </Flag>
                )}
                {state.contractExpires === "no" && (
                  <Flag level="green">Contract extends past closing — no issue.</Flag>
                )}
              </>
            )}
            {state.contractActive === "no" && (
              <Flag level="amber">
                Client is between contracts. Short gaps between contracts are acceptable if the pattern is
                consistent. Confirm next contract start date.
              </Flag>
            )}
          </div>
        </>
      )}

      {/* Not Currently Working follow-ups */}
      {state.current === "none" && (
        <>
          <SectionConnector />
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: 0 }}>
              How long has the client been without work?
            </p>
            <OptionRow
              columns={3}
              options={[
                { value: "<30d", label: "Less than 30 days" },
                { value: "1-6m", label: "1–6 months" },
                { value: "6+m", label: "6+ months" },
              ]}
              value={state.noneDuration}
              onChange={(v) => update("noneDuration", v as NoneDuration)}
            />
            {state.noneDuration === "<30d" && (
              <Flag level="amber">Short break — acceptable. Confirm new employment start date.</Flag>
            )}
            {state.noneDuration === "1-6m" && (
              <Flag level="amber">
                Gap in progress. If client has been back on the job for 4+ months, they can start the process
                now and close after the 6th month back.
              </Flag>
            )}
            {state.noneDuration === "6+m" && (
              <>
                <Flag level="red">
                  Gap of 6+ consecutive months triggers the waiting rule. Client must be back on the job for
                  6 full months before qualifying.
                </Flag>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                  <label style={{ fontSize: "0.8125rem", color: "#111111", fontWeight: 600 }}>
                    How long have they been back (in months)?
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={state.backOnJobMonths}
                    onChange={(e) => update("backOnJobMonths", e.target.value)}
                    style={{
                      width: "80px",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: "1px solid #E8E8E8",
                      fontSize: "0.8125rem",
                    }}
                  />
                </div>
                {state.backOnJobMonths !== "" && Number(state.backOnJobMonths) >= 6 && (
                  <Flag level="green">Clear to proceed — 6+ months back on the job.</Flag>
                )}
                {state.backOnJobMonths !== "" && Number(state.backOnJobMonths) < 6 && (
                  <Flag level="red">
                    Available to close on:{" "}
                    <strong>{ymLabel(addMonths(todayYM(), Math.max(0, 6 - Number(state.backOnJobMonths))))}</strong>
                  </Flag>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* ═════ STEP 2 ═════ */}
      {showStep2 && (
        <>
          <SectionConnector />
          <StepHeader
            n={2}
            title="Employment History — Last 2 Years"
            hint="Walk us through the client's employment over the last 2 years"
          />

          <div style={{ background: "#FAF8F3", borderRadius: "12px", padding: "16px", marginTop: "14px", marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
              <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#111111" }}>
                {coverage.documentedMonths} of 24 months documented
                {coverage.partialMonths > 0 && (
                  <span style={{ color: "#92400E", fontWeight: 500 }}> · {coverage.partialMonths} partial</span>
                )}
                {coverage.gaps.length > 0 && (
                  <span style={{ color: "#C8202A", fontWeight: 500 }}>
                    {" "}
                    · {coverage.gaps.length} gap{coverage.gaps.length > 1 ? "s" : ""} (longest {coverage.longestGap}m)
                  </span>
                )}
              </div>
            </div>
            <TimelineBar periods={state.periods} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {state.periods.map((p) => (
              <PeriodRow
                key={p.id}
                period={p}
                onChange={(np) => updatePeriod(p.id, np)}
                onRemove={() => removePeriod(p.id)}
              />
            ))}
            {state.periods.length < 6 && (
              <button
                onClick={addPeriod}
                style={{
                  padding: "12px 16px",
                  borderRadius: "10px",
                  border: "1.5px dashed #C8202A",
                  background: "#FFFFFF",
                  color: "#C8202A",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                + Add employment period
              </button>
            )}
            {state.periods.length >= 6 && (
              <div style={{ fontSize: "0.75rem", color: "#9B9B9B", textAlign: "center" }}>
                Maximum 6 periods
              </div>
            )}
          </div>
        </>
      )}

      {/* ═════ STEP 3 ═════ */}
      {showStep3 && (
        <>
          <SectionConnector />
          <StepHeader n={3} title="Income Type Combinations" hint="Does the client have more than one income source?" />
          <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <OptionRow
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
              value={state.multiIncome}
              onChange={(v) => update("multiIncome", v as YesNo)}
            />

            {state.multiIncome === "yes" && (
              <>
                <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: 0 }}>
                  What combination? (select all that apply)
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "10px" }}>
                  <MultiCheck
                    label="Two W2 jobs simultaneously"
                    checked={state.multiTwoW2}
                    onChange={(v) => update("multiTwoW2", v)}
                  />
                  <MultiCheck
                    label="W2 + self-employment / 1099"
                    checked={state.multiW2SE}
                    onChange={(v) => update("multiW2SE", v)}
                  />
                  <MultiCheck
                    label="W2 + gig income"
                    checked={state.multiW2Gig}
                    onChange={(v) => update("multiW2Gig", v)}
                  />
                  <MultiCheck
                    label="Multiple self-employment streams"
                    checked={state.multiMultiSE}
                    onChange={(v) => update("multiMultiSE", v)}
                  />
                </div>

                <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: 0 }}>
                  How long has the client been doing both simultaneously?
                </p>
                <OptionRow
                  options={[
                    { value: "<2y", label: "Less than 2 years" },
                    { value: "2+y", label: "2+ years" },
                  ]}
                  value={state.multiDuration}
                  onChange={(v) => update("multiDuration", v as MultiDuration)}
                />
                {state.multiDuration === "<2y" && (
                  <Flag level="amber">
                    Cannot use the newer income stream for qualifying yet. Use only the income with 2+ year
                    history. The newer stream can only be counted once 2 years of simultaneous history is
                    established.
                  </Flag>
                )}
                {state.multiDuration === "2+y" && (
                  <Flag level="green">Both income streams can be used for qualifying.</Flag>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* ═════ STEP 4 — Gap Resolution ═════ */}
      {showStep4 && (
        <>
          <SectionConnector />
          <StepHeader n={4} title="Gap Resolution" hint="One or more gaps of 6+ months were detected" />
          <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {coverage.gaps
              .filter((g) => g.months >= 6)
              .map((g, i) => (
                <div key={i} style={{ background: "#FFF5F5", borderLeft: "4px solid #C8202A", borderRadius: "0 10px 10px 0", padding: "12px 16px" }}>
                  <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#7F1D1D" }}>
                    Gap: {ymLabel(g.startYM)} – {ymLabel(g.endYM)} ({g.months} months)
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "#4B4B4B", marginTop: "6px", lineHeight: 1.5 }}>
                    Resolution options:
                  </div>
                  <ul style={{ margin: "6px 0 0 0", paddingLeft: "20px", color: "#4B4B4B", fontSize: "0.8125rem", lineHeight: 1.6 }}>
                    <li><strong>Close with prior employment</strong> — add a W2, self-employment, or gig period that fills the timeline.</li>
                    <li><strong>Employment verification letter</strong> — cash employer letter for this period (amber — obtain before closing).</li>
                    <li><strong>Amend taxes</strong> — if income was earned but not reported, amending is legitimate. Consult CPA.</li>
                    <li><strong>Wait</strong> — client must be continuously employed 6 months. Eligible {ymLabel(addMonths(todayYM(), 6))} at earliest.</li>
                  </ul>
                </div>
              ))}
          </div>
        </>
      )}

      {/* ═════ STEP 5 — Verdict ═════ */}
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

function MultiCheck({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px 12px",
        borderRadius: "10px",
        border: checked ? "2px solid #C8202A" : "1.5px solid #E8E8E8",
        background: checked ? "#FFF8F8" : "#FFFFFF",
        cursor: "pointer",
        fontSize: "0.8125rem",
        color: checked ? "#C8202A" : "#111111",
        fontWeight: 600,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: "#C8202A" }}
      />
      {label}
    </label>
  );
}
