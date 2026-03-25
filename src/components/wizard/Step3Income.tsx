"use client";

import { ClientData } from "@/lib/loanPrograms";

interface Props {
  client: ClientData;
  update: (partial: Partial<ClientData>) => void;
}

function YesNoButtons({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2 mt-1">
      {["yes", "no"].map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
            value === v
              ? "bg-rio-red text-white border-rio-red"
              : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
          }`}
        >
          {v === "yes" ? "Yes" : "No"}
        </button>
      ))}
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
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
      <input
        type="number"
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full border border-gray-300 rounded-lg pl-7 pr-4 py-2.5 text-sm focus:border-rio-red focus:ring-1 focus:ring-rio-red outline-none"
        placeholder={placeholder || "0"}
      />
    </div>
  );
}

export default function Step3Income({ client, update }: Props) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Income & Employment</h2>
      <p className="text-gray-500 text-sm mb-6">Determine qualifying income and employment stability.</p>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Annual Gross Income
          </label>
          <MoneyInput
            value={client.annualIncome}
            onChange={(v) => update({ annualIncome: v })}
            placeholder="75000"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700">Co-signer?</label>
          <YesNoButtons
            value={client.hasCosigner}
            onChange={(v) => update({ hasCosigner: v as "yes" | "no" })}
          />
        </div>

        {client.hasCosigner === "yes" && (
          <div className="ml-4 pl-4 border-l-2 border-rio-red/30 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Co-signer Annual Gross Income
              </label>
              <MoneyInput
                value={client.cosignerIncome}
                onChange={(v) => update({ cosignerIncome: v })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Co-signer Monthly Debts
              </label>
              <MoneyInput
                value={client.cosignerDebts}
                onChange={(v) => update({ cosignerDebts: v })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Co-signer Credit Score
              </label>
              <input
                type="number"
                value={client.cosignerCreditScore || ""}
                onChange={(e) => update({ cosignerCreditScore: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:border-rio-red focus:ring-1 focus:ring-rio-red outline-none"
                placeholder="700"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-700">
            Are you self-employed or do you receive 1099 income?
          </label>
          <YesNoButtons
            value={client.isSelfEmployed}
            onChange={(v) => update({ isSelfEmployed: v as "yes" | "no" })}
          />
        </div>

        {client.isSelfEmployed === "yes" && (
          <div className="ml-4 pl-4 border-l-2 border-rio-red/30">
            <label className="block text-sm font-semibold text-gray-700">
              Do you reduce your net income on taxes to lower your tax liability?
            </label>
            <YesNoButtons
              value={client.reducesNetIncome}
              onChange={(v) => update({ reducesNetIncome: v as "yes" | "no" })}
            />
            {client.reducesNetIncome === "yes" && (
              <div className="mt-3 bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 text-sm text-amber-800">
                <strong>⚠️ Complex income file</strong> — Recommend Cross Country Mortgage partner for this client.
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-700">
            Do you have any gaps in employment in the last 2 years?
          </label>
          <YesNoButtons
            value={client.hasEmploymentGaps}
            onChange={(v) => update({ hasEmploymentGaps: v as "yes" | "no" })}
          />
          {client.hasEmploymentGaps === "yes" && (
            <p className="mt-2 text-sm text-gray-500">
              Documentation may be required — this is OK and manageable.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700">
            Is any portion of your income commission-based or variable (bonuses, overtime)?
          </label>
          <YesNoButtons
            value={client.hasVariableIncome}
            onChange={(v) => update({ hasVariableIncome: v as "yes" | "no", hasVariableIncomeHistory: "" })}
          />
        </div>

        {client.hasVariableIncome === "yes" && (
          <div className="ml-4 pl-4 border-l-2 border-rio-red/30 space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700">
                Do you have 12 or more months of documented history with this income?
              </label>
              <YesNoButtons
                value={client.hasVariableIncomeHistory}
                onChange={(v) => update({ hasVariableIncomeHistory: v as "yes" | "no" })}
              />
            </div>
            {client.hasVariableIncomeHistory === "no" && (
              <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 text-sm text-amber-800">
                <strong>⚠️ Variable income history required</strong>
                <p className="mt-1">
                  Variable income requires 12 months of history to be used for qualifying. Consider waiting
                  until that threshold is met before applying for Programs 1 or 2, or refer to Cross Country
                  Mortgage if they need to move sooner.
                </p>
              </div>
            )}
            {client.hasVariableIncomeHistory === "yes" && (
              <p className="text-sm text-green-700">
                ✓ 12+ months of history — variable income can be used for qualifying.
              </p>
            )}
          </div>
        )}

        {(client.citizenship === "daca" || client.citizenship === "no") && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-4 space-y-3">
            <p className="text-sm font-semibold text-blue-900">ITIN Loan Eligibility Check</p>
            <div>
              <label className="block text-sm font-semibold text-gray-700">
                Do you have 2 years of documented work history and/or tax returns?
              </label>
              <YesNoButtons
                value={client.hasITINWorkHistory}
                onChange={(v) => update({ hasITINWorkHistory: v as "yes" | "no" })}
              />
              {client.hasITINWorkHistory === "yes" && (
                <p className="mt-2 text-sm text-green-700">
                  ✓ Eligible for ITIN Loan — 10% down, 680+ credit score required.
                </p>
              )}
              {client.hasITINWorkHistory === "no" && (
                <p className="mt-2 text-sm text-amber-700">
                  ⚠️ 2 years of documented history required to qualify for ITIN Loan.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
