export function HolographicScan() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0f0a1a" }}>
      <style>{`
        @keyframes scan-sweep {
          0%   { top: -4px; opacity: 0; }
          5%   { opacity: 1; }
          90%  { opacity: 0.8; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes scan-outer-glow {
          0%, 100% { box-shadow: 0 0 18px rgba(34,211,238,0.25), 0 0 40px rgba(34,211,238,0.1); }
          50%       { box-shadow: 0 0 28px rgba(34,211,238,0.45), 0 0 60px rgba(34,211,238,0.2); }
        }
        @keyframes scan-lines-drift {
          0%   { background-position: 0 0; }
          100% { background-position: 0 20px; }
        }
        .holo-card-border {
          background: linear-gradient(145deg, #164e63, #0c4a6e, #1e3a5f, #0c4a6e);
          border-radius: 16px;
          padding: 3px;
          animation: scan-outer-glow 3s ease-in-out infinite;
        }
        .scan-line {
          position: absolute;
          left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, transparent, rgba(34,211,238,0.8), rgba(255,255,255,0.95), rgba(34,211,238,0.8), transparent);
          animation: scan-sweep 3s 0.5s ease-in-out infinite;
          pointer-events: none;
          z-index: 20;
          border-radius: 2px;
          filter: blur(0.5px);
        }
        .scan-line::after {
          content: '';
          position: absolute;
          top: -6px; left: 0; right: 0;
          height: 16px;
          background: linear-gradient(180deg, transparent, rgba(34,211,238,0.12), rgba(34,211,238,0.2), rgba(34,211,238,0.12), transparent);
        }
        .scanlines-overlay {
          background-image: repeating-linear-gradient(0deg, rgba(34,211,238,0.04) 0px, rgba(34,211,238,0.04) 1px, transparent 1px, transparent 4px);
          animation: scan-lines-drift 0.8s linear infinite;
        }
      `}</style>

      <div className="holo-card-border" style={{ width: 200 }}>
        <div className="relative overflow-hidden" style={{ borderRadius: 14, background: "#020c1b" }}>

          {/* Image area */}
          <div className="relative overflow-hidden" style={{ height: 200, background: "linear-gradient(160deg, #001f3f 0%, #003366 50%, #001a33 100%)" }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div style={{ fontSize: 64, filter: "drop-shadow(0 0 20px rgba(34,211,238,0.7)) drop-shadow(0 0 40px rgba(34,211,238,0.3))" }}>🦅</div>
            </div>
            {/* Scanlines texture */}
            <div className="absolute inset-0 scanlines-overlay opacity-60" />
            {/* The sweep line */}
            <div className="scan-line" />
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-bold" style={{ background: "rgba(8,51,68,0.9)", color: "#67e8f9", fontSize: 10 }}>MYTHIC</div>
          </div>

          {/* Card info */}
          <div className="px-3 py-2.5" style={{ background: "linear-gradient(180deg, #020c1b 0%, #0a1929 100%)" }}>
            <div className="font-bold text-sm" style={{ color: "#bae6fd", fontFamily: "serif", letterSpacing: "0.02em" }}>Void Stalker</div>
            <div className="text-xs mt-0.5" style={{ color: "#0ea5e9" }}>Wildhaven • Deep Sky</div>
          </div>
        </div>
      </div>
    </div>
  );
}
