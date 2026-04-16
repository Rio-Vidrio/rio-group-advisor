"use client";

import Image from "next/image";

export default function Header() {
  return (
    <header
      className="sticky top-0 z-50 no-print"
      style={{
        position: "relative",
        overflow: "hidden",
        background: "#0E0E0E",
        boxShadow: "0 1px 0 rgba(200, 32, 42, 0.35), 0 6px 20px rgba(0,0,0,0.25)",
      }}
    >
      {/* Background image — very subtle texture */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "url('/NAI-BUILDING.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center 70%",
          filter: "brightness(0.55) blur(3px)",
          transform: "scale(1.06)",
          opacity: 0.55,
          zIndex: 0,
        }}
      />
      {/* Warm black gradient for luxury feel */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(14,14,14,0.75) 0%, rgba(22,18,18,0.55) 45%, rgba(14,14,14,0.8) 100%)",
          zIndex: 0,
        }}
      />
      {/* Hairline red accent at bottom */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "1px",
          background:
            "linear-gradient(90deg, transparent 0%, rgba(200,32,42,0.9) 20%, rgba(200,32,42,0.9) 80%, transparent 100%)",
          zIndex: 2,
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
          padding: "0 32px",
          height: "84px",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo + Name */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexShrink: 0 }}>
          <Image
            src="/rio-square.png"
            alt="The Rio Group"
            width={44}
            height={44}
            style={{ borderRadius: "10px" }}
          />
          <div style={{ borderLeft: "1px solid rgba(255,255,255,0.12)", paddingLeft: "14px" }}>
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: "0.95rem",
                color: "#FFFFFF",
                lineHeight: 1.15,
                letterSpacing: "0.02em",
              }}
            >
              The Rio Group
            </div>
            <div
              style={{
                fontSize: "9.5px",
                color: "rgba(255,255,255,0.45)",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                marginTop: "3px",
                fontWeight: 500,
              }}
            >
              Built&nbsp;&nbsp;Different
            </div>
          </div>
        </div>

        {/* Center Title */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
              color: "#FFFFFF",
              fontSize: "20px",
              fontWeight: 500,
              letterSpacing: "0.04em",
              lineHeight: 1,
            }}
          >
            Client Advisor
          </div>
          <div
            style={{
              marginTop: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
            }}
          >
            <span
              style={{
                height: "1px",
                width: "28px",
                background: "rgba(200,32,42,0.7)",
              }}
            />
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "9.5px",
                color: "rgba(255,255,255,0.55)",
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                fontWeight: 500,
              }}
            >
              The Rio Group
            </span>
            <span
              style={{
                height: "1px",
                width: "28px",
                background: "rgba(200,32,42,0.7)",
              }}
            />
          </div>
        </div>

        {/* AZ Mark */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexShrink: 0 }}>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: "9.5px",
                color: "rgba(255,255,255,0.4)",
                textTransform: "uppercase",
                letterSpacing: "0.22em",
                fontWeight: 500,
              }}
            >
              Powered by
            </div>
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "rgba(255,255,255,0.88)",
                lineHeight: 1.15,
                marginTop: "2px",
                letterSpacing: "0.02em",
              }}
            >
              AZ &amp; Associates
            </div>
          </div>
          <Image
            src="/az-logo-white.png"
            alt="AZ & Associates"
            width={38}
            height={38}
            style={{ borderRadius: "8px", opacity: 0.9 }}
          />
        </div>
      </div>

      {/* Mobile content */}
      <div
        className="sm:hidden flex items-center justify-between"
        style={{ position: "relative", zIndex: 1, height: "62px", padding: "0 16px" }}
      >
        <Image
          src="/rio-square.png"
          alt="The Rio Group"
          width={34}
          height={34}
          style={{ borderRadius: "8px" }}
        />
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
              color: "#FFFFFF",
              fontSize: "15px",
              fontWeight: 500,
              letterSpacing: "0.03em",
              lineHeight: 1,
            }}
          >
            Client Advisor
          </div>
          <div
            style={{
              marginTop: "3px",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "8px",
              color: "rgba(255,255,255,0.5)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
            }}
          >
            The Rio Group
          </div>
        </div>
        <Image
          src="/az-logo-white.png"
          alt="AZ & Associates"
          width={30}
          height={30}
          style={{ borderRadius: "6px", opacity: 0.85 }}
        />
      </div>
    </header>
  );
}
