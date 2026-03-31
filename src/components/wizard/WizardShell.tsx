"use client";
import { useState, useRef, useMemo } from "react";
import Image from "next/image";
import { useReactToPrint } from "react-to-print";
import {
  ClientData,
  defaultClientData,
  ProgramEligibility,
  evaluateEligibility,
  getCrossCountryFlags,
  calculateMonthlyPayment,
} from "@/lib/loanPrograms";
import { getRates } from "@/lib/rateStore";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */
interface Props {
  onTabChange?: (tab: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Helper Components                                                  */
/* ------------------------------------------------------------------ */

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="mb-5">
      <span
        className="text-[11px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: "#C8202A" }}
      >
        {label}
      </span>
    </div>
  );
}

function SectionConnector() {
  return <div className="h-px my-8" style={{ background: "#E8E8E8" }} />;
}

function YesNoButtons({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-2 mt-2">
      {["yes", "no"].map((v) => {
        const selected = value === v;
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            style={{
              minHeight: "44px",
              padding: "0 20px",
              borderRadius: "8px",
              border: selected ? "1.5px solid #C8202A" : "1.5px solid #E8E8E8",
              background: selected ? "#C8202A" : "#FFFFFF",
              color: selected ? "#FFFFFF" : "#111111",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
              transition: "background 100ms, border-color 100ms, color 100ms",
            }}
          >
            {v === "yes" ? "Yes" : "No"}
          </button>
        );
      })}
    </div>
  );
}

function ThreeButtons({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              minHeight: "44px",
              padding: "0 20px",
              borderRadius: "8px",
              border: selected ? "1.5px solid #C8202A" : "1.5px solid #E8E8E8",
              background: selected ? "#C8202A" : "#FFFFFF",
              color: selected ? "#FFFFFF" : "#111111",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
              transition: "background 100ms, border-color 100ms, color 100ms",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function MoneyInput({
  value,
  onChange,
  placeholder,
}: {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <span
        className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium"
        style={{ color: "#9B9B9B" }}
      >
        $
      </span>
      <input
        type="number"
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: "100%",
          border: "1.5px solid #E8E8E8",
          borderRadius: "10px",
          paddingLeft: "28px",
          paddingRight: "16px",
          paddingTop: "12px",
          paddingBottom: "12px",
          fontSize: "0.9375rem",
          color: "#111111",
          background: "#FFFFFF",
          outline: "none",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "#C8202A";
          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(200,32,42,0.08)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "#E8E8E8";
          e.currentTarget.style.boxShadow = "none";
        }}
        placeholder={placeholder || "0"}
      />
    </div>
  );
}

