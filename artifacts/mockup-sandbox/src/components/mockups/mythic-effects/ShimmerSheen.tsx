export function ShimmerSheen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0f0a1a" }}>
      <style>{`
        @keyframes sheen-sweep {
          0%   { transform: translateX(-200%) skewX(-20deg); opacity: 0; }
          10%  { opacity: 1; }
          40%  { transform: translateX(300%) skewX(-20deg); opacity: 0.7; }
          100% { transform: translateX(300%) skewX(-20deg); opacity: 0; }
        }
        @keyframes sheen-idle {
          0%, 100% { box-shadow: 0 0 16px rgba(148,163,184,0.3), 0 0 40px rgba(100,116,139,0.12), 0 20px 40px rgba(0,0,0,0.5); }
          50%       { box-shadow: 0 0 24px rgba(203,213,225,0.45), 0 0 60px rgba(148,163,184,0.2), 0 20px 40px rgba(0,0,0,0.5); }
        }
        @keyframes card-shimmer-bg {
          0%, 100% { background-position: 0% 50%; }
          50%       { background-position: 100% 50%; }
        }
        .sheen-border {
          border-radius: 16px;
          padding: 3px;
          background: linear-gradient(145deg, #94a3b8, #475569, #cbd5e1, #64748b, #94a3b8);
          background-size: 300% 300%;
          animation: card-shimmer-bg 5s ease-in-out infinite, sheen-idle 3s ease-in-out infinite;
        }
        .sheen-beam {
          position: absolute;
          top: -20%;
          left: 0;
          width: 35%;
          height: 140%;
          background: linear-gradient(90deg,
            transparent 0%,
            rgba(203,213,225,0.08) 20%,
            rgba(255,255,255,0.25) 50%,
            rgba(203,213,225,0.08) 80%,
            transparent 100%
          );
          animation: sheen-sweep 4s 0.8s ease-in-out infinite;
          pointer-events: none;
          z-index: 10;
        }
        .sheen-beam-2 {
          position: absolute;
          top: -20%;
          left: 0;
          width: 15%;
          height: 140%;
          background: linear-gradient(90deg,
            transparent 0%,
            rgba(255,255,255,0.18) 50%,
            transparent 100%
          );
          animation: sheen-sweep 4s 1.1s ease-in-out infinite;
          pointer-events: none;
          z-index: 11;
        }
        .silver-vignette {
          background: radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(15,23,42,0.6) 100%);
        }
      `}</style>

      <div className="sheen-border" style={{ width: 200 }}>
        <div className="relative overflow-hidden" style={{ borderRadius: 14, background: "#0f172a" }}>

          {/* Image area */}
          <div className="relative overflow-hidden" style={{ height: 200, background: "linear-gradient(160deg, #1e293b 0%, #0f172a 40%, #334155 70%, #1e293b 100%)" }}>
            <div className="silver-vignette absolute inset-0" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div style={{ fontSize: 60, filter: "drop-shadow(0 0 16px rgba(203,213,225,0.6)) drop-shadow(0 0 32px rgba(148,163,184,0.3))" }}>🐍</div>
            </div>
            {/* Sheen beams */}
            <div className="sheen-beam" />
            <div className="sheen-beam-2" />
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-bold" style={{ background: "rgba(15,23,42,0.9)", color: "#94a3b8", fontSize: 10 }}>MYTHIC</div>
          </div>

          {/* Card info */}
          <div className="px-3 py-2.5" style={{ background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)" }}>
            <div className="font-bold text-sm" style={{ color: "#e2e8f0", fontFamily: "serif", letterSpacing: "0.02em" }}>Silver Serpent</div>
            <div className="text-xs mt-0.5" style={{ color: "#64748b" }}>Wildhaven • Moonlit Wilds</div>
          </div>
        </div>
      </div>
    </div>
  );
}
