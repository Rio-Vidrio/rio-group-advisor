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
        background: "#FFFFFF",
        borderBottom: "1px solid #ECE8E1",
        boxShadow: "0 1px 3px rgba(20, 16, 10, 0.04)",
      }}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 32px" }}>
        <div
          style={{ display: "flex", overflowX: "auto", gap: "4px" }}
          className="scrollbar-none"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                style={{
                  position: "relative",
                  padding: "18px 22px",
                  fontSize: "13.5px",
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: isActive ? 600 : 500,
                  letterSpacing: "0.02em",
                  whiteSpace: "nowrap",
                  border: "none",
                  background: "transparent",
                  color: isActive ? "#1A1A1A" : "#8A857C",
                  cursor: "pointer",
                  transition: "color 160ms ease",
                  marginBottom: "-1px",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.color = "#3A3733";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.color = "#8A857C";
                  }
                }}
              >
                {tab.label}
                {/* Active underline — thin, elegant */}
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: "22px",
                    right: "22px",
                    bottom: 0,
                    height: "2px",
                    background: "#C8202A",
                    opacity: isActive ? 1 : 0,
                    transition: "opacity 160ms ease",
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
