"use client";

import { ClientData } from "@/lib/loanPrograms";

interface Props {
  client: ClientData;
  update: (partial: Partial<ClientData>) => void;
}

export default function Step1ClientInfo({ client, update }: Props) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Client Information</h2>
      <p className="text-gray-500 text-sm mb-6">Basic contact details for the consultation.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            First Name <span className="text-rio-red">*</span>
          </label>
          <input
            type="text"
            value={client.firstName}
            onChange={(e) => update({ firstName: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:border-rio-red focus:ring-1 focus:ring-rio-red outline-none"
            placeholder="First name"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Last Name
          </label>
          <input
            type="text"
            value={client.lastName}
            onChange={(e) => update({ lastName: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:border-rio-red focus:ring-1 focus:ring-rio-red outline-none"
            placeholder="Last name"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Date
          </label>
          <input
            type="date"
            value={client.date}
            onChange={(e) => update({ date: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:border-rio-red focus:ring-1 focus:ring-rio-red outline-none"
          />
        </div>
      </div>
    </div>
  );
}
