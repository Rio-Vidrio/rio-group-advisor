"use client";

import React, { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type TreeState = {
  currentLoan: "fha" | "conventional" | null;
  // Bankruptcy & citizenship — asked before any other branch questions
  bankruptcyFHA: "yes" | "no" | null;   // FHA branch: within last 2 years?
  bankruptcyConv: "yes" | "no" | null;  // Conventional branch: within last 4 years?
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
};

const initialState: TreeState = {
  currentLoan: null,
  bankruptcyFHA: null,
  bankruptcyConv: null,
  citizenship: null,
  purchaseTiming: null,
  familySizeIncreased: null,
  hasEquity25: null,
  familySizeIncreasedLong: null,
  vacated: null,
  nextLoanType: null,
  convToFHAEquity: null,
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
    impact: "+~$450/month vs standard FHA",
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
    name: "Cross Country Conventional DPA",
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
    <span className="relative inline-flex items-center">
      <button
        type="button"
        aria-label="What is a vacating residence?"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-500 hover:bg-gray-300 text-xs font-bold leading-none focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400"
        style={{ fontSize: "10px" }}
      >
        ⓘ
      </button>
      {open && (
        <span
          className="absolute z-50 left-6 top-0 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg leading-relaxed"
          style={{ minWidth: "220px" }}
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
      className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-150 ${
        selected
          ? "border-[#C8202A] bg-red-50"
          : "border-gray-200 bg-white hover:border-gray-400 hover:shadow-sm"
      }`}
    >
      <div className={`font-bold text-lg ${selected ? "text-[#C8202A]" : "text-gray-900"}`}>
        {title}
      </div>
      {note && (
        <div className="text-xs italic text-gray-400 mt-1 leading-snug">{note}</div>
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
    <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-100 last:border-0">
      <span className="text-gray-800 font-medium text-sm flex-1">{label}</span>
      <div className="flex gap-2">
        <button
          onClick={() => onChange(true)}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
            value === true
              ? "bg-[#C8202A] text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Yes
        </button>
        <button
          onClick={() => onChange(false)}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
            value === false
              ? "bg-gray-800 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          No
        </button>
      </div>
    </div>
  );
}

function ProgramCard({ programKey }: { programKey: ProgramKey }) {
  const p = PROGRAMS[programKey];
  const isBlue = p.color === "blue";
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
      <div className={`px-4 py-3 flex items-start justify-between gap-2 ${isBlue ? "bg-blue-50" : "bg-gray-50"}`}>
        <span className="font-bold text-sm text-gray-900 leading-snug">{p.name}</span>
        <span className="shrink-0 text-xs font-bold text-white bg-[#C8202A] px-2 py-0.5 rounded-full">
          {p.minScore}
        </span>
      </div>
      <div className="px-4 py-3 flex-1">
        <ul className="space-y-1">
          {p.bullets.map((b, i) => (
            <li key={i} className="text-xs text-gray-700 flex gap-1.5">
              <span className="text-gray-400 shrink-0">•</span>
              {b}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs font-semibold text-gray-700">{p.impact}</p>
      </div>
      <div className="px-4 py-2 border-t border-gray-100">
        <p className="text-xs text-gray-400 italic">{p.note}</p>
      </div>
    </div>
  );
}

function ProgramRow({ programs }: { programs: ProgramKey[] }) {
  return (
    <div>
      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
        Available Programs
      </h4>
      <div className={`grid gap-3 ${programs.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
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
  const borderClass =
    borderColor === "red"
      ? "border-l-[#C8202A]"
      : borderColor === "green"
      ? "border-l-green-500"
      : "border-l-gray-300";

  const badgeBg =
    badge?.color === "red"
      ? "bg-[#C8202A] text-white"
      : badge?.color === "green"
      ? "bg-green-600 text-white"
      : "bg-gray-200 text-gray-700";

  return (
    <div className={`bg-white rounded-xl border border-gray-200 border-l-4 ${borderClass} p-5 space-y-4`}>
      <div className="flex items-center gap-3 flex-wrap">
        <h3 className="font-bold text-gray-900 text-base">{title}</h3>
        {badge && (
          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${badgeBg}`}>
            {badge.text}
          </span>
        )}
      </div>
      <ul className="space-y-1.5">
        {bullets.map((b, i) => (
          <li key={i} className="text-sm text-gray-700 flex gap-2">
            <span className="shrink-0">{b.icon}</span>
            {b.text}
          </li>
        ))}
      </ul>
      {flagBox && (
        <div
          className={`rounded-lg p-3 text-sm ${
            flagBox.color === "amber"
              ? "bg-amber-50 border border-amber-200 text-amber-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
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
    <div className="bg-red-50 border-2 border-[#C8202A] rounded-xl p-4 flex gap-3 items-start">
      <span className="text-[#C8202A] text-base font-bold shrink-0 mt-0.5">✗</span>
      <div>
        <div className="font-bold text-[#C8202A] text-sm mb-1">Not Available</div>
        <div className="text-sm text-gray-800 leading-snug">{reason}</div>
      </div>
    </div>
  );
}

// ─── NoPrograms card ──────────────────────────────────────────────────────────

function NoProgramsCard() {
  return (
    <div className="bg-gray-900 rounded-xl p-5 text-white space-y-2">
      <div className="font-bold text-base">No Programs Currently Available</div>
      <p className="text-sm text-gray-300 leading-relaxed">
        This client does not qualify for any available programs at this time.
        Recommend a credit and financial recovery plan before reapplying.
      </p>
    </div>
  );
}

// ─── Section Connector ────────────────────────────────────────────────────────

function SectionConnector() {
  return (
    <div className="flex items-center gap-2 pl-4 my-1">
      <div className="w-px h-6 bg-gray-200" />
      <span className="text-gray-300 text-xs">▼</span>
    </div>
  );
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

function buildBreadcrumb(state: TreeState): string[] {
  const crumbs: string[] = [];
  if (state.currentLoan === "fha") {
    crumbs.push("FHA");
    if (state.bankruptcyFHA === "yes") { crumbs.push("Bankruptcy < 2yr"); return crumbs; }
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
    if (state.bankruptcyConv === "yes") { crumbs.push("Bankruptcy < 4yr"); return crumbs; }
    if (state.citizenship === "daca") { crumbs.push("DACA"); return crumbs; }
    if (state.nextLoanType === "fha") {
      crumbs.push("Next: FHA");
      if (state.convToFHAEquity === "yes") crumbs.push("Has 25%+ Equity");
      if (state.convToFHAEquity === "no") crumbs.push("No 25%+ Equity");
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
          return { ...prev, [key]: null, citizenship: null, ...clearFromCitizenship };
        }
        if (key === "citizenship") {
          return { ...prev, citizenship: null, ...clearFromCitizenship };
        }
        if (key === "purchaseTiming") {
          return { ...prev, purchaseTiming: null, familySizeIncreased: null, hasEquity25: null, familySizeIncreasedLong: null, vacated: null };
        }
        if (key === "familySizeIncreased") return { ...prev, familySizeIncreased: null };
        if (key === "nextLoanType") return { ...prev, nextLoanType: null, convToFHAEquity: null };
        if (key === "convToFHAEquity") return { ...prev, convToFHAEquity: null };
        return { ...prev, [key]: null };
      }

      // Tapping new value → set + clear downstream
      if (key === "currentLoan") {
        return { ...initialState, currentLoan: value as TreeState["currentLoan"] };
      }
      if (key === "bankruptcyFHA" || key === "bankruptcyConv") {
        return { ...prev, [key]: value, citizenship: null, ...clearFromCitizenship };
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
        return { ...prev, nextLoanType: value as TreeState["nextLoanType"], convToFHAEquity: null };
      }
      if (key === "convToFHAEquity") {
        return { ...prev, convToFHAEquity: value as TreeState["convToFHAEquity"] };
      }
      return { ...prev, [key]: value };
    });
  }

  const resetAll = () => setState(initialState);
  const breadcrumb = buildBreadcrumb(state);

  // ── Long-ago result logic ──────────────────────────────────────────────────
  const longAgoAllAnswered =
    state.hasEquity25 !== null &&
    state.familySizeIncreasedLong !== null &&
    state.vacated !== null;

  const getLongAgoCase = (): 1 | 2 | 3 | 4 => {
    const { hasEquity25, familySizeIncreasedLong, vacated } = state;
    if (!hasEquity25) return 4;
    if (hasEquity25 && familySizeIncreasedLong && vacated) return 1;
    if (hasEquity25 && familySizeIncreasedLong && !vacated) return 2;
    return 3;
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

  const convToFHANoEquityCard = (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        The client can still proceed but must qualify carrying both mortgage payments. Review debt-to-income impact carefully.
      </div>
      <ProgramRow programs={["fhaDPA", "fhaSolar"]} />
    </div>
  );

  // ── Visibility flags ───────────────────────────────────────────────────────

  // FHA branch
  const showBankruptcyFHA     = state.currentLoan === "fha";
  const showCitizenshipFHA    = state.currentLoan === "fha" && state.bankruptcyFHA !== null;
  const fhaBankruptcyBlocked  = state.currentLoan === "fha" && state.bankruptcyFHA === "yes" && state.citizenship !== null;
  const fhaDacaBlocked        = state.currentLoan === "fha" && state.bankruptcyFHA === "no" && state.citizenship === "daca";
  const showFHAMainFlow       = state.currentLoan === "fha" && state.bankruptcyFHA === "no" && state.citizenship === "citizen";

  // Conventional branch
  const showBankruptcyConv    = state.currentLoan === "conventional";
  const showCitizenshipConv   = state.currentLoan === "conventional" && state.bankruptcyConv !== null;
  const convBankruptcyBlocked = state.currentLoan === "conventional" && state.bankruptcyConv === "yes" && state.citizenship !== null;
  const convDacaBlocked       = state.currentLoan === "conventional" && state.bankruptcyConv === "no" && state.citizenship === "daca";
  const showConvMainFlow      = state.currentLoan === "conventional" && state.bankruptcyConv === "no" && state.citizenship === "citizen";

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          {breadcrumb.length === 0 ? (
            <span className="text-sm text-gray-400 italic">No path selected yet</span>
          ) : (
            breadcrumb.map((crumb, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span className="text-gray-300 text-xs">›</span>}
                <span
                  className={`text-sm font-semibold px-2.5 py-1 rounded-full ${
                    i === breadcrumb.length - 1
                      ? "bg-[#C8202A] text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {crumb}
                </span>
              </span>
            ))
          )}
        </div>
        {state.currentLoan !== null && (
          <button
            onClick={resetAll}
            className="shrink-0 text-sm font-semibold border-2 border-[#C8202A] text-[#C8202A] px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
          >
            ↺ Start Over
          </button>
        )}
      </div>

      <div className="max-w-2xl mx-auto space-y-0">

        {/* ── SECTION 1: Always visible — current loan type ─────────────────── */}
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Existing Homeowner Options</h2>
            <p className="text-gray-500 mt-1 text-base">
              Find the best path for the client&apos;s next home purchase.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">
              What type of loan does the client currently have on their existing home?
            </p>
            <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-4">
              <p className="text-sm font-semibold text-gray-700">
                Has the client had a bankruptcy discharged within the last 2 years?
              </p>
              <div className="grid grid-cols-2 gap-4">
                <SelectionCard
                  title="Yes"
                  selected={state.bankruptcyFHA === "yes"}
                  onClick={() => selectCard("bankruptcyFHA", "yes")}
                />
                <SelectionCard
                  title="No"
                  selected={state.bankruptcyFHA === "no"}
                  onClick={() => selectCard("bankruptcyFHA", "no")}
                />
              </div>
            </div>
          </>
        )}

        {/* FHA: Citizenship question (shown after bankruptcy is answered) */}
        {showCitizenshipFHA && (
          <>
            <SectionConnector />
            <div className="space-y-4">
              <p className="text-sm font-semibold text-gray-700">
                What is the client&apos;s citizenship status?
              </p>
              <div className="grid grid-cols-2 gap-4">
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

        {/* FHA: Bankruptcy = Yes → disqualifier + route to conventional (or no programs for DACA) */}
        {fhaBankruptcyBlocked && (
          <>
            <SectionConnector />
            <div className="space-y-4">
              <DisqualifierCard reason="FHA requires 2 years post-bankruptcy discharge. No FHA programs are available at this time." />
              {state.citizenship === "citizen" ? (
                <>
                  <h3 className="text-base font-bold text-gray-900">Alternative Path — Conventional</h3>
                  {fhaToConvCard}
                </>
              ) : (
                <>
                  <DisqualifierCard reason="FHA financing is not available for DACA or work permit holders. All FHA programs are ineligible." />
                  <NoProgramsCard />
                </>
              )}
            </div>
          </>
        )}

        {/* FHA: Bankruptcy = No + DACA → FHA disqualifier + conventional only */}
        {fhaDacaBlocked && (
          <>
            <SectionConnector />
            <div className="space-y-4">
              <DisqualifierCard reason="FHA financing is not available for DACA or work permit holders. All FHA programs are ineligible." />
              <h3 className="text-base font-bold text-gray-900">Available Path — Conventional</h3>
              {fhaToConvCard}
            </div>
          </>
        )}

        {/* FHA: Bankruptcy = No + Citizen → main FHA flow ─────────────────── */}
        {showFHAMainFlow && (
          <>
            <SectionConnector />
            <div className="space-y-4">
              <p className="text-sm font-semibold text-gray-700">
                When did the client purchase their current home?
              </p>
              <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-4">
              <p className="text-sm font-semibold text-gray-700">
                Has the client&apos;s family size increased since purchasing? (marriage or children)
              </p>
              <div className="grid grid-cols-2 gap-4">
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

            {/* FHA + 2021 or Later + No → FHA to FHA disqualifier + conventional */}
            {state.familySizeIncreased === "no" && (
              <>
                <SectionConnector />
                <div className="space-y-4">
                  <DisqualifierCard reason="FHA to FHA not available — the client's new home is within 100 miles and there has been no family size increase." />
                  <h3 className="text-base font-bold text-gray-900">Recommended Path</h3>
                  {fhaToConvCard}
                </div>
              </>
            )}

            {/* FHA + 2021 or Later + Yes → options */}
            {state.familySizeIncreased === "yes" && (
              <>
                <SectionConnector />
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-gray-900">Available Options</h3>
                  <div className="space-y-4">
                    <PathCard
                      title="Path 1 — FHA → FHA (Second FHA Loan)"
                      borderColor="red"
                      bullets={[
                        { icon: "✅", text: "Family size increased" },
                        {
                          icon: "✅",
                          text: (
                            <span>
                              Must currently live in home (not{" "}
                              <span className="font-medium">vacating residence</span>
                              <VacatingTooltip />
                            </span>
                          ),
                        },
                        {
                          icon: "⚠️",
                          text: "12 months landlord history on tax returns required to offset current mortgage",
                        },
                      ]}
                      flagBox={{
                        color: "amber",
                        text: "If 12-month rental history not yet established, consider waiting or using Path 2",
                      }}
                      programs={["fhaDPA", "fhaSolar"]}
                    />
                    <PathCard
                      title="Path 2 — FHA → Conventional"
                      borderColor="gray"
                      bullets={[
                        { icon: "✅", text: "5% down" },
                        { icon: "✅", text: "No equity needed" },
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

        {/* FHA + Before 2021 → all 3 toggle questions at once */}
        {showFHAMainFlow && state.purchaseTiming === "longago" && (
          <>
            <SectionConnector />
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="font-bold text-gray-900 mb-4">Client&apos;s Situation</h3>
                <div className="space-y-1">
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
                        <span className="font-normal text-gray-500">
                          (<span className="italic">vacating residence</span>
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
                  <div className="space-y-4">
                    {(() => {
                      const c = getLongAgoCase();

                      if (c === 1) {
                        return (
                          <>
                            <h3 className="text-base font-bold text-gray-900">Available Options</h3>
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
                                      <span className="font-medium">vacating residence</span>
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
                            <div className="bg-[#C8202A] text-white rounded-xl p-5 space-y-2">
                              <h3 className="font-bold text-lg">⏱ Timing Opportunity</h3>
                              <p className="text-sm leading-relaxed text-red-100">
                                The client qualifies once they vacate. Move into the new home first — the
                                application address cannot match the current home. Once moved, all three
                                requirements are met.
                              </p>
                            </div>
                            <h3 className="text-base font-bold text-gray-900">Always Available</h3>
                            {fhaToConvCard}
                          </>
                        );
                      }

                      if (c === 3) {
                        return (
                          <>
                            <DisqualifierCard reason="FHA to FHA not available — the client's family size has not increased. Family size increase is required to obtain a second FHA loan on a home within 100 miles." />
                            {fhaToConvCard}
                          </>
                        );
                      }

                      // c === 4 — no equity
                      return (
                        <>
                          <DisqualifierCard reason="FHA to FHA not available — the current home does not have 25%+ equity. Without sufficient equity the current FHA payment cannot be offset." />
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
            <div className="space-y-4">
              <p className="text-sm font-semibold text-gray-700">
                Has the client had a bankruptcy discharged within the last 4 years?
              </p>
              <div className="grid grid-cols-2 gap-4">
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

        {/* Conventional: Citizenship question (shown after bankruptcy is answered) */}
        {showCitizenshipConv && (
          <>
            <SectionConnector />
            <div className="space-y-4">
              <p className="text-sm font-semibold text-gray-700">
                What is the client&apos;s citizenship status?
              </p>
              <div className="grid grid-cols-2 gap-4">
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

        {/* Conventional: Bankruptcy = Yes → disqualifier + route to FHA (or no programs for DACA) */}
        {convBankruptcyBlocked && (
          <>
            <SectionConnector />
            <div className="space-y-4">
              <DisqualifierCard reason="Conventional financing requires 4 years post-bankruptcy discharge. Routing to FHA options if applicable." />
              {state.citizenship === "citizen" ? (
                <>
                  <h3 className="text-base font-bold text-gray-900">Available FHA Paths</h3>
                  {convToFHAAvailableCard}
                </>
              ) : (
                <>
                  <DisqualifierCard reason="FHA financing is not available for DACA or work permit holders. All FHA programs are ineligible." />
                  <NoProgramsCard />
                </>
              )}
            </div>
          </>
        )}

        {/* Conventional: Bankruptcy = No + DACA → FHA disqualifier + conventional only */}
        {convDacaBlocked && (
          <>
            <SectionConnector />
            <div className="space-y-4">
              <DisqualifierCard reason="FHA financing is not available for DACA or work permit holders. All FHA programs are ineligible." />
              <h3 className="text-base font-bold text-gray-900">Available Path — Conventional Only</h3>
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

        {/* Conventional: Bankruptcy = No + Citizen → main conventional flow ── */}
        {showConvMainFlow && (
          <>
            <SectionConnector />
            <div className="space-y-4">
              <p className="text-sm font-semibold text-gray-700">
                Is the client looking to buy their next home with FHA or Conventional financing?
              </p>
              <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-4">
              <p className="text-sm font-semibold text-gray-700">
                Does the client&apos;s current home have 25%+ equity?
              </p>
              <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-gray-900">Client&apos;s Path</h3>
                  {convToFHAAvailableCard}
                </div>
              </>
            )}

            {state.convToFHAEquity === "no" && (
              <>
                <SectionConnector />
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-gray-900">Proceeding Without Full Equity</h3>
                  {convToFHANoEquityCard}
                </div>
              </>
            )}
          </>
        )}

        {/* Conventional + Conventional → result immediately */}
        {showConvMainFlow && state.nextLoanType === "conventional" && (
          <>
            <SectionConnector />
            <div className="space-y-4">
              <h3 className="text-base font-bold text-gray-900">Client&apos;s Path</h3>
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
