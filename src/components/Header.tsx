"use client";

import Image from "next/image";

export default function Header() {
  return (
    <header
      className="sticky top-0 z-50 no-print"
      style={{
        position: "relative",
        overflow: "hidden",
        borderBottom: "3px solid #C8202A",
        boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
      }}
    >
      {/* Background image — blurred, darkened, texture only */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "url('/NAI-BUILDING.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center 40%",
          filter: "blur(2px) brightness(0.35)",
          transform: "scale(1.05)",
          zIndex: 0,
        }}
      />

      {/* Desktop content */}
      <div
        className="hidden sm:flex"
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "0 28px",
          height: "72px",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo + Name */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
          <Image
            src="/rio-square.png"
            alt="The Rio Group"
            width={44}
            height={44}
            style={{ borderRadius: "10px" }}
          />
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.9375rem", color: "#FFFFFF", lineHeight: 1.2, letterSpacing: "0.01em" }}>
              The Rio Group
            </div>
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.14em", textTransform: "uppercase", marginTop: "2px" }}>
              Products Advisor
            </div>
          </div>
        </div>

        {/* Center Title */}
        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", textAlign: "center", pointerEvents: "none" }}>
          <span style={{
            fontFamily: "'DM Sans', sans-serif",
            color: "rgba(255,255,255,0.85)",
            fontSize: "13px",
            fontWeight: 500,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}>
            Rio Group&nbsp;&nbsp;|&nbsp;&nbsp;Home Buying Advisor
          </span>
        </div>

        {/* AZ Mark */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.12em" }}>Powered by</div>
            <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "rgba(255,255,255,0.75)", lineHeight: 1.2, marginTop: "1px" }}>
              AZ &amp; Associates
            </div>
          </div>
          <Image
            src="/az-logo-white.png"
            alt="AZ & Associates"
            width={38}
            height={38}
            style={{ borderRadius: "8px", opacity: 0.85 }}
          />
        </div>
      </div>

      {/* Mobile content */}
      <div
        className="sm:hidden flex items-center justify-between"
        style={{ position: "relative", zIndex: 1, height: "60px", padding: "0 16px" }}
      >
        <Image
          src="/rio-square.png"
          alt="The Rio Group"
          width={36}
          height={36}
          style={{ borderRadius: "8px" }}
        />
        <span style={{
          fontFamily: "'DM Sans', sans-serif",
          color: "rgba(255,255,255,0.85)",
          fontSize: "11px",
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}>
          Rio Group&nbsp;|&nbsp;Advisor
        </span>
        <Image
          src="/az-logo-white.png"
          alt="AZ & Associates"
          width={32}
          height={32}
          style={{ borderRadius: "6px", opacity: 0.8 }}
        />
      </div>
    </header>
  );
}
