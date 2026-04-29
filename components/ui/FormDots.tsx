export function FormDots({ form }: { form?: string }) {
  if (!form) return null;
  const chars = form.replace(/[,\s]/g, "").toUpperCase().split("").slice(-5);
  const colors: Record<string, string> = {
    W: "#22c55e", D: "#f59e0b", L: "#ef4444",
  };
  const textColor: Record<string, string> = {
    W: "#052e16", D: "#451a03", L: "#fff",
  };
  return (
    <div style={{ display: "flex", gap: 3, marginTop: 3 }}>
      {chars.map((c, i) => (
        <span key={i} style={{
          width: 16, height: 16, borderRadius: 4,
          background: colors[c] ?? "rgba(255,255,255,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9, fontWeight: 700,
          color: textColor[c] ?? "rgba(255,255,255,0.4)",
          fontFamily: "JetBrains Mono, monospace",
        }}>{c}</span>
      ))}
    </div>
  );
}
