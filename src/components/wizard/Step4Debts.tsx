"use client";

import { ClientData } from "@/lib/loanPrograms";
import { getRates } from "@/lib/rateStore";
import { calculateMonthlyPayment } from "@/lib/loanPrograms";

interface Props {
  client: ClientData;
  update: (partial: Partial<ClientData>) => void;
}

export default function Step4Debts({ client, update }: Props) {
  const totalIncome = client.annualIncome + (client.hasCosigner === "yes" ? client.cosignerIncome : 0);
  const totalDebts = client.monthlyDebts + (client.hasCosigner === "yes" ? client.cosignerDebts : 0);
  const monthlyIncome = totalIncome / 12;
  const maxPayment45 = monthlyIncome * 0.45 - totalDebts;
  const maxPayment57 = monthlyIncome * 0.57 - totalDebts;

  // Estimate a housing payment for DTI preview if purchase price is set
  const rates = getRates();
  const estimatedPITI = client.purchasePrice > 0
    ? (() => {
        const loan = client.purchasePrice * 0.97;
        const pi = calculateMonthlyPayment(loan, rates.conventional, 30);
        const tax = (client.purchasePrice * 0.0045) / 12;
        const ins = 1350 / 12;
        return pi + tax + ins;
      })()
    : 0;

  const housingDTI = monthlyIncome > 0 && estimatedPITI > 0 ? (estimatedPITI / monthlyIncome) * 100 : 0;
  const totalDTI = monthlyIncome > 0 && estimatedPITI > 0 ? ((estimatedPITI + totalDebts) / monthlyIncome) * 100 : 0;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Monthly Debts</h2>
      <p className="text-gray-500 text-sm mb-6">
        Car loans, student loans, credit cards, personal loans, etc. Do NOT include rent.
      </p>

      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Total Monthly Debt Payments
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
          <input
            type="number"
            value={client.monthlyDebts || ""}
            onChange={(e) => update({ monthlyDebts: Number(e.target.value) })}
            className="w-full border border-gray-300 rounded-lg pl-7 pr-4 py-2.5 text-sm focus:border-rio-red focus:ring-1 focus:ring-rio-red outline-none"
            placeholder="500"
          />
        </div>
      </div>

      {/* Live DTI Calculator */}
      {monthlyIncome > 0 && (
        <div className="bg-rio-gray rounded-xl p-5 border border-gray-200">
          <h3 className="font-bold text-sm mb-3 text-gray-700">Live DTI Preview</h3>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-lg p-3 border">
              <div className="text-xs text-gray-500">Max Payment (45% DTI)</div>
              <div className="text-xl font-bold text-rio-black">
                ${maxPayment45 > 0 ? maxPayment45.toFixed(0) : "—"}
              </div>
              <div className="text-xs text-gray-400">Front-End Ratio Guide</div>
            </div>
            <div className="bg-white rounded-lg p-3 border">
              <div className="text-xs text-gray-500">Max Payment (57% DTI)</div>
              <div className="text-xl font-bold text-rio-black">
                ${maxPayment57 > 0 ? maxPayment57.toFixed(0) : "—"}
              </div>
              <div className="text-xs text-gray-400">Back-End Ratio Guide</div>
            </div>
          </div>

          {estimatedPITI > 0 && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white rounded-lg p-3 border">
                <div className="text-xs text-gray-500">Housing DTI</div>
                <div className={`text-xl font-bold ${housingDTI > 46 ? "text-red-600" : housingDTI > 43 ? "text-amber-600" : "text-green-600"}`}>
                  {housingDTI.toFixed(1)}%
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border">
                <div className="text-xs text-gray-500">Total DTI</div>
                <div className={`text-xl font-bold ${totalDTI > 50 ? "text-red-600" : totalDTI > 43 ? "text-amber-600" : "text-green-600"}`}>
                  {totalDTI.toFixed(1)}%
                </div>
              </div>
            </div>
          )}

          {maxPayment45 > 0 && maxPayment45 <= 2100 && (
            <div className="bg-red-50 border border-red-300 rounded-lg px-4 py-3 text-sm text-red-800 mt-3">
              <strong>⚠️ Limited Buying Power</strong>
              <p className="mt-1">
                Based on this income and debt load, the maximum qualifying payment is around ${maxPayment45.toFixed(0)}.
                This limits home price options significantly.
              </p>
              <p className="mt-2">
                <strong>Consider:</strong> Adding a co-signer or having the client pay off existing debt to increase buying power.
              </p>
              {client.creditScore >= 660 && (
                <p className="mt-2">
                  A condo may be achievable in the $1,500–$2,100/month range with conventional financing.
                </p>
              )}
            </div>
          )}

          {client.hasCosigner === "yes" && (
            <div className="text-xs text-gray-500 mt-2">
              Combined income: ${totalIncome.toLocaleString()}/yr | Combined debts: ${totalDebts.toLocaleString()}/mo
            </div>
          )}
        </div>
      )}
    </div>
  );
}
