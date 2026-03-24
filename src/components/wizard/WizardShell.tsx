"use client";

import { useState } from "react";
import { ClientData, defaultClientData, ProgramEligibility, evaluateEligibility, getCrossCountryFlags } from "@/lib/loanPrograms";
import { getRates } from "@/lib/rateStore";
import Step1ClientInfo from "./Step1ClientInfo";
import Step2Citizenship from "./Step2Citizenship";
import Step3Income from "./Step3Income";
import Step4Debts from "./Step4Debts";
import Step5Credit from "./Step5Credit";
import Step6Purchase from "./Step6Purchase";
import Step7Results from "./Step7Results";

const stepLabels = [
  "Client Info",
  "Citizenship",
  "Income",
  "Debts",
  "Credit",
  "Purchase",
  "Results",
];

export default function WizardShell() {
  const [step, setStep] = useState(1);
  const [client, setClient] = useState<ClientData>(defaultClientData);
  const [results, setResults] = useState<ProgramEligibility[] | null>(null);
  const [ccFlags, setCcFlags] = useState<string[]>([]);

  const update = (partial: Partial<ClientData>) => {
    setClient((prev) => ({ ...prev, ...partial }));
  };

  const next = () => {
    if (step === 6) {
      // Run eligibility engine
      const rates = getRates();
      const eligibility = evaluateEligibility(client, { conventional: rates.conventional, fha: rates.fha });
      setResults(eligibility);
      setCcFlags(getCrossCountryFlags(client));
    }
    setStep((s) => Math.min(s + 1, 7));
  };

  const prev = () => setStep((s) => Math.max(s - 1, 1));

  const restart = () => {
    setStep(1);
    setClient(defaultClientData);
    setResults(null);
    setCcFlags([]);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Bar — hidden in print */}
      <div className="mb-6 no-print">
        <div className="flex justify-between mb-2">
          {stepLabels.map((label, i) => (
            <button
              key={i}
              onClick={() => i + 1 <= step ? setStep(i + 1) : null}
              className={`text-xs font-semibold px-1 transition-colors ${
                i + 1 === step
                  ? "text-rio-red"
                  : i + 1 < step
                  ? "text-green-600 cursor-pointer hover:text-green-700"
                  : "text-gray-400"
              }`}
            >
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{i + 1}</span>
            </button>
          ))}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-rio-red h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / 7) * 100}%` }}
          />
        </div>
        <div className="text-center text-sm text-gray-500 mt-1">
          Step {step} of 7 — {stepLabels[step - 1]}
        </div>
      </div>

      {/* Step Content — wizard steps hidden in print; results page has its own print layout */}
      <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8 ${step < 7 ? "no-print" : ""}`}>
        {step === 1 && <Step1ClientInfo client={client} update={update} />}
        {step === 2 && <Step2Citizenship client={client} update={update} />}
        {step === 3 && <Step3Income client={client} update={update} />}
        {step === 4 && <Step4Debts client={client} update={update} />}
        {step === 5 && <Step5Credit client={client} update={update} />}
        {step === 6 && <Step6Purchase client={client} update={update} />}
        {step === 7 && results && (
          <Step7Results
            client={client}
            results={results}
            ccFlags={ccFlags}
            onRestart={restart}
          />
        )}

        {/* Navigation Buttons — always hidden in print */}
        {step < 7 && (
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-100 no-print">
            <button
              onClick={prev}
              disabled={step === 1}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Back
            </button>
            <button
              onClick={next}
              className="px-8 py-2.5 rounded-lg text-sm font-semibold bg-rio-red text-white hover:bg-red-700 transition-colors shadow-sm"
            >
              {step === 6 ? "Get Recommendations" : "Continue"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
