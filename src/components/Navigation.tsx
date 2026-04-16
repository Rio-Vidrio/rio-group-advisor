"use client";

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "wizard", label: "Client Wizard" },
  { id: "homeowner", label: "Existing Homeowner" },
  { id: "selfemployed", label: "Business Owner" },
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
        background: "#111111",
        borderBottom: "2px solid #C8202A",
        boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
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
                  padding: "15px 24px",
                  fontSize: "13px",
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: isActive ? 700 : 400,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase" as const,
                  whiteSpace: "nowrap",
                  border: "none",
                  borderBottom: isActive ? "3px solid #C8202A" : "3px solid transparent",
                  background: "transparent",
                  color: isActive ? "#C8202A" : "rgba(255,255,255,0.45)",
                  cursor: "pointer",
                  transition: "color 120ms, background 120ms",
                  marginBottom: "-1px",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.85)";
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.45)";
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
