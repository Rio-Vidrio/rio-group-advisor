"use client";

import { useState, useEffect } from "react";
import {
  getRates,
  saveRates,
  Rates,
  defaultRates,
  getSettings,
  saveSettings,
  Settings,
  defaultSettings,
  fetchLiveRates,
  LiveRateResponse,
} from "@/lib/rateStore";

export default function SettingsPanel() {
  const [rates, setRates] = useState<Rates>(defaultRates);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [fetching, setFetching] = useState(false);
  const [liveData, setLiveData] = useState<LiveRateResponse | null>(null);
  const [fetchError, setFetchError] = useState("");
  const [manuallyEdited, setManuallyEdited] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setRates(getRates());
    setSettings(getSettings());
    setMounted(true);
  }, []);

  const updateRate = (key: "conventional" | "fha" | "va", value: number) => {
    const updated = { ...rates, [key]: value, lastUpdated: new Date().toISOString() };
    setRates(updated);
    saveRates(updated);
    setManuallyEdited(true);
  };

  const updateSetting = (key: keyof Settings, value: number) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated as Settings);
    saveSettings(updated as Settings);
  };

  const handleFetchRates = async () => {
    setFetching(true);
    setFetchError("");
    setLiveData(null);
    const live = await fetchLiveRates();
    if (live) {
      setRates(live);
      saveRates(live);
      setLiveData(live);
      setManuallyEdited(false);
    } else {
      setFetchError("Live rate fetch unavailable from this server. Rates update automatically each week via the scheduled refresh — enter rates manually to override.");
    }
    setFetching(false);
  };

  const rateAge = rates.lastUpdated
    ? Math.floor((Date.now() - new Date(rates.lastUpdated).getTime()) / 60000)
    : null;

  const rateStatus = () => {
    if (manuallyEdited) return { label: "Manually set", color: "text-amber-600", dot: "bg-amber-500" };
    if (rateAge === null) return { label: "Unknown", color: "text-gray-500", dot: "bg-gray-400" };
    if (rateAge < 60) return { label: "Live — updated just now", color: "text-green-600", dot: "bg-green-500" };
    if (rateAge < 1440) return { label: `Live — updated ${rateAge < 60 ? rateAge + "m" : Math.floor(rateAge / 60) + "h"} ago`, color: "text-green-600", dot: "bg-green-500" };
    return { label: "Stale — click Refresh", color: "text-amber-600", dot: "bg-amber-500" };
  };

  const status = rateStatus();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Rate Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold">Interest Rates</h3>
          <div className="flex items-center gap-1.5 text-xs">
            <span className={`w-2 h-2 rounded-full ${status.dot}`} />
            <span className={status.color}>{status.label}</span>
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Pulled from the Freddie Mac Primary Mortgage Market Survey (PMMS) via FRED.
          FHA and VA are estimated from the conventional rate.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          {(["conventional", "fha", "va"] as const).map((key) => (
            <div key={key}>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">
                {key === "conventional" ? "Conventional 30yr" : key === "fha" ? "FHA 30yr" : "VA 30yr"}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.125"
                  value={rates[key]}
                  onChange={(e) => updateRate(key, Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:border-rio-red focus:ring-1 focus:ring-rio-red outline-none font-semibold"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={handleFetchRates}
            disabled={fetching}
            className="px-5 py-2 rounded-lg text-sm font-semibold bg-rio-red text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {fetching ? (
              <>
                <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Fetching...
              </>
            ) : (
              "↻ Refresh Live Rates"
            )}
          </button>
          {fetchError && (
            <span className="text-sm text-red-600">{fetchError}</span>
          )}
        </div>

        {/* Live data details */}
        {liveData && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800">
            <strong>✓ Rates updated</strong> — Source: {liveData.source}
            {liveData.asOf && <span className="ml-2 text-green-700">Survey week of {liveData.asOf}</span>}
          </div>
        )}

        <div className="text-xs text-gray-400 mt-3 space-y-0.5">
          <div suppressHydrationWarning>Last updated: {mounted && rates.lastUpdated ? new Date(rates.lastUpdated).toLocaleString() : "—"}</div>
          <div className="text-gray-300">
            Note: FHA = Conventional − 0.25% | VA = Conventional − 0.50% (industry approximations — override manually if needed)
          </div>
        </div>
      </div>

      {/* Default Values */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-bold mb-1">Default Values</h3>
        <p className="text-sm text-gray-500 mb-4">
          Used across all calculators and the wizard.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Default HOA</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                value={settings.defaultHOA}
                onChange={(e) => updateSetting("defaultHOA", Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg pl-7 pr-4 py-2.5 text-sm focus:border-rio-red focus:ring-1 focus:ring-rio-red outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Tax Rate %</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={settings.defaultTaxRate}
                onChange={(e) => updateSetting("defaultTaxRate", Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:border-rio-red focus:ring-1 focus:ring-rio-red outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Annual Insurance</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                value={settings.defaultInsurance}
                onChange={(e) => updateSetting("defaultInsurance", Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg pl-7 pr-4 py-2.5 text-sm focus:border-rio-red focus:ring-1 focus:ring-rio-red outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-bold mb-2">About</h3>
        <p className="text-sm text-gray-600">
          <strong>The Rio Group Products Advisor</strong> — powered by AZ &amp; Associates.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Internal agent-facing consultation tool. All data stored locally in your browser.
          No login required. Rates and settings persist between sessions.
        </p>
        <p className="text-xs text-gray-400 mt-3">
          Disclaimer: This tool provides estimates for informational purposes only.
          All figures are subject to lender approval.
        </p>
      </div>
    </div>
  );
}
