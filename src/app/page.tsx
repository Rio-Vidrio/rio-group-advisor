"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Navigation from "@/components/Navigation";
import WizardShell from "@/components/wizard/WizardShell";
import Calculators from "@/components/Calculators";
import ProgramReference from "@/components/ProgramReference";
import MarketRates from "@/components/MarketRates";
import SettingsPanel from "@/components/SettingsPanel";
import { fetchLiveRates, saveRates } from "@/lib/rateStore";

export default function Home() {
  const [activeTab, setActiveTab] = useState("wizard");

  // Fetch live rates on load — always try, save if successful
  useEffect(() => {
    const tryFetchRates = async () => {
      const live = await fetchLiveRates();
      if (live) saveRates(live);
    };
    tryFetchRates();
  }, []);

  return (
    <div className="min-h-screen bg-rio-gray">
      <Header />
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="px-4 py-6 md:py-8">
        {/* Keep all tabs mounted so wizard state is never lost when switching tabs */}
        <div style={{ display: activeTab === "wizard" ? "block" : "none" }}><WizardShell /></div>
        <div style={{ display: activeTab === "calculators" ? "block" : "none" }}><Calculators /></div>
        <div style={{ display: activeTab === "programs" ? "block" : "none" }}><ProgramReference /></div>
        <div style={{ display: activeTab === "rates" ? "block" : "none" }}><MarketRates /></div>
        <div style={{ display: activeTab === "settings" ? "block" : "none" }}><SettingsPanel /></div>
      </main>

      <footer className="bg-rio-dark text-gray-500 text-center text-xs py-4 mt-8 no-print">
        <p>The Rio Group — powered by AZ &amp; Associates</p>
        <p className="mt-1">All estimates for informational purposes only. Subject to lender approval.</p>
      </footer>
    </div>
  );
}
