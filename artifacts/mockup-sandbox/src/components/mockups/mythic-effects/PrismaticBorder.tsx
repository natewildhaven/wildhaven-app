export function PrismaticBorder() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0f0a1a" }}>
      <style>{`
        @keyframes prism-rotate {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes prism-outer {
          0%   { box-shadow: 0 0 20px rgba(168,85,247,0.4), 0 0 40px rgba(168,85,247,0.15); }
          17%  { box-shadow: 0 0 20px rgba(59,130,246,0.4),  0 0 40px rgba(59,130,246,0.15); }
          33%  { box-shadow: 0 0 20px rgba(20,184,166,0.4),  0 0 40px rgba(20,184,166,0.15); }
          50%  { box-shadow: 0 0 20px rgba(234,179,8,0.4),   0 0 40px rgba(234,179,8,0.15); }
          67%  { box-shadow: 0 0 20px rgba(239,68,68,0.4),   0 0 40px rgba(239,68,68,0.15); }
          83%  { box-shadow: 0 0 20px rgba(236,72,153,0.4),  0 0 40px rgba(236,72,153,0.15); }
          100% { box-shadow: 0 0 20px rgba(168,85,247,0.4),  0 0 40px rgba(168,85,247,0.15); }
        }
        @keyframes badge-hue {
          0%   { filter: hue-rotate(0deg); }
          100% { filter: hue-rotate(360deg); }
        }
        .prism-wrapper {
          border-radius: 16px;
          padding: 3px;
          background: linear-gradient(135deg, #a855f7, #3b82f6, #14b8a6, #eab308, #ef4444, #ec4899, #a855f7);
          background-size: 300% 300%;
          animation: prism-rotate 4s linear infinite, prism-outer 4s linear infinite;
        }
        .foil-overlay {
          background: linear-gradient(135deg,
            rgba(168,85,247,0.08) 0%,
            rgba(59,130,246,0.1) 20%,
            rgba(20,184,166,0.08) 40%,
            rgba(234,179,8,0.1) 60%,
            rgba(236,72,153,0.08) 80%,
            rgba(168,85,247,0.08) 100%
          );
          background-size: 300% 300%;
          animation: prism-rotate 4s linear infinite;
          mix-blend-mode: color-dodge;
        }
        .mythic-badge {
          animation: badge-hue 4s linear infinite;
        }
      `}</style>

      <div className="prism-wrapper" style={{ width: 200 }}>
        <div className="relative overflow-hidden" style={{ borderRadius: 14, background: "#0d1117" }}>

          {/* Image area */}
          <div className="relative overflow-hidden" style={{ height: 200, background: "linear-gradient(160deg, #0d1b2a 0%, #1a2744 50%, #0d1117 100%)" }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div style={{ fontSize: 64, filter: "drop-shadow(0 0 20px rgba(168,85,247,0.6))" }}>🐍</div>
            </div>
            {/* Foil sheen */}
            <div className="absolute inset-0 foil-overlay" />
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-bold mythic-badge" style={{ background: "rgba(30,10,50,0.85)", color: "#e879f9", fontSize: 10 }}>MYTHIC</div>
          </div>

          {/* Card info */}
          <div className="px-3 py-2.5" style={{ background: "linear-gradient(180deg, #0d1117 0%, #1a1f2e 100%)" }}>
            <div className="font-bold text-sm" style={{ color: "#e2e8f0", fontFamily: "serif", letterSpacing: "0.02em" }}>Crystal Drake</div>
            <div className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>Wildhaven • Prism Depths</div>
          </div>
        </div>
      </div>
    </div>
  );
}
