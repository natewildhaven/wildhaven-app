import { useEffect, useRef } from "react";

const STARS = [
  { x: 0.12, y: 0.15, vx: 0.00015, vy: 0.00010 },
  { x: 0.35, y: 0.08, vx: -0.00012, vy: 0.00018 },
  { x: 0.68, y: 0.22, vx: 0.00010, vy: -0.00015 },
  { x: 0.85, y: 0.12, vx: -0.00018, vy: 0.00008 },
  { x: 0.22, y: 0.45, vx: 0.00008, vy: -0.00020 },
  { x: 0.50, y: 0.38, vx: -0.00016, vy: 0.00012 },
  { x: 0.78, y: 0.55, vx: 0.00014, vy: 0.00016 },
  { x: 0.15, y: 0.70, vx: -0.00010, vy: -0.00014 },
  { x: 0.42, y: 0.80, vx: 0.00018, vy: -0.00010 },
  { x: 0.88, y: 0.75, vx: -0.00012, vy: 0.00018 },
  { x: 0.62, y: 0.65, vx: 0.00008, vy: 0.00012 },
  { x: 0.30, y: 0.92, vx: 0.00016, vy: -0.00008 },
];

const CONNECTION_DIST = 0.38;

function distance(a: typeof STARS[0], b: typeof STARS[0]) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function ConstellationDrift() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef(STARS.map(s => ({ ...s })));
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width;
    const H = canvas.height;
    const stars = starsRef.current;

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Update positions
      for (const s of stars) {
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < 0 || s.x > 1) s.vx *= -1;
        if (s.y < 0 || s.y > 1) s.vy *= -1;
      }

      // Draw connections
      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const d = distance(stars[i], stars[j]);
          if (d < CONNECTION_DIST) {
            const alpha = (1 - d / CONNECTION_DIST) * 0.6;
            ctx.beginPath();
            ctx.moveTo(stars[i].x * W, stars[i].y * H);
            ctx.lineTo(stars[j].x * W, stars[j].y * H);
            ctx.strokeStyle = `rgba(148,163,184,${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      // Draw stars
      for (const s of stars) {
        const x = s.x * W;
        const y = s.y * H;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(226,232,240,0.9)";
        ctx.fill();
        // Glow
        const g = ctx.createRadialGradient(x, y, 0, x, y, 6);
        g.addColorStop(0, "rgba(148,163,184,0.5)");
        g.addColorStop(1, "rgba(148,163,184,0)");
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#050810" }}>
      <style>{`
        @keyframes const-outer {
          0%, 100% { box-shadow: 0 0 20px rgba(148,163,184,0.3), 0 0 50px rgba(99,102,241,0.1); }
          50%       { box-shadow: 0 0 28px rgba(148,163,184,0.5), 0 0 60px rgba(99,102,241,0.2); }
        }
        .const-border {
          background: linear-gradient(145deg, #334155, #1e293b, #475569, #1e293b);
          border-radius: 16px;
          padding: 3px;
          animation: const-outer 4s ease-in-out infinite;
        }
      `}</style>

      <div className="const-border" style={{ width: 200 }}>
        <div className="relative overflow-hidden" style={{ borderRadius: 14, background: "#050810" }}>

          {/* Image area with canvas overlay */}
          <div className="relative overflow-hidden" style={{ height: 200, background: "linear-gradient(160deg, #050810 0%, #0d1229 60%, #050810 100%)" }}>
            <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 5 }}>
              <div style={{ fontSize: 56, filter: "drop-shadow(0 0 16px rgba(148,163,184,0.5))", opacity: 0.85 }}>🐺</div>
            </div>
            <canvas
              ref={canvasRef}
              width={194}
              height={200}
              className="absolute inset-0"
              style={{ zIndex: 10, mixBlendMode: "screen" }}
            />
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-bold" style={{ background: "rgba(15,23,42,0.9)", color: "#94a3b8", fontSize: 10, zIndex: 15 }}>MYTHIC</div>
          </div>

          {/* Card info */}
          <div className="px-3 py-2.5" style={{ background: "linear-gradient(180deg, #050810 0%, #0f172a 100%)" }}>
            <div className="font-bold text-sm" style={{ color: "#cbd5e1", fontFamily: "serif", letterSpacing: "0.02em" }}>Star Wolf</div>
            <div className="text-xs mt-0.5" style={{ color: "#475569" }}>Wildhaven • Celestial Pack</div>
          </div>
        </div>
      </div>
    </div>
  );
}
