"use client";

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type TreeState = {
  currentLoan: "fha" | "conventional" | null;
  // FHA branch
  purchaseTiming: "recent" | "longago" | null;
  familySizeIncreased: "yes" | "no" | null;
  // FHA 10+ years toggles
  hasEquity25: boolean | null;
  familySizeIncreasedLong: boolean | null;
  vacated: boolean | null;
  // Conventional branch
  nextLoanType: "fha" | "conventional" | null;
  convToFHAEquity: "yes" | "no" | null;
};

const initialState: TreeState = {
  currentLoan: null,
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function SelectionCard({
  title,
  subtitle,
  selected,
  onClick,
}: {
  title: string;
  subtitle?: string;
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
      {subtitle && (
        <div className={`text-sm mt-1 ${selected ? "text-red-700" : "text-gray-500"}`}>
          {subtitle}
        </div>
      )}
    </button>
  );
}

function PillToggle({
  label,
  value,
  onChange,
}: {
  label: string;
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
  bullets: { icon: string; text: string }[];
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

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

function buildBreadcrumb(state: TreeState): string[] {
  const crumbs: string[] = [];
  if (state.currentLoan === "fha") {
    crumbs.push("FHA");
    if (state.purchaseTiming === "recent") {
      crumbs.push("Within 3 Years");
      if (state.familySizeIncreased === "yes") crumbs.push("Family Size Increased");
      if (state.familySizeIncreased === "no") crumbs.push("No Family Size Change");
    } else if (state.purchaseTiming === "longago") {
      crumbs.push("10+ Years Ago");
    }
  } else if (state.currentLoan === "conventional") {
    crumbs.push("Conventional");
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

  // Long-ago toggle screen local state
  const [showLongAgoResults, setShowLongAgoResults] = useState(false);

  const set = <K extends keyof TreeState>(key: K, value: TreeState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
    setShowLongAgoResults(false);
  };

  const resetAll = () => {
    setState(initialState);
    setShowLongAgoResults(false);
  };

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
    return 3; // equity yes, but family no (or other combo)
  };

  // ── Conventional-to-FHA path cards ────────────────────────────────────────
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
        You can still proceed but must qualify carrying both mortgage payments. Speak with your agent about debt-to-income impact.
      </div>
      <ProgramRow programs={["fhaDPA", "fhaSolar"]} />
    </div>
  );

  // ── FHA→Conventional always-available card ─────────────────────────────────
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

      <div className="max-w-2xl mx-auto">

        {/* ── ENTRY SCREEN ────────────────────────────────────────────────── */}
        {state.currentLoan === null && (
          <div className="text-center space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Existing Homeowner Options</h2>
              <p className="text-gray-500 mt-2 text-base">
                Let&apos;s find the best path for your next home purchase.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-4">
                What type of loan do you currently have on your existing home?
              </p>
              <div className="grid grid-cols-2 gap-4">
                <SelectionCard
                  title="FHA"
                  subtitle="FHA-insured mortgage"
                  selected={state.currentLoan === "fha"}
                  onClick={() => set("currentLoan", "fha")}
                />
                <SelectionCard
                  title="Conventional"
                  subtitle="Conventional mortgage"
                  selected={state.currentLoan === "conventional"}
                  onClick={() => set("currentLoan", "conventional")}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── BRANCH A — FHA ──────────────────────────────────────────────── */}

        {/* A1 — Purchase timing */}
        {state.currentLoan === "fha" && state.purchaseTiming === null && (
          <div className="space-y-5">
            <p className="text-sm font-semibold text-gray-700">
              When did you purchase your current home?
            </p>
            <div className="grid grid-cols-2 gap-4">
              <SelectionCard
                title="Within the last 3 years"
                selected={state.purchaseTiming === "recent"}
                onClick={() => set("purchaseTiming", "recent")}
              />
              <SelectionCard
                title="10+ years ago"
                selected={state.purchaseTiming === "longago"}
                onClick={() => set("purchaseTiming", "longago")}
              />
            </div>
          </div>
        )}

        {/* A-Recent — Family size */}
        {state.currentLoan === "fha" &&
          state.purchaseTiming === "recent" &&
          state.familySizeIncreased === null && (
            <div className="space-y-5">
              <p className="text-sm font-semibold text-gray-700">
                Has your family size increased since purchasing? (marriage or children)
              </p>
              <div className="grid grid-cols-2 gap-4">
                <SelectionCard
                  title="Yes"
                  selected={state.familySizeIncreased === "yes"}
                  onClick={() => set("familySizeIncreased", "yes")}
                />
                <SelectionCard
                  title="No"
                  selected={state.familySizeIncreased === "no"}
                  onClick={() => set("familySizeIncreased", "no")}
                />
              </div>
            </div>
          )}

        {/* A-Recent-No */}
        {state.currentLoan === "fha" &&
          state.purchaseTiming === "recent" &&
          state.familySizeIncreased === "no" && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-gray-900">Your Best Path</h3>
              {fhaToConvCard}
            </div>
          )}

        {/* A-Recent-Yes */}
        {state.currentLoan === "fha" &&
          state.purchaseTiming === "recent" &&
          state.familySizeIncreased === "yes" && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-gray-900">Your Options</h3>
              <div className="space-y-4">
                <PathCard
                  title="Path 1 — FHA → FHA (Second FHA Loan)"
                  borderColor="red"
                  bullets={[
                    { icon: "✅", text: "Family size increased" },
                    { icon: "✅", text: "Must currently live in home (not vacation residence)" },
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
          )}

        {/* A-LongAgo */}
        {state.currentLoan === "fha" && state.purchaseTiming === "longago" && (
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-bold text-gray-900 mb-4">Check Your Situation</h3>
              <div className="space-y-1">
                <PillToggle
                  label="Does your current home have 25%+ equity?"
                  value={state.hasEquity25}
                  onChange={(v) => set("hasEquity25", v)}
                />
                <PillToggle
                  label="Has your family size increased? (marriage or children)"
                  value={state.familySizeIncreasedLong}
                  onChange={(v) => set("familySizeIncreasedLong", v)}
                />
                <PillToggle
                  label="Have you already vacated the home or established a different address?"
                  value={state.vacated}
                  onChange={(v) => set("vacated", v)}
                />
              </div>
              {longAgoAllAnswered && !showLongAgoResults && (
                <button
                  onClick={() => setShowLongAgoResults(true)}
                  className="mt-5 w-full bg-[#C8202A] hover:bg-red-700 text-white font-bold py-2.5 rounded-lg transition-colors text-sm"
                >
                  See My Options →
                </button>
              )}
            </div>

            {/* Long-ago results */}
            {showLongAgoResults && (
              <div className="space-y-4">
                {(() => {
                  const c = getLongAgoCase();

                  if (c === 1) {
                    return (
                      <>
                        <h3 className="text-base font-bold text-gray-900">Your Options</h3>
                        <PathCard
                          title="FHA → FHA Available ✅"
                          borderColor="green"
                          bullets={[
                            { icon: "✅", text: "Has 25%+ equity — current payment can be offset" },
                            { icon: "✅", text: "Family size has increased" },
                            { icon: "✅", text: "Home has been vacated / different address established" },
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
                        <div className="bg-[#C8202A] text-white rounded-xl p-5 space-y-2">
                          <h3 className="font-bold text-lg">⏱ Timing Opportunity</h3>
                          <p className="text-sm leading-relaxed text-red-100">
                            You qualify once you vacate. Move into your new home first — your application
                            address cannot match your current home. Once moved, all three requirements are met.
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
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                          <strong>FHA to FHA not available</strong> — family size requirement not met.
                        </div>
                        {fhaToConvCard}
                      </>
                    );
                  }

                  // c === 4
                  return (
                    <>
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700">
                        Without 25% equity, the current FHA payment cannot be offset. Conventional path recommended.
                      </div>
                      {fhaToConvCard}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* ── BRANCH B — Conventional ─────────────────────────────────────── */}

        {/* B1 — Next loan type */}
        {state.currentLoan === "conventional" && state.nextLoanType === null && (
          <div className="space-y-5">
            <p className="text-sm font-semibold text-gray-700">
              Are you looking to buy your next home with FHA or Conventional financing?
            </p>
            <div className="grid grid-cols-2 gap-4">
              <SelectionCard
                title="FHA"
                selected={state.nextLoanType === "fha"}
                onClick={() => set("nextLoanType", "fha")}
              />
              <SelectionCard
                title="Conventional"
                selected={state.nextLoanType === "conventional"}
                onClick={() => set("nextLoanType", "conventional")}
              />
            </div>
          </div>
        )}

        {/* B-FHA — Equity question */}
        {state.currentLoan === "conventional" &&
          state.nextLoanType === "fha" &&
          state.convToFHAEquity === null && (
            <div className="space-y-5">
              <p className="text-sm font-semibold text-gray-700">
                Does your current home have 25%+ equity?
              </p>
              <div className="grid grid-cols-2 gap-4">
                <SelectionCard
                  title="Yes"
                  selected={state.convToFHAEquity === "yes"}
                  onClick={() => set("convToFHAEquity", "yes")}
                />
                <SelectionCard
                  title="No"
                  selected={state.convToFHAEquity === "no"}
                  onClick={() => set("convToFHAEquity", "no")}
                />
              </div>
            </div>
          )}

        {/* B-FHA-Yes */}
        {state.currentLoan === "conventional" &&
          state.nextLoanType === "fha" &&
          state.convToFHAEquity === "yes" && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-gray-900">Your Path</h3>
              {convToFHAAvailableCard}
            </div>
          )}

        {/* B-FHA-No */}
        {state.currentLoan === "conventional" &&
          state.nextLoanType === "fha" &&
          state.convToFHAEquity === "no" && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-gray-900">Proceeding Without Full Equity</h3>
              {convToFHANoEquityCard}
            </div>
          )}

        {/* B-Conventional */}
        {state.currentLoan === "conventional" && state.nextLoanType === "conventional" && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-gray-900">Your Path</h3>
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
        )}

      </div>
    </div>
  );
}
