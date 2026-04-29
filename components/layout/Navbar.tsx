"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <header style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
      background: scrolled ? "rgba(8,13,20,0.97)" : "transparent",
      backdropFilter: scrolled ? "blur(20px)" : "none",
      borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "none",
      transition: "background 0.3s ease, backdrop-filter 0.3s ease, border-color 0.3s ease",
    }}>
      <div style={{
        maxWidth: 960, margin: "0 auto",
        padding: "0 1.5rem",
        height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.6rem", textDecoration: "none" }}>
          {/* Ball icon */}
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: "linear-gradient(135deg,#22c55e,#16a34a)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 16px rgba(34,197,94,0.4)",
            flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1.5" />
              <path d="M12 2C12 2 9 6 9 12C9 18 12 22 12 22" stroke="white" strokeWidth="1.2" />
              <path d="M12 2C12 2 15 6 15 12C15 18 12 22 12 22" stroke="white" strokeWidth="1.2" />
              <path d="M2 12H22" stroke="white" strokeWidth="1.2" />
              <path d="M3.5 7H20.5" stroke="white" strokeWidth="1" opacity="0.6" />
              <path d="M3.5 17H20.5" stroke="white" strokeWidth="1" opacity="0.6" />
            </svg>
          </div>
          <div>
            <span style={{
              fontFamily: "Bebas Neue", fontSize: "1.45rem",
              color: "white", letterSpacing: "0.1em", lineHeight: 1,
              textShadow: "0 0 20px rgba(34,197,94,0.3)",
            }}>
              FOOTBALL <span style={{ color: "#22c55e" }}>IQ</span>
            </span>
            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", letterSpacing: "0.15em", textTransform: "uppercase", marginTop: -1 }}>
              Prediction Dashboard
            </div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
          {[
            { href: "/", label: "Predictions" },
            { href: "/?tab=live", label: "Live", live: true },
            { href: "/admin", label: "Admin" },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex", alignItems: "center", gap: "0.4rem",
                color: "rgba(255,255,255,0.55)",
                textDecoration: "none", fontSize: "0.875rem",
                padding: "6px 14px", borderRadius: 8,
                transition: "all 0.15s",
                border: "1px solid transparent",
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.color = "white";
                el.style.background = "rgba(255,255,255,0.07)";
                el.style.borderColor = "rgba(255,255,255,0.08)";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.color = "rgba(255,255,255,0.55)";
                el.style.background = "transparent";
                el.style.borderColor = "transparent";
              }}
            >
              {item.live && (
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "#ef4444", display: "inline-block", flexShrink: 0,
                }} className="live-dot" />
              )}
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}






/*"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <header style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
      background: scrolled ? "rgba(8,13,20,0.96)" : "transparent",
      backdropFilter: scrolled ? "blur(16px)" : "none",
      borderBottom: scrolled ? "1px solid var(--border)" : "none",
      transition: "all 0.2s",
    }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 1.5rem", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
          <span style={{ fontSize: "1.3rem" }}>⚽</span>
          <span style={{ fontFamily: "Bebas Neue", fontSize: "1.4rem", color: "white", letterSpacing: "0.1em" }}>
            FOOTBALL <span style={{ color: "var(--green)" }}>IQ</span>
          </span>
        </Link>
        <nav style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
          <Link href="/" style={{ color: "var(--muted)", textDecoration: "none", fontSize: "0.875rem" }}>Predictions</Link>
          <Link href="/?tab=live" style={{ color: "var(--muted)", textDecoration: "none", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--red)", display: "inline-block" }} className="live-dot" />
            Live
          </Link>
          <Link href="/admin" style={{ color: "var(--muted)", textDecoration: "none", fontSize: "0.875rem" }}>Admin</Link>
        </nav>
      </div>
    </header>
  );
}
*/