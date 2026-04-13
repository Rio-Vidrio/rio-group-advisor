"use client";

import { useState, useEffect, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import html2canvas from "html2canvas";
import { getRates, Rates, defaultRates } from "@/lib/rateStore";
import { TRG_LOGO_BLACK_B64, AZ_LOGO_BLACK_B64 } from "@/lib/printLogos";

/* ── Helpers ── */
const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const fmtComma = (n: number) => n === 0 ? "" : Math.round(n).toLocaleString("en-US");
const parseComma = (s: string) => Number(s.replace(/[^0-9.-]/g, "")) || 0;

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#4A4845",
  marginBottom: "6px", fontFamily: "'DM Sans', sans-serif",
};
const inputStyle: React.CSSProperties = {
  width: "100%", background: "white", border: "1px solid #D4D0C8",
  borderRadius: "8px", padding: "12px 14px", fontSize: "1rem",
  color: "#0D0D0D", outline: "none", fontFamily: "'DM Sans', sans-serif",
};

/* ── Reusable inputs ── */
function MoneyInput({ label, value, onChange, placeholder }: {
  label: string; value: number; onChange: (v: number) => void; placeholder?: string;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
        <input type="text" inputMode="numeric" value={fmtComma(value)}
          onChange={(e) => onChange(parseComma(e.target.value))}
          style={{ ...inputStyle, paddingLeft: "28px" }} placeholder={placeholder || "0"} />
      </div>
    </div>
  );
}

function NumberInput({ label, value, onChange, suffix, placeholder }: {
  label: string; value: number; onChange: (v: number) => void; suffix?: string; placeholder?: string;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div className="relative">
        <input type="number" inputMode="decimal" value={value || ""}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          style={inputStyle} placeholder={placeholder || "0"} />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{suffix}</span>}
      </div>
    </div>
  );
}

/* ── Section connector ── */
function SectionConnector() {
  return <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
    <div style={{ width: 2, height: 24, background: "#D4D0C8" }} />
  </div>;
}

function SectionLabel({ label }: { label: string }) {
  return <div className="section-label mb-3">{label}</div>;
}

