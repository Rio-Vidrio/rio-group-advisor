"use client";

import { useRef } from "react";
import { TRG_LOGO_BLACK_B64, AZ_LOGO_BLACK_B64 } from "@/lib/printLogos";
import { useReactToPrint } from "react-to-print";
import { ClientData, ProgramEligibility } from "@/lib/loanPrograms";

interface Props {
  client: ClientData;
  results: ProgramEligibility[];
  ccFlags: string[];
  onRestart: () => void;
}

export default function Step7Results({ client, results, ccFlags, onRestart }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef });

  // Sort: eligible first, then conditional, then ineligible; lowest total monthly first within each group
  const sorted = [...results].sort((a, b) => {
    const scoreA = a.eligible && !a.conditional ? 0 : a.eligible && a.conditional ? 1 : 2;
    const scoreB = b.eligible && !b.conditional ? 0 : b.eligible && b.conditional ? 1 : 2;
    if (scoreA !== scoreB) return scoreA - scoreB;
    return a.totalMonthly - b.totalMonthly;
  });

  const bestMatch = sorted.find((r) => r.eligible && !r.conditional);
  const allIneligible = !sorted.some((r) => r.eligible);

  const fmt = (n: number) => "$" + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const pct = (n: number) => n.toFixed(1) + "%";

  // Income & debt summary
  const totalIncome = client.annualIncome + (client.hasCosigner === "yes" ? client.cosignerIncome : 0);
  const totalDebts = client.monthlyDebts + (client.hasCosigner === "yes" ? client.cosignerDebts : 0);
  const monthlyIncome = totalIncome / 12;

  return (
    <div>
      <div ref={printRef} className="print-container">
        {/* Print Header */}
        <div className="print-only mb-6">
          <div className="flex justify-between items-center pb-3 mb-3 border-b-2 border-[#C8202A]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={TRG_LOGO_BLACK_B64} alt="The Rio Group"
              style={{height:48,width:"auto",display:"block",printColorAdjust:"exact",WebkitPrintColorAdjust:"exact"} as React.CSSProperties} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={AZ_LOGO_BLACK_B64} alt="AZ & Associates"
              style={{height:36,width:"auto",display:"block",printColorAdjust:"exact",WebkitPrintColorAdjust:"exact"} as React.CSSProperties} />
          </div>
          <p className="text-sm text-gray-500">
            Prepared for {client.firstName} {client.lastName} | {client.date}
          </p>
        </div>

        <h2 className="text-2xl font-bold mb-1">
          Recommendations for {client.firstName || "Client"}
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          Based on the information provided, here are the loan programs ranked by fit.
        </p>

        {/* Client Snapshot */}
        <div className="bg-rio-gray rounded-xl border border-gray-200 p-5 mb-6">
          <h3 className="font-bold text-sm text-gray-700 mb-3">Client Snapshot</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg p-3 border border-gray-100">
              <div className="text-xs text-gray-500">Annual Income</div>
              <div className="text-lg font-bold">{fmt(client.annualIncome)}</div>
              {client.hasCosigner === "yes" && (
                <div className="text-xs text-gray-400">+ Co-signer: {fmt(client.cosignerIncome)}</div>
              )}
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-100">
              <div className="text-xs text-gray-500">Monthly Debts</div>
              <div className="text-lg font-bold">{fmt(client.monthlyDebts)}/mo</div>
              {client.hasCosigner === "yes" && (
                <div className="text-xs text-gray-400">+ Co-signer: {fmt(client.cosignerDebts)}/mo</div>
              )}
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-100">
              <div className="text-xs text-gray-500">Combined Monthly Income</div>
              <div className="text-lg font-bold">{fmt(monthlyIncome)}</div>
              <div className="text-xs text-gray-400">Total debts: {fmt(totalDebts)}/mo</div>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-100">
              <div className="text-xs text-gray-500">Target Purchase Price</div>
              <div className="text-lg font-bold">{fmt(client.purchasePrice)}</div>
              <div className="text-xs text-gray-400">Credit: {client.creditScore} | Down: {fmt(client.downPaymentAvailable)}</div>
            </div>
          </div>
        </div>

        {/* Cross Country Flags */}
        {ccFlags.length > 0 && (
          <div className="bg-amber-50 border-2 border-amber-400 rounded-xl px-5 py-4 mb-6">
            <h3 className="font-bold text-amber-800 mb-2">
              ⚠️ Cross Country Mortgage Referral Recommended
            </h3>
            <p className="text-sm text-amber-700 mb-2">
              This client may be a stronger candidate for our lending partner at Cross Country Mortgage.
              They specialize in complex files — including self-employment, new jobs, employment gaps,
              and credit repair pathways. Make the introduction as the agent of record.
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
          <div className="bg-red-50 border-2 border-red-300 rounded-xl px-5 py-4 mb-6">
            <h3 className="font-bold text-red-800 mb-2">
              ⚠️ No Programs Currently Qualify
            </h3>
            <p className="text-sm text-red-700">
              Based on the client&apos;s profile, none of the 5 programs are a current match.
              Consider referring to Cross Country Mortgage or reviewing the disqualification reasons below.
            </p>
          </div>
        )}

        {/* Best Match Card */}
        {bestMatch && (
          <div className="border-2 border-rio-red rounded-xl p-5 mb-6 relative">
            <span className="absolute -top-3 left-4 bg-rio-red text-white text-xs font-bold px-3 py-1 rounded-full">
              Best Match
            </span>
            <h3 className="text-xl font-bold mt-1">{bestMatch.program.name}</h3>
            <p className="text-sm text-gray-500 mb-3">{bestMatch.program.loanType} — {bestMatch.program.term}-year term</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div className="bg-rio-gray rounded-lg p-3">
                <div className="text-xs text-gray-500">Est. Monthly Payment</div>
                <div className="text-lg font-bold">{fmt(bestMatch.totalMonthly)}</div>
              </div>
              <div className="bg-rio-gray rounded-lg p-3">
                <div className="text-xs text-gray-500">Down Payment</div>
                <div className="text-lg font-bold">{fmt(bestMatch.downPaymentRequired)}</div>
              </div>
              <div className="bg-rio-gray rounded-lg p-3">
                <div className="text-xs text-gray-500">Financed Amount</div>
                <div className="text-lg font-bold">{fmt(bestMatch.loanAmount)}</div>
                {(bestMatch.program.id === 4) && (
                  <div className="text-[10px] text-gray-400">Includes ~$35K solar</div>
                )}
                {(bestMatch.program.id === 3) && (
                  <div className="text-[10px] text-gray-400">DPA covers down payment</div>
                )}
              </div>
              <div className="bg-rio-gray rounded-lg p-3">
                <div className="text-xs text-gray-500">Est. DTI</div>
                {(() => {
                  const dti = monthlyIncome > 0 ? ((bestMatch.totalMonthly + totalDebts) / monthlyIncome) * 100 : 0;
                  return (
                    <div className={`text-lg font-bold ${dti > bestMatch.program.maxDTI ? "text-red-600" : dti > 43 ? "text-amber-600" : "text-green-600"}`}>
                      {pct(dti)}
                    </div>
                  );
                })()}
                <div className="text-[10px] text-gray-400">Max: {bestMatch.program.maxDTI}%</div>
              </div>
            </div>

            {/* Suggested max price for best match */}
            {bestMatch.suggestedMaxPrice > 0 && (
              <div className="bg-rio-gray rounded-lg px-4 py-3 text-sm mb-4 border border-gray-200">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-semibold">Max Purchase Price:</span>
                  <span className="font-bold text-base">{fmt(bestMatch.suggestedMaxPrice)}</span>
                  {bestMatch.suggestedMaxPriceBound === "program" && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Program Limit</span>
                  )}
                  {bestMatch.suggestedMaxPriceBound === "dti" && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Income-Based</span>
                  )}
                  {client.purchasePrice <= bestMatch.suggestedMaxPrice && client.purchasePrice > 0 && (
                    <span className="text-xs text-green-600 font-semibold">
                      ✓ {fmt(bestMatch.suggestedMaxPrice - client.purchasePrice)} headroom
                    </span>
                  )}
                  {client.purchasePrice > bestMatch.suggestedMaxPrice && (
                    <span className="text-xs text-red-600 font-semibold">
                      ⚠️ {fmt(client.purchasePrice - bestMatch.suggestedMaxPrice)} over limit
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">{bestMatch.suggestedMaxPriceNote}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-bold text-green-700 mb-1">Pros</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  {bestMatch.program.pros.map((p, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-green-600 mt-0.5">✓</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-bold text-red-700 mb-1">Cons</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  {bestMatch.program.cons.map((c, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-red-500 mt-0.5">✗</span> {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* All Programs Comparison */}
        <h3 className="text-lg font-bold mb-3">All Programs — Detailed Breakdown</h3>
        <div className="space-y-4">
          {sorted.map((result) => {
            const isEligible = result.eligible && !result.conditional;
            const isConditional = result.eligible && result.conditional;
            const status = isEligible ? "qualifies" : isConditional ? "conditional" : "disqualified";
            const statusColors = {
              qualifies: "bg-green-50 border-green-200 text-green-800",
              conditional: "bg-amber-50 border-amber-200 text-amber-800",
              disqualified: "bg-red-50 border-red-200 text-red-800",
            };
            const statusLabels = {
              qualifies: "✅ Qualifies",
              conditional: "⚠️ Conditional",
              disqualified: "❌ Disqualified",
            };

            const programDTI = monthlyIncome > 0
              ? ((result.totalMonthly + totalDebts) / monthlyIncome) * 100
              : 0;
            const hasExtraCosts = result.program.id === 4 || result.program.id === 3;
            const priceExceedsSuggested = client.purchasePrice > result.suggestedMaxPrice && result.suggestedMaxPrice > 0;

            return (
              <div
                key={result.program.id}
                className={`border rounded-xl p-4 ${statusColors[status]}`}
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <span className="font-bold text-base">{result.program.name}</span>
                    <span className="text-sm ml-2 opacity-75">{result.program.loanType} — {result.program.term}yr</span>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/50">
                    {statusLabels[status]}
                  </span>
                </div>

                {/* Financing breakdown */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                  <div className="bg-white/60 rounded-lg p-2.5">
                    <div className="text-[11px] text-gray-500 uppercase">Total Monthly</div>
                    <div className="text-lg font-bold">{fmt(result.totalMonthly)}</div>
                  </div>
                  <div className="bg-white/60 rounded-lg p-2.5">
                    <div className="text-[11px] text-gray-500 uppercase">Financed Amount</div>
                    <div className="text-lg font-bold">{fmt(result.loanAmount)}</div>
                    {hasExtraCosts && (
                      <div className="text-[10px] opacity-70">
                        {result.program.id === 4 ? "Includes ~$35K solar" : "DPA second loan covers down"}
                      </div>
                    )}
                  </div>
                  <div className="bg-white/60 rounded-lg p-2.5">
                    <div className="text-[11px] text-gray-500 uppercase">Rate</div>
                    <div className="text-lg font-bold">{result.effectiveRate.toFixed(2)}%</div>
                  </div>
                  <div className="bg-white/60 rounded-lg p-2.5">
                    <div className="text-[11px] text-gray-500 uppercase">Est. DTI</div>
                    <div className={`text-lg font-bold ${programDTI > result.program.maxDTI ? "text-red-700" : programDTI > 43 ? "text-amber-700" : "text-green-700"}`}>
                      {pct(programDTI)}
                    </div>
                    <div className="text-[10px] opacity-70">Max: {result.program.maxDTI}%</div>
                  </div>
                </div>

                {/* Suggested max price — always show for context */}
                {result.suggestedMaxPrice > 0 && (
                  <div className={`rounded-lg px-4 py-3 text-sm mb-3 ${
                    priceExceedsSuggested
                      ? "bg-red-100/80 border border-red-300"
                      : "bg-white/50 border border-gray-200"
                  }`}>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-semibold">
                        {priceExceedsSuggested ? "⚠️ " : ""}Max Purchase Price:
                      </span>
                      <span className="font-bold text-base">{fmt(result.suggestedMaxPrice)}</span>
                      {result.suggestedMaxPriceBound === "program" && (
                        <span className="text-xs bg-white/70 px-2 py-0.5 rounded-full font-medium opacity-80">Program Limit</span>
                      )}
                      {result.suggestedMaxPriceBound === "dti" && (
                        <span className="text-xs bg-white/70 px-2 py-0.5 rounded-full font-medium opacity-80">Income-Based</span>
                      )}
                      {priceExceedsSuggested && (
                        <span className="text-xs font-semibold text-red-700">
                          {fmt(client.purchasePrice - result.suggestedMaxPrice)} over limit
                        </span>
                      )}
                      {!priceExceedsSuggested && client.purchasePrice > 0 && (
                        <span className="text-xs font-semibold text-green-700">
                          ✓ {fmt(result.suggestedMaxPrice - client.purchasePrice)} headroom
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-1 opacity-70">{result.suggestedMaxPriceNote}</p>
                    {priceExceedsSuggested && (
                      <p className="text-xs mt-1.5 opacity-80">
                        Consider lowering the purchase price to {fmt(result.suggestedMaxPrice)} or below
                        {client.hasCosigner !== "yes" ? ", adding a co-signer," : ""} or reducing monthly debts.
                      </p>
                    )}
                  </div>
                )}

                {/* Disqualification reasons */}
                {result.reasons.length > 0 && (
                  <div className="text-sm opacity-80">
                    {result.reasons.map((r, i) => (
                      <div key={i}>• {r}</div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Next Steps */}
        <div className="mt-6 bg-rio-gray rounded-xl p-5 border">
          <h3 className="font-bold mb-2">Next Steps</h3>
          {ccFlags.length > 0 ? (
            <p className="text-sm text-gray-700">
              Introduce the client to our lending partner at Cross Country Mortgage
              for specialized support with their file.
            </p>
          ) : (
            <p className="text-sm text-gray-700">
              Guide the client through the next steps in the process.
            </p>
          )}
        </div>

        {/* Disclaimer */}
        <div className="mt-4 text-xs text-gray-400 text-center">
          The Rio Group — powered by AZ &amp; Associates
          <br />
          This is an estimate for informational purposes only. All figures subject to lender approval.
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-100 no-print">
        <button
          onClick={() => handlePrint()}
          className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-rio-red text-white hover:bg-red-700 transition-colors"
        >
          Save PDF
        </button>
        <button
          onClick={onRestart}
          className="px-6 py-2.5 rounded-lg text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Start New Consultation
        </button>
      </div>
    </div>
  );
}
