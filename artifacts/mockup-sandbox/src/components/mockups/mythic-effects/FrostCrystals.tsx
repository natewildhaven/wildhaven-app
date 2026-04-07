const CRYSTALS = [
  { top: "3%",  left: "5%",  char: "❄", size: 13, delay: "0s",   dur: "2.8s", rot: -15 },
  { top: "3%",  left: "78%", char: "✦", size: 9,  delay: "1.2s", dur: "3.2s", rot: 20  },
  { top: "3%",  left: "90%", char: "❄", size: 11, delay: "0.5s", dur: "2.5s", rot: 10  },
  { top: "18%", left: "2%",  char: "✧", size: 8,  delay: "1.8s", dur: "3.0s", rot: -5  },
  { top: "18%", left: "91%", char: "❄", size: 10, delay: "0.9s", dur: "2.7s", rot: 25  },
  { top: "35%", left: "1%",  char: "✦", size: 9,  delay: "2.2s", dur: "3.4s", rot: -20 },
  { top: "50%", left: "3%",  char: "❄", size: 12, delay: "0.3s", dur: "2.9s", rot: 8   },
  { top: "65%", left: "2%",  char: "✧", size: 8,  delay: "1.5s", dur: "3.1s", rot: -12 },
  { top: "80%", left: "5%",  char: "❄", size: 10, delay: "2.5s", dur: "2.6s", rot: 18  },
  { top: "90%", left: "15%", char: "✦", size: 9,  delay: "0.7s", dur: "3.3s", rot: -8  },
  { top: "90%", left: "55%", char: "❄", size: 11, delay: "1.9s", dur: "2.8s", rot: 15  },
  { top: "90%", left: "82%", char: "✧", size: 8,  delay: "0.4s", dur: "3.0s", rot: -22 },
  { top: "60%", left: "92%", char: "❄", size: 10, delay: "2.1s", dur: "2.7s", rot: 5   },
  { top: "75%", left: "90%", char: "✦", size: 9,  delay: "1.3s", dur: "3.2s", rot: -18 },
  { top: "45%", left: "93%", char: "❄", size: 12, delay: "2.8s", dur: "2.9s", rot: 12  },
];

export function FrostCrystals() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#050c18" }}>
      <style>{`
        @keyframes frost-fade {
          0%   { opacity: 0;   transform: scale(0.5) rotate(var(--rot)); }
          30%  { opacity: 1;   transform: scale(1.0) rotate(var(--rot)); }
          70%  { opacity: 0.9; transform: scale(1.0) rotate(var(--rot)); }
          100% { opacity: 0;   transform: scale(0.7) rotate(var(--rot)); }
        }
        @keyframes frost-outer {
          0%, 100% { box-shadow: 0 0 20px rgba(186,230,253,0.25), 0 0 50px rgba(147,197,253,0.1); }
          50%       { box-shadow: 0 0 30px rgba(186,230,253,0.45), 0 0 70px rgba(147,197,253,0.2); }
        }
        .frost-border {
          border-radius: 16px;
          padding: 3px;
          background: linear-gradient(145deg, #93c5fd, #60a5fa, #bfdbfe, #60a5fa);
          animation: frost-outer 3s ease-in-out infinite;
        }
        .frost-crystal {
          position: absolute;
          pointer-events: none;
          animation: frost-fade var(--dur) var(--delay) ease-in-out infinite;
        }
      `}</style>

      <div className="frost-border" style={{ width: 200 }}>
        <div className="relative overflow-hidden" style={{ borderRadius: 14, background: "#050c18" }}>

          {/* Image area */}
          <div className="relative overflow-hidden" style={{ height: 200, background: "linear-gradient(160deg, #0c1a2e 0%, #1e3a5f 50%, #0c1a2e 100%)" }}>
            {/* Icy vignette */}
            <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 40%, transparent 40%, rgba(186,230,253,0.08) 100%)" }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div style={{ fontSize: 60, filter: "drop-shadow(0 0 18px rgba(186,230,253,0.7)) drop-shadow(0 0 35px rgba(147,197,253,0.4))" }}>🦊</div>
            </div>
            {/* Crystal particles */}
            {CRYSTALS.map((c, i) => (
              <span
                key={i}
                className="frost-crystal select-none leading-none"
                style={{
                  top: c.top,
                  left: c.left,
                  fontSize: c.size,
                  color: "rgba(186,230,253,0.9)",
                  textShadow: "0 0 8px rgba(147,197,253,0.9), 0 0 16px rgba(186,230,253,0.5)",
                  "--dur": c.dur,
                  "--delay": c.delay,
                  "--rot": `${c.rot}deg`,
                } as React.CSSProperties}
              >
                {c.char}
              </span>
            ))}
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-bold" style={{ background: "rgba(8,28,52,0.9)", color: "#bae6fd", fontSize: 10 }}>MYTHIC</div>
          </div>

          {/* Card info */}
          <div className="px-3 py-2.5" style={{ background: "linear-gradient(180deg, #050c18 0%, #0f172a 100%)" }}>
            <div className="font-bold text-sm" style={{ color: "#bae6fd", fontFamily: "serif", letterSpacing: "0.02em" }}>Glacier Fox</div>
            <div className="text-xs mt-0.5" style={{ color: "#60a5fa" }}>Wildhaven • Arctic Wilds</div>
          </div>
        </div>
      </div>
    </div>
  );
}
