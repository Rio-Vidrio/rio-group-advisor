"use client";

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "wizard", label: "Client Wizard" },
  { id: "homeowner", label: "Existing Homeowner" },
  { id: "selfemployed", label: "Self-Employed" },
  { id: "calculators", label: "Calculators" },
  { id: "programs", label: "Programs" },
  { id: "rates", label: "Market Rates" },
  { id: "settings", label: "Settings" },
];

export default function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <nav
      className="no-print"
      style={{
        background: "#FFFFFF",
        borderBottom: "1px solid #F0EEE9",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 28px" }}>
        <div
          style={{ display: "flex", overflowX: "auto" }}
          className="scrollbar-none"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                style={{
                  padding: "16px 24px",
                  fontSize: "14px",
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: isActive ? 600 : 500,
                  whiteSpace: "nowrap",
                  border: "none",
                  borderBottom: isActive ? "3px solid #C8202A" : "3px solid transparent",
                  background: "transparent",
                  color: isActive ? "#C8202A" : "#8C8880",
                  cursor: "pointer",
                  transition: "color 120ms, background 120ms",
                  marginBottom: "-1px",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.color = "#4A4845";
                    (e.currentTarget as HTMLButtonElement).style.background = "#F0EEE9";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.color = "#8C8880";
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  }
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