/* ── Inline Schedule C Reference ── */
function ScheduleCInline() {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-200 bg-white">
        <h4 className="text-sm font-bold text-gray-900">Where to Find Your Income — IRS Schedule C</h4>
        <p className="text-xs text-gray-500 mt-0.5">Use Line 31 from your federal tax return (Form 1040 Schedule C)</p>
      </div>
      <div className="p-5">
        <div className="inline-block border-2 border-gray-300 rounded-lg p-5 bg-white w-full max-w-md">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1.5">IRS Form 1040 — Schedule C</p>
          <p className="text-sm font-bold text-gray-800 mb-3">Profit or Loss From Business</p>
          <div className="space-y-1.5 text-sm text-gray-600">
            <div className="flex justify-between border-b border-gray-100 pb-1"><span>Line 29: Tentative profit</span><span className="text-gray-400">$_____</span></div>
            <div className="flex justify-between border-b border-gray-100 pb-1"><span>Line 30: Business use of home</span><span className="text-gray-400">$_____</span></div>
            <div className="flex justify-between items-center py-2 px-3 rounded-lg" style={{ background: "#FFF5F5", border: "2px solid #C8202A" }}>
              <span className="font-bold text-gray-900">Line 31: Net profit (or loss)</span>
              <span className="font-bold text-[#C8202A]">← USE THIS</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[#C8202A] font-bold text-xs mt-3">
          <span className="text-lg">↑</span>
          <span>Enter this number for each tax year below</span>
        </div>
        <p className="text-xs text-gray-400 mt-3">For S-Corp / LLC owners: use net income from K-1 distributions plus any W2 salary paid from the business. Enter total net qualifying income below.</p>
        <a href="https://www.irs.gov/pub/irs-pdf/f1040sc.pdf" target="_blank" rel="noopener noreferrer"
          className="inline-block mt-2 text-xs text-[#C8202A] underline font-medium">
          Download full IRS Schedule C form (PDF) ↗
        </a>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════ */
/*  SELF-EMPLOYED WIZARD                                                      */
/* ════════════════════════════════════════════════════════════════════════════ */

interface SelfEmployedWizardProps {
  onTabChange?: (tab: string) => void;
}

export default function SelfEmployedWizard({ onTabChange }: SelfEmployedWizardProps) {
  const [rates, setRates] = useState<Rates>(defaultRates);
  useEffect(() => { setRates(getRates()); }, []);

  const convRate = rates.conventional || 6.25;
  const fhaRate = rates.fha || 5.75;
  const bsRate = convRate + 1.5;

  /* ── Step 1: Client Info ── */
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [clientDate, setClientDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [hasCosigner, setHasCosigner] = useState<"yes" | "no" | null>(null);
  const [cosignerIncome, setCosignerIncome] = useState(0);
  const [cosignerDebts, setCosignerDebts] = useState(0);
  const [cosignerCredit, setCosignerCredit] = useState(0);

  /* ── Step 2: Credit & Business ── */
  const [creditScore, setCreditScore] = useState(0);
  const [businessType, setBusinessType] = useState<string | null>(null);
  const [monthlyDebts, setMonthlyDebts] = useState(0);
  const [homeownership, setHomeownership] = useState<string | null>(null);

  /* ── Step 3: Income ── */
  const [prevYearIncome, setPrevYearIncome] = useState(0);
  const [recentYearIncome, setRecentYearIncome] = useState(0);
  const [cosignerW2, setCosignerW2] = useState(0);

  /* ── Step 4: Purchase Details ── */
  const [purchasePrice, setPurchasePrice] = useState(450000);

  /* ── Tax Amendment Simulator ── */
  const [simOpen, setSimOpen] = useState(false);
  const [simPrevIncome, setSimPrevIncome] = useState(0);
  const [simRecentIncome, setSimRecentIncome] = useState(0);
  const [simDebts, setSimDebts] = useState(0);
  const [simCosignerIncome, setSimCosignerIncome] = useState(0);
  const [simPrice, setSimPrice] = useState(450000);

  /* ── Print ── */
  const printRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const [imgLoading, setImgLoading] = useState(false);

  const todayStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    pageStyle: `
      @page { margin: 0.5in; size: letter portrait; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; height: 0 !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; }
      .print-only { display: block !important; }
    `,
  });

  const downloadJPG = async () => {
    const el = summaryRef.current;
    if (!el) return;
    setImgLoading(true);
    el.style.display = "block";
    el.style.position = "fixed";
    el.style.left = "-9999px";
    try {
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
      const link = document.createElement("a");
      link.download = `Rio-Group-SelfEmployed${firstName ? `-${firstName.replace(/\s+/g, "-")}` : ""}.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      link.click();
    } finally {
      el.style.display = ""; el.style.position = ""; el.style.left = "";
      setImgLoading(false);
    }
  };

  /* ── Derived calculations ── */
  const step1Complete = firstName.trim() !== "" && hasCosigner !== null;
  const step2Complete = step1Complete && creditScore > 0 && businessType !== null && homeownership !== null;
  const step3Complete = step2Complete && prevYearIncome > 0 && recentYearIncome > 0;

  const twoYearAvg = (prevYearIncome + recentYearIncome) / 2;
  const monthlyAvg = twoYearAvg / 12;
  const totalCosignerMonthly = hasCosigner === "yes" ? cosignerW2 / 12 : 0;
  const combinedMonthly = monthlyAvg + totalCosignerMonthly;
  const totalDebts = monthlyDebts + (hasCosigner === "yes" ? cosignerDebts : 0);
  const effectiveCredit = hasCosigner === "yes" && cosignerCredit > 0
    ? Math.min(creditScore, cosignerCredit) : creditScore;

  const creditBlocked = effectiveCredit > 0 && effectiveCredit < 680;
  const creditWarning = effectiveCredit >= 680 && effectiveCredit < 700;
  const creditGood = effectiveCredit >= 700;

  const step4Complete = step3Complete && purchasePrice > 0 && !creditBlocked;

  /* Payment calculations */
  const calcPayment = (loanAmt: number, rate: number, termYears: number) => {
    const r = rate / 100 / 12;
    const n = termYears * 12;
    return r > 0 ? (loanAmt * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : loanAmt / n;
  };

  const taxRate = 0.0045;
  const insuranceAnnual = 1350;
  const fhaMipUpfront = 0.0175; // 1.75% financed into loan
  const fhaMipAnnual = 0.0055; // 0.55% annual MIP

  // FHA Full Doc — 3.5% down
  const fhaDown = purchasePrice * 0.035;
  const fhaBaseLoan = purchasePrice - fhaDown;
  const fhaLoanWithMip = fhaBaseLoan * (1 + fhaMipUpfront); // UFMIP financed
  const fhaPI = calcPayment(fhaLoanWithMip, fhaRate, 30);
  const fhaTax = purchasePrice * taxRate / 12;
  const fhaIns = insuranceAnnual / 12;
  const fhaMipMonthly = fhaBaseLoan * fhaMipAnnual / 12;
  const fhaPITI = fhaPI + fhaTax + fhaIns + fhaMipMonthly;

  // Bank statement — 10% down, no PMI
  const bsDown = purchasePrice * 0.1;
  const bsLoan = purchasePrice * 0.9;
  const bsPI = calcPayment(bsLoan, bsRate, 30);
  const bsTax = purchasePrice * taxRate / 12;
  const bsIns = insuranceAnnual / 12;
  const bsPITI = bsPI + bsTax + bsIns;

  // Qualification check — full doc (FHA) at 45% DTI
  const maxMonthlyPayment = combinedMonthly * 0.45 - totalDebts;
  const fdQualifies = step3Complete && maxMonthlyPayment >= fhaPITI;

  // Income needed for full doc (FHA)
  const incomeNeededMonthly = (fhaPITI + totalDebts) / 0.45;
  const avgNeededAnnual = incomeNeededMonthly * 12;
  const recentYearNeeded = avgNeededAnnual * 2 - prevYearIncome;
  const additionalIncome = Math.max(0, recentYearNeeded - recentYearIncome);
  const additionalTax = additionalIncome * 0.25;

  // Payment difference
  const paymentDiff = bsPITI - fhaPITI;
  const mipSavings = fhaMipMonthly; // bank statement saves the MIP
  const netDiff = paymentDiff - mipSavings;

  // Recommendation
  const recommendFullDoc = fdQualifies && !creditBlocked;
  const recommendBankStatement = !fdQualifies && !creditBlocked;

  // Max qualifying prices
  const calcMaxPriceFHA = () => {
    let lo = 0, hi = 2000000;
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2;
      const baseLoan = mid * 0.965;
      const loanMip = baseLoan * (1 + fhaMipUpfront);
      const pi = calcPayment(loanMip, fhaRate, 30);
      const tax = mid * taxRate / 12;
      const ins = insuranceAnnual / 12;
      const mip = baseLoan * fhaMipAnnual / 12;
      if (pi + tax + ins + mip + totalDebts < combinedMonthly * 0.45) lo = mid; else hi = mid;
    }
    return Math.floor(lo);
  };
  const calcMaxPriceBS = () => {
    let lo = 0, hi = 2000000;
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2;
      const pi = calcPayment(mid * 0.9, bsRate, 30);
      const tax = mid * taxRate / 12;
      const ins = insuranceAnnual / 12;
      if (pi + tax + ins + totalDebts < combinedMonthly * 0.45) lo = mid; else hi = mid;
    }
    return Math.floor(lo);
  };
  const maxPriceFD = step3Complete ? calcMaxPriceFHA() : 0;
  const maxPriceBS = step3Complete ? calcMaxPriceBS() : 0;
  const neitherWorks = !fdQualifies && maxPriceBS < purchasePrice && !creditBlocked;

  /* ── Go to Client Wizard with prefilled data ── */
  const goToClientWizard = () => {
    const prefill = {
      firstName,
      lastName,
      date: clientDate,
      annualIncome: twoYearAvg,
      monthlyDebts,
      creditScore,
      isSelfEmployed: "yes" as const,
      hasCosigner: hasCosigner === "yes" ? "yes" as const : "no" as const,
      cosignerIncome: hasCosigner === "yes" ? cosignerIncome : 0,
      cosignerDebts: hasCosigner === "yes" ? cosignerDebts : 0,
      cosignerCreditScore: hasCosigner === "yes" ? cosignerCredit : 0,
    };
    window.dispatchEvent(new CustomEvent("prefill-wizard", { detail: prefill }));
    onTabChange?.("wizard");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ── Tax Amendment Simulator Calcs ── */
  const simAvg = (simPrevIncome + simRecentIncome) / 2;
  const simMonthly = simAvg / 12 + simCosignerIncome / 12;
  const simMaxPrice = (() => {
    let lo = 0, hi = 2000000;
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2;
      const baseLoan = mid * 0.965;
      const loanMip = baseLoan * (1 + fhaMipUpfront);
      const pi = calcPayment(loanMip, fhaRate, 30);
      const tax = mid * taxRate / 12;
      const ins = insuranceAnnual / 12;
      const mip = baseLoan * fhaMipAnnual / 12;
      if (pi + tax + ins + mip + simDebts < simMonthly * 0.45) lo = mid; else hi = mid;
    }
    return Math.floor(lo);
  })();
  const simIncomeNeededMonthly = (() => {
    const baseLoan = simPrice * 0.965;
    const loanMip = baseLoan * (1 + fhaMipUpfront);
    const pi = calcPayment(loanMip, fhaRate, 30);
    const tax = simPrice * taxRate / 12;
    const ins = insuranceAnnual / 12;
    const mip = baseLoan * fhaMipAnnual / 12;
    return (pi + tax + ins + mip + simDebts) / 0.45;
  })();
  const simAvgNeeded = simIncomeNeededMonthly * 12;
  const simRecentNeeded = simAvgNeeded * 2 - simPrevIncome;
  const simAdditional = Math.max(0, simRecentNeeded - simRecentIncome);
  const simAdditionalTax = simAdditional * 0.25;

  /* ════════════════════════════════════════════════════════════════════════ */
  /*  RENDER                                                                 */
  /* ════════════════════════════════════════════════════════════════════════ */
  return (
    <div>
      <div ref={printRef}>

        {/* ── Print summary card ── */}
        <div ref={summaryRef} className="print-only" style={{ maxWidth: 680, background: "#FFFFFF", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          {/* Header */}
          <div style={{ padding: "20px 28px", borderBottom: "3px solid #C8202A", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={TRG_LOGO_BLACK_B64} alt="The Rio Group" style={{ height: 44, width: "auto", display: "block" }} />
              <div>
                <div style={{ color: "#111", fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}>The Rio Group</div>
                <div style={{ color: "#999", fontSize: 9, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" }}>Built Different</div>
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={AZ_LOGO_BLACK_B64} alt="AZ & Associates" style={{ height: 36, width: "auto", display: "block" }} />
          </div>
          <div style={{ borderBottom: "2px solid #C8202A", padding: "10px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#C8202A", fontSize: 14, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Self-Employed Buyer Summary</span>
            <span style={{ color: "#999", fontSize: 11 }}>{todayStr}</span>
          </div>
          {(firstName || lastName) && (
            <div style={{ padding: "14px 28px", borderBottom: "1px solid #E8E8E8" }}>
              <div style={{ fontSize: 9, color: "#C8202A", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Prepared For</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>{firstName} {lastName}</div>
              <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 2 }}>{clientDate}</div>
            </div>
          )}

          {/* Income Summary */}
          {step3Complete && (
            <div style={{ padding: "16px 28px", borderBottom: "1px solid #E8E8E8" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#C8202A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Income Summary</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div style={{ fontSize: 12, color: "#666" }}>Previous Year Net Income</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#111", textAlign: "right" }}>{fmt(prevYearIncome)}</div>
                <div style={{ fontSize: 12, color: "#666" }}>Most Recent Year Net Income</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#111", textAlign: "right" }}>{fmt(recentYearIncome)}</div>
                <div style={{ fontSize: 12, color: "#666", fontWeight: 600 }}>2-Year Average</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#111", textAlign: "right" }}>{fmt(twoYearAvg)}/yr — {fmt(monthlyAvg)}/mo</div>
                {hasCosigner === "yes" && cosignerW2 > 0 && <>
                  <div style={{ fontSize: 12, color: "#666" }}>Co-signer W2 Income</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#111", textAlign: "right" }}>{fmt(cosignerW2)}/yr</div>
                  <div style={{ fontSize: 12, color: "#666", fontWeight: 600 }}>Combined Monthly</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#111", textAlign: "right" }}>{fmt(combinedMonthly)}/mo</div>
                </>}
              </div>
            </div>
          )}

          {/* Side-by-side comparison */}
          {step4Complete && (
            <div style={{ padding: "16px 28px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#C8202A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Loan Comparison</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ border: fdQualifies ? "2px solid #C8202A" : "1px solid #E8E8E8", borderRadius: 12, padding: 14, position: "relative" }}>
                  {fdQualifies && <span style={{ position: "absolute", top: -1, left: 16, background: "#C8202A", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: "0 0 6px 6px", textTransform: "uppercase" }}>Recommended</span>}
                  <div style={{ fontWeight: 700, fontSize: 12, color: "#111", marginTop: fdQualifies ? 12 : 0, marginBottom: 8 }}>FHA Full Doc</div>
                  {[
                    { l: "Down (3.5%)", v: fmt(fhaDown) },
                    { l: "Rate", v: `${fhaRate.toFixed(2)}%` },
                    { l: "MIP", v: `${fmt(fhaMipMonthly)}/mo` },
                    { l: "Monthly P&I", v: fmt(fhaPI) },
                    { l: "Monthly PITI+MIP", v: fmt(fhaPITI) },
                    { l: "Qualifies", v: fdQualifies ? "Yes" : "No" },
                  ].map((r, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "3px 0", borderBottom: "1px solid #F0F0F0" }}>
                      <span style={{ color: "#666" }}>{r.l}</span>
                      <span style={{ fontWeight: 600, color: "#111" }}>{r.v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ border: !fdQualifies ? "2px solid #C8202A" : "1px solid #E8E8E8", borderRadius: 12, padding: 14, position: "relative" }}>
                  {!fdQualifies && <span style={{ position: "absolute", top: -1, left: 16, background: "#C8202A", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: "0 0 6px 6px", textTransform: "uppercase" }}>Recommended</span>}
                  <div style={{ fontWeight: 700, fontSize: 12, color: "#111", marginTop: !fdQualifies ? 12 : 0, marginBottom: 8 }}>Bank Statement Loan</div>
                  {[
                    { l: "Down (10%)", v: fmt(bsDown) },
                    { l: "Rate", v: `${bsRate.toFixed(2)}%` },
                    { l: "PMI/MIP", v: "None" },
                    { l: "Monthly P&I", v: fmt(bsPI) },
                    { l: "Monthly PITI", v: fmt(bsPITI) },
                    { l: "Qualifies", v: "Yes" },
                  ].map((r, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "3px 0", borderBottom: "1px solid #F0F0F0" }}>
                      <span style={{ color: "#666" }}>{r.l}</span>
                      <span style={{ fontWeight: 600, color: "#111" }}>{r.v}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Summary */}
              <div style={{ border: "2px solid #C8202A", borderRadius: 10, padding: "12px 16px", marginTop: 12 }}>
                <div style={{ fontSize: 11, color: "#C8202A", fontWeight: 700, marginBottom: 4 }}>
                  FHA requires {fmt(fhaDown)} down (3.5%). Bank statement requires {fmt(bsDown)} down (10%). Monthly difference: {fmt(Math.abs(paymentDiff))}/mo.
                </div>
                {!fdQualifies && additionalTax > 0 && (
                  <div style={{ fontSize: 10, color: "#666", marginTop: 4 }}>Bank statement avoids estimated {fmt(additionalTax)} in additional tax liability.</div>
                )}
              </div>
            </div>
          )}

          {/* Recommendation */}
          {step4Complete && (
            <div style={{ padding: "0 28px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#C8202A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Recommendation</div>
              <div style={{ fontSize: 12, color: "#111", lineHeight: 1.6 }}>
                {recommendFullDoc && `FHA full doc path recommended. Lower rate and 3.5% down payment. May qualify for DPA programs — see Client Wizard for full program matching.`}
                {recommendBankStatement && `Bank statement loan recommended. Current 2-year average does not qualify for full doc at this price. Bank statement avoids tax exposure.`}
                {neitherWorks && `Target price of ${fmt(purchasePrice)} is not achievable with current income. Max FHA: ${fmt(maxPriceFD)}. Max bank statement: ${fmt(maxPriceBS)}.`}
              </div>
            </div>
          )}

          {/* Tax amendment if applicable */}
          {step4Complete && !fdQualifies && additionalIncome > 0 && (
            <div style={{ padding: "0 28px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#C8202A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Tax Amendment Consideration</div>
              <div style={{ fontSize: 11, color: "#666", lineHeight: 1.6 }}>
                Most recent year would need {fmt(recentYearNeeded)} net income ({fmt(additionalIncome)} more than reported).
                Estimated additional tax at 25%: {fmt(additionalTax)}.
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ borderTop: "2px solid #C8202A", padding: "12px 28px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#6B6B6B", fontWeight: 500 }}>The Rio Group — Powered by AZ &amp; Associates</div>
            <div style={{ fontSize: 8, color: "#ABABAB", marginTop: 3 }}>All figures are estimates for informational purposes only. Client should consult a CPA before amending returns. Subject to lender approval.</div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/*  SCREEN CONTENT                                                     */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        <div className="no-print">

          <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Self-Employed Buyer</h2>
          <p className="text-gray-500 text-sm mb-6">Guided qualification for business owners and self-employed clients.</p>

          {/* ── STEP 1: Client Info ── */}
          <SectionLabel label="Client Info" />
          <div className="card fade-in mb-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label style={labelStyle}>First Name <span className="text-[#C8202A]">*</span></label>
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Last Name</label>
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Date</label>
                <input type="date" value={clientDate} onChange={(e) => setClientDate(e.target.value)} style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Does the client have a co-signer?</label>
              <div className="flex gap-2 mt-1">
                {(["yes", "no"] as const).map((opt) => (
                  <button key={opt} onClick={() => setHasCosigner(opt)}
                    style={{ padding: "8px 24px", borderRadius: 8, fontSize: "0.875rem",
                      border: hasCosigner === opt ? "1.5px solid #C8202A" : "1.5px solid #E8E8E8",
                      background: "#fff", color: hasCosigner === opt ? "#C8202A" : "#6B6B6B",
                      fontWeight: hasCosigner === opt ? 600 : 500, cursor: "pointer" }}>
                    {opt === "yes" ? "Yes" : "No"}
                  </button>
                ))}
              </div>
            </div>

            {hasCosigner === "yes" && (
              <div className="mt-4 space-y-4 fade-in">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <MoneyInput label="Co-signer Annual Income" value={cosignerIncome} onChange={setCosignerIncome} />
                    <p className="text-xs text-gray-400 mt-1 pl-1">Enter co-signer W2 or regular employment income only</p>
                  </div>
                  <MoneyInput label="Co-signer Monthly Debts" value={cosignerDebts} onChange={setCosignerDebts} />
                  <NumberInput label="Co-signer Credit Score" value={cosignerCredit} onChange={setCosignerCredit} placeholder="700" />
                </div>
                <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-lg px-4 py-3 text-sm text-amber-800">
                  Co-signer income will be combined with the business owner&apos;s qualifying income to determine DTI. The lesser of the two credit scores will be used.
                </div>
              </div>
            )}
          </div>

          {/* ── STEP 2: Credit & Business Profile ── */}
          {step1Complete && (<>
            <SectionConnector />
            <SectionLabel label="Credit & Business Profile" />
            <div className="card fade-in mb-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <NumberInput label="Credit Score" value={creditScore} onChange={setCreditScore} placeholder="700" />
                <div>
                  <label style={labelStyle}>Business Type</label>
                  <div className="flex flex-wrap gap-2">
                    {["Sole Proprietor", "S-Corp / LLC", "Partnership"].map((t) => (
                      <button key={t} onClick={() => setBusinessType(t)}
                        style={{ padding: "8px 16px", borderRadius: 8, fontSize: "0.8125rem",
                          border: businessType === t ? "1.5px solid #C8202A" : "1.5px solid #E8E8E8",
                          background: "#fff", color: businessType === t ? "#C8202A" : "#6B6B6B",
                          fontWeight: businessType === t ? 600 : 500, cursor: "pointer" }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Credit score alerts */}
              {creditBlocked && (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl px-5 py-4 mb-4 fade-in">
                  <h4 className="font-bold text-red-800 mb-1">Does Not Meet Minimum Requirements</h4>
                  <p className="text-sm text-red-700">Minimum credit score is 680 for business owner programs. Refer client to credit repair pathway before proceeding.</p>
                </div>
              )}
              {creditWarning && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-xl px-5 py-4 mb-4 fade-in">
                  <h4 className="font-bold text-amber-800 mb-1">Exception Territory — 680-699</h4>
                  <p className="text-sm text-amber-700">May qualify with strong compensating factors but 10% minimum down is required and approval is not guaranteed.</p>
                </div>
              )}
              {creditGood && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800 mb-4 fade-in">
                  Qualifies for standard business owner programs including 10% down option.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MoneyInput label="Monthly Personal Debts (exclude business debts)" value={monthlyDebts} onChange={setMonthlyDebts} />
                <div>
                  <label style={labelStyle}>Homeownership Status</label>
                  <div className="flex gap-2">
                    {[{ id: "first", label: "First-time Buyer" }, { id: "previous", label: "Previous Homeowner" }].map((o) => (
                      <button key={o.id} onClick={() => setHomeownership(o.id)}
                        style={{ padding: "8px 16px", borderRadius: 8, fontSize: "0.8125rem",
                          border: homeownership === o.id ? "1.5px solid #C8202A" : "1.5px solid #E8E8E8",
                          background: "#fff", color: homeownership === o.id ? "#C8202A" : "#6B6B6B",
                          fontWeight: homeownership === o.id ? 600 : 500, cursor: "pointer" }}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>)}

          {/* ── STEP 3: Income Entry ── */}
          {step2Complete && !creditBlocked && (<>
            <SectionConnector />
            <SectionLabel label="Tax Return Income" />
            <div className="card fade-in mb-2">
              {/* Inline Schedule C reference */}
              <ScheduleCInline />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 mb-3">
                <MoneyInput label="Previous Year Net Income (Line 31)" value={prevYearIncome} onChange={setPrevYearIncome} />
                <MoneyInput label="Most Recent Year Net Income (Line 31)" value={recentYearIncome} onChange={setRecentYearIncome} />
              </div>

              {hasCosigner === "yes" && (
                <div className="mt-4">
                  <MoneyInput label="Co-signer Annual W2 or Employment Income" value={cosignerW2} onChange={setCosignerW2} />
                  <p className="text-xs text-gray-400 mt-1 pl-1">This will be combined with the business owner average for total qualifying income</p>
                </div>
              )}

              {/* Live income calculation */}
              {prevYearIncome > 0 && recentYearIncome > 0 && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 fade-in">
                  <div className="font-bold text-blue-800 mb-2 text-sm">2-Year Average Net Income: {fmt(twoYearAvg)}/year — {fmt(monthlyAvg)}/month</div>
                  {hasCosigner === "yes" && cosignerW2 > 0 && (
                    <div className="text-sm text-blue-700">Combined Qualifying Income: {fmt(combinedMonthly)}/month</div>
                  )}
                </div>
              )}
            </div>
          </>)}

          {/* ── STEP 4: Purchase Details & Qualification ── */}
          {step3Complete && !creditBlocked && (<>
            <SectionConnector />
            <SectionLabel label="Purchase Details & Qualification" />
            <div className="card fade-in mb-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <MoneyInput label="Target Purchase Price" value={purchasePrice} onChange={setPurchasePrice} placeholder="450000" />
                <div className="flex items-end">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-600 w-full">
                    <div className="text-xs text-gray-400 mb-1">Down Payment Comparison</div>
                    <div>FHA (3.5%): <strong>{fmt(fhaDown)}</strong> &nbsp;|&nbsp; Bank Stmt (10%): <strong>{fmt(bsDown)}</strong></div>
                  </div>
                </div>
              </div>

              {/* Full doc qualification */}
              {fdQualifies ? (
                <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 mb-4 fade-in">
                  <h4 className="font-bold text-green-800 mb-1">Full Doc Path Works — May Qualify for DPA</h4>
                  <p className="text-sm text-green-700 mb-3">Income qualifies for FHA full doc at this price with only 3.5% down ({fmt(fhaDown)}). Client may also qualify for down payment assistance programs.</p>
                  {onTabChange && (
                    <button onClick={goToClientWizard}
                      className="px-4 py-2 text-sm font-semibold rounded-lg text-white transition-colors"
                      style={{ background: "#C8202A", border: "none", cursor: "pointer" }}>
                      Continue to Client Wizard for DPA Programs →
                    </button>
                  )}
                </div>
              ) : step3Complete && (
                <div className="space-y-3 mb-4 fade-in">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
                    <h4 className="font-bold text-amber-800 mb-1">Income Needed for Full Doc (FHA)</h4>
                    <p className="text-sm text-amber-700">
                      Current 2-year average of {fmt(combinedMonthly)}/month does not qualify for {fmt(purchasePrice)} purchase price.
                      Most recent year would need to show {fmt(recentYearNeeded)} net income to bring the 2-year average to the required {fmt(incomeNeededMonthly)}/month.
                      That is {fmt(additionalIncome)} more than currently reported.
                    </p>
                  </div>
                  {additionalIncome > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
                      <h4 className="font-bold text-amber-800 mb-1">Tax Amendment Cost Estimate</h4>
                      <p className="text-sm text-amber-700">
                        If most recent year is amended to show {fmt(additionalIncome)} additional income, estimated additional tax liability at 25% effective rate: {fmt(additionalTax)}.
                      </p>
                      <p className="text-xs text-amber-600 mt-1 italic">This is an estimate only. Client should consult a CPA before amending returns.</p>
                    </div>
                  )}
                  {additionalTax > 0 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700">
                      <strong>Break-even note:</strong> Estimated additional tax cost of {fmt(additionalTax)} should be weighed against the higher monthly cost ({fmt(Math.abs(netDiff))}/mo net difference) on a bank statement loan at a higher rate. In many cases the bank statement loan is the smarter financial move.
                    </div>
                  )}
                </div>
              )}
            </div>
          </>)}

          {/* ── STEP 5: Side-by-Side Comparison ── */}
          {step4Complete && (<>
            <SectionConnector />
            <SectionLabel label="Loan Comparison" />
            <div className="card fade-in mb-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* FHA Full Doc Card */}
                <div className={`border rounded-xl p-4 ${fdQualifies ? "border-t-4 border-t-[#C8202A] border-x border-b border-gray-200" : "border-gray-200"}`} style={{ position: "relative" }}>
                  {fdQualifies && <span className="absolute -top-px left-4 bg-[#C8202A] text-white text-xs font-bold px-3 py-0.5 rounded-b-lg uppercase tracking-wide" style={{ fontSize: 10 }}>Recommended</span>}
                  <h4 className="font-bold text-gray-900 mb-3 mt-2">FHA Full Doc</h4>
                  <div className="space-y-2 text-sm">
                    {[
                      { l: "Down Payment (3.5%)", v: fmt(fhaDown) },
                      { l: "Rate", v: `${fhaRate.toFixed(2)}%` },
                      { l: "MIP (0.55% annual)", v: `~${fmt(fhaMipMonthly)}/mo` },
                      { l: "Monthly P&I", v: fmt(fhaPI) },
                      { l: "Monthly PITI + MIP", v: fmt(fhaPITI) },
                    ].map((r, i) => (
                      <div key={i} className="flex justify-between border-b border-gray-100 pb-1">
                        <span className="text-gray-600">{r.l}</span>
                        <span className="font-semibold text-gray-900">{r.v}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-1">
                      <span className="font-bold text-gray-900">Qualifies</span>
                      <span className={`font-bold ${fdQualifies ? "text-green-600" : "text-red-600"}`}>{fdQualifies ? "Yes" : "No"}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-3">3.5% down. Requires tax return income. Lower rate but MIP for life of loan. May qualify for DPA.</p>
                </div>

                {/* Bank Statement Card */}
                <div className={`border rounded-xl p-4 ${!fdQualifies ? "border-t-4 border-t-[#C8202A] border-x border-b border-gray-200" : "border-gray-200"}`} style={{ position: "relative" }}>
                  {!fdQualifies && <span className="absolute -top-px left-4 bg-[#C8202A] text-white text-xs font-bold px-3 py-0.5 rounded-b-lg uppercase tracking-wide" style={{ fontSize: 10 }}>Recommended</span>}
                  <h4 className="font-bold text-gray-900 mb-3 mt-2">Bank Statement Loan</h4>
                  <div className="space-y-2 text-sm">
                    {[
                      { l: "Down Payment (10%)", v: fmt(bsDown) },
                      { l: "Rate", v: `~${bsRate.toFixed(2)}%` },
                      { l: "PMI/MIP", v: "None" },
                      { l: "Monthly P&I", v: fmt(bsPI) },
                      { l: "Monthly PITI (no PMI)", v: fmt(bsPITI) },
                    ].map((r, i) => (
                      <div key={i} className="flex justify-between border-b border-gray-100 pb-1">
                        <span className="text-gray-600">{r.l}</span>
                        <span className="font-semibold text-gray-900">{r.v}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-1">
                      <span className="font-bold text-gray-900">Qualifies</span>
                      <span className="font-bold text-green-600">Yes</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-3">12 months bank statements only. No tax returns required. Higher rate but no PMI and no tax exposure.</p>
                </div>
              </div>

              {/* Summary callout */}
              <div className="border-2 border-[#C8202A] rounded-xl px-5 py-4">
                <p className="text-sm text-gray-800">
                  FHA requires <strong>{fmt(fhaDown)} down (3.5%)</strong>. Bank statement requires <strong>{fmt(bsDown)} down (10%)</strong>.
                  {' '}Monthly payment difference: <strong>{fmt(Math.abs(paymentDiff))}/mo</strong>.
                  {!fdQualifies && additionalTax > 0 && <> Bank statement avoids estimated <strong>{fmt(additionalTax)}</strong> in additional tax liability.</>}
                </p>
              </div>
            </div>
          </>)}

          {/* ── STEP 6: Recommendation ── */}
          {step4Complete && (<>
            <SectionConnector />
            <SectionLabel label="Recommendation" />
            <div className="fade-in mb-2">
              {creditBlocked ? (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl px-5 py-4">
                  <h4 className="font-bold text-red-800 mb-2">Credit Repair Referral</h4>
                  <p className="text-sm text-red-700">Credit score does not meet minimum requirements. Refer to credit repair pathway.</p>
                </div>
              ) : neitherWorks ? (
                <div className="card card-accent-top">
                  <h4 className="font-bold text-gray-900 mb-2">Price Adjustment Needed</h4>
                  <p className="text-sm text-gray-700 mb-3">
                    Target purchase price of {fmt(purchasePrice)} is not achievable with current income and down payment combination. Consider a lower purchase price or higher down payment.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500">Max FHA Price</div>
                      <div className="text-lg font-bold text-gray-900">{fmt(maxPriceFD)}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500">Max Bank Statement Price</div>
                      <div className="text-lg font-bold text-gray-900">{fmt(maxPriceBS)}</div>
                    </div>
                  </div>
                </div>
              ) : recommendFullDoc ? (
                <div className="card card-accent-top">
                  <span className="inline-block bg-[#C8202A] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide mb-3">Best Option</span>
                  <h4 className="text-lg font-bold text-gray-900 mb-1">FHA Full Doc</h4>
                  <p className="text-sm text-gray-600 mb-4">Lower rate with only 3.5% down. May qualify for DPA programs through Client Wizard.</p>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <h5 className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">Pros</h5>
                      <ul className="text-sm text-gray-800 space-y-1">
                        <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />Lower interest rate</li>
                        <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />Only 3.5% down required</li>
                        <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />May qualify for DPA</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Cons</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />MIP for life of loan</li>
                        <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />Relies on tax return income</li>
                      </ul>
                    </div>
                  </div>
                  {onTabChange && (
                    <button onClick={goToClientWizard}
                      className="w-full px-4 py-3 text-sm font-semibold rounded-lg text-white transition-colors"
                      style={{ background: "#C8202A", border: "none", cursor: "pointer" }}>
                      Continue to Client Wizard for DPA Program Matching →
                    </button>
                  )}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-600 mt-3">
                    Bank statement is available if client prefers not to rely on tax returns.
                  </div>
                </div>
              ) : (
                <div className="card card-accent-top">
                  <span className="inline-block bg-[#C8202A] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide mb-3">Best Option</span>
                  <h4 className="text-lg font-bold text-gray-900 mb-1">Bank Statement Loan</h4>
                  <p className="text-sm text-gray-600 mb-4">Current income does not qualify for full doc — bank statement avoids tax exposure and requires no MIP/PMI.</p>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <h5 className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">Pros</h5>
                      <ul className="text-sm text-gray-800 space-y-1">
                        <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />No tax returns needed</li>
                        <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />No PMI or MIP</li>
                        <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />No tax amendment exposure</li>
                        <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />12 months bank statements only</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Cons</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />Higher rate (+1.5% over market)</li>
                        <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />10% minimum down required</li>
                      </ul>
                    </div>
                  </div>
                  {additionalTax > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                      <strong>Full doc alternative:</strong> Would require amending returns to show {fmt(additionalIncome)} more income. Estimated additional tax: {fmt(additionalTax)}. Consult a CPA before amending.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-100">
              <button onClick={() => handlePrint()}
                style={{ padding: "12px 28px", borderRadius: 10, background: "#C8202A", color: "#fff", fontWeight: 600, fontSize: "0.9375rem", border: "none", cursor: "pointer" }}>
                Save PDF
              </button>
              <button onClick={downloadJPG} disabled={imgLoading}
                style={{ padding: "12px 28px", borderRadius: 10, background: "#111", color: "#fff", fontWeight: 600, fontSize: "0.9375rem", border: "none", cursor: "pointer", opacity: imgLoading ? 0.6 : 1 }}>
                {imgLoading ? "Saving…" : "Save as Image"}
              </button>
            </div>
          </>)}

          {/* ── TAX AMENDMENT SIMULATOR ── */}
          <div className="mt-10 pt-8 border-t-2 border-gray-200">
            <button onClick={() => setSimOpen(!simOpen)}
              className="flex items-center gap-2 text-left w-full"
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <span className="text-lg font-bold" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#111" }}>Tax Amendment Simulator</span>
              <span className="text-gray-400 text-sm">{simOpen ? "▲" : "▼"}</span>
            </button>
            <p className="text-xs text-gray-400 mt-1 mb-4">Standalone tool — estimate tax impact of amending returns to qualify for full doc.</p>

            {simOpen && (
              <div className="card fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <MoneyInput label="Previous Year Net Income" value={simPrevIncome} onChange={setSimPrevIncome} />
                  <MoneyInput label="Most Recent Year Net Income" value={simRecentIncome} onChange={setSimRecentIncome} />
                  <MoneyInput label="Monthly Personal Debts" value={simDebts} onChange={setSimDebts} />
                  <MoneyInput label="Co-signer Monthly Income (optional)" value={simCosignerIncome} onChange={setSimCosignerIncome} />
                  <MoneyInput label="Target Purchase Price" value={simPrice} onChange={setSimPrice} placeholder="450000" />
                </div>

                {simPrevIncome > 0 && simRecentIncome > 0 && (
                  <div className="space-y-3 fade-in">
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-gray-500">Current 2-Year Average:</span></div>
                        <div className="text-right font-semibold">{fmt(simAvg)}/yr — {fmt(simAvg / 12)}/mo</div>
                        <div><span className="text-gray-500">Current Max Qualifying Price:</span></div>
                        <div className="text-right font-semibold">{fmt(simMaxPrice)}</div>
                        <div><span className="text-gray-500">Income Needed (recent year):</span></div>
                        <div className="text-right font-semibold">{fmt(Math.max(simRecentNeeded, 0))}</div>
                        <div><span className="text-gray-500">Additional Income Needed:</span></div>
                        <div className="text-right font-bold text-[#C8202A]">{fmt(Math.max(simAdditional, 0))}</div>
                        <div><span className="text-gray-500">Estimated Additional Tax (25%):</span></div>
                        <div className="text-right font-bold text-[#C8202A]">{fmt(Math.max(simAdditionalTax, 0))}</div>
                      </div>
                    </div>
                    {simAdditional > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                        <strong>Is it worth amending?</strong> Additional tax cost of {fmt(simAdditionalTax)} vs FHA down payment of {fmt(simPrice * 0.035)}. Weigh the one-time tax cost against the ongoing rate difference on a bank statement loan.
                      </div>
                    )}
                    <p className="text-xs text-gray-400 italic">
                      Tax estimate uses 25% effective rate for illustration purposes only. Client should consult a CPA before amending returns.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>{/* end no-print */}
      </div>{/* end printRef */}
    </div>
  );
}