function AlertBox({
  color,
  title,
  children,
}: {
  color: "amber" | "red" | "green" | "blue";
  title?: string;
  children: React.ReactNode;
}) {
  const styles: Record<string, React.CSSProperties> = {
    amber: { background: "#FFFBEB", borderLeft: "4px solid #F59E0B", borderRadius: "0 8px 8px 0", padding: "14px 16px", marginTop: "12px" },
    red: { background: "#FFF5F5", borderLeft: "4px solid #C8202A", borderRadius: "0 8px 8px 0", padding: "14px 16px", marginTop: "12px" },
    green: { background: "#F0FDF4", borderLeft: "4px solid #22C55E", borderRadius: "0 8px 8px 0", padding: "14px 16px", marginTop: "12px" },
    blue: { background: "#EFF6FF", borderLeft: "4px solid #3B82F6", borderRadius: "0 8px 8px 0", padding: "14px 16px", marginTop: "12px" },
  };
  const textColors: Record<string, string> = {
    amber: "#92400E",
    red: "#991B1B",
    green: "#166534",
    blue: "#1E40AF",
  };
  return (
    <div style={{ ...styles[color], fontSize: "0.875rem", color: textColors[color] }}>
      {title && <div style={{ fontWeight: 600, marginBottom: "4px" }}>{title}</div>}
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function WizardShell({ onTabChange }: Props) {
  const [client, setClient] = useState<ClientData>(defaultClientData);
  const [overrideHomeowner, setOverrideHomeowner] = useState(false);
  const [showScheduleC, setShowScheduleC] = useState(false);
  const [debtsTouched, setDebtsTouched] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef });

  /* ---- update with cascade clearing ---- */
  const update = (partial: Partial<ClientData>) => {
    setClient((prev) => {
      const updated = { ...prev, ...partial };
      // Cascade: citizenship change clears downstream
      if ("citizenship" in partial && partial.citizenship !== prev.citizenship) {
        updated.isVeteran = "";
        updated.isHomeowner = "";
        updated.hasEquity25 = "";
        updated.familySizeIncreased = "";
        updated.homeVacated = "";
        updated.ownedLast3Years = "";
        updated.hasITINWorkHistory = "";
        setOverrideHomeowner(false);
      }
      // Cascade: homeowner change
      if ("isHomeowner" in partial && partial.isHomeowner !== prev.isHomeowner) {
        updated.hasEquity25 = "";
        updated.familySizeIncreased = "";
        updated.homeVacated = "";
        setOverrideHomeowner(false);
      }
      // Cascade: co-signer change
      if ("hasCosigner" in partial && partial.hasCosigner !== "yes") {
        updated.cosignerIncome = 0;
        updated.cosignerDebts = 0;
        updated.cosignerCreditScore = 0;
      }
      // Cascade: self-employed
      if ("isSelfEmployed" in partial && partial.isSelfEmployed !== "yes") {
        updated.reducesNetIncome = "";
      }
      // Cascade: variable income
      if ("hasVariableIncome" in partial && partial.hasVariableIncome !== "yes") {
        updated.hasVariableIncomeHistory = "";
      }
      // Cascade: HOA
      if ("hasHOA" in partial && partial.hasHOA !== "yes") {
        updated.hoaAmount = 100;
      }
      return updated;
    });
  };

  /* ---- restart ---- */
  const restart = () => {
    setClient(defaultClientData);
    setOverrideHomeowner(false);
    setDebtsTouched(false);
  };

  /* ---- visibility conditions ---- */
  const showCitizenship = client.firstName.trim().length > 0;
  const isITINPath = client.citizenship === "no";
  const showHomeownerRedirect =
    client.citizenship !== "no" &&
    client.citizenship !== "" &&
    client.isHomeowner === "yes" &&
    !overrideHomeowner;
  const showIncome = client.citizenship !== "" && !showHomeownerRedirect;
  const showDebts = showIncome && client.annualIncome > 0;
  const showCredit = showDebts && debtsTouched;
  const showPurchase = showCredit && client.creditScore > 0;
  const canShowResults =
    showPurchase && client.purchasePrice > 0 && client.propertyType !== "";

  /* ---- results computation ---- */
  const { results, ccFlags, sorted, bestMatch, allIneligible } = useMemo(() => {
    if (!canShowResults)
      return {
        results: null,
        ccFlags: [] as string[],
        sorted: [] as ProgramEligibility[],
        bestMatch: null as ProgramEligibility | null,
        allIneligible: false,
      };
    const rates = getRates();
    const r = evaluateEligibility(client, {
      conventional: rates.conventional,
      fha: rates.fha,
    });
    const cc = getCrossCountryFlags(client);
    const s = [...r].sort((a, b) => {
      const scoreA =
        a.eligible && !a.conditional ? 0 : a.eligible && a.conditional ? 1 : 2;
      const scoreB =
        b.eligible && !b.conditional ? 0 : b.eligible && b.conditional ? 1 : 2;
      if (scoreA !== scoreB) return scoreA - scoreB;
      return a.totalMonthly - b.totalMonthly;
    });
    return {
      results: r,
      ccFlags: cc,
      sorted: s,
      bestMatch: s.find((x) => x.eligible && !x.conditional) || null,
      allIneligible: !s.some((x) => x.eligible),
    };
  }, [canShowResults, client]);

  /* ---- DTI preview computation ---- */
  const totalIncome =
    client.annualIncome +
    (client.hasCosigner === "yes" ? client.cosignerIncome : 0);
  const totalDebts =
    client.monthlyDebts +
    (client.hasCosigner === "yes" ? client.cosignerDebts : 0);
  const monthlyIncome = totalIncome / 12;
  const maxPayment45 = monthlyIncome * 0.45 - totalDebts;
  const maxPayment57 = monthlyIncome * 0.57 - totalDebts;

  const rates = getRates();
  const estimatedPITI =
    client.purchasePrice > 0
      ? (() => {
          const loan = client.purchasePrice * 0.97;
          const pi = calculateMonthlyPayment(loan, rates.conventional, 30);
          const tax = (client.purchasePrice * 0.0045) / 12;
          const ins = 1350 / 12;
          return pi + tax + ins;
        })()
      : 0;
  const housingDTI =
    monthlyIncome > 0 && estimatedPITI > 0
      ? (estimatedPITI / monthlyIncome) * 100
      : 0;
  const totalDTI_preview =
    monthlyIncome > 0 && estimatedPITI > 0
      ? ((estimatedPITI + totalDebts) / monthlyIncome) * 100
      : 0;

  const fmt = (n: number) =>
    "$" + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const pct = (n: number) => n.toFixed(1) + "%";

  /* ================================================================ */
  /*  JSX                                                              */
  /* ================================================================ */

  /* ---- Progress step calculation ---- */
  const steps = [
    { label: "Client Info", done: client.firstName.trim().length > 0 },
    { label: "Citizenship", done: client.citizenship !== "" },
    { label: "Income", done: client.annualIncome > 0 },
    { label: "Debts", done: debtsTouched },
    { label: "Credit", done: client.creditScore > 0 },
    { label: "Purchase", done: client.purchasePrice > 0 && client.propertyType !== "" },
    { label: "Results", done: canShowResults },
  ];
  const completedCount = steps.filter((s) => s.done).length;

  return (
    <div>
      {/* Schedule C Modal */}
      {showScheduleC && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowScheduleC(false)}>
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowScheduleC(false)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-lg z-10"
            >
              ✕
            </button>
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">IRS Schedule C — Net Profit (Line 31)</h3>
              <div className="relative border border-gray-200 rounded-lg overflow-hidden mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://www.irs.gov/pub/irs-pdf/f1040sc.pdf"
                  alt="IRS Schedule C Form"
                  style={{ display: "none" }}
                />
                <div className="bg-gray-50 p-8 text-center">
                  <div className="inline-block border-2 border-gray-300 rounded-lg p-6 bg-white mb-4" style={{ maxWidth: "420px" }}>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">IRS Form 1040 — Schedule C</p>
                    <p className="text-sm font-bold text-gray-800 mb-4">Profit or Loss From Business</p>
                    <div className="space-y-2 text-left text-sm text-gray-600">
                      <div className="flex justify-between border-b border-gray-100 pb-1"><span>Line 29: Tentative profit</span><span className="text-gray-400">$_____</span></div>
                      <div className="flex justify-between border-b border-gray-100 pb-1"><span>Line 30: Business use of home</span><span className="text-gray-400">$_____</span></div>
                      <div className="flex justify-between items-center py-2 px-3 rounded-lg" style={{ background: "#FFF5F5", border: "2px solid #C8202A" }}>
                        <span className="font-bold text-gray-900">Line 31: Net profit (or loss)</span>
                        <span className="font-bold text-[#C8202A]">← USE THIS</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-[#C8202A] font-bold text-sm">
                    <span className="text-2xl">↑</span>
                    <span>NET PROFIT — Use this number</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Source: IRS Form 1040 Schedule C. Use the 2-year average of Line 31 for income qualification.
              </p>
              <a
                href="https://www.irs.gov/pub/irs-pdf/f1040sc.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 text-xs text-[#C8202A] underline font-medium"
              >
                Download full IRS Schedule C form (PDF) ↗
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Page header row */}
      <div className="flex items-center justify-between mb-6 no-print">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#111111", letterSpacing: "-0.02em" }}>
            Client Consultation
          </h1>
          <p className="text-sm mt-1" style={{ color: "#6B6B6B" }}>
            Complete each section — results appear once all details are filled.
          </p>
        </div>
        {client.firstName && (
          <button
            onClick={restart}
            style={{
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: "#C8202A",
              border: "1.5px solid #C8202A",
              borderRadius: "8px",
              padding: "7px 16px",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            ↻ Start Over
          </button>
        )}
      </div>

      {/* Progress indicator */}
      {client.firstName.trim().length > 0 && (
        <div className="mb-6 no-print">
          <div className="flex items-center gap-1.5 flex-wrap">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "4px 10px",
                    borderRadius: "999px",
                    fontSize: "0.6875rem",
                    fontWeight: 600,
                    background: step.done ? "#C8202A" : "#F7F6F4",
                    color: step.done ? "#FFFFFF" : "#9B9B9B",
                    border: step.done ? "none" : "1px solid #E8E8E8",
                    transition: "background 200ms, color 200ms",
                  }}
                >
                  {step.done && <span style={{ fontSize: "9px" }}>✓</span>}
                  {step.label}
                </div>
                {i < steps.length - 1 && (
                  <div style={{ width: "12px", height: "1px", background: "#E8E8E8", flexShrink: 0 }} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2" style={{ fontSize: "0.75rem", color: "#9B9B9B" }}>
            {completedCount} of {steps.length} sections complete
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  SINGLE CARD — all sections live inside one container         */}
      {/* ============================================================ */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "16px",
          border: "1px solid #E8E8E8",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          padding: "36px",
        }}
      >
        {/* ---------------------------------------------------------- */}
        {/*  SECTION 1 — CLIENT INFO (always visible)                   */}
        {/* ---------------------------------------------------------- */}
        <SectionLabel label="Client Info" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "#111111" }}>
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={client.firstName}
              onChange={(e) => update({ firstName: e.target.value })}
              className="w-full outline-none" style={{ border: "1.5px solid #E8E8E8", borderRadius: "10px", padding: "12px 16px", fontSize: "0.9375rem", color: "#111111", background: "#FFFFFF" }}
              placeholder="First name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "#111111" }}>
              Last Name
            </label>
            <input
              type="text"
              value={client.lastName}
              onChange={(e) => update({ lastName: e.target.value })}
              className="w-full outline-none" style={{ border: "1.5px solid #E8E8E8", borderRadius: "10px", padding: "12px 16px", fontSize: "0.9375rem", color: "#111111", background: "#FFFFFF" }}
              placeholder="Last name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "#111111" }}>
              Date
            </label>
            <input
              type="date"
              value={client.date}
              onChange={(e) => update({ date: e.target.value })}
              className="w-full outline-none" style={{ border: "1.5px solid #E8E8E8", borderRadius: "10px", padding: "12px 16px", fontSize: "0.9375rem", color: "#111111", background: "#FFFFFF" }}
            />
          </div>
        </div>

        {/* Co-signer Y/N — immediately after client name fields */}
        {client.firstName.trim().length > 0 && (
          <div className="mt-4">
            <label className="block text-sm font-medium mb-2" style={{ color: "#111111" }}>
              Co-signer?
            </label>
            <YesNoButtons
              value={client.hasCosigner}
              onChange={(v) => update({ hasCosigner: v as "yes" | "no" })}
            />

            {client.hasCosigner === "yes" && (
              <div className="mt-4 space-y-3 fade-in">
                <div style={{ background: "#FFFBEB", borderLeft: "4px solid #F59E0B", borderRadius: "0 8px 8px 0", padding: "14px 16px" }}>
                  <p className="text-sm font-semibold" style={{ color: "#92400E", marginBottom: "4px" }}>Co-Signer Requirements</p>
                  <p className="text-sm" style={{ color: "#92400E" }}>
                    All following answers should reflect the combined profile of both the client and co-signer.
                    If either party triggers a condition, apply it to both. The lesser of the two credit scores
                    will be used for program qualification.
                  </p>
                </div>
                <div style={{ background: "#EFF6FF", borderLeft: "4px solid #3B82F6", borderRadius: "0 8px 8px 0", padding: "14px 16px" }}>
                  <p className="text-sm" style={{ color: "#1E40AF" }}>
                    From this point forward all questions apply to both borrowers equally. One answer covers both.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------- */}
        {/*  SECTION 2 — CITIZENSHIP & ELIGIBILITY                      */}
        {/* ---------------------------------------------------------- */}
        {showCitizenship && (
          <>
            <SectionConnector />
            <SectionLabel label="Citizenship & Eligibility" />

            {/* Q: Citizenship */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: "#111111" }}>
                Is the client a U.S. citizen or permanent resident?
              </label>
              <ThreeButtons
                options={[
                  { label: "Yes", value: "yes" },
                  { label: "No", value: "no" },
                  { label: "DACA / Work Permit", value: "daca" },
                ]}
                value={client.citizenship}
                onChange={(v) =>
                  update({ citizenship: v as "yes" | "no" | "daca" })
                }
              />
            </div>

            {/* ITIN Path Warning */}
            {isITINPath && (
              <AlertBox color="amber" title="⚠️ No DPA options available">
                <p className="mt-1">
                  Standard down payment assistance programs require U.S.
                  citizenship, permanent residency, or work permit. The{" "}
                  <strong>ITIN Loan</strong> may be available —{" "}
                  <strong>10% down only</strong>, 680+ credit score, and 2 years
                  of documented work history or tax returns required.
                </p>
              </AlertBox>
            )}

            {/* VA Loan Question (citizens and DACA only) */}
            {(client.citizenship === "yes" ||
              client.citizenship === "daca") && (
              <div className="mb-4 mt-4">
                <label className="block text-sm font-medium mb-2" style={{ color: "#111111" }}>
                  Is the client using a VA loan?
                </label>
                <YesNoButtons
                  value={client.isVeteran}
                  onChange={(v) => update({ isVeteran: v as "yes" | "no" })}
                />
                {client.isVeteran === "yes" && (
                  <AlertBox color="green">
                    <p>
                      VA loan eligibility detected — strong new build candidate
                      if targeting outer West or East Valley areas. Confirm
                      DD-214 or Certificate of Eligibility.
                    </p>
                  </AlertBox>
                )}
              </div>
            )}

            {/* Homeowner Question (not for ITIN path) */}
            {client.citizenship !== "" && client.citizenship !== "no" && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: "#111111" }}>
                    Is the client currently a homeowner?
                  </label>
                  <YesNoButtons
                    value={client.isHomeowner}
                    onChange={(v) =>
                      update({ isHomeowner: v as "yes" | "no" })
                    }
                  />
                </div>

                {/* Homeowner Redirect Card */}
                {showHomeownerRedirect && (
                  <div className="space-y-4 mt-4 fade-in">
                    <div style={{ border: "1.5px solid #E8E8E8", borderTop: "4px solid #C8202A", borderRadius: "16px", padding: "32px", background: "#FFFFFF", textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                      <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🏠</div>
                      <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#111111", marginBottom: "8px" }}>
                        This client is an existing homeowner.
                      </h3>
                      <p style={{ fontSize: "0.875rem", color: "#6B6B6B", marginBottom: "24px", maxWidth: "400px", margin: "0 auto 24px" }}>
                        Use the Existing Homeowner tool to explore their purchase options — built specifically for clients who already own and want to buy again.
                      </p>
                      <button
                        onClick={() => onTabChange?.("homeowner")}
                        style={{ padding: "12px 32px", borderRadius: "10px", background: "#C8202A", color: "#FFFFFF", fontWeight: 700, fontSize: "0.9375rem", border: "none", cursor: "pointer" }}
                      >
                        Open Existing Homeowner Tool →
                      </button>
                    </div>
                    <div className="text-center">
                      <button
                        onClick={() => setOverrideHomeowner(true)}
                        style={{ fontSize: "0.8125rem", color: "#9B9B9B", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                      >
                        Continue with first-time buyer wizard anyway
                      </button>
                    </div>
                  </div>
                )}

                {/* Homeowner sub-questions (when homeowner=yes but override is active) */}
                {client.isHomeowner === "yes" && overrideHomeowner && (
                  <div className="pl-4 ml-2 space-y-4 mb-4 fade-in" style={{ borderLeft: "3px solid rgba(200,32,42,0.2)" }}>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: "#111111" }}>
                        Does the client have 25%+ equity?
                      </label>
                      <YesNoButtons
                        value={client.hasEquity25}
                        onChange={(v) =>
                          update({ hasEquity25: v as "yes" | "no" })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: "#111111" }}>
                        Has the client&apos;s family size increased since
                        purchasing?
                      </label>
                      <YesNoButtons
                        value={client.familySizeIncreased}
                        onChange={(v) =>
                          update({ familySizeIncreased: v as "yes" | "no" })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: "#111111" }}>
                        Has the client vacated the home or is it currently
                        rented?
                      </label>
                      <YesNoButtons
                        value={client.homeVacated}
                        onChange={(v) =>
                          update({ homeVacated: v as "yes" | "no" })
                        }
                      />
                    </div>
                  </div>
                )}

                {/* Owned in last 3 years */}
                {!showHomeownerRedirect && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2" style={{ color: "#111111" }}>
                      Has the client owned a home in the last 3 years?
                    </label>
                    <YesNoButtons
                      value={client.ownedLast3Years}
                      onChange={(v) =>
                        update({ ownedLast3Years: v as "yes" | "no" })
                      }
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ---------------------------------------------------------- */}
        {/*  SECTION 3 — INCOME & EMPLOYMENT                            */}
        {/* ---------------------------------------------------------- */}
        {showIncome && (
          <>
            <SectionConnector />
            <SectionLabel label="Income & Employment" />

            {/* Annual Income */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: "#111111" }}>
                Annual Gross Income
              </label>
              <MoneyInput
                value={client.annualIncome}
                onChange={(v) => update({ annualIncome: v })}
                placeholder="75000"
              />
              {client.hasCosigner === "yes" && (
                <p className="text-xs text-gray-400 italic mt-1">Enter primary borrower income only — co-signer income entered separately below</p>
              )}
            </div>

            {/* Co-signer income/debt fields — shown when co-signer selected at top */}
            {client.annualIncome > 0 && (
              <>
                {client.hasCosigner === "yes" && (
                  <div className="pl-4 ml-2 space-y-4 mb-4 fade-in" style={{ borderLeft: "3px solid rgba(200,32,42,0.2)" }}>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: "#111111" }}>
                        Co-signer Annual Gross Income
                      </label>
                      <MoneyInput
                        value={client.cosignerIncome}
                        onChange={(v) => update({ cosignerIncome: v })}
                      />
                      <p className="text-xs text-gray-400 italic mt-1">Combined with client income for DTI qualification</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: "#111111" }}>
                        Co-signer Monthly Debts
                      </label>
                      <MoneyInput
                        value={client.cosignerDebts}
                        onChange={(v) => update({ cosignerDebts: v })}
                      />
                      <p className="text-xs text-gray-400 italic mt-1">Combined with client debts for total DTI calculation</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: "#111111" }}>
                        Co-signer Credit Score
                      </label>
                      <input
                        type="number"
                        value={client.cosignerCreditScore || ""}
                        onChange={(e) =>
                          update({ cosignerCreditScore: Number(e.target.value) })
                        }
                        className="w-full outline-none" style={{ border: "1.5px solid #E8E8E8", borderRadius: "10px", padding: "12px 16px", fontSize: "0.9375rem", color: "#111111", background: "#FFFFFF" }}
                        placeholder="700"
                      />
                    </div>
                  </div>
                )}

                {/* Self-employed */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: "#111111" }}>
                    Is the client self-employed or do they receive 1099 income?
                  </label>
                  <YesNoButtons
                    value={client.isSelfEmployed}
                    onChange={(v) =>
                      update({ isSelfEmployed: v as "yes" | "no" })
                    }
                  />
                </div>

                {client.isSelfEmployed === "yes" && (
                  <div className="pl-4 ml-2 mb-4 fade-in" style={{ borderLeft: "3px solid rgba(200,32,42,0.2)" }}>
                    {/* Schedule C info card */}
                    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 mb-4">
                      <p className="text-sm text-blue-800">
                        Use net income from <strong>Schedule C (Line 31)</strong> — take a 2-year average of the net profit figure. With Cross Country Mortgage, 1 year may be acceptable if the client has been in business 5 or more years.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowScheduleC(true)}
                        className="mt-2 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#C8202A] text-[#C8202A] hover:bg-[#C8202A]/5 transition-colors"
                      >
                        View Schedule C Sample
                      </button>
                    </div>

                    <label className="block text-sm font-medium mb-2" style={{ color: "#111111" }}>
                      Does the client reduce their net income on taxes to lower
                      tax liability?
                    </label>
                    <YesNoButtons
                      value={client.reducesNetIncome}
                      onChange={(v) =>
                        update({ reducesNetIncome: v as "yes" | "no" })
                      }
                    />
                    {client.reducesNetIncome === "yes" && (
                      <AlertBox color="amber" title="⚠️ Complex income file">
                        <p className="mt-1">
                          Recommend Cross Country Mortgage partner for this
                          client.
                        </p>
                      </AlertBox>
                    )}
                  </div>
                )}

                {/* Employment gaps */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: "#111111" }}>
                    Does the client have any gaps in employment in the last 2
                    years?
                  </label>
                  <YesNoButtons
                    value={client.hasEmploymentGaps}
                    onChange={(v) =>
                      update({ hasEmploymentGaps: v as "yes" | "no" })
                    }
                  />
                  {client.hasEmploymentGaps === "yes" && (
                    <p className="text-xs text-gray-500 mt-2">
                      Documentation may be required — this is OK and manageable.
                    </p>
                  )}
                </div>

                {/* Variable income */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: "#111111" }}>
                    Is any portion of the client&apos;s income commission-based
                    or variable (bonuses, overtime)?
                  </label>
                  <YesNoButtons
                    value={client.hasVariableIncome}
                    onChange={(v) =>
                      update({ hasVariableIncome: v as "yes" | "no" })
                    }
                  />
                </div>

                {client.hasVariableIncome === "yes" && (
                  <div className="pl-4 ml-2 mb-4 fade-in" style={{ borderLeft: "3px solid rgba(200,32,42,0.2)" }}>
                    <label className="block text-sm font-medium mb-2" style={{ color: "#111111" }}>
                      Does the client have 12 or more months of documented
                      history with this income?
                    </label>
                    <YesNoButtons
                      value={client.hasVariableIncomeHistory}
                      onChange={(v) =>
                        update({
                          hasVariableIncomeHistory: v as "yes" | "no",
                        })
                      }
                    />
                    {client.hasVariableIncomeHistory === "no" && (
                      <AlertBox
                        color="amber"
                        title="⚠️ Variable income history required"
                      >
                        <p className="mt-1">
                          Variable income requires 12 months of history to be
                          used for qualifying. Consider waiting until that
                          threshold is met before applying for Programs 1 or 2,
                          or refer to Cross Country Mortgage if they need to
                          move sooner.
                        </p>
                      </AlertBox>
                    )}
                    {client.hasVariableIncomeHistory === "yes" && (
                      <AlertBox color="green">
                        <p>
                          ✓ 12+ months of history — variable income can be used
                          for qualifying.
                        </p>
                      </AlertBox>
                    )}
                  </div>
                )}

                {/* ITIN Loan Eligibility Check */}
                {client.citizenship === "no" && (
                  <div style={{ background: "#EFF6FF", borderLeft: "4px solid #3B82F6", borderRadius: "0 10px 10px 0", padding: "16px 18px", marginBottom: "16px" }}>
                    <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1E40AF", marginBottom: "12px" }}>
                      ITIN Loan Eligibility Check
                    </p>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: "#111111" }}>
                        Does the client have 2 years of documented work history
                        and/or tax returns?
                      </label>
                      <YesNoButtons
                        value={client.hasITINWorkHistory}
                        onChange={(v) =>
                          update({ hasITINWorkHistory: v as "yes" | "no" })
                        }
                      />
                      {client.hasITINWorkHistory === "yes" && (
                        <p className="mt-2 text-sm text-green-700">
                          ✓ Eligible for ITIN Loan — 10% down, 680+ credit
                          score required.
                        </p>
                      )}
                      {client.hasITINWorkHistory === "no" && (
                        <p className="mt-2 text-sm text-amber-700">
                          ⚠️ 2 years of documented history required to qualify
                          for ITIN Loan.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ---------------------------------------------------------- */}
        {/*  SECTION 4 — MONTHLY DEBTS                                  */}
        {/* ---------------------------------------------------------- */}
        {showDebts && (
          <>
            <SectionConnector />
            <SectionLabel label="Monthly Debts" />
            <p className="text-xs text-gray-500 mb-3">
              Car loans, student loans, credit cards, personal loans, etc. Do
              NOT include rent.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: "#111111" }}>
                Total Monthly Debt Payments
              </label>
              <MoneyInput
                value={client.monthlyDebts}
                onChange={(v) => {
                  update({ monthlyDebts: v });
                  setDebtsTouched(true);
                }}
                placeholder="500"
              />
              {client.hasCosigner === "yes" && (
                <p className="text-xs text-gray-400 italic mt-1">Include client debts only — co-signer debts entered separately above</p>
              )}
              {!debtsTouched && (
                <button
                  onClick={() => setDebtsTouched(true)}
                  style={{ fontSize: "0.8125rem", color: "#C8202A", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", marginTop: "8px", padding: 0 }}
                >
                  No debts — continue →
                </button>
              )}
            </div>

            {/* Live DTI Preview */}
            {debtsTouched && monthlyIncome > 0 && (
              <div className="fade-in" style={{ background: "#F7F6F4", borderRadius: "12px", border: "1px solid #E8E8E8", padding: "20px", marginBottom: "16px" }}>
                <h4 style={{ fontWeight: 600, fontSize: "0.8125rem", marginBottom: "14px", color: "#6B6B6B", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Live DTI Preview
                </h4>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div style={{ background: "#FFFFFF", borderRadius: "10px", padding: "14px", border: "1px solid #E8E8E8" }}>
                    <div style={{ fontSize: "0.6875rem", color: "#6B6B6B", marginBottom: "4px" }}>Max Payment (45% DTI)</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#111111" }}>
                      ${maxPayment45 > 0 ? maxPayment45.toFixed(0) : "—"}
                    </div>
                    <div style={{ fontSize: "0.6875rem", color: "#9B9B9B" }}>Front-End Guide</div>
                  </div>
                  <div style={{ background: "#FFFFFF", borderRadius: "10px", padding: "14px", border: "1px solid #E8E8E8" }}>
                    <div style={{ fontSize: "0.6875rem", color: "#6B6B6B", marginBottom: "4px" }}>Max Payment (57% DTI)</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#111111" }}>
                      ${maxPayment57 > 0 ? maxPayment57.toFixed(0) : "—"}
                    </div>
                    <div style={{ fontSize: "0.6875rem", color: "#9B9B9B" }}>Back-End Guide</div>
                  </div>
                </div>
                {estimatedPITI > 0 && (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div style={{ background: "#FFFFFF", borderRadius: "10px", padding: "14px", border: "1px solid #E8E8E8" }}>
                      <div style={{ fontSize: "0.6875rem", color: "#6B6B6B", marginBottom: "4px" }}>Housing DTI</div>
                      <div style={{ fontSize: "1.25rem", fontWeight: 700, color: housingDTI > 46 ? "#C8202A" : housingDTI > 43 ? "#D97706" : "#16A34A" }}>
                        {housingDTI.toFixed(1)}%
                      </div>
                    </div>
                    <div style={{ background: "#FFFFFF", borderRadius: "10px", padding: "14px", border: "1px solid #E8E8E8" }}>
                      <div style={{ fontSize: "0.6875rem", color: "#6B6B6B", marginBottom: "4px" }}>Total DTI</div>
                      <div style={{ fontSize: "1.25rem", fontWeight: 700, color: totalDTI_preview > 50 ? "#C8202A" : totalDTI_preview > 43 ? "#D97706" : "#16A34A" }}>
                        {totalDTI_preview.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                )}
                {maxPayment45 > 0 && maxPayment45 <= 2100 && (
                  <AlertBox color="red" title="⚠️ Limited Buying Power">
                    <p className="mt-1">
                      Based on this income and debt load, the maximum qualifying
                      payment is around ${maxPayment45.toFixed(0)}. This limits
                      home price options significantly.
                    </p>
                    <p className="mt-2">
                      <strong>Consider:</strong> Adding a co-signer or having
                      the client pay off existing debt to increase buying power.
                    </p>
                    {client.creditScore >= 660 && (
                      <p className="mt-2">
                        A condo may be achievable in the $1,500–$2,100/month
                        range with conventional financing.
                      </p>
                    )}
                  </AlertBox>
                )}
                {client.hasCosigner === "yes" && (
                  <div className="text-xs text-gray-500 mt-2">
                    Combined income: ${totalIncome.toLocaleString()}/yr |
                    Combined debts: ${totalDebts.toLocaleString()}/mo
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ---------------------------------------------------------- */}
        {/*  SECTION 5 — CREDIT PROFILE                                 */}
        {/* ---------------------------------------------------------- */}
        {showCredit && (
          <>
            <SectionConnector />
            <SectionLabel label="Credit Profile" />

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: "#111111" }}>
                Credit Score (Primary Borrower)
              </label>
              <input
                type="number"
                value={client.creditScore || ""}
                onChange={(e) =>
                  update({ creditScore: Number(e.target.value) })
                }
                className="w-full outline-none" style={{ border: "1.5px solid #E8E8E8", borderRadius: "10px", padding: "12px 16px", fontSize: "0.9375rem", color: "#111111", background: "#FFFFFF" }}
                placeholder="680"
              />
            </div>

            {client.creditScore > 0 && client.creditScore < 580 && (
              <AlertBox color="red" title="⛔ Score below 580">
                <p className="mt-1">
                  Refer to Cross Country Mortgage for credit repair pathway.
                  Show client their target score and estimated max home price
                  once they reach 600+.
                </p>
              </AlertBox>
            )}

            {client.creditScore > 0 && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: "#111111" }}>
                    Any late payments in the last 24 months?
                  </label>
                  <YesNoButtons
                    value={client.hasLatePayments}
                    onChange={(v) =>
                      update({ hasLatePayments: v as "yes" | "no" })
                    }
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: "#111111" }}>
                    Any open collections (excluding medical)?
                  </label>
                  <YesNoButtons
                    value={client.hasCollections}
                    onChange={(v) =>
                      update({ hasCollections: v as "yes" | "no" })
                    }
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: "#111111" }}>
                    Traditional tradelines active 12+ months
                  </label>
                  <p className="text-xs text-gray-500 mb-1">
                    Personal loan, credit card, student loan, car loan
                  </p>
                  <ThreeButtons
                    options={[
                      { label: "0", value: "0" },
                      { label: "1", value: "1" },
                      { label: "2+", value: "2+" },
                    ]}
                    value={client.traditionalTradelines}
                    onChange={(v) =>
                      update({
                        traditionalTradelines: v as "0" | "1" | "2+",
                      })
                    }
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: "#111111" }}>
                    Alternative tradelines active
                  </label>
                  <p className="text-xs text-gray-500 mb-1">
                    Netflix, phone bill, gym, utility, cell phone, app
                    subscriptions
                  </p>
                  <ThreeButtons
                    options={[
                      { label: "0", value: "0" },
                      { label: "1", value: "1" },
                      { label: "2+", value: "2+" },
                    ]}
                    value={client.alternativeTradelines}
                    onChange={(v) =>
                      update({
                        alternativeTradelines: v as "0" | "1" | "2+",
                      })
                    }
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: "#111111" }}>
                    Does the client have 12 months of verifiable rental history
                    from a landlord?
                  </label>
                  <YesNoButtons
                    value={client.hasRentalHistory}
                    onChange={(v) =>
                      update({ hasRentalHistory: v as "yes" | "no" })
                    }
                  />
                </div>
              </>
            )}
          </>
        )}

        {/* ---------------------------------------------------------- */}
        {/*  SECTION 6 — PURCHASE DETAILS                               */}
        {/* ---------------------------------------------------------- */}
        {showPurchase && (
          <>
            <SectionConnector />
            <SectionLabel label="Purchase Details" />

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: "#111111" }}>
                Target Purchase Price
              </label>
              <MoneyInput
                value={client.purchasePrice}
                onChange={(v) => update({ purchasePrice: v })}
                placeholder="350000"
              />
            </div>

            {client.purchasePrice > 0 && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: "#111111" }}>
                    Property Type
                  </label>
                  <ThreeButtons
                    options={[
                      { label: "Single Family", value: "single-family" },
                      { label: "Condo", value: "condo" },
                      { label: "Townhome", value: "townhome" },
                      { label: "New Build", value: "new-build" },
                    ]}
                    value={client.propertyType}
                    onChange={(v) =>
                      update({
                        propertyType: v as ClientData["propertyType"],
                      })
                    }
                  />
                </div>

                {client.propertyType === "condo" && (
                  <AlertBox color="amber">
                    <p>
                      ⚠️ Condo — conventional only, 660+ score required. FHA
                      programs ineligible.
                    </p>
                  </AlertBox>
                )}

                {client.propertyType !== "" && (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2" style={{ color: "#111111" }}>
                        Target Area
                      </label>
                      <select
                        value={client.targetArea}
                        onChange={(e) =>
                          update({ targetArea: e.target.value })
                        }
                        className="w-full outline-none" style={{ border: "1.5px solid #E8E8E8", borderRadius: "10px", padding: "12px 16px", fontSize: "0.9375rem", color: "#111111", background: "#FFFFFF" }}
                      >
                        <option value="">Select area...</option>
                        <option value="Central Area">Central Area</option>
                        <option value="West Valley Within the 101">
                          West Valley Within the 101
                        </option>
                        <option value="East Valley Within the 202">
                          East Valley Within the 202
                        </option>
                        <option value="West Valley Outside the 101">
                          West Valley Outside the 101
                        </option>
                        <option value="East Valley Outside the 202">
                          East Valley Outside the 202
                        </option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {/* New build / outer valley alert */}
                    {(client.propertyType === "new-build" ||
                      client.targetArea.includes("Outside")) &&
                      client.targetArea !== "" && (
                        <AlertBox color="blue" title="New Build Opportunity">
                          <p className="mt-1">
                            Builder rate buydowns (1.5–2% below market) available
                            in this area. Check the{" "}
                            <strong>New Build vs. Resale</strong> comparison in
                            Calculators for a side-by-side analysis.
                          </p>
                        </AlertBox>
                      )}

                    <div className="mb-4 mt-4">
                      <label className="block text-sm font-medium mb-2" style={{ color: "#111111" }}>
                        HOA?
                      </label>
                      <YesNoButtons
                        value={client.hasHOA}
                        onChange={(v) =>
                          update({ hasHOA: v as "yes" | "no" })
                        }
                      />
                    </div>

                    {/* No-HOA advisory for outer valley */}
                    {client.hasHOA === "no" &&
                      client.targetArea.includes("Outside") && (
                        <AlertBox color="amber">
                          <p>
                            ⚠️ <strong>Advisory:</strong> Most homes in this
                            area carry an HOA. If the client expects no HOA,
                            consider reconsidering the location or confirming the
                            specific property. Update this to <strong>Yes</strong>{" "}
                            and enter the typical HOA amount (~$100–$150/mo).
                          </p>
                        </AlertBox>
                      )}

                    {client.hasHOA === "yes" && (
                      <p className="text-xs text-gray-400 italic ml-2 mb-4">Enter HOA amount in the Payment Calculator if needed</p>
                    )}

                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2" style={{ color: "#111111" }}>
                        Down Payment Available
                      </label>
                      <MoneyInput
                        value={client.downPaymentAvailable}
                        onChange={(v) =>
                          update({ downPaymentAvailable: v })
                        }
                        placeholder="5000"
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* ---------------------------------------------------------- */}
        {/*  SECTION 7 — RESULTS                                        */}
        {/* ---------------------------------------------------------- */}
        {canShowResults && results && sorted.length > 0 && (
          <>
            <SectionConnector />
            <SectionLabel label="Recommendations" />

            <div ref={printRef} className="print-container">
              {/* Print Header */}
              <div className="print-only mb-6 text-center">
                <Image
                  src="/rio-landscape.png"
                  alt="The Rio Group"
                  width={200}
                  height={60}
                  className="mx-auto mb-2"
                />
                <p className="text-sm text-gray-500">
                  Prepared for {client.firstName} {client.lastName} |{" "}
                  {client.date}
                </p>
              </div>

              <h3 className="text-xl font-bold mb-1">
                Recommendations for {client.firstName || "Client"}
              </h3>
              <p className="text-gray-500 text-sm mb-5">
                Based on the information provided, here are the loan programs
                ranked by fit.
              </p>

              {/* Client Snapshot */}
              <div style={{ background: "#F7F6F4", borderRadius: "12px", border: "1px solid #E8E8E8", padding: "20px", marginBottom: "24px" }}>
                <h4 style={{ fontWeight: 600, fontSize: "0.6875rem", color: "#6B6B6B", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "14px" }}>
                  Client Snapshot
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Annual Income", value: fmt(client.annualIncome), sub: client.hasCosigner === "yes" ? `+ Co-signer: ${fmt(client.cosignerIncome)}` : undefined },
                    { label: "Monthly Debts", value: `${fmt(client.monthlyDebts)}/mo`, sub: client.hasCosigner === "yes" ? `+ Co-signer: ${fmt(client.cosignerDebts)}/mo` : undefined },
                    { label: "Monthly Income", value: fmt(monthlyIncome), sub: `Total debts: ${fmt(totalDebts)}/mo` },
                    { label: "Purchase Price", value: fmt(client.purchasePrice), sub: `Credit: ${client.creditScore} · Down: ${fmt(client.downPaymentAvailable)}` },
                  ].map((item) => (
                    <div key={item.label} style={{ background: "#FFFFFF", borderRadius: "10px", padding: "14px", border: "1px solid #E8E8E8" }}>
                      <div style={{ fontSize: "0.6875rem", color: "#6B6B6B", marginBottom: "4px" }}>{item.label}</div>
                      <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "#111111" }}>{item.value}</div>
                      {item.sub && <div style={{ fontSize: "0.6875rem", color: "#9B9B9B", marginTop: "2px" }}>{item.sub}</div>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Cross Country Flags */}
              {ccFlags.length > 0 && (
                <div className="bg-amber-50 border-2 border-amber-400 rounded-xl px-5 py-4 mb-5">
                  <h4 className="font-bold text-amber-800 mb-2">
                    ⚠️ Cross Country Mortgage Referral Recommended
                  </h4>
                  <p className="text-sm text-amber-700 mb-2">
                    This client may be a stronger candidate for our lending
                    partner at Cross Country Mortgage. They specialize in complex
                    files — including self-employment, new jobs, employment gaps,
                    and credit repair pathways. Make the introduction as the
                    agent of record.
                  </p>
                  <ul className="text-sm text-amber-800 space-y-1">
                    {ccFlags.map((flag, i) => (
                      <li key={i}>• {flag}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* All Ineligible */}
              {allIneligible && (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl px-5 py-4 mb-5">
                  <h4 className="font-bold text-red-800 mb-2">
                    ⚠️ No Programs Currently Qualify
                  </h4>
                  <p className="text-sm text-red-700">
                    Based on the client&apos;s profile, none of the 5 programs
                    are a current match. Consider referring to Cross Country
                    Mortgage or reviewing the disqualification reasons below.
                  </p>
                </div>
              )}

              {/* Best Match */}
              {bestMatch && (
                <div style={{ border: "1px solid #E8E8E8", borderTop: "4px solid #C8202A", borderRadius: "16px", padding: "24px", marginBottom: "24px", background: "#FFFFFF", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", position: "relative" }}>
                  <span style={{ position: "absolute", top: "-1px", left: "24px", background: "#C8202A", color: "#FFFFFF", fontSize: "0.6875rem", fontWeight: 700, padding: "4px 12px", borderRadius: "0 0 8px 8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Best Match
                  </span>
                  <h4 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#111111", marginTop: "8px" }}>
                    {bestMatch.program.name}
                  </h4>
                  <p style={{ fontSize: "0.875rem", color: "#6B6B6B", marginTop: "2px", marginBottom: "18px" }}>
                    {bestMatch.program.loanType} — {bestMatch.program.term}-year term
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {[
                      { label: "Est. Monthly Payment", value: fmt(bestMatch.totalMonthly), highlight: true },
                      { label: "Down Payment", value: fmt(bestMatch.downPaymentRequired) },
                      { label: "Financed Amount", value: fmt(bestMatch.loanAmount), sub: bestMatch.program.id === 4 ? "Includes ~$35K solar" : bestMatch.program.id === 3 ? "DPA covers down" : undefined },
                    ].map((item) => (
                      <div key={item.label} style={{ background: "#F7F6F4", borderRadius: "10px", padding: "14px" }}>
                        <div style={{ fontSize: "0.6875rem", color: "#6B6B6B", marginBottom: "4px" }}>{item.label}</div>
                        <div style={{ fontSize: "1.125rem", fontWeight: 700, color: item.highlight ? "#C8202A" : "#111111" }}>{item.value}</div>
                        {item.sub && <div style={{ fontSize: "0.6875rem", color: "#9B9B9B" }}>{item.sub}</div>}
                      </div>
                    ))}
                    <div style={{ background: "#F7F6F4", borderRadius: "10px", padding: "14px" }}>
                      <div style={{ fontSize: "0.6875rem", color: "#6B6B6B", marginBottom: "4px" }}>Est. DTI</div>
                      {(() => {
                        const dti = monthlyIncome > 0 ? ((bestMatch.totalMonthly + totalDebts) / monthlyIncome) * 100 : 0;
                        return (
                          <div style={{ fontSize: "1.125rem", fontWeight: 700, color: dti > bestMatch.program.maxDTI ? "#C8202A" : dti > 43 ? "#D97706" : "#16A34A" }}>
                            {pct(dti)}
                          </div>
                        );
                      })()}
                      <div style={{ fontSize: "0.6875rem", color: "#9B9B9B" }}>Max: {bestMatch.program.maxDTI}%</div>
                    </div>
                  </div>

                  {/* Max price for best match */}
                  {bestMatch.suggestedMaxPrice > 0 && (
                    <div className="bg-[#f5f5f5] rounded-lg px-4 py-3 text-sm mb-4 border border-gray-200">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-semibold">
                          Max Purchase Price:
                        </span>
                        <span className="font-bold text-base">
                          {fmt(bestMatch.suggestedMaxPrice)}
                        </span>
                        {bestMatch.suggestedMaxPriceBound === "program" && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                            Program Limit
                          </span>
                        )}
                        {bestMatch.suggestedMaxPriceBound === "dti" && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                            Income-Based
                          </span>
                        )}
                        {client.purchasePrice <= bestMatch.suggestedMaxPrice &&
                          client.purchasePrice > 0 && (
                            <span className="text-xs text-green-600 font-semibold">
                              ✓{" "}
                              {fmt(
                                bestMatch.suggestedMaxPrice -
                                  client.purchasePrice
                              )}{" "}
                              headroom
                            </span>
                          )}
                        {client.purchasePrice > bestMatch.suggestedMaxPrice && (
                          <span className="text-xs text-red-600 font-semibold">
                            ⚠️{" "}
                            {fmt(
                              client.purchasePrice -
                                bestMatch.suggestedMaxPrice
                            )}{" "}
                            over limit
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {bestMatch.suggestedMaxPriceNote}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 style={{ fontSize: "0.75rem", fontWeight: 600, color: "#16A34A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>Pros</h5>
                      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "7px" }}>
                        {bestMatch.program.pros.map((p, i) => (
                          <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "0.875rem", color: "#111111" }}>
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#16A34A", flexShrink: 0, marginTop: "6px" }} />
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6B6B6B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>Cons</h5>
                      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "7px" }}>
                        {bestMatch.program.cons.map((c, i) => (
                          <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "0.875rem", color: "#6B6B6B" }}>
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#9B9B9B", flexShrink: 0, marginTop: "6px" }} />
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  {bestMatch.program.id === 4 && (
                    <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5">
                      <p className="text-sm text-amber-800 font-medium">+~$200/month added to payment for solar — partially offset by electric savings</p>
                    </div>
                  )}
                  {bestMatch.program.id === 3 && (
                    <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5">
                      <p className="text-sm text-amber-800 font-medium">+~$450/month added to payment for down payment assistance 2nd lien</p>
                    </div>
                  )}
                </div>
              )}

              {/* All Programs */}
              <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#111111", marginBottom: "16px" }}>
                All Programs — Detailed Breakdown
              </h4>
              <div className="space-y-4">
                {sorted.map((result) => {
                  const isEligible = result.eligible && !result.conditional;
                  const isConditional = result.eligible && result.conditional;
                  const status = isEligible ? "qualifies" : isConditional ? "conditional" : "disqualified";
                  const statusStyles: Record<string, React.CSSProperties> = {
                    qualifies: { background: "#F0FDF4", border: "1px solid #BBF7D0", borderLeft: "4px solid #16A34A", borderRadius: "12px", padding: "20px" },
                    conditional: { background: "#FFFBEB", border: "1px solid #FDE68A", borderLeft: "4px solid #F59E0B", borderRadius: "12px", padding: "20px" },
                    disqualified: { background: "#FFF5F5", border: "1px solid #FECACA", borderLeft: "4px solid #C8202A", borderRadius: "12px", padding: "20px" },
                  };
                  const statusBadges: Record<string, { label: string; bg: string; color: string }> = {
                    qualifies: { label: "Qualifies", bg: "#DCFCE7", color: "#166534" },
                    conditional: { label: "Conditional", bg: "#FEF9C3", color: "#854D0E" },
                    disqualified: { label: "Disqualified", bg: "#FEE2E2", color: "#991B1B" },
                  };
                  const badge = statusBadges[status];
                  const programDTI = monthlyIncome > 0 ? ((result.totalMonthly + totalDebts) / monthlyIncome) * 100 : 0;
                  const priceExceedsSuggested = client.purchasePrice > result.suggestedMaxPrice && result.suggestedMaxPrice > 0;

                  return (
                    <div key={result.program.id} style={statusStyles[status]}>
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "14px" }}>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#111111" }}>{result.program.name}</span>
                          <span style={{ fontSize: "0.8125rem", color: "#6B6B6B", marginLeft: "8px" }}>{result.program.loanType} — {result.program.term}yr</span>
                        </div>
                        <span style={{ fontSize: "0.6875rem", fontWeight: 700, padding: "3px 10px", borderRadius: "999px", background: badge.bg, color: badge.color, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          {badge.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                        {[
                          { label: "Total Monthly", value: fmt(result.totalMonthly) },
                          { label: "Financed Amount", value: fmt(result.loanAmount), sub: result.program.id === 4 ? "Incl. ~$35K solar" : result.program.id === 3 ? "DPA covers down" : undefined },
                          { label: "Rate", value: `${result.effectiveRate.toFixed(2)}%` },
                        ].map((item) => (
                          <div key={item.label} style={{ background: "rgba(255,255,255,0.7)", borderRadius: "8px", padding: "10px 12px" }}>
                            <div style={{ fontSize: "0.625rem", color: "#6B6B6B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "3px" }}>{item.label}</div>
                            <div style={{ fontSize: "1rem", fontWeight: 700, color: "#111111" }}>{item.value}</div>
                            {item.sub && <div style={{ fontSize: "0.625rem", color: "#9B9B9B" }}>{item.sub}</div>}
                          </div>
                        ))}
                        <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: "8px", padding: "10px 12px" }}>
                          <div style={{ fontSize: "0.625rem", color: "#6B6B6B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "3px" }}>Est. DTI</div>
                          <div style={{ fontSize: "1rem", fontWeight: 700, color: programDTI > result.program.maxDTI ? "#C8202A" : programDTI > 43 ? "#D97706" : "#16A34A" }}>
                            {pct(programDTI)}
                          </div>
                          <div style={{ fontSize: "0.625rem", color: "#9B9B9B" }}>Max: {result.program.maxDTI}%</div>
                        </div>
                      </div>
                      {result.suggestedMaxPrice > 0 && (
                        <div
                          className={`rounded-lg px-4 py-3 text-sm mb-3 ${
                            priceExceedsSuggested
                              ? "bg-red-100/80 border border-red-300"
                              : "bg-white/50 border border-gray-200"
                          }`}
                        >
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="font-semibold">
                              {priceExceedsSuggested ? "⚠️ " : ""}Max Purchase
                              Price:
                            </span>
                            <span className="font-bold text-base">
                              {fmt(result.suggestedMaxPrice)}
                            </span>
                            {result.suggestedMaxPriceBound === "program" && (
                              <span className="text-xs bg-white/70 px-2 py-0.5 rounded-full font-medium opacity-80">
                                Program Limit
                              </span>
                            )}
                            {result.suggestedMaxPriceBound === "dti" && (
                              <span className="text-xs bg-white/70 px-2 py-0.5 rounded-full font-medium opacity-80">
                                Income-Based
                              </span>
                            )}
                            {priceExceedsSuggested && (
                              <span className="text-xs font-semibold text-red-700">
                                {fmt(
                                  client.purchasePrice -
                                    result.suggestedMaxPrice
                                )}{" "}
                                over limit
                              </span>
                            )}
                            {!priceExceedsSuggested &&
                              client.purchasePrice > 0 && (
                                <span className="text-xs font-semibold text-green-700">
                                  ✓{" "}
                                  {fmt(
                                    result.suggestedMaxPrice -
                                      client.purchasePrice
                                  )}{" "}
                                  headroom
                                </span>
                              )}
                          </div>
                          <p className="text-xs mt-1 opacity-70">
                            {result.suggestedMaxPriceNote}
                          </p>
                          {priceExceedsSuggested && (
                            <p className="text-xs mt-1.5 opacity-80">
                              Consider lowering the purchase price to{" "}
                              {fmt(result.suggestedMaxPrice)} or below
                              {client.hasCosigner !== "yes"
                                ? ", adding a co-signer,"
                                : ""}{" "}
                              or reducing monthly debts.
                            </p>
                          )}
                        </div>
                      )}
                      {result.program.id === 4 && (
                        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
                          <p className="text-xs text-amber-800 font-medium">+~$200/month added to payment for solar — partially offset by electric savings</p>
                        </div>
                      )}
                      {result.program.id === 3 && (
                        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
                          <p className="text-xs text-amber-800 font-medium">+~$450/month added to payment for down payment assistance 2nd lien</p>
                        </div>
                      )}
                      {result.reasons.length > 0 && (
                        <div style={{ fontSize: "0.8125rem", color: "#6B6B6B", marginTop: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
                          {result.reasons.map((r, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                              <span style={{ flexShrink: 0, marginTop: "1px" }}>·</span>
                              {r}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Next Steps */}
              <div style={{ marginTop: "24px", background: "#F7F6F4", borderRadius: "12px", border: "1px solid #E8E8E8", padding: "20px" }}>
                <h4 style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#111111", marginBottom: "8px" }}>Next Steps</h4>
                {ccFlags.length > 0 ? (
                  <p style={{ fontSize: "0.875rem", color: "#6B6B6B", lineHeight: "1.6" }}>
                    Introduce the client to our lending partner at Cross Country Mortgage for specialized support with their file.
                  </p>
                ) : (
                  <p style={{ fontSize: "0.875rem", color: "#6B6B6B", lineHeight: "1.6" }}>
                    Guide the client through the next steps in the process.
                  </p>
                )}
              </div>

              {/* Disclaimer */}
              <div style={{ marginTop: "20px", fontSize: "0.75rem", color: "#9B9B9B", textAlign: "center" }}>
                The Rio Group — powered by AZ &amp; Associates
                <br />
                All estimates for informational purposes only. Subject to lender approval.
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mt-6 pt-6 no-print" style={{ borderTop: "1px solid #E8E8E8" }}>
              <button
                onClick={() => handlePrint()}
                style={{ padding: "12px 28px", borderRadius: "10px", background: "#C8202A", color: "#FFFFFF", fontWeight: 600, fontSize: "0.9375rem", border: "none", cursor: "pointer" }}
              >
                Print / Save PDF
              </button>
              <button
                onClick={restart}
                style={{ padding: "12px 24px", borderRadius: "10px", border: "1.5px solid #E8E8E8", background: "#FFFFFF", color: "#6B6B6B", fontWeight: 600, fontSize: "0.9375rem", cursor: "pointer" }}
              >
                Start New Consultation
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
