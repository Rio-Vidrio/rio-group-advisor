"use client";

import { ClientData } from "@/lib/loanPrograms";

interface Props {
  client: ClientData;
  update: (partial: Partial<ClientData>) => void;
}

function YesNoButtons({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (val: string) => void;
  options?: { label: string; value: string }[];
}) {
  const opts = options || [
    { label: "Yes", value: "yes" },
    { label: "No", value: "no" },
  ];
  return (
    <div className="flex gap-2 mt-1">
      {opts.map((opt) => (
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

export default function Step2Citizenship({ client, update }: Props) {
  const isITINPath = client.citizenship === "no";
  const isDACAPath = client.citizenship === "daca";
  const isCitizenPath = client.citizenship === "yes";

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Citizenship & Eligibility</h2>
      <p className="text-gray-500 text-sm mb-6">Determine program eligibility based on citizenship and homeownership status.</p>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700">
            Are you a U.S. citizen or permanent resident?
          </label>
          <YesNoButtons
            value={client.citizenship}
            onChange={(v) => update({ citizenship: v as ClientData["citizenship"] })}
            options={[
              { label: "Yes", value: "yes" },
              { label: "No", value: "no" },
              { label: "DACA / Work Permit", value: "daca" },
            ]}
          />
        </div>

        {/* ITIN path — "No" selected */}
        {isITINPath && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-4 space-y-1">
            <p className="text-sm font-bold text-amber-800">⚠️ No DPA options available</p>
            <p className="text-sm text-amber-700">
              Standard down payment assistance programs require U.S. citizenship or permanent residency.
              The <strong>ITIN Loan</strong> may be available — <strong>10% down only</strong>, 680+ credit score,
              and 2 years of documented work history or tax returns required.
            </p>
          </div>
        )}

        {/* VA question — only relevant for US citizens/residents */}
        {(isCitizenPath || isDACAPath) && (
          <div>
            <label className="block text-sm font-semibold text-gray-700">
              Are you using a VA loan?
            </label>
            <YesNoButtons
              value={client.isVeteran}
              onChange={(v) => update({ isVeteran: v as "yes" | "no" })}
            />
            {client.isVeteran === "yes" && (
              <p className="mt-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                VA loan eligibility detected — strong new build candidate if targeting outer West or East Valley areas.
              </p>
            )}
          </div>
        )}

        {/* Homeownership questions — only relevant for non-ITIN path */}
        {!isITINPath && (
          <>
            <div>
              <label className="block text-sm font-semibold text-gray-700">
                Are you currently a homeowner?
              </label>
              <YesNoButtons
                value={client.isHomeowner}
                onChange={(v) => update({ isHomeowner: v as "yes" | "no" })}
              />
            </div>

            {client.isHomeowner === "yes" && (
              <div className="ml-4 pl-4 border-l-2 border-rio-red/30 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700">
                    Do you have 25%+ equity?
                  </label>
                  <YesNoButtons
                    value={client.hasEquity25}
                    onChange={(v) => update({ hasEquity25: v as "yes" | "no" })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700">
                    Has your family size increased since purchasing?
                  </label>
                  <YesNoButtons
                    value={client.familySizeIncreased}
                    onChange={(v) => update({ familySizeIncreased: v as "yes" | "no" })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700">
                    Have you vacated the home or is it currently rented?
                  </label>
                  <YesNoButtons
                    value={client.homeVacated}
                    onChange={(v) => update({ homeVacated: v as "yes" | "no" })}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700">
                Have you owned a home in the last 3 years?
              </label>
              <YesNoButtons
                value={client.ownedLast3Years}
                onChange={(v) => update({ ownedLast3Years: v as "yes" | "no" })}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
