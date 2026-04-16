"use client";

import { useState } from "react";

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeLabel = tabs.find((t) => t.id === activeTab)?.label ?? "Menu";

  const handleSelect = (id: string) => {
    onTabChange(id);
    setMobileOpen(false);
  };

  return (
    <nav
      className="no-print"
      style={{
        background: "#FFFFFF",
        borderBottom: "1px solid #ECE8E1",
        boxShadow: "0 1px 3px rgba(20, 16, 10, 0.04)",
      }}
    >
      {/* Desktop — horizontal tabs */}
      <div className="hidden sm:block" style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 32px" }}>
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

      {/* Mobile — stacked dropdown */}
      <div className="sm:hidden">
        {/* Current selection bar */}
        <button
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 20px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              aria-hidden="true"
              style={{
                width: "3px",
                height: "18px",
                background: "#C8202A",
                borderRadius: "2px",
              }}
            />
            <span
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#1A1A1A",
                letterSpacing: "0.01em",
              }}
            >
              {activeLabel}
            </span>
          </div>
          <span
            aria-hidden="true"
            style={{
              display: "inline-block",
              transition: "transform 200ms ease",
              transform: mobileOpen ? "rotate(180deg)" : "rotate(0deg)",
              color: "#8A857C",
              fontSize: "12px",
              lineHeight: 1,
            }}
          >
            ▼
          </span>
        </button>

        {/* Stacked list */}
        {mobileOpen && (
          <div
            style={{
              borderTop: "1px solid #ECE8E1",
              background: "#FAF8F3",
            }}
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleSelect(tab.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 20px",
                    background: isActive ? "#FFFFFF" : "transparent",
                    borderLeft: isActive ? "3px solid #C8202A" : "3px solid transparent",
                    borderBottom: "1px solid #ECE8E1",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "14px",
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? "#1A1A1A" : "#5A5650",
                    letterSpacing: "0.01em",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span>{tab.label}</span>
                  {isActive && (
                    <span
                      aria-hidden="true"
                      style={{
                        fontSize: "11px",
                        color: "#C8202A",
                        fontWeight: 600,
                        letterSpacing: "0.1em",
                      }}
                    >
                      ●
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
