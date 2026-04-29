// StadiumHero — full SVG stadium scene rendered as a hero background
// No external image needed. Works offline. Loads instantly.
// The pitch is viewed from a low camera angle looking up toward floodlights.

export function StadiumHero() {
  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0,
      height: "340px",
      zIndex: 0,
      pointerEvents: "none",
      overflow: "hidden",
    }}>
      <svg
        viewBox="0 0 1440 340"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        <defs>
          {/* Sky gradient — deep night */}
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#020812" />
            <stop offset="45%"  stopColor="#051428" />
            <stop offset="100%" stopColor="#0a1f3d" />
          </linearGradient>

          {/* Pitch gradient — lit from above */}
          <linearGradient id="pitch" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#0d3d1a" />
            <stop offset="40%"  stopColor="#0a2e14" />
            <stop offset="100%" stopColor="#061a0b" />
          </linearGradient>

          {/* Pitch stripe pattern */}
          <pattern id="stripes" x="0" y="0" width="80" height="200" patternUnits="userSpaceOnUse">
            <rect width="80" height="200" fill="#0a2e14" />
            <rect width="40" height="200" fill="#0d3d1a" />
          </pattern>

          {/* Floodlight cone glow */}
          <radialGradient id="floodL" cx="50%" cy="0%" r="100%">
            <stop offset="0%"  stopColor="#fffbe6" stopOpacity="0.18" />
            <stop offset="60%" stopColor="#fffbe6" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#fffbe6" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="floodR" cx="50%" cy="0%" r="100%">
            <stop offset="0%"  stopColor="#fffbe6" stopOpacity="0.18" />
            <stop offset="60%" stopColor="#fffbe6" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#fffbe6" stopOpacity="0" />
          </radialGradient>

          {/* Atmosphere haze over pitch */}
          <radialGradient id="haze" cx="50%" cy="30%" r="60%">
            <stop offset="0%"  stopColor="#22c55e" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </radialGradient>

          {/* Stand crowd gradient */}
          <linearGradient id="standL" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"  stopColor="#0d1f3c" />
            <stop offset="100%" stopColor="#122444" />
          </linearGradient>
          <linearGradient id="standR" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"  stopColor="#122444" />
            <stop offset="100%" stopColor="#0d1f3c" />
          </linearGradient>

          {/* Bottom fade to page bg */}
          <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#080d14" stopOpacity="0" />
            <stop offset="100%" stopColor="#080d14" stopOpacity="1" />
          </linearGradient>

          {/* Crowd noise / texture */}
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
            <feBlend in="SourceGraphic" mode="multiply" />
          </filter>

          {/* Floodlight bulb glow */}
          <radialGradient id="bulb" cx="50%" cy="50%" r="50%">
            <stop offset="0%"  stopColor="#fffde0" stopOpacity="1" />
            <stop offset="40%" stopColor="#ffd966" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ffd966" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="spotL" cx="50%" cy="100%" r="80%" gradientTransform="scale(1,0.4)">
            <stop offset="0%"  stopColor="#fffbe6" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#fffbe6" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="spotR" cx="50%" cy="100%" r="80%" gradientTransform="scale(1,0.4)">
            <stop offset="0%"  stopColor="#fffbe6" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#fffbe6" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ── Sky ── */}
        <rect width="1440" height="340" fill="url(#sky)" />

        {/* Stars */}
        {[
          [80,18],[200,8],[340,22],[480,6],[620,15],[760,9],[900,20],[1040,5],[1180,14],[1320,19],
          [130,35],[270,28],[410,40],[550,30],[690,38],[830,25],[970,42],[1110,32],[1250,37],[1390,27],
          [60,55],[190,48],[330,60],[470,50],[610,58],[750,45],[890,62],[1030,52],[1170,57],[1310,47],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.2 : 0.7} fill="white" opacity={0.3 + (i % 5) * 0.1} />
        ))}

        {/* ── Upper stands — left bank ── */}
        <path d="M0,60 L0,220 L520,200 L520,80 Z" fill="url(#standL)" opacity="0.95" />
        {/* Stand tier lines */}
        {[90,115,140,165,190].map((y, i) => (
          <line key={i} x1="0" y1={y} x2="520" y2={y - 10 + i * 2} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        ))}
        {/* Crowd dots — left stand */}
        {Array.from({ length: 160 }).map((_, i) => {
          const col = i % 20, row = Math.floor(i / 20);
          const x = col * 26 + 10;
          const y = 90 + row * 22 + col * 0.5;
          const colors = ["#1e3a5f","#2d5a8e","#c0392b","#e74c3c","#f39c12","#1a5276","#154360"];
          return y < 210 ? (
            <circle key={i} cx={x} cy={y} r={3.5} fill={colors[i % colors.length]} opacity={0.55 + (i % 3) * 0.1} />
          ) : null;
        })}

        {/* ── Upper stands — right bank ── */}
        <path d="M1440,60 L1440,220 L920,200 L920,80 Z" fill="url(#standR)" opacity="0.95" />
        {[90,115,140,165,190].map((y, i) => (
          <line key={i} x1="920" y1={y - 10 + i * 2} x2="1440" y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        ))}
        {Array.from({ length: 160 }).map((_, i) => {
          const col = i % 20, row = Math.floor(i / 20);
          const x = 920 + col * 26 + 10;
          const y = 90 + row * 22 + col * 0.5;
          const colors = ["#1e3a5f","#2d5a8e","#c0392b","#e74c3c","#f39c12","#1a5276","#154360"];
          return y < 210 ? (
            <circle key={i} cx={x} cy={y} r={3.5} fill={colors[(i + 5) % colors.length]} opacity={0.55 + (i % 3) * 0.1} />
          ) : null;
        })}

        {/* ── Left floodlight tower ── */}
        <rect x="88" y="10" width="6" height="120" fill="#1a2d4a" />
        <rect x="80" y="10" width="22" height="8" fill="#243856" rx="1" />
        {/* bulbs */}
        {[83,90,97].map((x, i) => (
          <g key={i}>
            <circle cx={x} cy="14" r="5" fill="url(#bulb)" />
            <circle cx={x} cy="14" r="2.5" fill="#fffde0" opacity="0.95" />
          </g>
        ))}
        {/* Cone of light from left tower */}
        <path d="M91,18 L-20,340 L260,340 Z" fill="url(#spotL)" opacity="0.7" />

        {/* ── Right floodlight tower ── */}
        <rect x="1346" y="10" width="6" height="120" fill="#1a2d4a" />
        <rect x="1338" y="10" width="22" height="8" fill="#243856" rx="1" />
        {[1341,1348,1355].map((x, i) => (
          <g key={i}>
            <circle cx={x} cy="14" r="5" fill="url(#bulb)" />
            <circle cx={x} cy="14" r="2.5" fill="#fffde0" opacity="0.95" />
          </g>
        ))}
        <path d="M1349,18 L1180,340 L1460,340 Z" fill="url(#spotR)" opacity="0.7" />

        {/* ── Pitch surface (perspective) ── */}
        <path d="M380,230 L1060,230 L1440,340 L0,340 Z" fill="url(#stripes)" />
        {/* Pitch perspective overlay for depth */}
        <path d="M380,230 L1060,230 L1440,340 L0,340 Z" fill="url(#pitch)" opacity="0.35" />

        {/* Pitch markings in perspective */}
        {/* Centre circle */}
        <ellipse cx="720" cy="310" rx="110" ry="28" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
        {/* Centre spot */}
        <circle cx="720" cy="310" r="3" fill="rgba(255,255,255,0.3)" />
        {/* Halfway line */}
        <line x1="280" y1="340" x2="1160" y2="340" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
        {/* Penalty area lines — perspective */}
        <path d="M520,230 L520,295 L920,295 L920,230" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
        {/* Goal box */}
        <path d="M620,230 L620,252 L820,252 L820,230" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" />
        {/* Penalty spot */}
        <circle cx="720" cy="265" r="2.5" fill="rgba(255,255,255,0.25)" />

        {/* Goalpost — perspective */}
        <rect x="645" y="222" width="150" height="2" fill="rgba(255,255,255,0.5)" />
        <rect x="645" y="222" width="2" height="12" fill="rgba(255,255,255,0.4)" />
        <rect x="793" y="222" width="2" height="12" fill="rgba(255,255,255,0.4)" />
        {/* Net lines */}
        {[660,675,690,705,720,735,750,765,780].map((x, i) => (
          <line key={i} x1={x} y1="224" x2={x - 2} y2="234" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8" />
        ))}

        {/* ── Pitch atmosphere haze ── */}
        <ellipse cx="720" cy="280" rx="520" ry="80" fill="url(#haze)" />

        {/* ── Advertisement boards at pitch edge ── */}
        <rect x="370" y="224" width="700" height="10" fill="#0a1628" rx="1" />
        {/* Ad board segments */}
        {["#c0392b","#27ae60","#2980b9","#f39c12","#8e44ad","#16a085","#e74c3c","#3498db","#e67e22","#1abc9c"].map((col, i) => (
          <rect key={i} x={375 + i * 69} y="225" width="65" height="8" fill={col} opacity="0.7" rx="0.5" />
        ))}

        {/* ── Green glow from pitch ── */}
        <rect x="0" y="200" width="1440" height="140" fill="url(#haze)" opacity="0.8" />

        {/* ── Bottom fade to page background ── */}
        <rect width="1440" height="340" fill="url(#fade)" />
      </svg>

      {/* Extra CSS blur for atmosphere */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(8,13,20,0.15) 0%, rgba(8,13,20,0) 50%, rgba(8,13,20,0.85) 80%, rgba(8,13,20,1) 100%)",
        pointerEvents: "none",
      }} />
    </div>
  );
}
