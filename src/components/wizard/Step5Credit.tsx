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

function CountButtons({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-2 mt-1">
      {[
        { label: "0", value: "0" },
        { label: "1", value: "1" },
        { label: "2+", value: "2+" },
      ].map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
            value === opt.value
              ? "bg-rio-red text-white border-rio-red"
              : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function Step5Credit({ client, update }: Props) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Credit Profile</h2>
      <p className="text-gray-500 text-sm mb-6">Credit score, history, and tradeline assessment.</p>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Credit Score (Primary Borrower)
          </label>
          <input
            type="number"
            value={client.creditScore || ""}
            onChange={(e) => update({ creditScore: Number(e.target.value) })}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:border-rio-red focus:ring-1 focus:ring-rio-red outline-none max-w-xs"
            placeholder="680"
          />
          {client.creditScore > 0 && client.creditScore < 580 && (
            <div className="mt-2 bg-red-50 border border-red-300 rounded-lg px-4 py-3 text-sm text-red-800">
              <strong>⛔ Score below 580</strong> — Refer to Cross Country Mortgage for credit repair pathway.
              Show client their target score and estimated max home price once they reach 600+.
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700">
            Any late payments in the last 24 months?
          </label>
          <YesNoButtons
            value={client.hasLatePayments}
            onChange={(v) => update({ hasLatePayments: v as "yes" | "no" })}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700">
            Any open collections (excluding medical)?
          </label>
          <YesNoButtons
            value={client.hasCollections}
            onChange={(v) => update({ hasCollections: v as "yes" | "no" })}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700">
            Traditional tradelines active 12+ months
          </label>
          <p className="text-xs text-gray-400 mb-1">Personal loan, credit card, student loan, car loan</p>
          <CountButtons
            value={client.traditionalTradelines}
            onChange={(v) => update({ traditionalTradelines: v as "0" | "1" | "2+" })}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700">
            Alternative tradelines active
          </label>
          <p className="text-xs text-gray-400 mb-1">Netflix, phone bill, gym, utility, cell phone, app subscriptions</p>
          <CountButtons
            value={client.alternativeTradelines}
            onChange={(v) => update({ alternativeTradelines: v as "0" | "1" | "2+" })}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700">
            Does the client have 12 months of verifiable rental history from a landlord?
          </label>
          <YesNoButtons
            value={client.hasRentalHistory}
            onChange={(v) => update({ hasRentalHistory: v as "yes" | "no" })}
          />
        </div>
      </div>
    </div>
  );
}
