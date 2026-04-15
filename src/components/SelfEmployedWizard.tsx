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

/* ── Down Payment dual input (% and $) ── */
function DownPaymentInput({ price, pct, onChange, label }: {
  price: number; pct: number; onChange: (pct: number) => void; label?: string;
}) {
  const dollars = Math.round(price * pct / 100);
  const handleDollars = (d: number) => {
    if (price > 0) onChange(Math.round((d / price) * 10000) / 100);
  };
  return (
    <div>
      {label && <label style={labelStyle}>{label}</label>}
      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <input type="number" inputMode="decimal" value={pct || ""}
            onChange={(e) => onChange(Number(e.target.value) || 0)}
            style={inputStyle} placeholder="0" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
          <input type="text" inputMode="numeric" value={fmtComma(dollars)}
            onChange={(e) => handleDollars(parseComma(e.target.value))}
            style={{ ...inputStyle, paddingLeft: "28px" }} placeholder="0" />
        </div>
      </div>
    </div>
  );
}

/* ── Section connector ── */
function SectionConnector() {
  return <div className="section-connector" style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
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
  const [fhaDownPct, setFhaDownPct] = useState(3.5);
  const [bsDownPct, setBsDownPct] = useState(10);

  /* ── Tax Amendment Simulator ── */
  const [simOpen, setSimOpen] = useState(false);
  const [simPrevIncome, setSimPrevIncome] = useState(0);
  const [simRecentIncome, setSimRecentIncome] = useState(0);
  const [simDebts, setSimDebts] = useState(0);
  const [simCosignerIncome, setSimCosignerIncome] = useState(0);
  const [simPrice, setSimPrice] = useState(450000);

  /* ── Full Doc vs Bank Statement Calculator ── */
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcFdPrice, setCalcFdPrice] = useState(450000);
  const [calcFdDown, setCalcFdDown] = useState(3.5);
  const [calcFdRate, setCalcFdRate] = useState(0);
  const [calcBsPrice, setCalcBsPrice] = useState(450000);
  const [calcBsDown, setCalcBsDown] = useState(10);
  const [calcBsRate, setCalcBsRate] = useState(0);

  /* Initialize calc rates from live rates */
  useEffect(() => { setCalcFdRate(fhaRate); }, [fhaRate]);
  useEffect(() => { setCalcBsRate(bsRate); }, [bsRate]);

  /* ── Print ── */
  const printRef = useRef<HTMLDivElement>(null);
  const [imgLoading, setImgLoading] = useState(false);

  const todayStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const boPdfName = `Rio-Group-BusinessOwner${firstName ? `-${[firstName, lastName].filter(Boolean).join("-").replace(/[^a-zA-Z0-9-]/g, "")}` : ""}`;
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: boPdfName,
    pageStyle: `
      @page { margin: 0.45in 0.5in; size: letter portrait; }
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; font-family: 'DM Sans', sans-serif; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      img { display: block !important; max-width: 100% !important; }

      .no-print { display: none !important; height: 0 !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; }
      .print-only { display: block !important; }

      /* ── Global compacting for 8.5x11 ── */
      .bo-print-root { font-size: 11px !important; line-height: 1.35 !important; }
      .bo-print-root .card { padding: 12px 14px !important; margin-bottom: 6px !important; border-radius: 8px !important; box-shadow: none !important; border: 1px solid #E0E0E0 !important; }

      /* Section labels */
      .bo-print-root .section-label { font-size: 9px !important; margin-bottom: 4px !important; }

      /* Section connectors — tighten */
      .bo-print-root .section-connector { margin: 3px 0 !important; }
      .bo-print-root .section-connector > div { height: 12px !important; }

      /* ── Form inputs → clean inline text in print ── */
      .bo-print-root input,
      .bo-print-root select { border: none !important; background: transparent !important; padding: 2px 0 !important; font-size: 11px !important; font-weight: 600 !important; box-shadow: none !important; outline: none !important; }
      .bo-print-root input[type="date"] { font-size: 10px !important; }

      /* ── Grids — ensure columns render in print ── */
      .bo-print-root .grid { display: grid !important; gap: 8px !important; }
      .bo-print-root .grid-cols-1.md\\:grid-cols-3 { grid-template-columns: repeat(3, 1fr) !important; }
      .bo-print-root .grid-cols-1.md\\:grid-cols-2 { grid-template-columns: repeat(2, 1fr) !important; }
      .bo-print-root .grid-cols-2 { grid-template-columns: repeat(2, 1fr) !important; }

      /* ── Label sizing ── */
      .bo-print-root label { font-size: 9px !important; margin-bottom: 2px !important; }

      /* ── Tighten spacing on comparison cards ── */
      .bo-print-root .space-y-2 > * { margin-top: 3px !important; margin-bottom: 0 !important; }
      .bo-print-root .space-y-1 > * { margin-top: 2px !important; margin-bottom: 0 !important; }
      .bo-print-root .space-y-3 > * { margin-top: 4px !important; margin-bottom: 0 !important; }

      /* ── Buttons in cards — hide action buttons but keep toggle-like pill buttons ── */
      .bo-print-root button.print-hide { display: none !important; }

      /* ── Headings inside cards ── */
      .bo-print-root h3 { font-size: 13px !important; margin-bottom: 2px !important; }
      .bo-print-root h4 { font-size: 11px !important; margin-bottom: 2px !important; }

      /* ── Info boxes — compact ── */
      .bo-print-root .bg-blue-50, .bo-print-root .bg-amber-50, .bo-print-root .bg-green-50, .bo-print-root .bg-red-50, .bo-print-root .bg-gray-50 {
        padding: 8px 10px !important;
        margin-bottom: 6px !important;
        font-size: 10px !important;
      }

      /* ── Comparison cards side-by-side ── */
      .bo-print-root .rounded-xl { border-radius: 8px !important; }
      .bo-print-root .rounded-xl p { font-size: 9px !important; }

      /* ── Summary callout ── */
      .bo-print-root .border-\\[\\#C8202A\\] { padding: 8px 12px !important; }

      /* ── Recommendation section ── */
      .bo-print-root .card-accent-top { padding: 12px 14px !important; }
      .bo-print-root .inline-block.bg-\\[\\#C8202A\\] { font-size: 8px !important; padding: 3px 8px !important; margin-bottom: 6px !important; }

      /* ── Page breaks ── */
      .bo-print-root .card { break-inside: avoid !important; page-break-inside: avoid !important; }
      .bo-print-root .bo-step-group { break-inside: avoid !important; page-break-inside: avoid !important; }

      /* ── Dollar sign prefixes ── */
      .bo-print-root .relative > span.absolute { font-size: 10px !important; }

      /* ── Pros/Cons lists compact ── */
      .bo-print-root ul { padding-left: 0 !important; }
      .bo-print-root li { font-size: 10px !important; }
      .bo-print-root .w-1\\.5 { width: 4px !important; height: 4px !important; }

      /* ── Print footer ── */
      .bo-print-root .bo-print-footer { margin-top: 12px !important; }

      /* ── IRS Schedule C box — compact for print ── */
      .bo-print-root .bg-gray-50.border.border-gray-200.rounded-xl { padding: 6px !important; font-size: 10px !important; }
      .bo-print-root .bg-gray-50.border.border-gray-200.rounded-xl .p-5 { padding: 8px !important; }
      .bo-print-root .bg-gray-50.border.border-gray-200.rounded-xl .px-5 { padding-left: 8px !important; padding-right: 8px !important; }
    `,
  });

  const downloadJPG = async () => {
    const el = printRef.current;
    if (!el) return;
    setImgLoading(true);
    try {
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
      const link = document.createElement("a");
      const namePart = [firstName, lastName].filter(Boolean).join("-").replace(/[^a-zA-Z0-9-]/g, "");
      link.download = `Rio-Group-BusinessOwner${namePart ? `-${namePart}` : ""}.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      link.click();
    } finally {
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

  // FHA Full Doc
  const fhaDown = purchasePrice * (fhaDownPct / 100);
  const fhaBaseLoan = purchasePrice - fhaDown;
  const fhaLoanWithMip = fhaDownPct < 20 ? fhaBaseLoan * (1 + fhaMipUpfront) : fhaBaseLoan;
  const fhaPI = calcPayment(fhaLoanWithMip, fhaRate, 30);
  const fhaTax = purchasePrice * taxRate / 12;
  const fhaIns = insuranceAnnual / 12;
  const fhaMipMonthly = fhaDownPct < 20 ? fhaBaseLoan * fhaMipAnnual / 12 : 0;
  const fhaPITI = fhaPI + fhaTax + fhaIns + fhaMipMonthly;

  // Bank statement — no PMI
  const bsDown = purchasePrice * (bsDownPct / 100);
  const bsLoan = purchasePrice - bsDown;
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
  const _recommendBankStatement = !fdQualifies && !creditBlocked; // eslint-disable-line @typescript-eslint/no-unused-vars

  // Max qualifying prices
  const calcMaxPriceFHA = () => {
    let lo = 0, hi = 2000000;
    const downFrac = fhaDownPct / 100;
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2;
      const baseLoan = mid * (1 - downFrac);
      const loanMip = downFrac < 0.2 ? baseLoan * (1 + fhaMipUpfront) : baseLoan;
      const pi = calcPayment(loanMip, fhaRate, 30);
      const tax = mid * taxRate / 12;
      const ins = insuranceAnnual / 12;
      const mip = downFrac < 0.2 ? baseLoan * fhaMipAnnual / 12 : 0;
      if (pi + tax + ins + mip + totalDebts < combinedMonthly * 0.45) lo = mid; else hi = mid;
    }
    return Math.floor(lo);
  };
  const calcMaxPriceBS = () => {
    let lo = 0, hi = 2000000;
    const downFrac = bsDownPct / 100;
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2;
      const pi = calcPayment(mid * (1 - downFrac), bsRate, 30);
      const tax = mid * taxRate / 12;
      const ins = insuranceAnnual / 12;
      if (pi + tax + ins + totalDebts < combinedMonthly * 0.45) lo = mid; else hi = mid;
    }
    return Math.floor(lo);
  };
  const maxPriceFD = step3Complete ? calcMaxPriceFHA() : 0;
  const maxPriceBS = step3Complete ? calcMaxPriceBS() : 0;
  const neitherWorks = !fdQualifies && maxPriceBS < purchasePrice && !creditBlocked;

  /* ── Standalone calculator computed totals ── */
  const calcFdBaseLoan = calcFdPrice * (1 - calcFdDown / 100);
  const calcFdLoanMip = calcFdBaseLoan * (1 + fhaMipUpfront);
  const calcFdPI = calcPayment(calcFdLoanMip, calcFdRate, 30);
  const calcFdTax = calcFdPrice * taxRate / 12;
  const calcFdIns = insuranceAnnual / 12;
  const calcFdMip = calcFdBaseLoan * fhaMipAnnual / 12;
  const calcFdTotal = calcFdPI + calcFdTax + calcFdIns + calcFdMip;

  const calcBsLoan = calcBsPrice * (1 - calcBsDown / 100);
  const calcBsPI = calcPayment(calcBsLoan, calcBsRate, 30);
  const calcBsTax = calcBsPrice * taxRate / 12;
  const calcBsIns = insuranceAnnual / 12;
  const calcBsTotal = calcBsPI + calcBsTax + calcBsIns; // no PMI

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
      <div ref={printRef} className="bo-print-root">

        {/* ── Print header (only visible in print) ── */}
        <div className="print-only" style={{ marginBottom: 16 }}>
          <div style={{ padding: "16px 0", borderBottom: "3px solid #C8202A", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={TRG_LOGO_BLACK_B64} alt="The Rio Group" style={{ height: 40, width: "auto", display: "block" }} />
              <div>
                <div style={{ color: "#111", fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}>The Rio Group</div>
                <div style={{ color: "#999", fontSize: 9, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" }}>Built Different</div>
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={AZ_LOGO_BLACK_B64} alt="AZ & Associates" style={{ height: 32, width: "auto", display: "block" }} />
          </div>
          <div style={{ borderBottom: "2px solid #C8202A", padding: "8px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#C8202A", fontSize: 14, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Business Owner — Loan Qualification</span>
            <span style={{ color: "#999", fontSize: 11 }}>{todayStr}</span>
          </div>
          {(firstName || lastName) && (
            <div style={{ padding: "10px 0", borderBottom: "1px solid #E8E8E8" }}>
              <div style={{ fontSize: 9, color: "#C8202A", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>Prepared For</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#111" }}>{firstName} {lastName}</div>
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/*  MAIN CONTENT (visible on screen AND print)                         */}
        {/* ════════════════════════════════════════════════════════════════════ */}

          <h2 className="text-2xl font-bold mb-1 no-print" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Business Owner</h2>
          <p className="text-gray-500 text-sm mb-6 no-print">Guided qualification for business owners and self-employed clients.</p>

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
                    {["Sole Proprietor", "S-Corp / LLC"].map((t) => (
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

              {businessType === "Sole Proprietor" && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800 mb-4 fade-in">
                  <strong>Sole Proprietor</strong> — Files a Schedule C on their personal tax return (Form 1040). This is the most common structure for independent contractors, freelancers, and single-owner businesses with no formal entity filing. Ask the client: &quot;Do you file a Schedule C with your taxes?&quot; If yes, this is the right selection.
                </div>
              )}

              {businessType === "S-Corp / LLC" && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800 mb-4 fade-in">
                  <strong>S-Corp / LLC</strong> — The business is a separate legal entity that files its own tax return. The owner typically receives a W2 salary from the business plus K-1 distributions. Ask the client: &quot;Does your business have its own EIN and file a separate return?&quot; If yes, use this. For income, combine W2 salary + K-1 distributions and enter the total net qualifying income below.
                </div>
              )}

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
              <div className="mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <MoneyInput label="Target Purchase Price" value={purchasePrice} onChange={setPurchasePrice} placeholder="450000" />
                  <DownPaymentInput price={purchasePrice} pct={fhaDownPct} onChange={setFhaDownPct} label="FHA Down Payment" />
                  <DownPaymentInput price={purchasePrice} pct={bsDownPct} onChange={setBsDownPct} label="Bank Stmt Down Payment" />
                </div>
              </div>

              {/* Full doc qualification */}
              {fdQualifies ? (
                <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 mb-4 fade-in">
                  <h4 className="font-bold text-green-800 mb-1">Full Doc Path Works — May Qualify for DPA</h4>
                  <p className="text-sm text-green-700 mb-3">Income qualifies for FHA full doc at this price with only {fhaDownPct}% down ({fmt(fhaDown)}). Client may also qualify for down payment assistance programs.</p>
                  {onTabChange && (
                    <button onClick={goToClientWizard}
                      className="print-hide px-4 py-2 text-sm font-semibold rounded-lg text-white transition-colors"
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

          {/* ── STEP 5: Side-by-Side Comparison (matches Calculator tab layout) ── */}
          {step4Complete && (<>
            <SectionConnector />
            <SectionLabel label="Loan Comparison" />
            <div className="fade-in mb-2">

              {/* Detailed breakdown cards — side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Full Doc (FHA) breakdown */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="font-bold text-blue-800 mb-3 text-xs uppercase tracking-wide">Full Doc (FHA)</div>
                  {[
                    { label: "Purchase Price", value: fmt(purchasePrice) },
                    { label: `Down (${fhaDownPct}%)`, value: fmt(fhaDown) },
                    { label: "Loan Amount", value: fmt(fhaBaseLoan) },
                    { label: "Rate (FHA)", value: `${fhaRate.toFixed(2)}%` },
                    { label: "MIP (0.55%)", value: fhaMipMonthly > 0 ? `${fmt(fhaMipMonthly)}/mo` : "None" },
                    { label: "P&I", value: fmt(fhaPI) },
                    { label: fhaMipMonthly > 0 ? "PITI + MIP" : "PITI", value: fmt(fhaPITI) },
                  ].map((r, i) => (
                    <div key={i} className="flex justify-between text-sm py-1.5 border-b border-blue-100">
                      <span className="text-blue-700">{r.label}</span>
                      <span className="font-semibold text-blue-900">{r.value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-bold mt-2 pt-2 text-blue-900">
                    <span>Total Monthly</span><span>{fmt(fhaPITI)}</span>
                  </div>
                </div>

                {/* Bank Statement breakdown */}
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <div className="font-bold text-orange-800 mb-3 text-xs uppercase tracking-wide">Bank Statement</div>
                  {[
                    { label: "Purchase Price", value: fmt(purchasePrice) },
                    { label: `Down (${bsDownPct}%)`, value: fmt(bsDown) },
                    { label: "Loan Amount", value: fmt(bsLoan) },
                    { label: "Rate (+1.5%)", value: `${bsRate.toFixed(2)}%` },
                    { label: "PMI/MIP", value: "None" },
                    { label: "P&I", value: fmt(bsPI) },
                    { label: "PITI", value: fmt(bsPITI) },
                  ].map((r, i) => (
                    <div key={i} className="flex justify-between text-sm py-1.5 border-b border-orange-100">
                      <span className="text-orange-700">{r.label}</span>
                      <span className="font-semibold text-orange-900">{r.value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-bold mt-2 pt-2 text-orange-900">
                    <span>Total Monthly</span><span>{fmt(bsPITI)}</span>
                  </div>
                </div>
              </div>

              {/* Payment total cards */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-blue-50 border-2 border-blue-400 rounded-xl p-4 text-center">
                  <div className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Full Doc Monthly</div>
                  <div className="text-3xl font-bold text-blue-900 mt-1">{fmt(fhaPITI)}</div>
                  <div className="text-xs text-blue-500 mt-1">P&I {fmt(fhaPI)} + Tax/Ins{fhaMipMonthly > 0 ? " + MIP" : ""}</div>
                </div>
                <div className="bg-orange-50 border-2 border-orange-400 rounded-xl p-4 text-center">
                  <div className="text-xs text-orange-600 font-semibold uppercase tracking-wide">Bank Stmt Monthly</div>
                  <div className="text-3xl font-bold text-orange-900 mt-1">{fmt(bsPITI)}</div>
                  <div className="text-xs text-orange-500 mt-1">P&I {fmt(bsPI)} + Tax/Ins</div>
                </div>
              </div>

              {/* Monthly difference strip */}
              <div className={`rounded-lg px-4 py-3 text-center text-sm font-semibold mb-4 ${
                paymentDiff > 0 ? "bg-blue-50 border border-blue-300 text-blue-800" : "bg-orange-50 border border-orange-300 text-orange-800"
              }`}>
                {paymentDiff > 0
                  ? `Full doc saves ${fmt(paymentDiff)}/mo (${fmt(paymentDiff * 12)}/yr)`
                  : `Bank statement saves ${fmt(Math.abs(paymentDiff))}/mo (${fmt(Math.abs(paymentDiff) * 12)}/yr)`}
              </div>

              {/* Down Payment vs Monthly Cost Trade-off */}
              <div className="bg-red-50/50 border-2 border-[#C8202A] rounded-xl px-5 py-4 mb-4">
                <h4 className="font-bold text-[#C8202A] text-sm mb-2">Down Payment vs Monthly Cost Trade-off</h4>
                <p className="text-sm text-gray-700">
                  Full doc requires <strong>{fmt(fhaDown)} down ({fhaDownPct}%)</strong> — bank statement requires <strong>{fmt(bsDown)} down ({bsDownPct}%)</strong>.
                  That&apos;s <strong className="text-[#C8202A]">{fmt(Math.abs(bsDown - fhaDown))} more</strong> upfront for bank statement.
                </p>
                <p className="text-sm text-gray-700 mt-2">
                  Bank statement has no MIP, saving <strong>{fmt(fhaMipMonthly)}/mo</strong>, but the higher rate adds <strong>{fmt(Math.abs(bsPI - fhaPI))}/mo</strong> to P&I.
                  Net monthly difference: <strong className="text-[#C8202A]">{fmt(Math.abs(paymentDiff))}/mo</strong>.
                </p>
                {!fdQualifies && additionalTax > 0 && (
                  <p className="text-sm text-gray-700 mt-2">
                    Bank statement also avoids estimated <strong className="text-[#C8202A]">{fmt(additionalTax)}</strong> in additional tax liability from amending returns.
                  </p>
                )}
              </div>

              {/* Qualification status */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className={`rounded-xl p-3 text-center border-2 ${fdQualifies ? "bg-green-50 border-green-400" : "bg-red-50 border-red-300"}`}>
                  <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: fdQualifies ? "#166534" : "#991B1B" }}>Full Doc Qualifies</div>
                  <div className={`text-lg font-bold ${fdQualifies ? "text-green-700" : "text-red-700"}`}>{fdQualifies ? "Yes" : "No"}</div>
                </div>
                <div className="bg-green-50 border-2 border-green-400 rounded-xl p-3 text-center">
                  <div className="text-xs font-semibold uppercase tracking-wide mb-1 text-green-800">Bank Stmt Qualifies</div>
                  <div className="text-lg font-bold text-green-700">Yes</div>
                </div>
              </div>

              {/* Pros / Cons notes — matching calculator tab */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                  <h4 className="font-bold text-blue-800 mb-1">Full Doc (FHA) Notes</h4>
                  <ul className="text-blue-700 space-y-1">
                    <li>✅ Lower interest rate</li>
                    <li>✅ Only {fhaDownPct}% down payment</li>
                    <li>✅ May qualify for DPA programs</li>
                    <li>⚠️ Requires 2 years tax returns</li>
                    <li>⚠️ MIP for life of loan</li>
                    <li>⚠️ Requires higher net income on tax returns</li>
                    <li>⚠️ Higher tax payment to IRS if amending to qualify</li>
                  </ul>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
                  <h4 className="font-bold text-orange-800 mb-1">Bank Statement Notes</h4>
                  <ul className="text-orange-700 space-y-1">
                    <li>✅ No tax returns needed</li>
                    <li>✅ No PMI or MIP ever</li>
                    <li>✅ No tax amendment exposure</li>
                    <li>✅ 12 months bank statements only</li>
                    <li>⚠️ {bsDownPct}% minimum down required</li>
                    <li>⚠️ Rate ~1.5% above market</li>
                  </ul>
                </div>
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
                  <span className="inline-block bg-[#C8202A] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide mb-3">Recommended — FHA Full Doc</span>
                  <p className="text-sm text-gray-600 mb-3">Income qualifies for FHA full doc at this price with only {fhaDownPct}% down. May also qualify for down payment assistance programs.</p>
                  {onTabChange && (
                    <button onClick={goToClientWizard}
                      className="print-hide w-full px-4 py-3 text-sm font-semibold rounded-lg text-white transition-colors"
                      style={{ background: "#C8202A", border: "none", cursor: "pointer" }}>
                      Continue to Client Wizard for DPA Program Matching →
                    </button>
                  )}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-600 mt-3">
                    Bank statement is also available if client prefers not to rely on tax returns.
                  </div>
                </div>
              ) : (
                <div className="card card-accent-top">
                  <span className="inline-block bg-[#C8202A] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide mb-3">Recommended — Bank Statement</span>
                  <p className="text-sm text-gray-600 mb-3">Current income does not qualify for full doc — bank statement avoids tax exposure and requires no MIP/PMI.</p>
                  {additionalTax > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                      <strong>Full doc alternative:</strong> Would require amending returns to show {fmt(additionalIncome)} more income. Estimated additional tax: {fmt(additionalTax)}. Consult a CPA before amending.
                    </div>
                  )}
                </div>
              )}
            </div>

          </>)}

          {/* ── Save / Print Buttons — always visible once step 1 complete ── */}
          {step1Complete && (
            <div className="no-print flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-100">
              <button onClick={() => handlePrint()}
                style={{ padding: "12px 28px", borderRadius: 10, background: "#C8202A", color: "#fff", fontWeight: 600, fontSize: "0.9375rem", border: "none", cursor: "pointer" }}>
                Save PDF
              </button>
              <button onClick={downloadJPG} disabled={imgLoading}
                style={{ padding: "12px 28px", borderRadius: 10, background: "#111", color: "#fff", fontWeight: 600, fontSize: "0.9375rem", border: "none", cursor: "pointer", opacity: imgLoading ? 0.6 : 1 }}>
                {imgLoading ? "Saving…" : "Save as Image"}
              </button>
            </div>
          )}

          {/* ── STANDALONE TOOLS ── */}
          <div className="mt-10 pt-8 border-t-2 border-gray-200 no-print">
            <div style={{ fontSize: "0.6875rem", fontWeight: 600, color: "#C8202A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
              Business Owner Tools
            </div>
            <div className="flex flex-wrap gap-3 mb-6">
              <button onClick={() => setSimOpen(!simOpen)}
                style={{ padding: "10px 20px", borderRadius: 8, fontSize: "0.8125rem",
                  border: simOpen ? "1.5px solid #C8202A" : "1.5px solid #E8E8E8",
                  background: "#fff", color: simOpen ? "#C8202A" : "#6B6B6B",
                  fontWeight: simOpen ? 600 : 500, cursor: "pointer" }}>
                {simOpen ? "✓ " : ""}Tax Amendment Simulator
              </button>
              <button onClick={() => setCalcOpen(!calcOpen)}
                style={{ padding: "10px 20px", borderRadius: 8, fontSize: "0.8125rem",
                  border: calcOpen ? "1.5px solid #C8202A" : "1.5px solid #E8E8E8",
                  background: "#fff", color: calcOpen ? "#C8202A" : "#6B6B6B",
                  fontWeight: calcOpen ? 600 : 500, cursor: "pointer" }}>
                {calcOpen ? "✓ " : ""}Full Doc vs Bank Statement Calculator
              </button>
            </div>

            {/* Tax Amendment Simulator */}
            {simOpen && (
              <div className="card fade-in mb-6">
                <h3 className="text-base font-bold text-gray-900 mb-1">Tax Amendment Simulator</h3>
                <p className="text-xs text-gray-400 mb-4">Estimate tax impact of amending returns to qualify for full doc.</p>
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
                        <strong>Is it worth amending?</strong> Additional tax cost of {fmt(simAdditionalTax)} vs FHA down payment of {fmt(simPrice * fhaDownPct / 100)}. Weigh the one-time tax cost against the ongoing rate difference on a bank statement loan.
                      </div>
                    )}
                    <p className="text-xs text-gray-400 italic">
                      Tax estimate uses 25% effective rate for illustration purposes only. Client should consult a CPA before amending returns.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Full Doc vs Bank Statement Calculator */}
            {calcOpen && (
              <div className="card fade-in mb-6">
                <h3 className="text-base font-bold text-gray-900 mb-1">Full Doc vs Bank Statement Calculator</h3>
                <p className="text-xs text-gray-400 mb-4">Side-by-side comparison — adjust rates, down payment, and see the real numbers.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Full Doc inputs */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h4 className="font-bold text-blue-800 mb-1 text-sm">Full Doc (FHA)</h4>
                    <p className="text-xs text-blue-600 mb-3">3.5% down · FHA rate · MIP for life</p>
                    <div className="space-y-3">
                      <MoneyInput label="Purchase Price" value={calcFdPrice} onChange={setCalcFdPrice} />
                      <DownPaymentInput price={calcFdPrice} pct={calcFdDown} onChange={setCalcFdDown} label="Down Payment" />
                      <NumberInput label="Rate" value={calcFdRate} onChange={setCalcFdRate} suffix="%" />
                    </div>
                  </div>
                  {/* Bank Statement inputs */}
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                    <h4 className="font-bold text-orange-800 mb-1 text-sm">Bank Statement</h4>
                    <p className="text-xs text-orange-600 mb-3">10% down · No PMI · Rate +1.5%</p>
                    <div className="space-y-3">
                      <MoneyInput label="Purchase Price" value={calcBsPrice} onChange={setCalcBsPrice} />
                      <DownPaymentInput price={calcBsPrice} pct={calcBsDown} onChange={setCalcBsDown} label="Down Payment" />
                      <NumberInput label="Rate" value={calcBsRate} onChange={setCalcBsRate} suffix="%" />
                    </div>
                  </div>
                </div>
                {/* Results */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-blue-50 border-2 border-blue-400 rounded-xl p-3 text-center">
                    <div className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Full Doc Monthly</div>
                    <div className="text-2xl font-bold text-blue-900 mt-1">{fmt(calcFdTotal)}</div>
                    <div className="text-xs text-blue-500 mt-1">Down: {fmt(calcFdPrice * calcFdDown / 100)}</div>
                  </div>
                  <div className="bg-orange-50 border-2 border-orange-400 rounded-xl p-3 text-center">
                    <div className="text-xs text-orange-600 font-semibold uppercase tracking-wide">Bank Stmt Monthly</div>
                    <div className="text-2xl font-bold text-orange-900 mt-1">{fmt(calcBsTotal)}</div>
                    <div className="text-xs text-orange-500 mt-1">Down: {fmt(calcBsPrice * calcBsDown / 100)}</div>
                  </div>
                </div>
                <div className="border-2 border-[#C8202A] rounded-xl px-4 py-3 text-center text-sm font-semibold text-[#C8202A]">
                  Difference: {fmt(Math.abs(calcBsTotal - calcFdTotal))}/mo · Down payment gap: {fmt(Math.abs(calcBsPrice * calcBsDown / 100 - calcFdPrice * calcFdDown / 100))}
                </div>
              </div>
            )}
          </div>

          {/* Print footer */}
          <div className="print-only" style={{ borderTop: "2px solid #C8202A", padding: "10px 0", textAlign: "center", marginTop: 20 }}>
            <div style={{ fontSize: 10, color: "#6B6B6B", fontWeight: 500 }}>The Rio Group — Powered by AZ &amp; Associates</div>
            <div style={{ fontSize: 8, color: "#ABABAB", marginTop: 3 }}>All figures are estimates for informational purposes only. Client should consult a CPA before amending returns. Subject to lender approval.</div>
          </div>

      </div>{/* end printRef */}
    </div>
  );
}
