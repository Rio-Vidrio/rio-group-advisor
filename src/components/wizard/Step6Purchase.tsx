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

export default function Step6Purchase({ client, update }: Props) {
  const showNewBuildNote =
    client.propertyType === "new-build" ||
    ["West Valley", "Maricopa", "Santan Valley"].includes(client.targetArea);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Purchase Details</h2>
      <p className="text-gray-500 text-sm mb-6">Target property information for payment calculations.</p>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Target Purchase Price
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input
              type="number"
              value={client.purchasePrice || ""}
              onChange={(e) => update({ purchasePrice: Number(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg pl-7 pr-4 py-2.5 text-sm focus:border-rio-red focus:ring-1 focus:ring-rio-red outline-none"
              placeholder="350000"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Property Type</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {[
              { label: "Single Family", value: "single-family" },
              { label: "Condo", value: "condo" },
              { label: "Townhome", value: "townhome" },
              { label: "New Build", value: "new-build" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => update({ propertyType: opt.value as ClientData["propertyType"] })}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                  client.propertyType === opt.value
                    ? "bg-rio-red text-white border-rio-red"
                    : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {client.propertyType === "condo" && (
            <div className="mt-2 bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 text-sm text-amber-800">
              <strong>⚠️</strong> Condo — conventional only, 660+ score required. FHA programs ineligible.
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Target Area</label>
          <select
            value={client.targetArea}
            onChange={(e) => update({ targetArea: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:border-rio-red focus:ring-1 focus:ring-rio-red outline-none bg-white"
          >
            <option value="">Select area</option>
            <option value="Phoenix Metro">Phoenix Metro</option>
            <option value="West Valley">West Valley (outside 101)</option>
            <option value="Maricopa">Maricopa</option>
            <option value="Santan Valley">Santan Valley</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {showNewBuildNote && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
            <strong>New Build Opportunity</strong> — Builder rate buydowns (1.5–2% below market) available in this area.
            Check the <strong>New Build vs. Resale</strong> comparison in Calculators for a side-by-side analysis.
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-700">HOA?</label>
          <YesNoButtons
            value={client.hasHOA}
            onChange={(v) => update({ hasHOA: v as "yes" | "no" })}
          />
        </div>

        {client.hasHOA === "yes" && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Monthly HOA Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                value={client.hoaAmount || ""}
                onChange={(e) => update({ hoaAmount: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg pl-7 pr-4 py-2.5 text-sm focus:border-rio-red focus:ring-1 focus:ring-rio-red outline-none max-w-xs"
                placeholder="100"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Down Payment Available
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input
              type="number"
              value={client.downPaymentAvailable || ""}
              onChange={(e) => update({ downPaymentAvailable: Number(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg pl-7 pr-4 py-2.5 text-sm focus:border-rio-red focus:ring-1 focus:ring-rio-red outline-none"
              placeholder="5000"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
