"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

/**
 * Soft-lock gate for the whole app. Not a security boundary — anyone who
 * inspects the bundle can bypass it — but keeps casual, off-team users out.
 *
 * Password is compared as a SHA-256 hash so the plaintext never appears in
 * the bundle. Successful unlock stores a versioned token in localStorage so
 * agents don't re-enter it on every visit. Bump AUTH_VERSION when the password
 * changes to force everyone to re-authenticate with the new value.
 */

const AUTH_VERSION = 1;
const AUTH_KEY = `rio-advisor-auth-v${AUTH_VERSION}`;

// SHA-256 of "Dothework3!"
const CORRECT_HASH = "0cf9fee2590a65dd8bbb3272d3ad0dce968764a7d6656210ec9e90d7aa17f2f7";

// Where the "Text Rio" button opens. sms: with a pre-filled body works on iOS and Android messaging apps.
const CONTACT_HREF = "sms:+16028720267?body=Hi%20Rio%2C%20I%27d%20like%20the%20Client%20Advisor%20password.%20Name%3A";

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);         // avoids SSR-hydration flash of the login screen
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // On mount, check the stored token
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage.getItem(AUTH_KEY) === "unlocked") {
        setUnlocked(true);
      }
    } catch {
      // localStorage blocked (private mode / cookies off) — user will need to re-enter each session
    }
    setReady(true);
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checking) return;
    setError(null);
    setChecking(true);
    try {
      const hash = await sha256Hex(password);
      if (hash === CORRECT_HASH) {
        try { window.localStorage.setItem(AUTH_KEY, "unlocked"); } catch { /* ignore quota / disabled */ }
        setUnlocked(true);
      } else {
        setError("That password isn't right. Text Rio if you need one.");
      }
    } catch {
      setError("Couldn't check the password on this device. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  // Avoid an SSR/CSR mismatch flash where the login screen briefly renders
  // even though the visitor is already authenticated on this device.
  if (!ready) {
    return <div style={{ minHeight: "100vh", background: "#0E0E0E" }} />;
  }

  if (unlocked) return <>{children}</>;

  return (
    <div style={{ minHeight: "100vh", background: "#0E0E0E", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* Rio branding lockup */}
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "14px" }}>
          <Image src="/rio-square.png" alt="The Rio Group" width={54} height={54} style={{ borderRadius: "12px" }} />
          <div style={{ textAlign: "left" }}>
            <div style={{ color: "#FFFFFF", fontWeight: 600, fontSize: "1rem", letterSpacing: "0.02em" }}>The Rio Group</div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "10px", fontWeight: 500, letterSpacing: "0.22em", textTransform: "uppercase", marginTop: "3px" }}>
              Built Different
            </div>
          </div>
        </div>
        <div style={{ marginTop: "22px" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif", color: "#FFFFFF", fontSize: "26px", fontWeight: 500, letterSpacing: "0.04em", lineHeight: 1.1 }}>
            Client Advisor
          </div>
          <div style={{ marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
            <span style={{ height: "1px", width: "34px", background: "rgba(200,32,42,0.7)" }} />
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "10px", fontWeight: 500, letterSpacing: "0.28em", textTransform: "uppercase" }}>Restricted</span>
            <span style={{ height: "1px", width: "34px", background: "rgba(200,32,42,0.7)" }} />
          </div>
        </div>
      </div>

      {/* Login card */}
      <form
        onSubmit={onSubmit}
        style={{ width: "100%", maxWidth: "380px", background: "#FFFFFF", borderRadius: "14px", padding: "24px", boxShadow: "0 24px 60px rgba(0,0,0,0.35)" }}
      >
        <label htmlFor="rio-pw" style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#6B6B6B", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "8px" }}>
          Password
        </label>
        <div style={{ position: "relative" }}>
          <input
            id="rio-pw"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => { setPassword(e.target.value); if (error) setError(null); }}
            style={{
              width: "100%",
              padding: "12px 60px 12px 14px",
              borderRadius: "10px",
              border: `1.5px solid ${error ? "#C8202A" : "#E8E8E8"}`,
              fontSize: "0.9375rem",
              color: "#111",
              outline: "none",
              transition: "border-color 100ms",
              boxSizing: "border-box",
            }}
            placeholder="Enter password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            style={{
              position: "absolute",
              right: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "transparent",
              border: "none",
              color: "#6B6B6B",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
              padding: "4px 6px",
            }}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        {error && (
          <div style={{ marginTop: "10px", fontSize: "0.8125rem", color: "#C8202A", lineHeight: 1.4 }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={checking || password.length === 0}
          style={{
            marginTop: "16px",
            width: "100%",
            padding: "13px",
            borderRadius: "10px",
            background: password.length === 0 || checking ? "#F2C7CA" : "#C8202A",
            color: "#FFFFFF",
            fontSize: "0.9375rem",
            fontWeight: 700,
            border: "none",
            cursor: checking || password.length === 0 ? "not-allowed" : "pointer",
            letterSpacing: "0.04em",
          }}
        >
          {checking ? "Checking…" : "Unlock"}
        </button>

        <div style={{ marginTop: "18px", paddingTop: "16px", borderTop: "1px solid #F0EEE9", textAlign: "center" }}>
          <div style={{ fontSize: "0.8125rem", color: "#6B6B6B", marginBottom: "10px" }}>
            Don&apos;t have access? Text <span style={{ fontWeight: 700, color: "#111111" }}>602-872-0267</span>
          </div>
          <a
            href={CONTACT_HREF}
            style={{
              display: "inline-block",
              padding: "10px 20px",
              borderRadius: "10px",
              border: "1.5px solid #111111",
              color: "#111111",
              fontSize: "0.8125rem",
              fontWeight: 600,
              textDecoration: "none",
              letterSpacing: "0.02em",
            }}
          >
            💬 Text Rio for a Password
          </a>
        </div>
      </form>

      <div style={{ marginTop: "24px", fontSize: "0.6875rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
        Powered by AZ &amp; Associates
      </div>
    </div>
  );
}
