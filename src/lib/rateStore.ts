"use client";

const RATES_KEY = "rio_rates";
const SETTINGS_KEY = "rio_settings";

export interface Rates {
  conventional: number;
  fha: number;
  va: number;
  lastUpdated: string;
  program1Rate?: number; // 1% Down override — if set, used instead of conventional + offset
  program2Rate?: number; // $1K Down override — if set, used instead of conventional + offset
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
  lastUpdated: "",
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
  // Try the server-side FRED proxy first (works on Vercel)
  try {
    const res = await fetch("/api/rates", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (!data.error && data.conventional) {
        return {
          conventional: data.conventional,
          fha: data.fha,
          va: data.va,
          lastUpdated: data.lastUpdated,
          source: data.source,
          asOf: data.asOf,
        };
      }
    }
  } catch { /* fall through to static fallback */ }

  // Fallback: use the static rate-history.json (works on localhost & Vercel)
  try {
    const res = await fetch("/rate-history.json", { cache: "no-store" });
    if (!res.ok) return null;
    const file = await res.json();
    const points = file["3months"] || file["6months"] || file["1year"] || file["2years"];
    if (!points?.length) return null;
    const latest = points[points.length - 1];
    return {
      conventional: latest.conventional,
      fha: latest.fha,
      va: latest.va,
      lastUpdated: new Date().toISOString(),
      source: "Freddie Mac PMMS (cached)",
      asOf: latest.date,
    };
  } catch {
    return null;
  }
}
