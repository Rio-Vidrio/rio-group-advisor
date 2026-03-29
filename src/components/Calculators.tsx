"use client";

import { useState, useEffect, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { calculateMonthlyPayment } from "@/lib/loanPrograms";
import { getRates, Rates, defaultRates } from "@/lib/rateStore";
import { TRG_LOGO_BLACK_B64, AZ_LOGO_BLACK_B64 } from "@/lib/printLogos";

/* ── Floating Quick Calculator ── */
function FloatingCalc() {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [waitNext, setWaitNext] = useState(false);

  const press = (key: string) => {
    if (key === "C") { setDisplay("0"); setPrev(null); setOp(null); setWaitNext(false); return; }
    if (key === "=") {
      if (op === null || prev === null) return;
      const cur = parseFloat(display);
      let res = prev;
      if (op === "+") res = prev + cur;
      if (op === "-") res = prev - cur;
      if (op === "×") res = prev * cur;
      if (op === "÷") res = cur !== 0 ? prev / cur : 0;
      const str = parseFloat(res.toFixed(10)).toString();
      setDisplay(str); setPrev(null); setOp(null); setWaitNext(true);
      return;
    }
    if (["+", "-", "×", "÷"].includes(key)) {
      setPrev(parseFloat(display)); setOp(key); setWaitNext(true); return;
    }
    if (key === ".") {
      if (waitNext) { setDisplay("0."); setWaitNext(false); return; }
      if (!display.includes(".")) setDisplay(display + ".");
      return;
    }
    if (waitNext) { setDisplay(key); setWaitNext(false); return; }
    setDisplay(display === "0" ? key : display.length < 12 ? display + key : display);
  };

  const keys = ["C","÷","×","-","7","8","9","+","4","5","6","=","1","2","3","0","."];
  const wide = new Set(["=","0"]);

  return (
    <div className="relative no-print">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-10 h-10 rounded-full bg-rio-red text-white shadow-lg flex items-center justify-center hover:bg-red-700 transition-colors text-lg"
        title="Quick Calculator"
        aria-label="Quick Calculator"
      >
        🧮
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-12 right-0 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 w-52 overflow-hidden">
            <div className="bg-gray-900 px-3 pt-3 pb-2">
              <div className="text-right text-white text-xl font-mono truncate">{display}</div>
              {op && <div className="text-right text-gray-400 text-xs">{op}</div>}
            </div>
            <div className="grid grid-cols-4 gap-px bg-gray-200 p-px">
              {keys.map(k => (
                <button
                  key={k}
                  onClick={() => press(k)}
                  className={`${wide.has(k) ? (k === "=" ? "col-span-1 row-span-2" : "col-span-2") : ""} ${
                    k === "=" ? "bg-rio-red text-white row-span-2" :
                    k === "C" ? "bg-red-100 text-red-700 font-bold" :
                    ["+","-","×","÷"].includes(k) ? "bg-amber-50 text-amber-700 font-bold" :
                    "bg-white text-gray-800"
                  } py-3 text-sm font-semibold hover:brightness-95 transition-all`}
                >
                  {k}
                </button>
              ))}
            </div>
            <button onClick={() => setOpen(false)} className="w-full text-xs text-gray-400 py-1.5 hover:text-gray-600 bg-gray-50 border-t border-gray-100">✕ Close</button>
          </div>
        </>
      )}
    </div>
  );
}

function fmt(n: number) {
  return "$" + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1.5px solid #E8E8E8",
  borderRadius: "10px",
  padding: "11px 16px",
  fontSize: "0.9375rem",
  color: "#111111",
  background: "#FFFFFF",
  outline: "none",
};
const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.8125rem",
  fontWeight: 500,
  color: "#111111",
  marginBottom: "7px",
};

function MoneyInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div className="relative">
        <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#9B9B9B", fontSize: "0.875rem" }}>$</span>
        <input
          type="number"
          value={value || ""}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ ...inputStyle, paddingLeft: "28px" }}
          placeholder={placeholder || "0"}
        />
      </div>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  suffix,
  placeholder,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  placeholder?: string;
  step?: string;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div className="relative">
        <input
          type="number"
          value={value || ""}
          onChange={(e) => onChange(Number(e.target.value))}
          step={step || "any"}
          style={{ ...inputStyle, paddingRight: suffix ? "40px" : "16px" }}
          placeholder={placeholder || "0"}
        />
        {suffix && (
          <span style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", color: "#9B9B9B", fontSize: "0.875rem" }}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * TaxInput — toggle between dollar amount and tax rate %
 * mode "dollar": user enters annual tax dollars, component derives rate from price
 * mode "rate": user enters rate %, component derives dollar amount from price
 */
function TaxInput({
  price,
  taxDollars,
  onTaxDollarsChange,
  taxRate,
  onTaxRateChange,
  label,
  assessorLink,
  note,
}: {
  price: number;
  taxDollars: number;
  onTaxDollarsChange: (v: number) => void;
  taxRate: number;
  onTaxRateChange: (v: number) => void;
  label?: string;
  assessorLink?: boolean;
  note?: React.ReactNode;
}) {
  const [mode, setMode] = useState<"dollar" | "rate">("rate");

  const handleModeSwitch = (newMode: "dollar" | "rate") => {
    if (newMode === mode) return;
    if (newMode === "dollar") {
      // Derive dollar from current rate
      onTaxDollarsChange(Math.round(price * (taxRate / 100)));
    } else {
      // Derive rate from current dollar
      if (price > 0) {
        onTaxRateChange(Number(((taxDollars / price) * 100).toFixed(4)));
      }
    }
    setMode(newMode);
  };

  // When price changes and mode is rate, keep dollars in sync
  const derivedDollars = mode === "rate" ? Math.round(price * (taxRate / 100)) : taxDollars;
  const derivedRate = mode === "dollar" && price > 0 ? Number(((taxDollars / price) * 100).toFixed(4)) : taxRate;

  // Sync derived values upstream
  useEffect(() => {
    if (mode === "rate") {
      onTaxDollarsChange(Math.round(price * (taxRate / 100)));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [price, taxRate, mode]);

  useEffect(() => {
    if (mode === "dollar" && price > 0) {
      onTaxRateChange(Number(((taxDollars / price) * 100).toFixed(4)));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [price, taxDollars, mode]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label style={labelStyle}>{label || "Property Taxes"}</label>
        {assessorLink && (
          <a
            href="https://mcassessor.maricopa.gov"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-rio-red underline font-medium hover:text-rio-red/80"
          >
            Look up on Maricopa County Assessor ↗
          </a>
        )}
      </div>
      {/* Toggle */}
      <div className="flex gap-1 mb-2">
        {(["dollar", "rate"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => handleModeSwitch(m)}
            style={{
              flex: 1,
              padding: "7px 0",
              borderRadius: "7px",
              fontSize: "0.75rem",
              fontWeight: 600,
              border: mode === m ? "1.5px solid #C8202A" : "1.5px solid #E8E8E8",
              background: "#FFFFFF",
              color: mode === m ? "#C8202A" : "#6B6B6B",
              cursor: "pointer",
              transition: "background 100ms, color 100ms",
            }}
          >
            {m === "dollar" ? "$ Amount" : "Tax Rate %"}
          </button>
        ))}
      </div>
      {mode === "dollar" ? (
        <>
          <div className="relative">
            <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#9B9B9B", fontSize: "0.875rem" }}>$</span>
            <input
              type="number"
              value={taxDollars || ""}
              onChange={(e) => onTaxDollarsChange(Number(e.target.value))}
              style={{ ...inputStyle, paddingLeft: "28px" }}
              placeholder="1800"
            />
          </div>
          <div style={{ fontSize: "0.6875rem", color: "#9B9B9B", marginTop: "4px" }}>= {derivedRate}% of {fmt(price)}</div>
        </>
      ) : (
        <>
          <div className="relative">
            <input
              type="number"
              value={taxRate || ""}
              onChange={(e) => onTaxRateChange(Number(e.target.value))}
              step="0.01"
              style={{ ...inputStyle, paddingRight: "36px" }}
              placeholder="0.45"
            />
            <span style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", color: "#9B9B9B", fontSize: "0.875rem" }}>%</span>
          </div>
          <div style={{ fontSize: "0.6875rem", color: "#9B9B9B", marginTop: "4px" }}>= {fmt(derivedDollars)}/yr</div>
        </>
      )}
      {note && <div className="mt-1">{note}</div>}
    </div>
  );
}

function ResultCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div style={{ background: "#F7F6F4", borderRadius: "10px", padding: "14px 16px", border: "1px solid #E8E8E8" }}>
      <div style={{ fontSize: "0.6875rem", color: "#6B6B6B", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ fontSize: "1.25rem", fontWeight: 700, color: highlight ? "#C8202A" : "#111111" }}>{value}</div>
      {sub && <div style={{ fontSize: "0.6875rem", color: "#9B9B9B", marginTop: "2px" }}>{sub}</div>}
    </div>
  );
}

/* ── Calculator 1: Monthly Payment ── */
type LoanMode = "conventional" | "fha" | "va";

function PaymentCalc() {
  const [loanMode, setLoanMode] = useState<LoanMode>("conventional");
  const [rates, setRates] = useState<Rates>(defaultRates);
  const [price, setPrice] = useState(350000);
  const [downPct, setDownPct] = useState(3);
  const [rate, setRate] = useState(0);
  const [term, setTerm] = useState(30);
  const [tax, setTax] = useState(0.45);
  const [taxDollars, setTaxDollars] = useState(Math.round(350000 * 0.0045));
  const [insurance, setInsurance] = useState(1350);
  const [hoa, setHoa] = useState(0);
  const [pmiRate, setPmiRate] = useState(0.55); // Conventional PMI — adjustable, default 0.55%
  const [vaDisabilityWaiver, setVaDisabilityWaiver] = useState(false);
  const [clientName, setClientName] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const todayStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    pageStyle: `
      @page { margin: 0.5in; size: letter portrait; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    `,
    onBeforePrint: () => new Promise<void>((resolve) => {
      const imgs = printRef.current?.querySelectorAll("img") ?? [];
      if (!imgs.length) { resolve(); return; }
      let pending = imgs.length;
      imgs.forEach((img) => {
        if (img.complete && img.naturalHeight !== 0) { if (--pending === 0) resolve(); }
        else { img.onload = img.onerror = () => { if (--pending === 0) resolve(); }; const s = img.src; img.src = ""; img.src = s; }
      });
    }),
  });

  useEffect(() => {
    const r = getRates();
    setRates(r);
    setRate(r.conventional);
  }, []);

  // When loan mode changes, reset rate and down payment defaults
  useEffect(() => {
    if (loanMode === "conventional") {
      setRate(rates.conventional);
      setDownPct(3);
    } else if (loanMode === "fha") {
      setRate(rates.fha);
      setDownPct(3.5);
    } else {
      setRate(rates.va);
      setDownPct(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loanMode]);

  // --- Core calculations ---
  const downPayment = loanMode === "va" ? 0 : price * (downPct / 100);
  const baseLoan = price - downPayment;

  // Funding fees rolled into loan principal
  const fhaUpfrontMIP = loanMode === "fha" ? baseLoan * 0.0175 : 0;         // 1.75% — fixed, not editable
  const vaFundingFee  = loanMode === "va"  ? (vaDisabilityWaiver ? 0 : baseLoan * 0.0215) : 0; // 2.15% or waived
  const totalLoan = baseLoan + fhaUpfrontMIP + vaFundingFee;

  const monthlyPI  = calculateMonthlyPayment(totalLoan, rate, term);
  const monthlyTax = (price * (tax / 100)) / 12;
  const monthlyIns = insurance / 12;

  // Monthly mortgage insurance
  const monthlyMI =
    loanMode === "conventional" && downPct < 20 ? (baseLoan * (pmiRate / 100)) / 12 :
    loanMode === "fha"                           ? (baseLoan * 0.0055) / 12 :   // FHA annual MIP 0.55% — fixed
    0; // VA: no MI

  const piti  = monthlyPI + monthlyTax + monthlyIns + monthlyMI;
  const total = piti + hoa;

  const modeLabel = loanMode === "conventional" ? "Conv" : loanMode === "fha" ? "FHA" : "VA";
  const currentRate =
    loanMode === "conventional" ? rates.conventional :
    loanMode === "fha"          ? rates.fha : rates.va;

  return (
    <div>
      <div ref={printRef} className="print-root">

        {/* ── PRINT-ONLY HEADER ── (hidden on screen) */}
        <div className="print-only mb-4">
          <div className="flex justify-between items-center pb-3 mb-3 border-b-2 border-[#C8202A]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={TRG_LOGO_BLACK_B64} alt="The Rio Group"
              style={{height:52,width:"auto",display:"block",printColorAdjust:"exact",WebkitPrintColorAdjust:"exact"} as React.CSSProperties} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={AZ_LOGO_BLACK_B64} alt="AZ & Associates"
              style={{height:40,width:"auto",display:"block",printColorAdjust:"exact",WebkitPrintColorAdjust:"exact"} as React.CSSProperties} />
          </div>
          <h1 className="text-xl font-bold mb-0.5 text-rio-black">Monthly Payment Summary</h1>
          <p className="text-sm text-gray-500 mb-1">{todayStr}</p>
          {clientName      && <p className="text-sm text-gray-700">Client: <strong>{clientName}</strong></p>}
          {propertyAddress && <p className="text-sm text-gray-700">Property: <strong>{propertyAddress}</strong></p>}
          <p className="text-sm text-gray-700 mt-1">
            Loan Type: <strong>{loanMode === "conventional" ? "Conventional" : loanMode === "fha" ? "FHA" : "VA"}</strong>
          </p>
        </div>

        {/* ── PRINT-ONLY breakdown detail table ── */}
        <div className="print-only mb-6 border border-gray-200 rounded-lg overflow-hidden">
          {([
            { label: "Purchase Price",               value: fmt(price)                                              },
            loanMode !== "va"
              ? { label: `Down Payment (${downPct}%)`, value: `${fmt(downPayment)}`                                }
              : { label: "Down Payment",               value: "$0 — VA No Down Payment Required"                   },
            { label: "Loan Amount",                  value: fmt(baseLoan)                                          },
            { label: "Interest Rate",                value: `${rate.toFixed(2)}%`                                  },
            { label: "Loan Term",                    value: `${term} years`                                        },
            { label: "Monthly Principal & Interest", value: fmt(monthlyPI)                                         },
            { label: "Monthly Property Tax",         value: fmt(monthlyTax)                                        },
            { label: "Monthly Insurance",            value: fmt(monthlyIns)                                        },
            hoa > 0
              ? { label: "Monthly HOA",              value: fmt(hoa) }
              : null,
            loanMode === "conventional" && downPct < 20
              ? { label: `Monthly PMI (${pmiRate}%/yr)`, value: fmt(monthlyMI) }
              : null,
            loanMode === "fha"
              ? { label: "Monthly MIP (0.55%/yr)", value: fmt(monthlyMI) }
              : null,
          ] as ({ label: string; value: string } | null)[])
            .filter((r): r is { label: string; value: string } => r !== null)
            .map((row, i) => (
              <div key={i} className={`flex justify-between px-4 py-1.5 border-b border-gray-100 ${i % 2 === 0 ? "bg-gray-50" : "bg-white"}`}>
                <span className="text-sm text-gray-600">{row.label}</span>
                <span className="text-sm font-semibold text-rio-black">{row.value}</span>
              </div>
            ))}
          <div className="flex justify-between items-center px-4 py-4 bg-red-50 border-t-2 border-[#C8202A]">
            <span className="font-bold text-base text-rio-black">Total Monthly Payment</span>
            <span className="text-3xl font-extrabold text-rio-red">{fmt(total)}</span>
          </div>
        </div>

        {/* ── SCREEN-ONLY title & inputs ── */}
        <h3 className="text-lg font-bold mb-5 no-print" style={{ color: "#111111", letterSpacing: "-0.01em" }}>Monthly Payment Calculator</h3>

        {/* Client info for print */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5 pb-5 border-b border-gray-100 no-print">
          <div>
            <label style={labelStyle}>
              Client Name <span className="text-xs text-gray-400 font-normal">(optional — for print)</span>
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. John & Jane Smith"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>
              Property Address <span className="text-xs text-gray-400 font-normal">(optional — for print)</span>
            </label>
            <input
              type="text"
              value={propertyAddress}
              onChange={(e) => setPropertyAddress(e.target.value)}
              placeholder="e.g. 1234 W Main St, Chandler AZ"
              style={inputStyle}
            />
          </div>
        </div>

      {/* Loan type sub-tabs */}
      <div className="flex gap-2 mb-6 no-print">
        {(["conventional", "fha", "va"] as LoanMode[]).map((m) => {
          const isActive = loanMode === m;
          return (
            <button
              key={m}
              onClick={() => setLoanMode(m)}
              style={{
                padding: "8px 20px",
                borderRadius: "8px",
                fontSize: "0.875rem",
                fontWeight: 500,
                border: isActive ? "1.5px solid #C8202A" : "1.5px solid #E8E8E8",
                background: "#FFFFFF",
                color: isActive ? "#C8202A" : "#6B6B6B",
                fontWeight: isActive ? 600 : 500,
                cursor: "pointer",
                transition: "background 100ms, color 100ms",
                minHeight: "40px",
              }}
            >
              {m === "conventional" ? "Conventional" : m === "fha" ? "FHA" : "VA"}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 no-print">
        <MoneyInput label="Purchase Price" value={price} onChange={setPrice} placeholder="350000" />

        {/* Down payment — hidden for VA */}
        {loanMode !== "va" ? (
          <NumberInput
            label="Down Payment %"
            value={downPct}
            onChange={setDownPct}
            suffix="%"
            placeholder={loanMode === "fha" ? "3.5" : "3"}
          />
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800 flex items-center">
            <span className="font-semibold">VA Loan — No Down Payment Required</span>
          </div>
        )}

        {/* Rate slider */}
        <div>
          <label style={labelStyle}>
            Interest Rate: {rate.toFixed(2)}%
          </label>
          <input
            type="range" min="2" max="12" step="0.125" value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="w-full accent-rio-red"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>2%</span>
            <span>Current {modeLabel}: {currentRate.toFixed(2)}%</span>
            <span>12%</span>
          </div>
        </div>

        <NumberInput label="Loan Term (years)" value={term} onChange={setTerm} placeholder="30" />
        <TaxInput
          price={price}
          taxDollars={taxDollars}
          onTaxDollarsChange={setTaxDollars}
          taxRate={tax}
          onTaxRateChange={setTax}
          label="Property Taxes"
        />
        <MoneyInput label="Annual Insurance" value={insurance} onChange={setInsurance} placeholder="1350" />
        <MoneyInput label="Monthly HOA" value={hoa} onChange={setHoa} placeholder="0" />

        {/* Conventional PMI — adjustable, only when < 20% down */}
        {loanMode === "conventional" && downPct < 20 && (
          <NumberInput
            label="PMI Rate % (adjustable)"
            value={pmiRate}
            onChange={setPmiRate}
            suffix="%"
            step="0.05"
            placeholder="0.55"
          />
        )}

        {/* FHA — fixed fee info panel (no inputs) */}
        {loanMode === "fha" && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm md:col-span-1">
            <div className="font-semibold text-blue-800 mb-1">FHA Fees — Fixed (not adjustable)</div>
            <div className="text-blue-700 space-y-0.5">
              <div>• Upfront MIP: 1.75% rolled into loan <span className="font-semibold">(+{fmt(fhaUpfrontMIP)})</span></div>
              <div>• Annual MIP: 0.55%/yr → <span className="font-semibold">{fmt(monthlyMI)}/mo</span></div>
            </div>
          </div>
        )}

        {/* VA — disability toggle for funding fee */}
        {loanMode === "va" && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm md:col-span-1">
            <div className="font-semibold text-green-800 mb-2">VA Funding Fee</div>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setVaDisabilityWaiver(false)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  !vaDisabilityWaiver
                    ? "bg-green-700 text-white border-green-700"
                    : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                }`}
              >
                No Disability (2.15%)
              </button>
              <button
                onClick={() => setVaDisabilityWaiver(true)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  vaDisabilityWaiver
                    ? "bg-green-700 text-white border-green-700"
                    : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                }`}
              >
                10%+ Disability (Waived)
              </button>
            </div>
            {vaDisabilityWaiver ? (
              <div className="text-green-700 text-xs">✓ Funding fee waived — $0 additional cost</div>
            ) : (
              <div className="text-green-700 text-xs">2.15% rolled into loan → <span className="font-semibold">+{fmt(vaFundingFee)}</span> financed</div>
            )}
            <div className="text-green-600 text-xs mt-1">✓ No PMI · No down payment required</div>
          </div>
        )}
      </div>

      {/* Results — screen only; print table above already shows all values */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 no-print">
        <ResultCard label="Monthly P&I" value={fmt(monthlyPI)} />
        <ResultCard
          label="Monthly PITI"
          value={fmt(piti)}
          sub={
            loanMode === "fha" ? `Incl. MIP ${fmt(monthlyMI)}/mo` :
            loanMode === "conventional" && downPct < 20 ? `Incl. PMI ${fmt(monthlyMI)}/mo` :
            undefined
          }
        />
        <ResultCard label="Total w/ HOA" value={fmt(total)} />
        <ResultCard
          label={loanMode === "va" ? "Down Payment" : "Down Payment"}
          value={loanMode === "va" ? "$0" : fmt(downPayment)}
          sub={
            fhaUpfrontMIP > 0 ? `+${fmt(fhaUpfrontMIP)} MIP in loan` :
            vaFundingFee > 0   ? `+${fmt(vaFundingFee)} fee in loan` :
            undefined
          }
        />
      </div>

      {/* Loan summary strip */}
      <div className="bg-rio-gray rounded-lg px-4 py-2.5 text-xs text-gray-600 border border-gray-200 no-print">
        <span className="font-semibold">Loan Summary: </span>
        Base loan {fmt(baseLoan)}
        {fhaUpfrontMIP > 0 && <span> + upfront MIP {fmt(fhaUpfrontMIP)}</span>}
        {vaFundingFee  > 0 && <span> + VA funding fee {fmt(vaFundingFee)}</span>}
        <span> = <strong>Total financed {fmt(totalLoan)}</strong></span>
        {loanMode === "va" && <span className="ml-2 text-green-700">· No PMI</span>}
        {loanMode === "fha" && <span className="ml-2 text-blue-700">· Annual MIP {fmt(monthlyMI * 12)}/yr</span>}
      </div>

        {/* Print-only footer */}
        <div className="print-only mt-3 pt-3 border-t border-gray-200 text-center text-xs text-gray-400">
          The Rio Group — Powered by AZ &amp; Associates. All figures are estimates for informational purposes only. Subject to lender approval and qualification.
        </div>
      </div>{/* end printRef */}

      {/* Print button — outside printRef, won't appear on print */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-6 border-t border-gray-100 no-print">
        <button
          onClick={() => handlePrint()}
          style={{ padding: "12px 28px", borderRadius: "10px", background: "#C8202A", color: "#FFFFFF", fontWeight: 600, fontSize: "0.9375rem", border: "none", cursor: "pointer" }}
        >
          Print / Save PDF
        </button>
        <FloatingCalc />
      </div>
    </div>
  );
}

/* ── Calculator 2: DTI ── */
function DTICalc() {
  const [income, setIncome] = useState(75000);
  const [cosignerIncome, setCosignerIncome] = useState(0);
  const [debts, setDebts] = useState(500);
  const [cosignerDebts, setCosignerDebts] = useState(0);
  const [housing, setHousing] = useState(2000);
  const [hasCosigner, setHasCosigner] = useState(false);

  const totalMonthlyIncome = (income + cosignerIncome) / 12;
  const totalDebts = debts + cosignerDebts;
  const housingDTI = totalMonthlyIncome > 0 ? (housing / totalMonthlyIncome) * 100 : 0;
  const totalDTI = totalMonthlyIncome > 0 ? ((housing + totalDebts) / totalMonthlyIncome) * 100 : 0;
  const max45 = totalMonthlyIncome * 0.45 - totalDebts;
  const max57 = totalMonthlyIncome * 0.57 - totalDebts;

  const dtiColor = (v: number) =>
    v > 50 ? "text-red-600" : v > 43 ? "text-amber-600" : "text-green-600";

  return (
    <div>
      <h3 className="text-lg font-bold mb-5" style={{ color: "#111111", letterSpacing: "-0.01em" }}>DTI Calculator</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <MoneyInput label="Annual Gross Income" value={income} onChange={setIncome} />
        <MoneyInput label="Monthly Debts" value={debts} onChange={setDebts} />
        <MoneyInput label="Proposed Monthly Housing Payment" value={housing} onChange={setHousing} />
        <div className="flex items-end">
          <button
            onClick={() => setHasCosigner(!hasCosigner)}
            style={{
              padding: "11px 18px",
              borderRadius: "8px",
              fontSize: "0.875rem",
              fontWeight: 500,
              border: hasCosigner ? "1.5px solid #C8202A" : "1.5px solid #E8E8E8",
              background: "#FFFFFF",
              color: hasCosigner ? "#C8202A" : "#6B6B6B",
              fontWeight: hasCosigner ? 600 : 500,
              cursor: "pointer",
            }}
          >
            {hasCosigner ? "✓ Co-signer Added" : "Add Co-signer"}
          </button>
        </div>
      </div>
      {hasCosigner && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 ml-4 pl-4 border-l-2 border-rio-red/30">
          <MoneyInput label="Co-signer Income" value={cosignerIncome} onChange={setCosignerIncome} />
          <MoneyInput label="Co-signer Debts" value={cosignerDebts} onChange={setCosignerDebts} />
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-rio-gray rounded-lg p-4 border">
          <div className="text-xs text-gray-500">Housing DTI</div>
          <div className={`text-xl font-bold ${dtiColor(housingDTI)}`}>{housingDTI.toFixed(1)}%</div>
        </div>
        <div className="bg-rio-gray rounded-lg p-4 border">
          <div className="text-xs text-gray-500">Total DTI</div>
          <div className={`text-xl font-bold ${dtiColor(totalDTI)}`}>{totalDTI.toFixed(1)}%</div>
        </div>
        <ResultCard label="Max Payment (45%)" value={fmt(Math.max(max45, 0))} sub="Conv / Prog 1 & 2" />
        <ResultCard label="Max Payment (57%)" value={fmt(Math.max(max57, 0))} sub="FHA Programs" />
      </div>
    </div>
  );
}

/* ── Calculator 3: Max Purchase Price ── */
function MaxPriceCalc() {
  const [income, setIncome] = useState(75000);
  const [debts, setDebts] = useState(500);
  const [targetDTI, setTargetDTI] = useState(45);
  const [rate, setRate] = useState(6.25);
  const [tax, setTax] = useState(0.45);
  const [taxDollars, setTaxDollars] = useState(0);
  const [insurance, setInsurance] = useState(1350);
  const [hoa, setHoa] = useState(0);

  const monthlyIncome = income / 12;
  const maxPayment = monthlyIncome * (targetDTI / 100) - debts;
  // Reverse solve for price
  // maxPayment = PI + tax + insurance + hoa
  // PI = maxPayment - (price * taxRate/100/12) - (insurance/12) - hoa
  // This is iterative; use a simple approach
  let maxPrice = 0;
  if (maxPayment > 0) {
    // Binary search
    let lo = 0, hi = 2000000;
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2;
      const loan = mid * 0.965; // 3.5% down
      const pi = calculateMonthlyPayment(loan, rate, 30);
      const t = (mid * (tax / 100)) / 12;
      const ins = insurance / 12;
      const total = pi + t + ins + hoa;
      if (total < maxPayment) lo = mid;
      else hi = mid;
    }
    maxPrice = Math.floor(lo);
  }

  return (
    <div>
      <h3 className="text-lg font-bold mb-5" style={{ color: "#111111", letterSpacing: "-0.01em" }}>Max Purchase Price Calculator</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <MoneyInput label="Annual Gross Income" value={income} onChange={setIncome} />
        <MoneyInput label="Monthly Debts" value={debts} onChange={setDebts} />
        <NumberInput label="Target DTI %" value={targetDTI} onChange={setTargetDTI} suffix="%" />
        <NumberInput label="Interest Rate %" value={rate} onChange={setRate} suffix="%" step="0.125" />
        <TaxInput
          price={maxPrice || 350000}
          taxDollars={taxDollars}
          onTaxDollarsChange={setTaxDollars}
          taxRate={tax}
          onTaxRateChange={setTax}
          label="Property Taxes"
        />
        <MoneyInput label="Annual Insurance" value={insurance} onChange={setInsurance} />
        <MoneyInput label="Monthly HOA" value={hoa} onChange={setHoa} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ResultCard label="Max Purchase Price" value={fmt(maxPrice)} sub={`at ${targetDTI}% DTI`} />
        <ResultCard label="Max Monthly Payment" value={fmt(Math.max(maxPayment, 0))} sub="Including PITI + HOA" />
      </div>
    </div>
  );
}

/* ── Calculator 4: Solar Savings ── */
function SolarCalc() {
  const [sqft, setSqft] = useState(1800);
  const [electricBill, setElectricBill] = useState(180);

  const solarCost = 200; // monthly addition
  const estimatedSavings = Math.min(electricBill * 0.85, 200); // 85% savings, capped
  const netImpact = solarCost - estimatedSavings;
  const breakEvenMonths = estimatedSavings > 0 ? Math.ceil(35000 / (estimatedSavings * 12)) * 12 : 0;
  const fiveYearSavings = estimatedSavings * 60 - solarCost * 60;

  return (
    <div>
      <h3 className="text-lg font-bold mb-5" style={{ color: "#111111", letterSpacing: "-0.01em" }}>Solar Savings Calculator</h3>
      <p className="text-sm text-gray-500 mb-4">
        Phoenix Metro defaults — APS/SRP average ~$180/month for 1,800 sq ft
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <NumberInput label="Home Square Footage" value={sqft} onChange={setSqft} placeholder="1800" />
        <MoneyInput label="Current Monthly Electric Bill" value={electricBill} onChange={setElectricBill} placeholder="180" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <ResultCard label="Est. Monthly Savings" value={fmt(estimatedSavings)} />
        <ResultCard label="Solar Payment" value={fmt(solarCost)} sub="Added to mortgage" />
        <ResultCard label="Net Monthly Impact" value={(netImpact >= 0 ? "+" : "") + fmt(Math.abs(netImpact))} sub={netImpact > 0 ? "Net cost" : "Net savings"} />
        <ResultCard label="5-Year Net" value={(fiveYearSavings >= 0 ? "+" : "-") + fmt(Math.abs(fiveYearSavings))} />
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
        Break-even: ~{breakEvenMonths} months | Solar adds ~$10–15K to home value at resale
      </div>
    </div>
  );
}

/* ── Calculator 5: New Build vs Resale ── */
function NewBuildCalc() {
  const [rates, setRates] = useState<Rates>(defaultRates);

  useEffect(() => { setRates(getRates()); }, []);

  const [nbPrice, setNbPrice] = useState(470000);
  const [nbRate, setNbRate] = useState(3.75);
  const [nbHoa, setNbHoa] = useState(100);
  const [nbDownPct, setNbDownPct] = useState(3.5);
  const [nbTaxRate, setNbTaxRate] = useState(0.8); // First-year new build tax rate
  const [nbTaxDollars, setNbTaxDollars] = useState(Math.round(470000 * 0.008));

  const [rsPrice, setRsPrice] = useState(380000);
  const [rsRate, setRsRate] = useState(0);
  const [rsHoa, setRsHoa] = useState(0);
  const [rsDownPct, setRsDownPct] = useState(3.5);
  const [rsTaxRate, setRsTaxRate] = useState(0.45);
  const [rsTaxDollars, setRsTaxDollars] = useState(Math.round(380000 * 0.0045));

  useEffect(() => { setRsRate(rates.fha); }, [rates]);

  const todayStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    pageStyle: `
      @page { margin: 0.5in; size: letter portrait; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    `,
    onBeforePrint: () => new Promise<void>((resolve) => {
      const imgs = printRef.current?.querySelectorAll("img") ?? [];
      if (!imgs.length) { resolve(); return; }
      let pending = imgs.length;
      imgs.forEach((img) => {
        if (img.complete && img.naturalHeight !== 0) { if (--pending === 0) resolve(); }
        else { img.onload = img.onerror = () => { if (--pending === 0) resolve(); }; const s = img.src; img.src = ""; img.src = s; }
      });
    }),
  });

  const insurance = 1350;

  const calc = (price: number, rate: number, hoa: number, downPct: number, taxRate: number) => {
    const down = price * (downPct / 100);
    const loan = price - down;
    const pi = calculateMonthlyPayment(loan, rate, 30);
    const tax = (price * (taxRate / 100)) / 12;
    const ins = insurance / 12;
    const pmi = downPct < 20 ? (loan * 0.007) / 12 : 0;
    const piti = pi + tax + ins + pmi;
    const total = piti + hoa;
    const lifetimeInterest = pi * 360 - loan;
    return { pi, piti, total, lifetimeInterest, down, loan };
  };

  const nb = calc(nbPrice, nbRate, nbHoa, nbDownPct, nbTaxRate);
  const rs = calc(rsPrice, rsRate, rsHoa, rsDownPct, rsTaxRate);

  // Payment-equivalent: what resale price = same payment as new build at market rate
  let equivalentResalePrice = 0;
  {
    let lo = 0, hi = 1500000;
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2;
      const c = calc(mid, rsRate, rsHoa, rsDownPct, rsTaxRate);
      if (c.total < nb.total) lo = mid;
      else hi = mid;
    }
    equivalentResalePrice = Math.floor(lo);
  }

  // Reverse: what new build price = same payment as resale at builder rate
  let maxNewBuildForResalePayment = 0;
  {
    let lo = 0, hi = 1500000;
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2;
      const c = calc(mid, nbRate, nbHoa, nbDownPct, nbTaxRate);
      if (c.total < rs.total) lo = mid;
      else hi = mid;
    }
    maxNewBuildForResalePayment = Math.floor(lo);
  }

  return (
    <div>
      <div ref={printRef} className="print-root">

        {/* ── PRINT-ONLY HEADER ── */}
        <div className="print-only mb-4">
          <div className="flex justify-between items-center pb-3 mb-3 border-b-2 border-[#C8202A]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={TRG_LOGO_BLACK_B64} alt="The Rio Group"
              style={{height:52,width:"auto",display:"block",printColorAdjust:"exact",WebkitPrintColorAdjust:"exact"} as React.CSSProperties} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={AZ_LOGO_BLACK_B64} alt="AZ & Associates"
              style={{height:40,width:"auto",display:"block",printColorAdjust:"exact",WebkitPrintColorAdjust:"exact"} as React.CSSProperties} />
          </div>
          <h1 className="text-xl font-bold mb-0.5 text-rio-black">New Build vs. Resale Comparison</h1>
          <p className="text-xs text-gray-500">{todayStr}</p>
        </div>

        {/* ── PRINT-ONLY side-by-side summary ── */}
        <div className="print-only mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
              <div className="font-bold text-blue-800 mb-3">New Build</div>
              {[
                { label: "Purchase Price",  value: fmt(nbPrice) },
                { label: `Down (${nbDownPct}%)`, value: fmt(nb.down) },
                { label: "Loan Amount",     value: fmt(nb.loan) },
                { label: "Rate (buydown)",  value: `${nbRate}%` },
                { label: "Tax Rate",        value: `${nbTaxRate}%` },
                { label: "Monthly HOA",     value: fmt(nbHoa) },
                { label: "P&I",             value: fmt(nb.pi) },
                { label: "PITI",            value: fmt(nb.piti) },
              ].map((r, i) => (
                <div key={i} className="flex justify-between text-sm py-1 border-b border-blue-100">
                  <span className="text-blue-700">{r.label}</span>
                  <span className="font-semibold text-blue-900">{r.value}</span>
                </div>
              ))}
              <div className="flex justify-between text-base font-bold mt-2 pt-2 text-blue-900">
                <span>Total Monthly</span><span>{fmt(nb.total)}</span>
              </div>
            </div>
            <div className="border border-green-200 rounded-lg p-4 bg-green-50">
              <div className="font-bold text-green-800 mb-3">Resale</div>
              {[
                { label: "Purchase Price",  value: fmt(rsPrice) },
                { label: `Down (${rsDownPct}%)`, value: fmt(rs.down) },
                { label: "Loan Amount",     value: fmt(rs.loan) },
                { label: "Rate (market)",   value: `${rsRate.toFixed(2)}%` },
                { label: "Tax Rate",        value: `${rsTaxRate}%` },
                { label: "Monthly HOA",     value: rsHoa > 0 ? fmt(rsHoa) : "None" },
                { label: "P&I",             value: fmt(rs.pi) },
                { label: "PITI",            value: fmt(rs.piti) },
              ].map((r, i) => (
                <div key={i} className="flex justify-between text-sm py-1 border-b border-green-100">
                  <span className="text-green-700">{r.label}</span>
                  <span className="font-semibold text-green-900">{r.value}</span>
                </div>
              ))}
              <div className="flex justify-between text-base font-bold mt-2 pt-2 text-green-900">
                <span>Total Monthly</span><span>{fmt(rs.total)}</span>
              </div>
            </div>
          </div>
          <div className="bg-rio-red/5 border-2 border-rio-red rounded-xl px-5 py-4 text-sm text-gray-700">
            <strong className="text-rio-red">Monthly Difference: </strong>
            {nb.total > rs.total
              ? `Resale saves ${fmt(nb.total - rs.total)}/mo (${fmt((nb.total - rs.total) * 12)}/yr)`
              : `New Build saves ${fmt(rs.total - nb.total)}/mo (${fmt((rs.total - nb.total) * 12)}/yr)`}
            <br />
            <strong>Payment-equivalent:</strong> {fmt(nbPrice)} new build at {nbRate}% = same payment as a {fmt(equivalentResalePrice)} resale at {rsRate.toFixed(2)}%
          </div>
        </div>

        <h3 className="text-lg font-bold mb-5 no-print" style={{ color: "#111111", letterSpacing: "-0.01em" }}>New Build vs. Resale Comparison</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 no-print">
          {/* New Build inputs */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h4 className="font-bold text-blue-800 mb-3">New Build</h4>
          <div className="space-y-3">
            <MoneyInput label="Purchase Price" value={nbPrice} onChange={setNbPrice} />
            {/* Down payment */}
            <div>
              <NumberInput label="Down Payment %" value={nbDownPct} onChange={setNbDownPct} suffix="%" step="0.5" placeholder="3.5" />
              <div className="mt-1 text-xs text-blue-600 font-medium pl-1">
                = {fmt(nb.down)} down · Loan {fmt(nb.loan)}
              </div>
            </div>
            <NumberInput label="Rate (builder buydown)" value={nbRate} onChange={setNbRate} suffix="%" step="0.125" />
            {/* Tax rate with first-year note */}
            <TaxInput
              price={nbPrice}
              taxDollars={nbTaxDollars}
              onTaxDollarsChange={setNbTaxDollars}
              taxRate={nbTaxRate}
              onTaxRateChange={setNbTaxRate}
              label="Property Taxes"
              note={
                <div className="text-xs text-amber-700 font-medium pl-1">
                  ⚠ First year tax rate always higher on new builds
                </div>
              }
            />
            <MoneyInput label="Monthly HOA" value={nbHoa} onChange={setNbHoa} />
          </div>
        </div>
        {/* Resale inputs */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <h4 className="font-bold text-green-800 mb-3">Resale</h4>
          <div className="space-y-3">
            <MoneyInput label="Purchase Price" value={rsPrice} onChange={setRsPrice} />
            {/* Down payment */}
            <div>
              <NumberInput label="Down Payment %" value={rsDownPct} onChange={setRsDownPct} suffix="%" step="0.5" placeholder="3.5" />
              <div className="mt-1 text-xs text-green-700 font-medium pl-1">
                = {fmt(rs.down)} down · Loan {fmt(rs.loan)}
              </div>
            </div>
            <NumberInput label="Rate (market)" value={rsRate} onChange={setRsRate} suffix="%" step="0.125" />
            <TaxInput
              price={rsPrice}
              taxDollars={rsTaxDollars}
              onTaxDollarsChange={setRsTaxDollars}
              taxRate={rsTaxRate}
              onTaxRateChange={setRsTaxRate}
              label="Property Taxes"
            />
            <MoneyInput label="Monthly HOA" value={rsHoa} onChange={setRsHoa} />
          </div>
        </div>
      </div>

      {/* Highlighted total monthly payment comparison */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-blue-50 border-2 border-blue-400 rounded-xl p-4 text-center">
          <div className="text-xs text-blue-600 font-semibold uppercase tracking-wide">New Build Monthly</div>
          <div className="text-3xl font-bold text-blue-900 mt-1">{fmt(nb.total)}</div>
          <div className="text-xs text-blue-500 mt-1">P&I {fmt(nb.pi)} + Tax/Ins + HOA</div>
        </div>
        <div className="bg-green-50 border-2 border-green-400 rounded-xl p-4 text-center">
          <div className="text-xs text-green-600 font-semibold uppercase tracking-wide">Resale Monthly</div>
          <div className="text-3xl font-bold text-green-900 mt-1">{fmt(rs.total)}</div>
          <div className="text-xs text-green-500 mt-1">P&I {fmt(rs.pi)} + Tax/Ins{rsHoa > 0 ? " + HOA" : ""}</div>
        </div>
      </div>

      {/* Monthly difference */}
      <div className={`rounded-lg px-4 py-3 text-center text-sm font-semibold mb-4 ${
        nb.total > rs.total
          ? "bg-green-50 border border-green-300 text-green-800"
          : "bg-blue-50 border border-blue-300 text-blue-800"
      }`}>
        {nb.total > rs.total
          ? `Resale saves ${fmt(nb.total - rs.total)}/mo (${fmt((nb.total - rs.total) * 12)}/yr)`
          : `New Build saves ${fmt(rs.total - nb.total)}/mo (${fmt((rs.total - nb.total) * 12)}/yr)`}
      </div>

      {/* PITI breakdown */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          <ResultCard label="New Build P&I" value={fmt(nb.pi)} />
          <ResultCard label="New Build PITI" value={fmt(nb.piti)} />
        </div>
        <div className="space-y-2">
          <ResultCard label="Resale P&I" value={fmt(rs.pi)} />
          <ResultCard label="Resale PITI" value={fmt(rs.piti)} />
        </div>
      </div>

      {/* Key insight: max new build price to match resale payment */}
      <div className="bg-rio-red/5 border-2 border-rio-red rounded-xl px-5 py-4 mb-4">
        <h4 className="font-bold text-rio-red text-sm mb-2">New Build Price Suggestion</h4>
        <p className="text-sm text-gray-700">
          To match the resale payment of <strong>{fmt(rs.total)}/mo</strong>, the client could purchase a new build up to{" "}
          <strong className="text-rio-red text-lg">{fmt(maxNewBuildForResalePayment)}</strong> at the builder buydown rate of {nbRate}%.
        </p>
        {maxNewBuildForResalePayment > nbPrice ? (
          <p className="text-sm text-green-700 mt-2 font-semibold">
            That&apos;s {fmt(maxNewBuildForResalePayment - nbPrice)} MORE than the current new build price — there&apos;s room to go higher.
          </p>
        ) : maxNewBuildForResalePayment < nbPrice ? (
          <p className="text-sm text-red-700 mt-2 font-semibold">
            The current new build price is {fmt(nbPrice - maxNewBuildForResalePayment)} OVER the resale-equivalent payment. Consider a lower-priced new build or increasing the resale budget.
          </p>
        ) : null}
      </div>

      <div className="bg-rio-gray border border-gray-200 rounded-lg px-4 py-3 text-sm mb-4">
        <strong>Payment-equivalent price:</strong> A {fmt(nbPrice)} new build at {nbRate}% = same payment as a{" "}
        <strong>{fmt(equivalentResalePrice)}</strong> resale at {rsRate.toFixed(2)}%
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
            <h4 className="font-bold text-blue-800 mb-1">New Build Notes</h4>
            <ul className="text-blue-700 space-y-1">
              <li>✅ Lower payment due to builder buydown</li>
              <li>✅ New construction — no repair costs</li>
              <li>⚠️ Must use builder&apos;s lender</li>
              <li>⚠️ 5–7% price premium over resale</li>
              <li>⚠️ HOA required</li>
              <li>⚠️ No pool / smaller lot / no RV gate</li>
            </ul>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
            <h4 className="font-bold text-green-800 mb-1">Resale Notes</h4>
            <ul className="text-green-700 space-y-1">
              <li>✅ Lower purchase price</li>
              <li>✅ More lender flexibility</li>
              <li>✅ Established neighborhoods</li>
              <li>✅ Pool / larger lot options</li>
              <li>⚠️ May need repairs/updates</li>
              <li>⚠️ Higher rate = higher payment per $</li>
            </ul>
          </div>
        </div>

        {/* Print-only footer */}
        <div className="print-only mt-3 pt-3 border-t border-gray-200 text-center text-xs text-gray-400">
          The Rio Group — Powered by AZ &amp; Associates. All figures are estimates for informational purposes only. Subject to lender approval and qualification.
        </div>
      </div>{/* end printRef */}

      <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-100 no-print">
        <button
          onClick={() => handlePrint()}
          style={{ padding: "12px 28px", borderRadius: "10px", background: "#C8202A", color: "#FFFFFF", fontWeight: 600, fontSize: "0.9375rem", border: "none", cursor: "pointer" }}
        >
          Print / Save PDF
        </button>
      </div>
    </div>
  );
}

/* ── Calculator 6: Loan Payoff Estimator ── */
function LoanPayoffCalc({ onPayoffCalculated }: { onPayoffCalculated: (amount: number) => void }) {
  const [originalLoan, setOriginalLoan] = useState(350000);
  const [interestRate, setInterestRate] = useState(6.5);
  const [firstPaymentDate, setFirstPaymentDate] = useState("");

  const parseLocalDate = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  const today = new Date();
  const todayStr = today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  let paymentsMade = 0;
  let remainingBalance = 0;
  let totalInterestPaid = 0;
  let monthlyPayment = 0;

  const hasResult = firstPaymentDate && originalLoan > 0 && interestRate > 0;

  if (hasResult) {
    const firstDate = parseLocalDate(firstPaymentDate);
    const r = interestRate / 100 / 12;
    const n = 360;

    monthlyPayment = (originalLoan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

    const yr = today.getFullYear() - firstDate.getFullYear();
    const mo = today.getMonth() - firstDate.getMonth();
    paymentsMade = Math.min(Math.max(yr * 12 + mo, 0), n);

    remainingBalance = paymentsMade === 0
      ? originalLoan
      : originalLoan * Math.pow(1 + r, paymentsMade) -
        monthlyPayment * (Math.pow(1 + r, paymentsMade) - 1) / r;

    remainingBalance = Math.max(0, remainingBalance);
    const principalPaid = originalLoan - remainingBalance;
    totalInterestPaid = Math.max(0, monthlyPayment * paymentsMade - principalPaid);
  }

  const paymentsRemaining = 360 - paymentsMade;

  return (
    <div>
      <h3 className="text-lg font-bold mb-5" style={{ color: "#111111", letterSpacing: "-0.01em" }}>Loan Payoff Estimator</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <MoneyInput label="Original Loan Amount" value={originalLoan} onChange={setOriginalLoan} placeholder="350000" />
        <NumberInput label="Original Interest Rate %" value={interestRate} onChange={setInterestRate} suffix="%" step="0.125" placeholder="6.5" />
        <div className="md:col-span-2">
          <label style={labelStyle}>Date of First Payment</label>
          <input
            type="date"
            value={firstPaymentDate}
            onChange={(e) => setFirstPaymentDate(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      {hasResult && (
        <>
          {/* Primary result */}
          <div className="bg-rio-red/5 border-2 border-rio-red rounded-xl px-6 py-5 mb-5 text-center">
            <div className="text-sm font-semibold text-gray-600 mb-1">Estimated Current Payoff</div>
            <div className="text-4xl font-bold text-rio-red mb-1">{fmt(remainingBalance)}</div>
            <div className="text-xs text-gray-500 mb-3">
              Snapshot as of {todayStr}. Contact lender for official payoff amount.
            </div>
            <button
              onClick={() => onPayoffCalculated(Math.round(remainingBalance))}
              className="px-5 py-2 bg-rio-red text-white text-sm font-semibold rounded-lg hover:bg-rio-red/90 transition-colors"
            >
              Send to Net Proceeds Calculator →
            </button>
          </div>

          {/* Supporting stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ResultCard label="Original Loan" value={fmt(originalLoan)} />
            <ResultCard label="Payments Made" value={String(paymentsMade)} sub={`${fmt(monthlyPayment)}/mo`} />
            <ResultCard label="Payments Remaining" value={String(paymentsRemaining)} />
            <ResultCard label="Total Interest Paid" value={fmt(totalInterestPaid)} />
          </div>
        </>
      )}
    </div>
  );
}

/* ── Calculator 7: Seller Net Proceeds ── */
function SellerNetCalc({ importedPayoff }: { importedPayoff: number | null }) {
  const [offerPrice, setOfferPrice] = useState(400000);
  const [payoff, setPayoff] = useState(0);
  const [annualTaxes, setAnnualTaxes] = useState(2000);
  const [taxRate, setTaxRate] = useState(Number(((2000 / 400000) * 100).toFixed(4)));
  const [hoaDues, setHoaDues] = useState(0);
  const [closingDate, setClosingDate] = useState("");
  const [concessionsPct, setConcessionsPct] = useState(0);
  const [buyerAgentPct, setBuyerAgentPct] = useState(2.5);
  const [listingAgentPct, setListingAgentPct] = useState(3);
  const [clientName, setClientName] = useState("");

  const todayStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    pageStyle: `
      @page { margin: 0.5in; size: letter portrait; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    `,
    onBeforePrint: () => new Promise<void>((resolve) => {
      const imgs = printRef.current?.querySelectorAll("img") ?? [];
      if (!imgs.length) { resolve(); return; }
      let pending = imgs.length;
      imgs.forEach((img) => {
        if (img.complete && img.naturalHeight !== 0) { if (--pending === 0) resolve(); }
        else { img.onload = img.onerror = () => { if (--pending === 0) resolve(); }; const s = img.src; img.src = ""; img.src = s; }
      });
    }),
  });

  const parseLocalDate = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  // Prorate: seller credits buyer for days owned Jan 1 → closing
  let proratedTaxes = 0;
  let daysFromJan1 = 0;
  if (closingDate && annualTaxes > 0) {
    const closing = parseLocalDate(closingDate);
    const jan1 = new Date(closing.getFullYear(), 0, 1);
    daysFromJan1 = Math.floor((closing.getTime() - jan1.getTime()) / 86400000);
    proratedTaxes = (annualTaxes / 365) * daysFromJan1;
  }

  const concessionsAmt  = offerPrice * (concessionsPct / 100);
  const buyerAgentAmt   = offerPrice * (buyerAgentPct  / 100);
  const listingAgentAmt = offerPrice * (listingAgentPct / 100);
  const titleFees       = offerPrice * 0.01;

  const netProceeds = offerPrice - payoff - proratedTaxes - hoaDues
    - concessionsAmt - buyerAgentAmt - listingAgentAmt - titleFees;
  const isNegative = netProceeds < 0;

  const DeductionRow = ({ label, value }: { label: string; value: number }) => (
    <div className="flex justify-between items-center py-2 border-b border-gray-100">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-semibold text-red-600">− {fmt(value)}</span>
    </div>
  );

  return (
    <div>
      <div ref={printRef} className="print-root">

        {/* ── PRINT-ONLY HEADER ── */}
        <div className="print-only mb-4">
          <div className="flex justify-between items-center pb-3 mb-3 border-b-2 border-[#C8202A]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={TRG_LOGO_BLACK_B64} alt="The Rio Group"
              style={{height:52,width:"auto",display:"block",printColorAdjust:"exact",WebkitPrintColorAdjust:"exact"} as React.CSSProperties} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={AZ_LOGO_BLACK_B64} alt="AZ & Associates"
              style={{height:40,width:"auto",display:"block",printColorAdjust:"exact",WebkitPrintColorAdjust:"exact"} as React.CSSProperties} />
          </div>
          <h1 className="text-xl font-bold mb-0.5 text-rio-black">Seller Net Proceeds Estimate</h1>
          <p className="text-xs text-gray-500 mb-1">{todayStr}</p>
          {clientName && <p className="text-xs text-gray-700">Client: <strong>{clientName}</strong></p>}
        </div>

        <h3 className="text-lg font-bold mb-5 no-print" style={{ color: "#111111", letterSpacing: "-0.01em" }}>Seller Net Proceeds Estimator</h3>

        {/* Client name — for print only */}
        <div className="mb-4 no-print">
          <label style={labelStyle}>
            Client Name <span className="text-xs text-gray-400 font-normal">(optional — for print)</span>
          </label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="e.g. John & Jane Smith"
            style={inputStyle}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 no-print">
          <MoneyInput label="Purchase / Offer Price" value={offerPrice} onChange={setOfferPrice} placeholder="400000" />

        {/* Payoff with import button */}
        <div>
          <label style={labelStyle}>Payoff Amount</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                value={payoff || ""}
                onChange={(e) => setPayoff(Number(e.target.value))}
                style={{ ...inputStyle, paddingLeft: "28px" }}
                placeholder="0"
              />
            </div>
            {importedPayoff !== null && (
              <button
                onClick={() => setPayoff(importedPayoff)}
                className="px-3 py-2 bg-rio-red/10 text-rio-red text-xs font-semibold rounded-lg border border-rio-red/30 hover:bg-rio-red/20 whitespace-nowrap transition-colors"
              >
                Import from Payoff Calc
              </button>
            )}
          </div>
        </div>

        {/* Annual taxes with assessor link */}
        <TaxInput
          price={offerPrice}
          taxDollars={annualTaxes}
          onTaxDollarsChange={setAnnualTaxes}
          taxRate={taxRate}
          onTaxRateChange={setTaxRate}
          label="Property Taxes"
          assessorLink
        />

        <MoneyInput label="HOA Amount Owed at Closing (optional)" value={hoaDues} onChange={setHoaDues} placeholder="0" />

        {/* Closing date */}
        <div>
          <label style={labelStyle}>Closing Date</label>
          <input
            type="date"
            value={closingDate}
            onChange={(e) => setClosingDate(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Seller concessions */}
        <div>
          <label style={labelStyle}>
            Seller Concessions: {concessionsPct.toFixed(1)}%
            <span className="ml-2 text-rio-red font-bold">{fmt(concessionsAmt)}</span>
          </label>
          <input
            type="range" min="0" max="6" step="0.5" value={concessionsPct}
            onChange={(e) => setConcessionsPct(Number(e.target.value))}
            className="w-full accent-rio-red"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-0.5"><span>0%</span><span>6%</span></div>
        </div>

        {/* Buyer agent commission */}
        <div>
          <label style={labelStyle}>
            Buyer&apos;s Agent Commission: {buyerAgentPct.toFixed(2)}%
            <span className="ml-2 text-rio-red font-bold">{fmt(buyerAgentAmt)}</span>
          </label>
          <input
            type="range" min="2" max="4" step="0.25" value={buyerAgentPct}
            onChange={(e) => setBuyerAgentPct(Number(e.target.value))}
            className="w-full accent-rio-red"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-0.5"><span>2%</span><span>4%</span></div>
        </div>

        {/* Listing agent commission */}
        <div>
          <label style={labelStyle}>
            Listing Agent Commission: {listingAgentPct.toFixed(2)}%
            <span className="ml-2 text-rio-red font-bold">{fmt(listingAgentAmt)}</span>
          </label>
          <input
            type="range" min="1" max="6" step="0.25" value={listingAgentPct}
            onChange={(e) => setListingAgentPct(Number(e.target.value))}
            className="w-full accent-rio-red"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-0.5">
            <span>1%</span>
            <span className="text-gray-500">default 3%</span>
            <span>6%</span>
          </div>
        </div>

        {/* Title fees — read only */}
        <div>
          <label style={labelStyle}>Title Fees (1% — fixed)</label>
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-600 flex justify-between items-center">
            <span>1% of purchase price</span>
            <span className="font-bold text-gray-800">{fmt(titleFees)}</span>
          </div>
        </div>
        </div>{/* end no-print inputs grid */}

        {/* Line-by-line breakdown */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h4 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide">Net Proceeds Breakdown</h4>

        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-900">Purchase Price</span>
          <span className="text-sm font-bold text-gray-900">{fmt(offerPrice)}</span>
        </div>
        <DeductionRow label="Payoff Amount" value={payoff} />
        {closingDate && annualTaxes > 0 && (
          <DeductionRow
            label={`Prorated Property Taxes (${fmt(annualTaxes)}/yr ÷ 365 × ${daysFromJan1} days)`}
            value={proratedTaxes}
          />
        )}
        {hoaDues > 0 && <DeductionRow label="HOA Dues at Closing" value={hoaDues} />}
        <DeductionRow label={`Seller Concessions (${concessionsPct.toFixed(1)}% = ${fmt(concessionsAmt)})`} value={concessionsAmt} />
        <DeductionRow label={`Buyer's Agent Commission (${buyerAgentPct.toFixed(2)}% = ${fmt(buyerAgentAmt)})`} value={buyerAgentAmt} />
        <DeductionRow label={`Listing Agent Commission (${listingAgentPct.toFixed(2)}% = ${fmt(listingAgentAmt)})`} value={listingAgentAmt} />
        <DeductionRow label={`Title Fees (1% = ${fmt(titleFees)})`} value={titleFees} />

        {/* Net result */}
        <div className={`flex justify-between items-center py-3 px-4 mt-3 rounded-xl ${isNegative ? "bg-red-50 border border-red-200" : "bg-rio-red/5 border border-rio-red/20"}`}>
          <span className="font-bold text-gray-900 text-sm">Estimated Net Proceeds</span>
          <span className={`text-2xl font-bold ${isNegative ? "text-red-600" : "text-rio-red"}`}>
            {isNegative ? "−" : ""}{fmt(Math.abs(netProceeds))}
          </span>
        </div>

        {isNegative && (
          <div className="mt-3 bg-red-50 border border-red-300 rounded-lg px-4 py-3 text-sm text-red-700 font-semibold">
            ⚠ Estimated proceeds are negative — review payoff, concessions, and commission structure.
          </div>
        )}
      </div>{/* end breakdown card */}

      {/* Print-only footer */}
      <div className="print-only mt-3 pt-3 border-t border-gray-200 text-center text-xs text-gray-400">
        The Rio Group — Powered by AZ &amp; Associates. All figures are estimates for informational purposes only. Subject to lender approval and qualification.
      </div>
    </div>{/* end printRef */}

      <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-6 border-t border-gray-100 no-print">
        <button
          onClick={() => handlePrint()}
          style={{ padding: "12px 28px", borderRadius: "10px", background: "#C8202A", color: "#FFFFFF", fontWeight: 600, fontSize: "0.9375rem", border: "none", cursor: "pointer" }}
        >
          Print / Save PDF
        </button>
        <FloatingCalc />
      </div>
    </div>
  );
}

/* ── Main Calculators Tab ── */
export default function Calculators() {
  const [active, setActive] = useState("payment");
  const [payoffAmount, setPayoffAmount] = useState<number | null>(null);

  const buyerTabs = [
    { id: "payment", label: "Monthly Payment" },
    { id: "dti", label: "DTI" },
    { id: "maxprice", label: "Max Price" },
    { id: "solar", label: "Solar Savings" },
    { id: "newbuild", label: "New Build vs Resale" },
  ];

  const sellerTabs = [
    { id: "payoff", label: "Loan Payoff" },
    { id: "sellernet", label: "Net Proceeds" },
  ];

  const TabBtn = ({ id, label }: { id: string; label: string }) => {
    const isActive = active === id;
    return (
      <button
        onClick={() => setActive(id)}
        style={{
          padding: "8px 18px",
          borderRadius: "8px",
          fontSize: "0.8125rem",
          fontWeight: isActive ? 600 : 500,
          border: isActive ? "1.5px solid #C8202A" : "1.5px solid #E8E8E8",
          background: "#FFFFFF",
          color: isActive ? "#C8202A" : "#6B6B6B",
          cursor: "pointer",
          transition: "background 100ms, color 100ms, border-color 100ms",
          whiteSpace: "nowrap" as const,
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div>
      {/* Tab groups */}
      <div className="mb-6">
        <div style={{ fontSize: "0.6875rem", fontWeight: 600, color: "#C8202A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>
          Buyer Tools
        </div>
        <div className="flex flex-wrap gap-2 mb-5">
          {buyerTabs.map((tab) => <TabBtn key={tab.id} id={tab.id} label={tab.label} />)}
        </div>

        <div style={{ fontSize: "0.6875rem", fontWeight: 600, color: "#C8202A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>
          Seller Tools
        </div>
        <div className="flex flex-wrap gap-2">
          {sellerTabs.map((tab) => <TabBtn key={tab.id} id={tab.id} label={tab.label} />)}
        </div>
      </div>

      <div style={{ background: "#FFFFFF", borderRadius: "16px", border: "1px solid #E8E8E8", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", padding: "32px" }}>
        {active === "payment"    && <PaymentCalc />}
        {active === "dti"        && <DTICalc />}
        {active === "maxprice"   && <MaxPriceCalc />}
        {active === "solar"      && <SolarCalc />}
        {active === "newbuild"   && <NewBuildCalc />}
        {active === "payoff"     && <LoanPayoffCalc onPayoffCalculated={(amt) => { setPayoffAmount(amt); }} />}
        {active === "sellernet"  && <SellerNetCalc importedPayoff={payoffAmount} />}
      </div>
    </div>
  );
}
