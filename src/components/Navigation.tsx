"use client";

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "wizard", label: "Client Wizard", icon: "🧙🏼‍♂️" },
  { id: "calculators", label: "Calculators", icon: "🧮" },
  { id: "programs", label: "Program Reference", icon: "📊" },
  { id: "rates", label: "Market Rates", icon: "📈" },
  { id: "homeowner", label: "Existing Homeowner", icon: "🏠" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

export default function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <nav className="bg-white border-b border-gray-200 no-print">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex gap-0 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-rio-red text-rio-red"
                  : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
              }`}
            >
              <span className="mr-1.5 hidden sm:inline">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
