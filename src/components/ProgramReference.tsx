"use client";

import { useState, useEffect } from "react";
import { loanPrograms } from "@/lib/loanPrograms";
import { getRates, saveRates, Rates, defaultRates, getSettings, saveSettings, Settings, defaultSettings } from "@/lib/rateStore";

export default function ProgramReference() {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [rates, setRates] = useState<Rates>(defaultRates);
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  useEffect(() => {
    setRates(getRates());
    setSettings(getSettings());
  }, []);

  const updateNote = (programId: number, note: string) => {
    const updated = { ...settings, programNotes: { ...settings.programNotes, [programId]: note } };
    setSettings(updated);
    saveSettings(updated);
  };

  const updateRate = (key: keyof Rates, value: number) => {
    if (key === "lastUpdated") return;
    const updated = { ...rates, [key]: value, lastUpdated: new Date().toISOString() };
    setRates(updated);
    saveRates(updated);
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Quick Rate Edit */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <h3 className="font-bold text-sm text-gray-700 mb-3">Current Rates (editable — saved automatically)</h3>
        <div className="grid grid-cols-3 gap-3">
          {(["conventional", "fha", "va"] as const).map((key) => (
            <div key={key}>
              <label className="block text-xs text-gray-500 mb-1 uppercase">{key}</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.125"
                  value={rates[key]}
                  onChange={(e) => updateRate(key, Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-rio-red focus:ring-1 focus:ring-rio-red outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
            </div>
          ))}
        </div>
        <div className="text-xs text-gray-400 mt-2">
          Last updated: {new Date(rates.lastUpdated).toLocaleString()}
        </div>
      </div>

      {/* Side-by-side overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6 overflow-x-auto">
        <h3 className="font-bold mb-4">Program Overview</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b">
              <th className="py-2 pr-3">Program</th>
              <th className="py-2 pr-3">Type</th>
              <th className="py-2 pr-3">Min Score</th>
              <th className="py-2 pr-3">Max DTI <span className="font-normal text-gray-400 text-[10px]">(FHA: front/back)</span></th>
              <th className="py-2 pr-3">Down</th>
              <th className="py-2 pr-3">PMI</th>
              <th className="py-2 pr-3">DACA</th>
              <th className="py-2 pr-3">Income Limit</th>
            </tr>
          </thead>
          <tbody>
            {loanPrograms.map((p) => (
              <tr key={p.id} className="border-b border-gray-100 hover:bg-rio-gray/50">
                <td className="py-2.5 pr-3 font-semibold">{p.name}</td>
                <td className="py-2.5 pr-3">{p.loanType}</td>
                <td className="py-2.5 pr-3">{p.minCreditScore}</td>
                <td className="py-2.5 pr-3">
                  {p.loanType === "FHA"
                    ? `${p.housingDTI}% / ${p.maxDTI}%`
                    : `${p.maxDTI}%`}
                </td>
                <td className="py-2.5 pr-3">{p.downPayment}</td>
                <td className="py-2.5 pr-3">{p.hasPMI ? "Yes" : "No"}</td>
                <td className="py-2.5 pr-3">{p.dacaAllowed ? "✅" : "❌"}</td>
                <td className="py-2.5 pr-3">{p.incomeLimit ? `$${(p.incomeLimit / 1000).toFixed(0)}K` : "None"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expandable Cards */}
      <div className="space-y-3">
        {loanPrograms.map((program) => (
          <div
            key={program.id}
            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <button
              onClick={() => setExpanded(expanded === program.id ? null : program.id)}
              className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-rio-gray/50 transition-colors"
            >
              <div>
                <span className="font-bold">{program.name}</span>
                <span className="text-sm text-gray-500 ml-2">{program.loanType} — {program.term}yr</span>
              </div>
              <span className="text-gray-400 text-lg">
                {expanded === program.id ? "−" : "+"}
              </span>
            </button>

            {expanded === program.id && (
              <div className="px-5 pb-5 border-t border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <h4 className="text-sm font-bold text-gray-700 mb-2">Key Details</h4>
                    <dl className="text-sm space-y-1.5">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Down Payment</dt>
                        <dd className="font-medium">{program.downPayment}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Rate</dt>
                        <dd className="font-medium">{program.rateDescription}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Min Credit Score</dt>
                        <dd className="font-medium">{program.minCreditScore}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Max DTI</dt>
                        <dd className="font-medium">
                          {program.loanType === "FHA"
                            ? `${program.housingDTI}% front / ${program.maxDTI}% back`
                            : `${program.maxDTI}%`}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">PMI</dt>
                        <dd className="font-medium">{program.hasPMI ? "Yes" : "No"}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Late Payments OK</dt>
                        <dd className="font-medium">{program.latePaymentsAllowed ? "Yes" : "No"}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Collections OK</dt>
                        <dd className="font-medium">{program.collectionsAllowed ? "Yes" : "No"}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">DACA/Work Permit</dt>
                        <dd className="font-medium">{program.dacaAllowed ? "Yes" : "No"}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Income Limit</dt>
                        <dd className="font-medium">{program.incomeLimit ? `$${program.incomeLimit.toLocaleString()}` : "None"}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Seller Credits</dt>
                        <dd className="font-medium text-right max-w-[200px]">{program.sellerCreditMax}</dd>
                      </div>
                    </dl>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-700 mb-2">Tradelines</h4>
                    <p className="text-sm text-gray-600 mb-3">{program.tradelineNote}</p>

                    <h4 className="text-sm font-bold text-gray-700 mb-2">Homeownership</h4>
                    <p className="text-sm text-gray-600 mb-3">{program.homeownershipRestriction}</p>

                    <h4 className="text-sm font-bold text-green-700 mb-1">Pros</h4>
                    <ul className="text-sm text-gray-700 space-y-0.5 mb-3">
                      {program.pros.map((p, i) => <li key={i}>✓ {p}</li>)}
                    </ul>

                    <h4 className="text-sm font-bold text-red-700 mb-1">Cons</h4>
                    <ul className="text-sm text-gray-700 space-y-0.5">
                      {program.cons.map((c, i) => <li key={i}>✗ {c}</li>)}
                    </ul>
                  </div>
                </div>

                {/* Agent Notes */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Agent Notes</label>
                  <textarea
                    value={settings.programNotes[program.id] || ""}
                    onChange={(e) => updateNote(program.id, e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-rio-red focus:ring-1 focus:ring-rio-red outline-none resize-y"
                    rows={2}
                    placeholder="Add notes for this program..."
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
