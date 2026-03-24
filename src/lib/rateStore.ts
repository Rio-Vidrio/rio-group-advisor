"use client";

const RATES_KEY = "rio_rates";
const SETTINGS_KEY = "rio_settings";

export interface Rates {
  conventional: number;
  fha: number;
  va: number;
  lastUpdated: string;
}

export interface Settings {
  defaultHOA: number;
  defaultTaxRate: number;
  defaultInsurance: number;
  programNotes: Record<number, string>;
}

export const defaultRates: Rates = {
  conventional: 6.25,
  fha: 5.75,
  va: 5.75,
  lastUpdated: new Date().toISOString(),
};

export const defaultSettings: Settings = {
  defaultHOA: 100,
  defaultTaxRate: 0.45,
  defaultInsurance: 1350,
  programNotes: {},
};

export function getRates(): Rates {
  if (typeof window === "undefined") return defaultRates;
  const stored = localStorage.getItem(RATES_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch { return defaultRates; }
  }
  return defaultRates;
}

export function saveRates(rates: Rates): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(RATES_KEY, JSON.stringify(rates));
}

export function getSettings(): Settings {
  if (typeof window === "undefined") return defaultSettings;
  const stored = localStorage.getItem(SETTINGS_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch { return defaultSettings; }
  }
  return defaultSettings;
}

export function saveSettings(settings: Settings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export interface LiveRateResponse extends Rates {
  source?: string;
  asOf?: string;
}

export async function fetchLiveRates(): Promise<LiveRateResponse | null> {
  try {
    // Call our own server-side API route — no CORS issues
    const res = await fetch("/api/rates", { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error || !data.conventional) return null;
    return {
      conventional: data.conventional,
      fha: data.fha,
      va: data.va,
      lastUpdated: data.lastUpdated,
      source: data.source,
      asOf: data.asOf,
    };
  } catch {
    return null;
  }
}
