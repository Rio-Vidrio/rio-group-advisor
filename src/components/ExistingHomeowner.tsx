"use client";

import React, { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type TreeState = {
  currentLoan: "fha" | "conventional" | null;
  // Bankruptcy — first ask if any BK history, then chapter, then whether waiting period is met
  bankruptcyFHA: "yes" | "no" | null;
  bankruptcyConv: "yes" | "no" | null;
  bankruptcyChapter: "ch7" | "ch13" | null;      // Ch 7 or Ch 13 (asked when BK = yes)
  bankruptcyMet: "yes" | "no" | null;            // Waiting period met? (Ch 7 = 2yr from discharge, Ch 13 = 12mo from filing)
  citizenship: "citizen" | "daca" | null;
  // FHA branch
  purchaseTiming: "recent" | "longago" | null;
  familySizeIncreased: "yes" | "no" | null;
  // FHA Before 2021 toggles
  hasEquity25: boolean | null;
  familySizeIncreasedLong: boolean | null;
  vacated: boolean | null;
  // Conventional branch
  nextLoanType: "fha" | "conventional" | null;
  convToFHAEquity: "yes" | "no" | null;
  // Conv → FHA no-equity path: rental income on prior year taxes?
  convToFHARentalTaxes: "yes" | "no" | null;
};

const initialState: TreeState = {
  currentLoan: null,
  bankruptcyFHA: null,
  bankruptcyConv: null,
  bankruptcyChapter: null,
  bankruptcyMet: null,
  citizenship: null,
  purchaseTiming: null,
  familySizeIncreased: null,
  hasEquity25: null,
  familySizeIncreasedLong: null,
  vacated: null,
  nextLoanType: null,
  convToFHAEquity: null,
  convToFHARentalTaxes: null,
};

// Downstream fields to clear when citizenship changes
const clearFromCitizenship = {
  purchaseTiming: null,
  familySizeIncreased: null,
  hasEquity25: null,
  familySizeIncreasedLong: null,
  vacated: null,
  nextLoanType: null,
  convToFHAEquity: null,
  convToFHARentalTaxes: null,
};


// ─── Program Data ─────────────────────────────────────────────────────────────

const PROGRAMS = {
  fhaDPA: {
    name: "FHA Down Payment Assistance",
    minScore: "600+",
    bullets: [
      "Down payment covered via 2nd loan",
      "Most flexible on credit history",
      "Higher DTI tolerance (57%)",
    ],
    impact: "+~$200/month vs standard FHA",
    color: "blue" as const,
    note: "U.S. citizens and permanent residents only — No DACA",
  },
  fhaSolar: {
    name: "FHA Solar Program",
    minScore: "580+",
    bullets: [
      "3.5% down covered (grant)",
      "Solar adds ~$10-15K home value",
      "No tradeline requirements",
    ],
    impact: "+~$200/month (offset by electric savings)",
    color: "blue" as const,
    note: "U.S. citizens and permanent residents only — No DACA",
  },
  ccConvDPA: {
    name: "Conventional DPA",
    minScore: "660+",
    bullets: [
      "Income limit: $146K",
      "DTI max 50%",
      "DU approval required",
      "2nd lien forgiven after 5 years",
    ],
    impact: "Rate: market + 1%",
    color: "gray" as const,
    note: "660+ credit score required",
  },
  selfConv: {
    name: "Self-Funded Conventional",
    minScore: "660+",
    bullets: [
      "5% down (buyer brings)",
      "Rent current home to offset",
      "No income limit",
      "No DPA restrictions",
    ],
    impact: "Standard market rate",
    color: "gray" as const,
    note: "660+ credit score required",
  },
};

type ProgramKey = keyof typeof PROGRAMS;

// ─── VacatingTooltip ──────────────────────────────────────────────────────────

const VACATING_TOOLTIP_TEXT =
  "A vacating residence is a home the owner no longer lives in. They have already changed their mailing address and the home is currently rented or actively being prepared for rental.";

function VacatingTooltip() {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <button
        type="button"
        aria-label="What is a vacating residence?"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        style={{ marginLeft: "4px", display: "inline-flex", alignItems: "center", justifyContent: "center", width: "16px", height: "16px", borderRadius: "50%", background: "#E8E8E8", color: "#6B6B6B", fontSize: "10px", fontWeight: 700, border: "none", cursor: "pointer" }}
      >
        ⓘ
      </button>
      {open && (
        <span
          style={{ position: "absolute", zIndex: 50, left: "22px", top: 0, width: "240px", background: "#111111", color: "#FFFFFF", fontSize: "0.75rem", borderRadius: "8px", padding: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", lineHeight: 1.6 }}
        >
          {VACATING_TOOLTIP_TEXT}
        </span>
      )}
    </span>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SelectionCard({
  title,
  note,
  selected,
  onClick,
}: {
  title: string;
  note?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "20px 22px",
        borderRadius: "12px",
        border: selected ? "2px solid #C8202A" : "1.5px solid #E8E8E8",
        background: selected ? "#FFF8F8" : "#FFFFFF",
        cursor: "pointer",
        transition: "border-color 100ms, background 100ms, box-shadow 100ms",
        boxShadow: selected ? "none" : "0 1px 4px rgba(0,0,0,0.04)",
        minHeight: "64px",
      }}
    >
      <div style={{ fontWeight: 600, fontSize: "0.9375rem", color: selected ? "#C8202A" : "#111111", lineHeight: 1.3 }}>
        {title}
      </div>
      {note && (
        <div style={{ fontSize: "0.75rem", color: "#9B9B9B", marginTop: "4px" }}>{note}</div>
      )}
    </button>
  );
}

function PillToggle({
  label,
  value,
  onChange,
}: {
  label: React.ReactNode;
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", padding: "12px 0", borderBottom: "1px solid #E8E8E8" }}>
      <span style={{ color: "#111111", fontWeight: 500, fontSize: "0.875rem", flex: 1 }}>{label}</span>
      <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
        <button
          onClick={() => onChange(true)}
          style={{
            padding: "6px 16px",
            borderRadius: "20px",
            fontSize: "0.8125rem",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
            transition: "background 100ms, color 100ms",
            background: value === true ? "#C8202A" : "#F7F6F4",
            color: value === true ? "#FFFFFF" : "#6B6B6B",
          }}
        >
          Yes
        </button>
        <button
          onClick={() => onChange(false)}
          style={{
            padding: "6px 16px",
            borderRadius: "20px",
            fontSize: "0.8125rem",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
            transition: "background 100ms, color 100ms",
            background: value === false ? "#111111" : "#F7F6F4",
            color: value === false ? "#FFFFFF" : "#6B6B6B",
          }}
        >
          No
        </button>
      </div>
    </div>
  );
}

function ProgramCard({ programKey }: { programKey: ProgramKey }) {
  const p = PROGRAMS[programKey];
  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #E8E8E8", borderRadius: "12px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px", background: "#F7F6F4" }}>
        <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "#111111", lineHeight: 1.3 }}>{p.name}</span>
        <span style={{ flexShrink: 0, fontSize: "0.6875rem", fontWeight: 700, color: "#FFFFFF", background: "#C8202A", padding: "2px 8px", borderRadius: "20px" }}>
          {p.minScore}
        </span>
      </div>
      <div style={{ padding: "12px 16px", flex: 1 }}>
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {p.bullets.map((b, i) => (
            <li key={i} style={{ fontSize: "0.75rem", color: "#4B4B4B", display: "flex", gap: "8px", marginBottom: "4px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#C8202A", flexShrink: 0, marginTop: "5px" }} />
              {b}
            </li>
          ))}
        </ul>
        <p style={{ marginTop: "8px", fontSize: "0.75rem", fontWeight: 600, color: "#111111" }}>{p.impact}</p>
        {programKey === "fhaSolar" && (
          <div style={{ marginTop: "8px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: "8px", padding: "6px 10px" }}>
            <p style={{ fontSize: "0.6875rem", color: "#92400E", fontWeight: 500 }}>+~$200/month added to payment for solar — partially offset by electric savings</p>
          </div>
        )}
        {programKey === "fhaDPA" && (
          <div style={{ marginTop: "8px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: "8px", padding: "6px 10px" }}>
            <p style={{ fontSize: "0.6875rem", color: "#92400E", fontWeight: 500 }}>+~$200/month added to payment for down payment assistance 2nd lien</p>
          </div>
        )}
      </div>
      <div style={{ padding: "8px 16px", borderTop: "1px solid #E8E8E8" }}>
        <p style={{ fontSize: "0.6875rem", color: "#9B9B9B", fontStyle: "italic" }}>{p.note}</p>
        {(programKey === "fhaDPA" || programKey === "fhaSolar") && (
          <p style={{ fontSize: "0.6875rem", color: "#9B9B9B", marginTop: "4px" }}>PMI required — FHA mortgage insurance premium applies</p>
        )}
      </div>
    </div>
  );
}

function ProgramRow({ programs }: { programs: ProgramKey[] }) {
  return (
    <div>
      <div style={{ fontSize: "0.6875rem", fontWeight: 600, color: "#C8202A", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "12px" }}>
        Available Programs
      </div>
      <div style={{ display: "grid", gap: "12px", gridTemplateColumns: programs.length === 1 ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))" }}>
        {programs.map((pk) => (
          <ProgramCard key={pk} programKey={pk} />
        ))}
      </div>
    </div>
  );
}

function PathCard({
  title,
  badge,
  borderColor,
  bullets,
  flagBox,
  programs,
}: {
  title: string;
  badge?: { text: string; color: "red" | "green" | "gray" };
  borderColor: "red" | "green" | "gray";
  bullets: { icon: string; text: React.ReactNode }[];
  flagBox?: { color: "amber" | "red"; text: string };
  programs: ProgramKey[];
}) {
  const leftBorderColor =
    borderColor === "red" ? "#C8202A" : borderColor === "green" ? "#22C55E" : "#D1D5DB";

  const badgeStyle: React.CSSProperties =
    badge?.color === "red"
      ? { background: "#C8202A", color: "#FFFFFF" }
      : badge?.color === "green"
      ? { background: "#22C55E", color: "#FFFFFF" }
      : { background: "#F7F6F4", color: "#6B6B6B" };

  return (
    <div style={{ background: "#FFFFFF", borderRadius: "12px", border: "1px solid #E8E8E8", borderLeft: `4px solid ${leftBorderColor}`, padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <h3 style={{ fontWeight: 700, color: "#111111", fontSize: "0.9375rem", margin: 0 }}>{title}</h3>
        {badge && (
          <span style={{ fontSize: "0.6875rem", fontWeight: 700, padding: "2px 10px", borderRadius: "20px", ...badgeStyle }}>
            {badge.text}
          </span>
        )}
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
        {bullets.map((b, i) => (
          <li key={i} style={{ fontSize: "0.875rem", color: "#4B4B4B", display: "flex", gap: "8px" }}>
            <span style={{ flexShrink: 0 }}>{b.icon}</span>
            {b.text}
          </li>
        ))}
      </ul>
      {flagBox && (
        <div style={{
          padding: "12px",
          fontSize: "0.875rem",
          borderRadius: "0 8px 8px 0",
          ...(flagBox.color === "amber"
            ? { background: "#FFFBEB", borderLeft: "4px solid #F59E0B", color: "#92400E" }
            : { background: "#FFF5F5", borderLeft: "4px solid #C8202A", color: "#7F1D1D" })
        }}>
          {flagBox.text}
        </div>
      )}
      <ProgramRow programs={programs} />
    </div>
  );
}

// ─── DisqualifierCard ─────────────────────────────────────────────────────────

function DisqualifierCard({ reason }: { reason: string }) {
  return (
    <div style={{ background: "#FFF5F5", borderLeft: "4px solid #C8202A", borderRadius: "0 10px 10px 0", padding: "14px 16px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
      <span style={{ color: "#C8202A", fontWeight: 700, flexShrink: 0, marginTop: "1px" }}>✗</span>
      <div>
        <div style={{ fontWeight: 700, color: "#C8202A", fontSize: "0.8125rem", marginBottom: "4px" }}>Not Available</div>
        <div style={{ fontSize: "0.875rem", color: "#111111", lineHeight: 1.5 }}>{reason}</div>
      </div>
    </div>
  );
}

// ─── Section Connector ────────────────────────────────────────────────────────

function SectionConnector() {
  return <div style={{ height: "1px", background: "#E8E8E8", margin: "24px 0" }} />;
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

function bankruptcyCrumb(state: TreeState): string | null {
  const bkAny = state.bankruptcyFHA === "yes" || state.bankruptcyConv === "yes";
  if (!bkAny) return null;
  if (state.bankruptcyChapter === "ch7" && state.bankruptcyMet === "no") return "Ch 7 — waiting period not met";
  if (state.bankruptcyChapter === "ch13" && state.bankruptcyMet === "no") return "Ch 13 — waiting period not met";
  if (state.bankruptcyChapter === "ch7" && state.bankruptcyMet === "yes") return "Ch 7 — 2yr discharge met";
  if (state.bankruptcyChapter === "ch13" && state.bankruptcyMet === "yes") return "Ch 13 — 12mo file met";
  if (state.bankruptcyChapter === "ch7") return "Ch 7";
  if (state.bankruptcyChapter === "ch13") return "Ch 13";
  return "Bankruptcy history";
}

function buildBreadcrumb(state: TreeState): string[] {
  const crumbs: string[] = [];
  const bkBlocked =
    (state.bankruptcyFHA === "yes" || state.bankruptcyConv === "yes") &&
    state.bankruptcyChapter !== null && state.bankruptcyMet === "no";
  if (state.currentLoan === "fha") {
    crumbs.push("FHA");
    const bkc = bankruptcyCrumb(state);
    if (bkc) crumbs.push(bkc);
    if (bkBlocked) return crumbs;
    if (state.citizenship === "daca") { crumbs.push("DACA"); return crumbs; }
    if (state.purchaseTiming === "recent") {
      crumbs.push("2021 or Later");
      if (state.familySizeIncreased === "yes") crumbs.push("Family Size Increased");
      if (state.familySizeIncreased === "no") crumbs.push("No Family Size Change");
    } else if (state.purchaseTiming === "longago") {
      crumbs.push("Before 2021");
    }
  } else if (state.currentLoan === "conventional") {
    crumbs.push("Conventional");
    const bkc = bankruptcyCrumb(state);
    if (bkc) crumbs.push(bkc);
    if (bkBlocked) return crumbs;
    if (state.citizenship === "daca") { crumbs.push("DACA"); return crumbs; }
    if (state.nextLoanType === "fha") {
      crumbs.push("Next: FHA");
      if (state.convToFHAEquity === "yes") crumbs.push("Has 25%+ Equity");
      if (state.convToFHAEquity === "no") crumbs.push("No 25%+ Equity");
      if (state.convToFHARentalTaxes === "yes") crumbs.push("Rental Income on Taxes");
      if (state.convToFHARentalTaxes === "no") crumbs.push("No Rental Income Filed");
    } else if (state.nextLoanType === "conventional") {
      crumbs.push("Next: Conventional");
    }
  }
  return crumbs;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ExistingHomeowner() {
  const [state, setState] = useState<TreeState>(initialState);

  function selectCard<K extends keyof TreeState>(key: K, value: TreeState[K]) {
    setState((prev) => {
      // Tapping the same value → deselect + clear downstream
      if (prev[key] === value) {
        if (key === "currentLoan") return { ...initialState };
        if (key === "bankruptcyFHA" || key === "bankruptcyConv") {
          return { ...prev, [key]: null, bankruptcyChapter: null, bankruptcyMet: null, citizenship: null, ...clearFromCitizenship };
        }
        if (key === "bankruptcyChapter") {
          return { ...prev, bankruptcyChapter: null, bankruptcyMet: null };
        }
        if (key === "bankruptcyMet") return { ...prev, bankruptcyMet: null };
        if (key === "citizenship") {
          return { ...prev, citizenship: null, ...clearFromCitizenship };
        }
        if (key === "purchaseTiming") {
          return { ...prev, purchaseTiming: null, familySizeIncreased: null, hasEquity25: null, familySizeIncreasedLong: null, vacated: null };
        }
        if (key === "familySizeIncreased") return { ...prev, familySizeIncreased: null };
        if (key === "nextLoanType") return { ...prev, nextLoanType: null, convToFHAEquity: null, convToFHARentalTaxes: null };
        if (key === "convToFHAEquity") return { ...prev, convToFHAEquity: null, convToFHARentalTaxes: null };
        if (key === "convToFHARentalTaxes") return { ...prev, convToFHARentalTaxes: null };
        return { ...prev, [key]: null };
      }

      // Tapping new value → set + clear downstream
      if (key === "currentLoan") {
        return { ...initialState, currentLoan: value as TreeState["currentLoan"] };
      }
      if (key === "bankruptcyFHA" || key === "bankruptcyConv") {
        return { ...prev, [key]: value, bankruptcyChapter: null, bankruptcyMet: null, citizenship: null, ...clearFromCitizenship };
      }
      if (key === "bankruptcyChapter") {
        return { ...prev, bankruptcyChapter: value as TreeState["bankruptcyChapter"], bankruptcyMet: null };
      }
      if (key === "bankruptcyMet") {
        return { ...prev, bankruptcyMet: value as TreeState["bankruptcyMet"] };
      }
      if (key === "citizenship") {
        return { ...prev, citizenship: value as TreeState["citizenship"], ...clearFromCitizenship };
      }
      if (key === "purchaseTiming") {
        return { ...prev, purchaseTiming: value as TreeState["purchaseTiming"], familySizeIncreased: null, hasEquity25: null, familySizeIncreasedLong: null, vacated: null };
      }
      if (key === "familySizeIncreased") {
        return { ...prev, familySizeIncreased: value as TreeState["familySizeIncreased"] };
      }
      if (key === "nextLoanType") {
        return { ...prev, nextLoanType: value as TreeState["nextLoanType"], convToFHAEquity: null, convToFHARentalTaxes: null };
      }
      if (key === "convToFHAEquity") {
        return { ...prev, convToFHAEquity: value as TreeState["convToFHAEquity"], convToFHARentalTaxes: null };
      }
      if (key === "convToFHARentalTaxes") {
        return { ...prev, convToFHARentalTaxes: value as TreeState["convToFHARentalTaxes"] };
      }
      return { ...prev, [key]: value };
    });
  }

  const resetAll = () => setState(initialState);
  const breadcrumb = buildBreadcrumb(state);

  // ── Long-ago result logic ──────────────────────────────────────────────────
  // Show results early when any hard-stop condition is met (no need to answer all 3)
  const longAgoAllAnswered =
    state.hasEquity25 === false ||                                           // Hard stop: no equity
    (state.hasEquity25 === true && state.familySizeIncreasedLong === false) || // Hard stop: no family size
    (state.hasEquity25 !== null && state.familySizeIncreasedLong !== null && state.vacated !== null);

  const getLongAgoCase = (): 1 | 2 | 3 | 4 => {
    const { hasEquity25, familySizeIncreasedLong, vacated } = state;
    if (!hasEquity25) return 4;                   // Hard stop — no 25% equity
    if (!familySizeIncreasedLong) return 3;       // Hard stop — family size has not increased
    if (vacated) return 1;                        // All three conditions met
    return 2;                                     // Has equity + family size, not yet vacated
  };

  // ── Reusable result cards ──────────────────────────────────────────────────

  const fhaToConvCard = (
    <PathCard
      title="FHA → Conventional"
      badge={{ text: "Recommended Path", color: "red" }}
      borderColor="red"
      bullets={[
        { icon: "✅", text: "5% down on new purchase" },
        { icon: "✅", text: "No equity requirement on current home" },
        { icon: "✅", text: "No family size requirement" },
        { icon: "✅", text: "No vacating rules" },
        { icon: "✅", text: "Can rent current home to offset mortgage" },
        { icon: "✅", text: "No rental history required" },
      ]}
      programs={["ccConvDPA", "selfConv"]}
    />
  );

  const convToFHAAvailableCard = (
    <PathCard
      title="Conventional → FHA ✅"
      borderColor="green"
      bullets={[
        { icon: "✅", text: "25% equity — current mortgage can be offset by rental income" },
        { icon: "✅", text: "No family size requirement" },
        { icon: "✅", text: "No vacating requirement" },
        { icon: "✅", text: "No 100-mile rule" },
      ]}
      programs={["fhaDPA", "fhaSolar"]}
    />
  );

  const convToFHACarryBothCard = (
    <PathCard
      title="Option A — Qualify Carrying Both Mortgages"
      borderColor="gray"
      bullets={[
        { icon: "✅", text: "No equity requirement, no rental history required" },
        { icon: "✅", text: "Client can rent current home once moved out" },
        { icon: "⚠️", text: "Must qualify with both mortgage payments in DTI — review carefully" },
      ]}
      programs={["fhaDPA", "fhaSolar"]}
    />
  );

  const convToFHARentalTaxCard = (
    <PathCard
      title="Option B — 12 Months Rental Income on Prior-Year Taxes"
      badge={{ text: "Preferred", color: "green" }}
      borderColor="green"
      bullets={[
        { icon: "✅", text: "No 25%+ equity requirement" },
        { icon: "✅", text: "Current mortgage payment can be excluded from DTI" },
        { icon: "✅", text: "Positive rental income (net) can be added to qualifying income instead" },
        { icon: "⚠️", text: "Requires 12 months of rental income filed on the previous year's tax return" },
      ]}
      programs={["fhaDPA", "fhaSolar"]}
    />
  );

  // ── Visibility flags ───────────────────────────────────────────────────────

  // Bankruptcy sub-flow — chapter shown after BK=yes, met shown after chapter answered.
  // Waiting-period rules: Ch 7 = 2 years from discharge, Ch 13 = 12 months from filing.
  const bkAnyYes         = state.bankruptcyFHA === "yes" || state.bankruptcyConv === "yes";
  const bkChapterAnswered = state.bankruptcyChapter !== null;
  const bkClean          = !bkAnyYes || (bkChapterAnswered && state.bankruptcyMet === "yes"); // No BK, or BK with waiting period met

  // FHA branch
  const showBankruptcyFHA        = state.currentLoan === "fha";
  const showChapterFHA           = state.currentLoan === "fha" && state.bankruptcyFHA === "yes";
  const showBkMetFHA             = state.currentLoan === "fha" && state.bankruptcyFHA === "yes" && bkChapterAnswered;
  const showCitizenshipFHA       = state.currentLoan === "fha" && state.bankruptcyFHA !== null && bkClean;
  const fhaDacaBlocked           = state.currentLoan === "fha" && state.bankruptcyFHA !== null && bkClean && state.citizenship === "daca";
  const showFHAMainFlow          = state.currentLoan === "fha" && state.bankruptcyFHA !== null && bkClean && state.citizenship === "citizen";

  // Conventional branch
  const showBankruptcyConv       = state.currentLoan === "conventional";
  const showChapterConv          = state.currentLoan === "conventional" && state.bankruptcyConv === "yes";
  const showBkMetConv            = state.currentLoan === "conventional" && state.bankruptcyConv === "yes" && bkChapterAnswered;
  const showCitizenshipConv      = state.currentLoan === "conventional" && state.bankruptcyConv !== null && bkClean;
  const convDacaBlocked          = state.currentLoan === "conventional" && state.bankruptcyConv !== null && bkClean && state.citizenship === "daca";
  const showConvMainFlow         = state.currentLoan === "conventional" && state.bankruptcyConv !== null && bkClean && state.citizenship === "citizen";

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: "#FFFFFF", borderRadius: "16px", border: "1px solid #E8E8E8", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", padding: "36px" }}>
      {/* Header bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {breadcrumb.length === 0 ? (
            <span style={{ fontSize: "0.875rem", color: "#9B9B9B", fontStyle: "italic" }}>No path selected yet</span>
          ) : (
            breadcrumb.map((crumb, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {i > 0 && <span style={{ color: "#D1D5DB", fontSize: "0.75rem" }}>›</span>}
                <span style={{
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  padding: "4px 10px",
                  borderRadius: "20px",
                  background: i === breadcrumb.length - 1 ? "#C8202A" : "#F7F6F4",
                  color: i === breadcrumb.length - 1 ? "#FFFFFF" : "#6B6B6B",
                }}>
                  {crumb}
                </span>
              </span>
            ))
          )}
        </div>
        {state.currentLoan !== null && (
          <button
            onClick={resetAll}
            style={{ flexShrink: 0, fontSize: "0.875rem", fontWeight: 600, border: "1.5px solid #C8202A", color: "#C8202A", padding: "6px 14px", borderRadius: "8px", background: "transparent", cursor: "pointer" }}
          >
            ↺ Start Over
          </button>
        )}
      </div>

      <div style={{ maxWidth: "640px", margin: "0 auto" }}>

        {/* ── SECTION 1: Always visible — current loan type ─────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <h2 style={{ fontSize: "1.375rem", fontWeight: 700, color: "#111111", margin: "0 0 4px 0" }}>Existing Homeowner Options</h2>
            <p style={{ color: "#6B6B6B", margin: 0, fontSize: "0.9375rem" }}>
              Find the best path for the client&apos;s next home purchase.
            </p>
          </div>
          <div>
            <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", marginBottom: "12px" }}>
              What type of loan does the client currently have on their existing home?
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <SelectionCard
                title="FHA"
                note="FHA-insured mortgage"
                selected={state.currentLoan === "fha"}
                onClick={() => selectCard("currentLoan", "fha")}
              />
              <SelectionCard
                title="Conventional"
                note="Conventional mortgage"
                selected={state.currentLoan === "conventional"}
                onClick={() => selectCard("currentLoan", "conventional")}
              />
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* FHA BRANCH                                                         */}
        {/* ═══════════════════════════════════════════════════════════════════ */}

        {/* FHA: Bankruptcy question */}
        {showBankruptcyFHA && (
          <>
            <SectionConnector />
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: 0 }}>
                Does the client have any bankruptcy history?
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <SelectionCard title="Yes" selected={state.bankruptcyFHA === "yes"} onClick={() => selectCard("bankruptcyFHA", "yes")} />
                <SelectionCard title="No" selected={state.bankruptcyFHA === "no"} onClick={() => selectCard("bankruptcyFHA", "no")} />
              </div>
            </div>
          </>
        )}

        {/* FHA: Bankruptcy = Yes → chapter question */}
        {showChapterFHA && (
          <>
            <SectionConnector />
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: 0 }}>Which chapter?</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <SelectionCard title="Chapter 7" note="Liquidation" selected={state.bankruptcyChapter === "ch7"} onClick={() => selectCard("bankruptcyChapter", "ch7")} />
                <SelectionCard title="Chapter 13" note="Reorganization" selected={state.bankruptcyChapter === "ch13"} onClick={() => selectCard("bankruptcyChapter", "ch13")} />
              </div>
            </div>
          </>
        )}

        {/* FHA: Bankruptcy waiting-period question */}
        {showBkMetFHA && (
          <>
            <SectionConnector />
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: 0 }}>
                {state.bankruptcyChapter === "ch7"
                  ? "Has it been 2+ years since the discharge date?"
                  : "Has it been 12+ months since the file date?"}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <SelectionCard title="Yes" selected={state.bankruptcyMet === "yes"} onClick={() => selectCard("bankruptcyMet", "yes")} />
                <SelectionCard title="No" selected={state.bankruptcyMet === "no"} onClick={() => selectCard("bankruptcyMet", "no")} />
              </div>
              {state.bankruptcyMet === "no" && (
                <DisqualifierCard reason={
                  state.bankruptcyChapter === "ch7"
                    ? "Chapter 7 requires a full 2 years from the discharge date. Client is not eligible until that waiting period is met."
                    : "Chapter 13 requires a full 12 months from the file date. Client is not eligible until that waiting period is met."
                } />
              )}
            </div>
          </>
        )}

        {/* FHA: Citizenship question (shown after bankruptcy is answered) */}
        {showCitizenshipFHA && (
          <>
            <SectionConnector />
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: 0 }}>
                What is the client&apos;s citizenship status?
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <SelectionCard
                  title="U.S. Citizen or Permanent Resident"
                  selected={state.citizenship === "citizen"}
                  onClick={() => selectCard("citizenship", "citizen")}
                />
                <SelectionCard
                  title="DACA or Work Permit"
                  selected={state.citizenship === "daca"}
                  onClick={() => selectCard("citizenship", "daca")}
                />
              </div>
            </div>
          </>
        )}

        {/* FHA: DACA → FHA disqualifier + conventional-only fallback */}
        {fhaDacaBlocked && (
          <>
            <SectionConnector />
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <DisqualifierCard reason="FHA financing is not available for DACA or work permit holders. All FHA programs are ineligible." />
              <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#111111", margin: 0 }}>Available Path — Conventional</h3>
              {fhaToConvCard}
            </div>
          </>
        )}
        {showFHAMainFlow && (
          <>
            <SectionConnector />
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: 0 }}>
                When did the client purchase their current home?
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <SelectionCard
                  title="2021 or Later"
                  note="Most homes purchased after 2021 have not yet accumulated 25% equity"
                  selected={state.purchaseTiming === "recent"}
                  onClick={() => selectCard("purchaseTiming", "recent")}
                />
                <SelectionCard
                  title="Before 2021"
                  note="Homes purchased before 2021 have likely appreciated — 25% equity is possible"
                  selected={state.purchaseTiming === "longago"}
                  onClick={() => selectCard("purchaseTiming", "longago")}
                />
              </div>
            </div>
          </>
        )}

        {/* FHA + 2021 or Later → family size question */}
        {showFHAMainFlow && state.purchaseTiming === "recent" && (
          <>
            <SectionConnector />
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: 0 }}>
                Has the client&apos;s family size increased since purchasing? (marriage or children)
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <SelectionCard
                  title="Yes"
                  selected={state.familySizeIncreased === "yes"}
                  onClick={() => selectCard("familySizeIncreased", "yes")}
                />
                <SelectionCard
                  title="No"
                  selected={state.familySizeIncreased === "no"}
                  onClick={() => selectCard("familySizeIncreased", "no")}
                />
              </div>
            </div>

            {/* FHA + 2021 or Later + No → Hard stop + two paths */}
            {state.familySizeIncreased === "no" && (
              <>
                <SectionConnector />
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <DisqualifierCard reason="FHA to FHA — Hard Stop. Family size has not increased. This is a non-negotiable requirement for a second FHA loan on a home within 100 miles. There is no workaround." />
                  
                  <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#111111", margin: 0 }}>Available Paths</h3>
                  <PathCard
                    title="Option A — Refinance Current FHA → Conventional"
                    borderColor="red"
                    bullets={[
                      { icon: "✅", text: "Refinance the current home out of FHA into a conventional loan" },
                      { icon: "✅", text: "Eliminates the existing FHA loan — frees up FHA entitlement" },
                      { icon: "✅", text: "Client can then purchase the new home using FHA financing" },
                      { icon: "⚠️", text: "Requires sufficient equity and qualifying income to refi" },
                    ]}
                    programs={["selfConv"]}
                  />
                  {fhaToConvCard}
                </div>
              </>
            )}

            {/* FHA + 2021 or Later + Yes → equity question */}
            {state.familySizeIncreased === "yes" && (
              <>
                <SectionConnector />
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: 0 }}>
                    Does the client&apos;s current home have 25%+ equity?
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <SelectionCard
                      title="Yes"
                      note="Equity can offset the existing FHA payment in DTI"
                      selected={state.hasEquity25 === true}
                      onClick={() => setState((prev) => ({ ...prev, hasEquity25: true }))}
                    />
                    <SelectionCard
                      title="No"
                      note="Most 2021+ purchases have not yet reached 25% equity"
                      selected={state.hasEquity25 === false}
                      onClick={() => setState((prev) => ({ ...prev, hasEquity25: false }))}
                    />
                  </div>
                </div>

                {/* No equity → hard stop */}
                {state.hasEquity25 === false && (
                  <>
                    <SectionConnector />
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      
                      <DisqualifierCard reason="FHA to FHA — Hard Stop. The client's current home does not have 25%+ equity. Without equity, the existing FHA payment cannot be excluded from DTI — both payments must be fully carried. There is no workaround." />
                      <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#111111", margin: 0 }}>Available Paths</h3>
                      <PathCard
                        title="Option A — Refinance Current FHA → Conventional"
                        borderColor="red"
                        bullets={[
                          { icon: "✅", text: "Refinance the current home out of FHA into a conventional loan" },
                          { icon: "✅", text: "Eliminates the existing FHA loan — frees up FHA entitlement" },
                          { icon: "✅", text: "Client can then purchase the new home using FHA financing" },
                          { icon: "⚠️", text: "Requires sufficient equity and qualifying income to refi" },
                        ]}
                        programs={["selfConv"]}
                      />
                      {fhaToConvCard}
                    </div>
                  </>
                )}

                {/* Has equity → FHA to FHA available */}
                {state.hasEquity25 === true && (
                  <>
                    <SectionConnector />
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      
                      <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#111111", margin: 0 }}>Available Options</h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <PathCard
                          title="Path 1 — FHA → FHA (Second FHA Loan)"
                          borderColor="red"
                          bullets={[
                            { icon: "✅", text: "Family size increased" },
                            { icon: "✅", text: "25%+ equity — existing FHA payment can be offset in DTI" },
                            {
                              icon: "✅",
                              text: (
                                <span>
                                  Client must have already vacated the home — current address of application cannot match the property address{" "}
                                  <VacatingTooltip />
                                </span>
                              ),
                            },
                          ]}
                          programs={["fhaDPA", "fhaSolar"]}
                        />
                        <PathCard
                          title="Path 2 — FHA → Conventional"
                          borderColor="gray"
                          bullets={[
                            { icon: "✅", text: "5% down" },
                            { icon: "✅", text: "No rental history required" },
                            { icon: "✅", text: "Can rent current home" },
                          ]}
                          programs={["ccConvDPA", "selfConv"]}
                        />
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* FHA + Before 2021 → all 3 toggle questions at once */}
        {showFHAMainFlow && state.purchaseTiming === "longago" && (
          <>
            <SectionConnector />
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ background: "#FFFFFF", border: "1px solid #E8E8E8", borderRadius: "12px", padding: "20px" }}>
                <h3 style={{ fontWeight: 700, color: "#111111", marginBottom: "16px", fontSize: "0.9375rem" }}>Client&apos;s Situation</h3>
                <div>
                  <PillToggle
                    label="Does the client's current home have 25%+ equity?"
                    value={state.hasEquity25}
                    onChange={(v) => setState((prev) => ({ ...prev, hasEquity25: v }))}
                  />
                  <PillToggle
                    label="Has the client's family size increased? (marriage or children)"
                    value={state.familySizeIncreasedLong}
                    onChange={(v) => setState((prev) => ({ ...prev, familySizeIncreasedLong: v }))}
                  />
                  <PillToggle
                    label={
                      <span>
                        Has the client already vacated the home or established a different address?{" "}
                        <span style={{ fontWeight: 400, color: "#9B9B9B" }}>
                          (<span style={{ fontStyle: "italic" }}>vacating residence</span>
                          <VacatingTooltip />)
                        </span>
                      </span>
                    }
                    value={state.vacated}
                    onChange={(v) => setState((prev) => ({ ...prev, vacated: v }))}
                  />
                </div>
              </div>

              {/* Show results automatically when all 3 answered */}
              {longAgoAllAnswered && (
                <>
                  <SectionConnector />
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    
                    {(() => {
                      const c = getLongAgoCase();

                      if (c === 1) {
                        return (
                          <>
                            <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#111111", margin: 0 }}>Available Options</h3>
                            <PathCard
                              title="FHA → FHA Available ✅"
                              borderColor="green"
                              bullets={[
                                { icon: "✅", text: "Has 25%+ equity — current payment can be offset" },
                                { icon: "✅", text: "Family size has increased" },
                                {
                                  icon: "✅",
                                  text: (
                                    <span>
                                      Home has been vacated /{" "}
                                      <span style={{ fontWeight: 600 }}>vacating residence</span>
                                      <VacatingTooltip /> established
                                    </span>
                                  ),
                                },
                              ]}
                              programs={["fhaDPA", "fhaSolar"]}
                            />
                            <PathCard
                              title="FHA → Conventional (Always Available)"
                              badge={{ text: "Always Available", color: "gray" }}
                              borderColor="red"
                              bullets={[
                                { icon: "✅", text: "5% down, no restrictions" },
                                { icon: "✅", text: "Can rent current home to offset mortgage" },
                                { icon: "✅", text: "No rental history required" },
                              ]}
                              programs={["ccConvDPA", "selfConv"]}
                            />
                          </>
                        );
                      }

                      if (c === 2) {
                        return (
                          <>
                            <DisqualifierCard reason="FHA to FHA not available — the home has not been vacated and no 12-month rental history is documented on tax returns." />
                            <div style={{ background: "#C8202A", borderRadius: "12px", padding: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
                              <h3 style={{ fontWeight: 700, fontSize: "1rem", color: "#FFFFFF", margin: 0 }}>⏱ Timing Opportunity</h3>
                              <p style={{ fontSize: "0.875rem", lineHeight: 1.6, color: "rgba(255,255,255,0.85)", margin: 0 }}>
                                The client qualifies once they vacate. Move into the new home first — the
                                application address cannot match the current home. Once moved, all three
                                requirements are met.
                              </p>
                            </div>
                            <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#111111", margin: 0 }}>Always Available</h3>
                            {fhaToConvCard}
                          </>
                        );
                      }

                      if (c === 3) {
                        return (
                          <>
                            <DisqualifierCard reason="FHA to FHA — Hard Stop. Family size has not increased. This is a non-negotiable requirement for a second FHA loan on a home within 100 miles. There is no workaround." />
                            <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#111111", margin: 0 }}>Available Paths</h3>
                            <PathCard
                              title="Option A — Refinance Current FHA → Conventional"
                              borderColor="red"
                              bullets={[
                                { icon: "✅", text: "Refinance the current home out of FHA into a conventional loan" },
                                { icon: "✅", text: "Eliminates the existing FHA loan — frees up FHA entitlement" },
                                { icon: "✅", text: "Client can then purchase the new home using FHA financing" },
                                { icon: "⚠️", text: "Requires sufficient equity and qualifying income to refi" },
                              ]}
                              programs={["selfConv"]}
                            />
                            {fhaToConvCard}
                          </>
                        );
                      }

                      // c === 4 — no equity: hard stop for FHA to FHA
                      return (
                        <>
                          <DisqualifierCard reason="FHA to FHA — Hard Stop. The client's current home does not have 25%+ equity. Without equity, the existing FHA payment cannot be excluded from DTI. Both mortgage payments must be fully carried — this disqualifies most borrowers. There is no workaround." />
                          <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#111111", margin: 0 }}>Available Paths</h3>
                          <PathCard
                            title="Option A — Refinance Current FHA → Conventional"
                            borderColor="red"
                            bullets={[
                              { icon: "✅", text: "Refinance the current home out of FHA into a conventional loan" },
                              { icon: "✅", text: "Eliminates the existing FHA loan — frees up FHA entitlement" },
                              { icon: "✅", text: "Client can then purchase the new home using FHA financing" },
                              { icon: "⚠️", text: "Requires sufficient equity and qualifying income to refi" },
                            ]}
                            programs={["selfConv"]}
                          />
                          {fhaToConvCard}
                        </>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* CONVENTIONAL BRANCH                                                */}
        {/* ═══════════════════════════════════════════════════════════════════ */}

        {/* Conventional: Bankruptcy question */}
        {showBankruptcyConv && (
          <>
            <SectionConnector />
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: 0 }}>
                Has the client had a bankruptcy discharged within the last 4 years?
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <SelectionCard
                  title="Yes"
                  selected={state.bankruptcyConv === "yes"}
                  onClick={() => selectCard("bankruptcyConv", "yes")}
                />
                <SelectionCard
                  title="No"
                  selected={state.bankruptcyConv === "no"}
                  onClick={() => selectCard("bankruptcyConv", "no")}
                />
              </div>
            </div>
          </>
        )}

        {/* Conventional: Bankruptcy = Yes → chapter question */}
        {showChapterConv && (
          <>
            <SectionConnector />
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: 0 }}>Which chapter?</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <SelectionCard title="Chapter 7" note="Liquidation" selected={state.bankruptcyChapter === "ch7"} onClick={() => selectCard("bankruptcyChapter", "ch7")} />
                <SelectionCard title="Chapter 13" note="Reorganization" selected={state.bankruptcyChapter === "ch13"} onClick={() => selectCard("bankruptcyChapter", "ch13")} />
              </div>
            </div>
          </>
        )}

        {/* Conventional: Bankruptcy waiting-period question */}
        {showBkMetConv && (
          <>
            <SectionConnector />
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: 0 }}>
                {state.bankruptcyChapter === "ch7"
                  ? "Has it been 2+ years since the discharge date?"
                  : "Has it been 12+ months since the file date?"}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <SelectionCard title="Yes" selected={state.bankruptcyMet === "yes"} onClick={() => selectCard("bankruptcyMet", "yes")} />
                <SelectionCard title="No" selected={state.bankruptcyMet === "no"} onClick={() => selectCard("bankruptcyMet", "no")} />
              </div>
              {state.bankruptcyMet === "no" && (
                <DisqualifierCard reason={
                  state.bankruptcyChapter === "ch7"
                    ? "Chapter 7 requires a full 2 years from the discharge date. Client is not eligible until that waiting period is met."
                    : "Chapter 13 requires a full 12 months from the file date. Client is not eligible until that waiting period is met."
                } />
              )}
            </div>
          </>
        )}

        {/* Conventional: Citizenship question (shown after bankruptcy is answered) */}
        {showCitizenshipConv && (
          <>
            <SectionConnector />
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: 0 }}>
                What is the client&apos;s citizenship status?
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <SelectionCard
                  title="U.S. Citizen or Permanent Resident"
                  selected={state.citizenship === "citizen"}
                  onClick={() => selectCard("citizenship", "citizen")}
                />
                <SelectionCard
                  title="DACA or Work Permit"
                  selected={state.citizenship === "daca"}
                  onClick={() => selectCard("citizenship", "daca")}
                />
              </div>
            </div>
          </>
        )}

        {/* Conventional: DACA → FHA disqualifier + Conventional-only fallback */}
        {convDacaBlocked && (
          <>
            <SectionConnector />
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <DisqualifierCard reason="FHA financing is not available for DACA or work permit holders. All FHA programs are ineligible." />
              <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#111111", margin: 0 }}>Available Path — Conventional Only</h3>
              <PathCard
                title="Conventional → Conventional ✅"
                badge={{ text: "Only Available Path", color: "red" }}
                borderColor="red"
                bullets={[
                  { icon: "✅", text: "Zero FHA restrictions" },
                  { icon: "✅", text: "Simply rent current home to offset mortgage" },
                  { icon: "✅", text: "No equity requirement" },
                  { icon: "✅", text: "No rental history requirement" },
                  { icon: "✅", text: "No family size or vacating rules" },
                ]}
                programs={["ccConvDPA", "selfConv"]}
              />
            </div>
          </>
        )}

        {/* Conventional: Citizen → main conventional flow (with planning note if BK=yes) ── */}
        {showConvMainFlow && (
          <>
            <SectionConnector />
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: 0 }}>
                Is the client looking to buy their next home with FHA or Conventional financing?
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <SelectionCard
                  title="FHA"
                  selected={state.nextLoanType === "fha"}
                  onClick={() => selectCard("nextLoanType", "fha")}
                />
                <SelectionCard
                  title="Conventional"
                  selected={state.nextLoanType === "conventional"}
                  onClick={() => selectCard("nextLoanType", "conventional")}
                />
              </div>
            </div>
          </>
        )}

        {/* Conventional + FHA → equity question */}
        {showConvMainFlow && state.nextLoanType === "fha" && (
          <>
            <SectionConnector />
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: 0 }}>
                Does the client&apos;s current home have 25%+ equity?
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <SelectionCard
                  title="Yes"
                  selected={state.convToFHAEquity === "yes"}
                  onClick={() => selectCard("convToFHAEquity", "yes")}
                />
                <SelectionCard
                  title="No"
                  selected={state.convToFHAEquity === "no"}
                  onClick={() => selectCard("convToFHAEquity", "no")}
                />
              </div>
            </div>

            {state.convToFHAEquity === "yes" && (
              <>
                <SectionConnector />
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  
                  <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#111111", margin: 0 }}>Client&apos;s Path</h3>
                  {convToFHAAvailableCard}
                </div>
              </>
            )}

            {state.convToFHAEquity === "no" && (
              <>
                <SectionConnector />
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: 0 }}>
                    Did the client file 12+ months of rental income from this property on their prior-year tax return?
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <SelectionCard
                      title="Yes"
                      selected={state.convToFHARentalTaxes === "yes"}
                      onClick={() => selectCard("convToFHARentalTaxes", "yes")}
                    />
                    <SelectionCard
                      title="No"
                      selected={state.convToFHARentalTaxes === "no"}
                      onClick={() => selectCard("convToFHARentalTaxes", "no")}
                    />
                  </div>
                </div>

                {state.convToFHARentalTaxes === "yes" && (
                  <>
                    <SectionConnector />
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#111111", margin: 0 }}>Client&apos;s Path — 12-Month Rental Income Filed</h3>
                      {convToFHARentalTaxCard}
                    </div>
                  </>
                )}

                {state.convToFHARentalTaxes === "no" && (
                  <>
                    <SectionConnector />
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#111111", margin: 0 }}>Available Options</h3>
                      {convToFHACarryBothCard}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* Conventional + Conventional → result immediately */}
        {showConvMainFlow && state.nextLoanType === "conventional" && (
          <>
            <SectionConnector />
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              
              <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#111111", margin: 0 }}>Client&apos;s Path</h3>
              <PathCard
                title="Conventional → Conventional ✅"
                badge={{ text: "Cleanest Path", color: "green" }}
                borderColor="green"
                bullets={[
                  { icon: "✅", text: "Zero restrictions" },
                  { icon: "✅", text: "Simply rent current home to offset mortgage" },
                  { icon: "✅", text: "No equity requirement" },
                  { icon: "✅", text: "No rental history requirement" },
                  { icon: "✅", text: "No family size or vacating rules" },
                ]}
                programs={["ccConvDPA", "selfConv"]}
              />
            </div>
          </>
        )}

      </div>
    </div>
  );
}
