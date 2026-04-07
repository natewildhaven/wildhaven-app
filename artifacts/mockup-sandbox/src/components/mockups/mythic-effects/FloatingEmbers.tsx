import { useEffect, useRef } from "react";

const EMBERS = [
  { left: "12%", size: 5, delay: 0,    dur: 3.2, drift: 14 },
  { left: "28%", size: 4, delay: 0.7,  dur: 2.8, drift: -10 },
  { left: "45%", size: 6, delay: 1.3,  dur: 3.6, drift: 8 },
  { left: "62%", size: 4, delay: 0.3,  dur: 2.5, drift: -16 },
  { left: "78%", size: 5, delay: 1.8,  dur: 3.0, drift: 12 },
  { left: "20%", size: 3, delay: 2.1,  dur: 2.6, drift: -8 },
  { left: "55%", size: 4, delay: 0.9,  dur: 3.4, drift: 18 },
  { left: "88%", size: 5, delay: 1.5,  dur: 2.9, drift: -14 },
  { left: "35%", size: 3, delay: 2.4,  dur: 3.1, drift: 10 },
  { left: "70%", size: 6, delay: 0.5,  dur: 3.8, drift: -12 },
  { left: "8%",  size: 4, delay: 1.1,  dur: 2.7, drift: 16 },
  { left: "92%", size: 3, delay: 2.7,  dur: 3.3, drift: -6 },
];

const EMBER_COLORS = [
  "rgba(251,146,60,0.9)",
  "rgba(253,186,116,0.8)",
  "rgba(239,68,68,0.85)",
  "rgba(253,224,71,0.7)",
  "rgba(251,191,36,0.9)",
];

export function FloatingEmbers() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0f0a1a" }}>
      <style>{`
        @keyframes ember-rise {
          0%   { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
          10%  { opacity: 1; }
          85%  { opacity: 0.7; }
          100% { transform: translateY(-280px) translateX(var(--drift)) scale(0.3); opacity: 0; }
        }
        @keyframes ember-glow {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.6); }
        }
        .card-border-mythic {
          background: linear-gradient(145deg, #334155, #1e293b, #475569, #1e293b);
          border-radius: 16px;
          padding: 3px;
        }
      `}</style>

      <div className="card-border-mythic" style={{ width: 200, boxShadow: "0 0 30px rgba(100,116,139,0.4), 0 20px 40px rgba(0,0,0,0.6)" }}>
        <div className="relative overflow-hidden" style={{ borderRadius: 14, background: "#0f172a" }}>

          {/* Card image area */}
          <div className="relative overflow-hidden" style={{ height: 200, background: "linear-gradient(160deg, #1a0533 0%, #2d1b4e 40%, #0f1729 70%, #1a2744 100%)" }}>
            {/* Scene */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div style={{ fontSize: 64, filter: "drop-shadow(0 0 20px rgba(251,146,60,0.6))" }}>🐉</div>
            </div>
            {/* Ember particles */}
            {EMBERS.map((e, i) => (
              <div
                key={i}
                className="absolute rounded-full pointer-events-none"
                style={{
                  left: e.left,
                  bottom: "5%",
                  width: e.size,
                  height: e.size,
                  background: EMBER_COLORS[i % EMBER_COLORS.length],
                  boxShadow: `0 0 ${e.size * 2}px ${EMBER_COLORS[i % EMBER_COLORS.length]}`,
                  "--drift": `${e.drift}px`,
                  animation: `ember-rise ${e.dur}s ${e.delay}s ease-out infinite, ember-glow ${e.dur * 0.6}s ${e.delay}s ease-in-out infinite`,
                } as React.CSSProperties}
              />
            ))}
            {/* Rarity badge */}
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-bold" style={{ background: "rgba(71,85,105,0.9)", color: "#cbd5e1", fontSize: 10 }}>MYTHIC</div>
          </div>

          {/* Card info */}
          <div className="px-3 py-2.5" style={{ background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)" }}>
            <div className="font-bold text-sm" style={{ color: "#e2e8f0", fontFamily: "serif", letterSpacing: "0.02em" }}>Ancient Wyrm</div>
            <div className="text-xs mt-0.5" style={{ color: "#64748b" }}>Wildhaven • Fire & Shadow</div>
          </div>
        </div>
      </div>
    </div>
  );
}
