import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "Football IQ — Predictions & Live Scores",
  description: "Professional football predictions powered by real data. Premier League, La Liga, Serie A.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main>{children}</main>
        <footer style={{ borderTop: "1px solid var(--border)", marginTop: "6rem", padding: "2rem 1.5rem", textAlign: "center" }}>
          <p style={{ fontFamily: "Bebas Neue", fontSize: "1rem", color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em" }}>FOOTBALL IQ</p>
          <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.18)", marginTop: "0.4rem" }}>For informational purposes only. Not betting advice.</p>
        </footer>
      </body>
    </html>
  );
}
