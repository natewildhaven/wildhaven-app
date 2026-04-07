import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Card } from "@workspace/api-client-react";
import { cn, metallicFilterStyle } from "@/lib/utils";
import { useCardRarities } from "@/contexts/CardRaritiesContext";
import { useCardTypes } from "@/contexts/CardTypesContext";

/* ── Static tag styles for the 5 built-in rarities ── */

const rarityTagStyle: Record<string, React.CSSProperties> = {
  Common: {
    background: "linear-gradient(160deg, #dcfce7 0%, #86efac 35%, #4ade80 50%, #86efac 65%, #dcfce7 100%)",
    borderColor: "#16a34a", color: "#14532d",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45), 0 1px 2px rgba(0,0,0,0.12)",
  },
  Rare: {
    background: "linear-gradient(160deg, #dbeafe 0%, #93c5fd 35%, #60a5fa 50%, #93c5fd 65%, #dbeafe 100%)",
    borderColor: "#2563eb", color: "#1e3a8a",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45), 0 1px 2px rgba(0,0,0,0.12)",
  },
  Epic: {
    background: "linear-gradient(160deg, #ede9fe 0%, #c4b5fd 35%, #a78bfa 50%, #c4b5fd 65%, #ede9fe 100%)",
    borderColor: "#7c3aed", color: "#4c1d95",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45), 0 1px 2px rgba(0,0,0,0.12)",
  },
  Mythic: {
    background: "linear-gradient(160deg, #f8fafc 0%, #e2e8f0 30%, #94a3b8 50%, #e2e8f0 70%, #f8fafc 100%)",
    borderColor: "#475569", color: "#1e293b",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6), 0 1px 2px rgba(0,0,0,0.18)",
  },
  Legendary: {
    background: "linear-gradient(160deg, #fef9c3 0%, #fde68a 30%, #f59e0b 50%, #fde68a 70%, #fef9c3 100%)",
    borderColor: "#b45309", color: "#78350f",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5), 0 1px 2px rgba(0,0,0,0.15)",
  },
};

/* ── CSS class maps for effects ── */

const BORDER_CLASS: Record<string, string> = {
  rainbow:     "legendary-prism-border",
  electric:    "fx-border-electric",
  fire:        "fx-border-fire",
  ice:         "fx-border-ice",
  golden:      "fx-border-golden",
  "neon-pink": "fx-border-neon-pink",
  "neon-blue": "fx-border-neon-blue",
  "neon-green":"fx-border-neon-green",
  stardust:    "fx-border-stardust",
  pulse:       "fx-border-pulse",
  lava:        "fx-border-lava",
  forest:      "fx-border-forest",
  ocean:       "fx-border-ocean",
  void:        "fx-border-void",
  dawn:        "fx-border-dawn",
};

const GLOW_CLASS: Record<string, string> = {
  "ember-glow":   "mythic-ember-glow",
  "bright-shadow": "fx-glow-bright-shadow",
  aura:           "fx-glow-aura",
  "golden-glow":  "fx-glow-golden",
  "pulse-glow":   "fx-glow-pulse",
  "neon-glow":    "fx-glow-neon",
  moonbeam:       "fx-glow-moonbeam",
  "rose-glow":    "fx-glow-rose",
};

/* ── Helper: rarity meta from context ── */

function useRarityMeta(rarity: string) {
  const { getEffects, getColor } = useCardRarities();
  const raw = getEffects(rarity);
  const color = getColor(rarity);

  const surface: string[] = raw.surface ?? [];
  const border: string[] = raw.border ?? [];
  const glow: string[] = raw.glow ?? [];

  const hasAnimatedBorder = border.length > 0;
  const borderStyle: React.CSSProperties = hasAnimatedBorder ? {} : { borderColor: color };

  const wrapperClasses = [
    ...border.map(b => BORDER_CLASS[b]).filter(Boolean),
    ...glow.map(g => GLOW_CLASS[g]).filter(Boolean),
  ];

  const tagStyle: React.CSSProperties = rarityTagStyle[rarity] ?? metallicFilterStyle(color, false);

  return { surface, border, glow, borderStyle, wrapperClasses, tagStyle };
}

/* ── Floating embers ── */

const EMBERS = [
  { left: "10%", size: 5, delay: "0s",    dur: "3.2s", drift: "12px"  },
  { left: "26%", size: 4, delay: "0.7s",  dur: "2.8s", drift: "-9px"  },
  { left: "44%", size: 6, delay: "1.3s",  dur: "3.6s", drift: "8px"   },
  { left: "60%", size: 4, delay: "0.3s",  dur: "2.5s", drift: "-14px" },
  { left: "76%", size: 5, delay: "1.8s",  dur: "3.0s", drift: "11px"  },
  { left: "18%", size: 3, delay: "2.1s",  dur: "2.6s", drift: "-7px"  },
  { left: "52%", size: 4, delay: "0.9s",  dur: "3.4s", drift: "16px"  },
  { left: "87%", size: 5, delay: "1.5s",  dur: "2.9s", drift: "-12px" },
  { left: "33%", size: 3, delay: "2.4s",  dur: "3.1s", drift: "9px"   },
  { left: "68%", size: 6, delay: "0.5s",  dur: "3.8s", drift: "-10px" },
  { left: "6%",  size: 4, delay: "1.1s",  dur: "2.7s", drift: "14px"  },
  { left: "91%", size: 3, delay: "2.7s",  dur: "3.3s", drift: "-5px"  },
];

const EMBER_COLORS = [
  "rgba(251,146,60,0.9)", "rgba(253,186,116,0.85)", "rgba(239,68,68,0.85)",
  "rgba(253,224,71,0.75)", "rgba(251,191,36,0.9)",
];

function MythicEmbers({ scale = 1 }: { scale?: number }) {
  const sz = (n: number) => Math.round(n * scale);
  return (
    <>
      {EMBERS.map((e, i) => (
        <span key={i} className="absolute rounded-full pointer-events-none z-20"
          style={{
            left: e.left, bottom: "4%",
            width: sz(e.size), height: sz(e.size),
            background: EMBER_COLORS[i % EMBER_COLORS.length],
            boxShadow: `0 0 ${sz(e.size * 2)}px ${EMBER_COLORS[i % EMBER_COLORS.length]}`,
            "--drift": e.drift, "--rise": `${-280 * scale}px`,
            animation: `ember-rise ${e.dur} ${e.delay} ease-out infinite, ember-flicker ${e.dur} ${e.delay} ease-in-out infinite`,
          } as React.CSSProperties}
        />
      ))}
    </>
  );
}

/* ── Sparkle particles ── */

const SPARKLES = [
  { top: "4%",  left: "10%", char: "✦", size: 11, delay: "0s",    dur: "1.6s", v: "a" },
  { top: "10%", left: "80%", char: "✧", size: 8,  delay: "0.3s",  dur: "1.9s", v: "b" },
  { top: "18%", left: "45%", char: "✦", size: 13, delay: "0.7s",  dur: "1.4s", v: "a" },
  { top: "22%", left: "20%", char: "✧", size: 7,  delay: "1.1s",  dur: "2.0s", v: "b" },
  { top: "28%", left: "68%", char: "✦", size: 10, delay: "0.5s",  dur: "1.7s", v: "a" },
  { top: "35%", left: "88%", char: "✧", size: 8,  delay: "1.4s",  dur: "1.5s", v: "b" },
  { top: "40%", left: "32%", char: "✦", size: 12, delay: "0.2s",  dur: "2.1s", v: "a" },
  { top: "47%", left: "55%", char: "✧", size: 9,  delay: "0.9s",  dur: "1.8s", v: "b" },
  { top: "52%", left: "8%",  char: "✦", size: 7,  delay: "0.6s",  dur: "1.6s", v: "a" },
  { top: "58%", left: "75%", char: "✧", size: 11, delay: "1.2s",  dur: "2.0s", v: "b" },
  { top: "64%", left: "42%", char: "✦", size: 8,  delay: "0.4s",  dur: "1.5s", v: "a" },
  { top: "70%", left: "18%", char: "✧", size: 10, delay: "1.0s",  dur: "1.7s", v: "b" },
  { top: "76%", left: "62%", char: "✦", size: 7,  delay: "0.8s",  dur: "2.2s", v: "a" },
  { top: "82%", left: "85%", char: "✧", size: 9,  delay: "0.1s",  dur: "1.4s", v: "b" },
  { top: "88%", left: "30%", char: "✦", size: 11, delay: "1.3s",  dur: "1.9s", v: "a" },
  { top: "93%", left: "58%", char: "✧", size: 8,  delay: "0.6s",  dur: "1.6s", v: "b" },
  { top: "14%", left: "92%", char: "✦", size: 9,  delay: "1.5s",  dur: "1.8s", v: "a" },
  { top: "44%", left: "72%", char: "✧", size: 7,  delay: "0.3s",  dur: "2.0s", v: "b" },
  { top: "68%", left: "50%", char: "✦", size: 10, delay: "1.1s",  dur: "1.5s", v: "a" },
  { top: "85%", left: "5%",  char: "✧", size: 12, delay: "0.7s",  dur: "1.7s", v: "b" },
];

const SPARKLE_COLORS = [
  "rgba(216,180,254,0.98)", "rgba(255,255,255,0.97)", "rgba(192,132,252,0.92)",
  "rgba(240,220,255,0.95)", "rgba(255,255,255,0.88)",
];

function EpicGlitter({ scale = 1 }: { scale?: number }) {
  return (
    <>
      {SPARKLES.map((s, i) => (
        <span key={i} className="absolute pointer-events-none z-20 select-none leading-none"
          style={{
            top: s.top, left: s.left,
            fontSize: Math.round(s.size * scale),
            color: SPARKLE_COLORS[i % SPARKLE_COLORS.length],
            textShadow: `0 0 ${Math.round(4 * scale)}px ${SPARKLE_COLORS[i % SPARKLE_COLORS.length]}`,
            animation: `${s.v === "a" ? "glitter-twinkle" : "glitter-twinkle-b"} ${s.dur} ${s.delay} ease-in-out infinite`,
          }}
        >{s.char}</span>
      ))}
    </>
  );
}

/* ── Constellation ── */

const CONST_STARS = [
  { cx: "8%",  cy: "5%",  r: 2.8, delay: "0s",    dur: "1.8s", bright: true  },
  { cx: "22%", cy: "3%",  r: 1.4, delay: "0.4s",  dur: "2.4s", bright: false },
  { cx: "38%", cy: "8%",  r: 2.2, delay: "0.9s",  dur: "1.6s", bright: false },
  { cx: "58%", cy: "2%",  r: 1.6, delay: "1.3s",  dur: "2.0s", bright: false },
  { cx: "76%", cy: "9%",  r: 2.0, delay: "0.5s",  dur: "1.9s", bright: false },
  { cx: "92%", cy: "4%",  r: 2.6, delay: "1.6s",  dur: "2.3s", bright: true  },
  { cx: "14%", cy: "20%", r: 1.3, delay: "0.7s",  dur: "2.1s", bright: false },
  { cx: "32%", cy: "17%", r: 2.4, delay: "2.0s",  dur: "1.5s", bright: true  },
  { cx: "50%", cy: "23%", r: 1.5, delay: "0.2s",  dur: "1.7s", bright: false },
  { cx: "68%", cy: "18%", r: 3.0, delay: "1.1s",  dur: "2.2s", bright: true  },
  { cx: "87%", cy: "28%", r: 1.4, delay: "0.6s",  dur: "1.8s", bright: false },
  { cx: "5%",  cy: "38%", r: 2.0, delay: "1.8s",  dur: "2.0s", bright: false },
  { cx: "24%", cy: "43%", r: 2.6, delay: "0.3s",  dur: "1.6s", bright: true  },
  { cx: "44%", cy: "36%", r: 1.3, delay: "2.2s",  dur: "2.4s", bright: false },
  { cx: "63%", cy: "48%", r: 2.0, delay: "0.8s",  dur: "1.9s", bright: false },
  { cx: "81%", cy: "40%", r: 1.6, delay: "1.4s",  dur: "2.1s", bright: false },
  { cx: "95%", cy: "52%", r: 2.2, delay: "0.1s",  dur: "1.7s", bright: false },
  { cx: "10%", cy: "58%", r: 1.5, delay: "2.5s",  dur: "2.3s", bright: false },
  { cx: "29%", cy: "63%", r: 2.8, delay: "0.4s",  dur: "1.5s", bright: true  },
  { cx: "48%", cy: "57%", r: 1.3, delay: "1.7s",  dur: "2.0s", bright: false },
  { cx: "66%", cy: "65%", r: 2.0, delay: "0.9s",  dur: "1.8s", bright: false },
  { cx: "84%", cy: "60%", r: 1.5, delay: "2.1s",  dur: "2.4s", bright: false },
  { cx: "16%", cy: "78%", r: 1.8, delay: "0.5s",  dur: "1.6s", bright: false },
  { cx: "36%", cy: "82%", r: 2.4, delay: "1.2s",  dur: "2.1s", bright: true  },
  { cx: "55%", cy: "75%", r: 1.3, delay: "2.3s",  dur: "1.7s", bright: false },
  { cx: "73%", cy: "83%", r: 2.0, delay: "0.6s",  dur: "2.3s", bright: false },
  { cx: "90%", cy: "77%", r: 1.5, delay: "1.5s",  dur: "1.9s", bright: false },
  { cx: "7%",  cy: "92%", r: 2.2, delay: "0.2s",  dur: "1.5s", bright: false },
  { cx: "42%", cy: "95%", r: 1.4, delay: "1.9s",  dur: "2.2s", bright: false },
  { cx: "69%", cy: "92%", r: 2.6, delay: "0.8s",  dur: "1.8s", bright: true  },
];

const CONST_LINES = [
  [0,2],[2,4],[4,5],
  [6,7],[7,9],[9,10],
  [11,12],[12,14],[14,15],[15,16],
  [17,18],[18,19],[19,20],[20,21],
  [22,23],[23,24],[24,25],[25,26],
  [27,28],[28,29],
  [2,7],[7,12],[12,18],[18,23],[23,28],
  [0,6],[6,11],[9,14],[14,20],[20,25],[25,29],
];

function ConstellationOverlay({ scale = 1 }: { scale?: number }) {
  const sw = (0.7 * scale).toFixed(2);
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
      <defs>
        <radialGradient id="cneb1" cx="0.30" cy="0.28" r="0.50" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="rgba(139,92,246,0.22)" />
          <stop offset="100%" stopColor="rgba(139,92,246,0)" />
        </radialGradient>
        <radialGradient id="cneb2" cx="0.72" cy="0.68" r="0.45" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="rgba(59,130,246,0.18)" />
          <stop offset="100%" stopColor="rgba(59,130,246,0)" />
        </radialGradient>
        <radialGradient id="cneb3" cx="0.55" cy="0.12" r="0.35" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="rgba(236,72,153,0.12)" />
          <stop offset="100%" stopColor="rgba(236,72,153,0)" />
        </radialGradient>
      </defs>

      {/* Nebula glows */}
      <rect x="0" y="0" width="100%" height="100%" fill="url(#cneb1)" />
      <rect x="0" y="0" width="100%" height="100%" fill="url(#cneb2)" />
      <rect x="0" y="0" width="100%" height="100%" fill="url(#cneb3)" />

      {/* Constellation lines */}
      {CONST_LINES.map(([a, b], i) => (
        <line key={`l${i}`}
          x1={CONST_STARS[a].cx} y1={CONST_STARS[a].cy}
          x2={CONST_STARS[b].cx} y2={CONST_STARS[b].cy}
          stroke="rgba(200,220,255,1)" strokeWidth={sw}
          style={{ animation: `const-line-appear ${2.6 + (i % 5) * 0.35}s ${(i * 0.18).toFixed(2)}s ease-in-out infinite` }}
        />
      ))}

      {/* Glow halos for bright stars */}
      {CONST_STARS.filter(s => s.bright).map((s, i) => (
        <circle key={`h${i}`} cx={s.cx} cy={s.cy} r={(s.r * 3.5 * scale).toFixed(2)} fill="rgba(210,230,255,0.14)"
          style={{ animation: `const-glow-halo ${s.dur} ${s.delay} ease-in-out infinite` }}
        />
      ))}

      {/* Star cores */}
      {CONST_STARS.map((s, i) => (
        <circle key={`s${i}`} cx={s.cx} cy={s.cy} r={(s.r * (s.bright ? 1.1 : 0.9) * scale).toFixed(2)} fill="white"
          style={{ animation: `constellation-pulse ${s.dur} ${s.delay} ease-in-out infinite` }}
        />
      ))}
    </svg>
  );
}

/* ── Fireflies ── */

const FLIES = [
  { left: "12%", top: "20%", fdx: "18px",  fdy: "-22px", delay: "0s",   dur: "3.2s" },
  { left: "35%", top: "60%", fdx: "-14px", fdy: "-28px", delay: "0.8s", dur: "2.8s" },
  { left: "58%", top: "35%", fdx: "22px",  fdy: "-18px", delay: "1.5s", dur: "3.5s" },
  { left: "75%", top: "70%", fdx: "-10px", fdy: "-32px", delay: "0.3s", dur: "2.6s" },
  { left: "20%", top: "80%", fdx: "16px",  fdy: "-24px", delay: "2.0s", dur: "3.0s" },
  { left: "85%", top: "25%", fdx: "-20px", fdy: "-20px", delay: "1.1s", dur: "2.9s" },
  { left: "45%", top: "15%", fdx: "12px",  fdy: "-30px", delay: "0.5s", dur: "3.4s" },
  { left: "65%", top: "50%", fdx: "-16px", fdy: "-16px", delay: "1.7s", dur: "2.7s" },
];

function FirefliesOverlay({ scale = 1 }: { scale?: number }) {
  const sz = (n: number) => Math.round(n * scale);
  return (
    <>
      {FLIES.map((f, i) => (
        <span key={i} className="absolute rounded-full pointer-events-none z-20"
          style={{
            left: f.left, top: f.top,
            width: sz(6), height: sz(6),
            background: "rgba(134,239,172,0.9)",
            boxShadow: `0 0 ${sz(6)}px ${sz(3)}px rgba(74,222,128,0.7), 0 0 ${sz(12)}px ${sz(6)}px rgba(74,222,128,0.3)`,
            "--fdx": f.fdx, "--fdy": f.fdy,
            animation: `firefly-drift ${f.dur} ${f.delay} ease-in-out infinite`,
          } as React.CSSProperties}
        />
      ))}
    </>
  );
}

/* ── Snowflakes ── */

const SNOWFLAKES = [
  { left: "5%",  delay: "0s",   dur: "4.0s", drift: "10px",  size: 8  },
  { left: "16%", delay: "0.7s", dur: "3.5s", drift: "-8px",  size: 6  },
  { left: "27%", delay: "1.4s", dur: "4.5s", drift: "12px",  size: 10 },
  { left: "39%", delay: "0.3s", dur: "3.8s", drift: "-6px",  size: 7  },
  { left: "51%", delay: "1.9s", dur: "4.2s", drift: "9px",   size: 9  },
  { left: "63%", delay: "0.9s", dur: "3.6s", drift: "-11px", size: 6  },
  { left: "74%", delay: "2.2s", dur: "4.8s", drift: "7px",   size: 8  },
  { left: "85%", delay: "1.1s", dur: "3.9s", drift: "-9px",  size: 5  },
  { left: "93%", delay: "2.6s", dur: "4.1s", drift: "13px",  size: 7  },
  { left: "10%", delay: "3.1s", dur: "3.7s", drift: "-7px",  size: 9  },
  { left: "34%", delay: "0.5s", dur: "4.3s", drift: "8px",   size: 6  },
  { left: "58%", delay: "2.9s", dur: "3.5s", drift: "-10px", size: 8  },
  { left: "79%", delay: "1.6s", dur: "4.0s", drift: "6px",   size: 7  },
];

function SnowOverlay({ scale = 1 }: { scale?: number }) {
  const fall = Math.round(300 * scale);
  return (
    <>
      {SNOWFLAKES.map((s, i) => (
        <span key={i} className="absolute pointer-events-none z-20 select-none leading-none"
          style={{
            left: s.left, top: "-4%",
            fontSize: Math.round(s.size * scale),
            color: "rgba(219,234,254,0.95)",
            textShadow: `0 0 ${Math.round(4 * scale)}px rgba(255,255,255,0.9)`,
            "--drift": s.drift, "--fall": `${fall}px`,
            animation: `snow-fall ${s.dur} ${s.delay} linear infinite`,
          } as React.CSSProperties}
        >❄</span>
      ))}
    </>
  );
}

/* ── Bubbles ── */

const BUBBLES = [
  { left: "6%",  size: 9,  delay: "0s",   dur: "3.8s" },
  { left: "18%", size: 13, delay: "0.7s", dur: "4.4s" },
  { left: "30%", size: 7,  delay: "1.5s", dur: "3.2s" },
  { left: "42%", size: 11, delay: "0.3s", dur: "4.0s" },
  { left: "54%", size: 8,  delay: "2.0s", dur: "3.5s" },
  { left: "65%", size: 14, delay: "1.1s", dur: "4.2s" },
  { left: "76%", size: 9,  delay: "2.5s", dur: "3.7s" },
  { left: "87%", size: 11, delay: "0.8s", dur: "4.6s" },
  { left: "24%", size: 7,  delay: "3.2s", dur: "3.3s" },
  { left: "58%", size: 12, delay: "1.8s", dur: "3.9s" },
  { left: "93%", size: 8,  delay: "0.4s", dur: "4.1s" },
];

function BubblesOverlay({ scale = 1 }: { scale?: number }) {
  const sz = (n: number) => Math.round(n * scale);
  const rise = Math.round(300 * scale);
  return (
    <>
      {BUBBLES.map((b, i) => (
        <span key={i} className="absolute rounded-full pointer-events-none z-20"
          style={{
            left: b.left, bottom: "0%",
            width: sz(b.size), height: sz(b.size),
            border: `${Math.max(1, Math.round(1.5 * scale))}px solid rgba(147,197,253,0.6)`,
            background: "rgba(219,234,254,0.15)",
            boxShadow: `inset 0 ${sz(1)}px ${sz(2)}px rgba(255,255,255,0.4)`,
            "--rise": `${-rise}px`,
            animation: `bubble-rise ${b.dur} ${b.delay} ease-in-out infinite`,
          } as React.CSSProperties}
        />
      ))}
    </>
  );
}

/* ── Petals ── */

const PETALS = [
  { left: "4%",  delay: "0s",   dur: "4.0s", drift: "20px",  spin: "180deg" },
  { left: "14%", delay: "0.9s", dur: "3.6s", drift: "-15px", spin: "240deg" },
  { left: "25%", delay: "1.8s", dur: "4.4s", drift: "25px",  spin: "160deg" },
  { left: "36%", delay: "0.4s", dur: "3.8s", drift: "-20px", spin: "300deg" },
  { left: "47%", delay: "2.2s", dur: "4.2s", drift: "18px",  spin: "220deg" },
  { left: "58%", delay: "1.1s", dur: "3.5s", drift: "-12px", spin: "190deg" },
  { left: "69%", delay: "2.8s", dur: "4.6s", drift: "22px",  spin: "270deg" },
  { left: "80%", delay: "1.5s", dur: "3.9s", drift: "-18px", spin: "140deg" },
  { left: "90%", delay: "3.2s", dur: "4.1s", drift: "14px",  spin: "210deg" },
  { left: "20%", delay: "0.6s", dur: "4.8s", drift: "-8px",  spin: "330deg" },
  { left: "53%", delay: "2.5s", dur: "3.7s", drift: "16px",  spin: "150deg" },
  { left: "75%", delay: "0.2s", dur: "4.3s", drift: "-22px", spin: "280deg" },
];

function PetalsOverlay({ scale = 1 }: { scale?: number }) {
  const fall = Math.round(300 * scale);
  return (
    <>
      {PETALS.map((p, i) => (
        <span key={i} className="absolute pointer-events-none z-20 select-none leading-none"
          style={{
            left: p.left, top: "-4%",
            fontSize: Math.round(10 * scale),
            "--drift": p.drift, "--spin": p.spin, "--fall": `${fall}px`,
            animation: `petal-fall ${p.dur} ${p.delay} linear infinite`,
          } as React.CSSProperties}
        >🌸</span>
      ))}
    </>
  );
}

/* ── Hearts ── */

const HEARTS = [
  { left: "6%",  delay: "0s",   dur: "3.0s", size: 10 },
  { left: "16%", delay: "0.5s", dur: "2.6s", size: 8  },
  { left: "27%", delay: "1.2s", dur: "3.4s", size: 11 },
  { left: "38%", delay: "0.2s", dur: "2.8s", size: 9  },
  { left: "49%", delay: "1.7s", dur: "3.2s", size: 12 },
  { left: "60%", delay: "0.8s", dur: "2.7s", size: 8  },
  { left: "71%", delay: "2.3s", dur: "3.5s", size: 10 },
  { left: "82%", delay: "0.4s", dur: "2.9s", size: 9  },
  { left: "91%", delay: "1.5s", dur: "3.1s", size: 7  },
  { left: "21%", delay: "2.8s", dur: "2.6s", size: 11 },
  { left: "54%", delay: "1.0s", dur: "3.3s", size: 8  },
  { left: "76%", delay: "3.2s", dur: "2.8s", size: 10 },
];

function HeartsOverlay({ scale = 1 }: { scale?: number }) {
  const rise = Math.round(310 * scale);
  return (
    <>
      {HEARTS.map((h, i) => (
        <span key={i} className="absolute pointer-events-none z-20 select-none leading-none"
          style={{
            left: h.left, bottom: "-2%",
            fontSize: Math.round(h.size * scale),
            "--rise": `${-rise}px`,
            animation: `heart-float ${h.dur} ${h.delay} ease-out infinite`,
          } as React.CSSProperties}
        >💛</span>
      ))}
    </>
  );
}

/* ── Shooting Stars ── */

const STARS = [
  { left: "5%",  top: "10%", sx: "60px",  sy: "35px",  delay: "0s",   dur: "2.5s" },
  { left: "25%", top: "5%",  sx: "55px",  sy: "40px",  delay: "0.8s", dur: "2.8s" },
  { left: "50%", top: "15%", sx: "50px",  sy: "30px",  delay: "1.6s", dur: "2.3s" },
  { left: "70%", top: "8%",  sx: "45px",  sy: "38px",  delay: "0.3s", dur: "2.6s" },
  { left: "15%", top: "40%", sx: "58px",  sy: "28px",  delay: "2.0s", dur: "2.9s" },
  { left: "60%", top: "35%", sx: "52px",  sy: "42px",  delay: "1.1s", dur: "2.4s" },
];

function ShootingStarsOverlay({ scale = 1 }: { scale?: number }) {
  const sz = (n: number) => Math.round(n * scale);
  return (
    <>
      {STARS.map((s, i) => (
        <span key={i} className="absolute pointer-events-none z-20"
          style={{
            left: s.left, top: s.top,
            width: sz(28), height: sz(2),
            borderRadius: sz(2),
            background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.9) 100%)",
            transform: "rotate(35deg)",
            "--sx": s.sx, "--sy": s.sy,
            animation: `star-shoot ${s.dur} ${s.delay} ease-in infinite`,
          } as React.CSSProperties}
        />
      ))}
    </>
  );
}

/* ── Rain ── */

const RAINDROPS = [
  { left: "4%",  delay: "0s",    dur: "1.1s", size: 2, len: 14 },
  { left: "11%", delay: "0.25s", dur: "0.95s",size: 3, len: 16 },
  { left: "19%", delay: "0.6s",  dur: "1.2s", size: 2, len: 12 },
  { left: "27%", delay: "0.1s",  dur: "1.0s", size: 3, len: 15 },
  { left: "35%", delay: "0.8s",  dur: "1.15s",size: 2, len: 13 },
  { left: "43%", delay: "0.35s", dur: "1.05s",size: 3, len: 16 },
  { left: "51%", delay: "0.7s",  dur: "0.9s", size: 2, len: 12 },
  { left: "59%", delay: "0.15s", dur: "1.2s", size: 3, len: 14 },
  { left: "67%", delay: "0.5s",  dur: "1.0s", size: 2, len: 15 },
  { left: "75%", delay: "0.9s",  dur: "1.1s", size: 3, len: 13 },
  { left: "83%", delay: "0.3s",  dur: "0.95s",size: 2, len: 16 },
  { left: "90%", delay: "0.65s", dur: "1.15s",size: 3, len: 14 },
  { left: "96%", delay: "0.45s", dur: "1.0s", size: 2, len: 12 },
];

function RainOverlay({ scale = 1 }: { scale?: number }) {
  const sz = (n: number) => Math.round(n * scale);
  const fall = Math.round(310 * scale);
  return (
    <>
      {RAINDROPS.map((r, i) => (
        <span key={i} className="absolute pointer-events-none z-20"
          style={{
            left: r.left, top: "-3%",
            width: sz(r.size), height: sz(r.len),
            borderRadius: sz(r.size),
            background: "linear-gradient(180deg, rgba(147,197,253,0) 0%, rgba(147,197,253,0.8) 100%)",
            "--fall": `${fall}px`,
            animation: `rain-fall ${r.dur} ${r.delay} linear infinite`,
          } as React.CSSProperties}
        />
      ))}
    </>
  );
}

/* ── Gleam sweep beam ── */

function GleamOverlay({ scale = 1 }: { scale?: number }) {
  const w = Math.round(32 * Math.max(0.6, scale));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-20" style={{ borderRadius: "inherit" }}>
      <div style={{
        position: "absolute",
        top: "-20%",
        left: 0,
        width: `${w}%`,
        height: "140%",
        background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 20%, rgba(255,255,255,0.34) 50%, rgba(255,255,255,0.06) 80%, transparent 100%)",
        animation: "gleam-sweep 3.5s 0.5s ease-in-out infinite",
        pointerEvents: "none",
      }} />
    </div>
  );
}

/* ── Holographic shine overlay ── */

function ShineOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none z-10" style={{
      borderRadius: "inherit",
      background: "linear-gradient(135deg, rgba(255,80,80,0.13) 0%, rgba(255,165,0,0.10) 14%, rgba(255,220,0,0.12) 28%, rgba(0,230,100,0.10) 42%, rgba(0,150,255,0.12) 57%, rgba(120,0,255,0.10) 71%, rgba(255,0,200,0.12) 85%, rgba(255,80,80,0.13) 100%)",
      backgroundSize: "400% 400%",
      mixBlendMode: "color-dodge",
      animation: "shine-holo-shift 4s linear infinite",
    }} />
  );
}

/* ── Rarity overlay effects ── */

function RarityOverlay({ rarity, scale = 1 }: { rarity: string; scale?: number }) {
  const { getEffects } = useCardRarities();
  const effects = getEffects(rarity);
  const surface: string[] = effects.surface ?? [];
  const border: string[] = effects.border ?? [];

  return (
    <>
      {border.includes("rainbow") && (
        <>
          <div className="absolute inset-0 legend-foil-overlay pointer-events-none z-10" />
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
            <div className="legend-sheen-beam" />
          </div>
        </>
      )}
      {surface.includes("shine")         && <ShineOverlay />}
      {surface.includes("gleam")         && <GleamOverlay scale={scale} />}
      {surface.includes("sparkle")       && <EpicGlitter scale={scale} />}
      {surface.includes("ember")         && <MythicEmbers scale={scale} />}
      {surface.includes("constellation") && <ConstellationOverlay scale={scale} />}
      {surface.includes("fireflies")     && <FirefliesOverlay scale={scale} />}
      {surface.includes("snow")          && <SnowOverlay scale={scale} />}
      {surface.includes("bubbles")       && <BubblesOverlay scale={scale} />}
      {surface.includes("petals")        && <PetalsOverlay scale={scale} />}
      {surface.includes("hearts")        && <HeartsOverlay scale={scale} />}
      {surface.includes("stars")         && <ShootingStarsOverlay scale={scale} />}
      {surface.includes("rain")          && <RainOverlay scale={scale} />}
    </>
  );
}

/* ── Direct effects overlay (bypasses context, used for live preview) ── */

function DirectRarityOverlay({ effects, scale = 1 }: {
  effects: { surface: string[]; border: string[] };
  scale?: number;
}) {
  const surface = effects.surface ?? [];
  const border  = effects.border  ?? [];
  return (
    <>
      {border.includes("rainbow") && (
        <>
          <div className="absolute inset-0 legend-foil-overlay pointer-events-none z-10" />
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
            <div className="legend-sheen-beam" />
          </div>
        </>
      )}
      {surface.includes("shine")         && <ShineOverlay />}
      {surface.includes("gleam")         && <GleamOverlay scale={scale} />}
      {surface.includes("sparkle")       && <EpicGlitter scale={scale} />}
      {surface.includes("ember")         && <MythicEmbers scale={scale} />}
      {surface.includes("constellation") && <ConstellationOverlay scale={scale} />}
      {surface.includes("fireflies")     && <FirefliesOverlay scale={scale} />}
      {surface.includes("snow")          && <SnowOverlay scale={scale} />}
      {surface.includes("bubbles")       && <BubblesOverlay scale={scale} />}
      {surface.includes("petals")        && <PetalsOverlay scale={scale} />}
      {surface.includes("hearts")        && <HeartsOverlay scale={scale} />}
      {surface.includes("stars")         && <ShootingStarsOverlay scale={scale} />}
      {surface.includes("rain")          && <RainOverlay scale={scale} />}
    </>
  );
}

/* ── Live rarity preview card (for Settings editor) ── */

export function RarityPreviewCard({
  effects,
  color,
  name,
  iconUrl,
}: {
  effects: { surface: string[]; border: string[]; glow: string[]; confetti: string[] };
  color: string;
  name: string;
  iconUrl?: string | null;
}) {
  const border = effects.border ?? [];
  const glow   = effects.glow   ?? [];

  const hasAnimatedBorder = border.length > 0;
  const borderStyle: React.CSSProperties = hasAnimatedBorder ? {} : { borderColor: color };

  const wrapperClasses = [
    ...border.map(b => BORDER_CLASS[b]).filter(Boolean),
    ...glow.map(g => GLOW_CLASS[g]).filter(Boolean),
  ];

  const tagStyle = rarityTagStyle[name] ?? metallicFilterStyle(color, false);

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Preview</p>
      <div className="flex flex-col gap-1.5 w-28">
        <div
          className={cn("rounded-3xl border-4 shadow-lg", ...wrapperClasses)}
          style={borderStyle}
        >
          <div className="relative overflow-hidden rounded-[20px]">
            <DirectRarityOverlay effects={effects} scale={0.55} />
            {iconUrl ? (
              <img
                src={iconUrl}
                alt={name}
                className="w-full aspect-[3/4] object-contain p-3"
                style={{ backgroundColor: color + "18" }}
              />
            ) : (
              <div
                className="w-full aspect-[3/4] flex items-center justify-center"
                style={{ backgroundColor: color + "18" }}
              >
                <span className="text-4xl font-display font-black" style={{ color }}>
                  {name[0] ?? "?"}
                </span>
              </div>
            )}
          </div>
        </div>
        <span
          className="inline-flex items-center justify-center self-start px-2 py-0.5 rounded-full text-xs font-bold border"
          style={tagStyle}
        >
          {name || "Rarity"}
        </span>
      </div>
    </div>
  );
}

/* ── Lightbox ── */

interface LightboxProps {
  card: Card;
  packName?: string;
  packColor?: string | null;
  duplicateCount?: number;
  onClose: () => void;
}

export function CardLightbox({ card, packName, packColor, duplicateCount, onClose }: LightboxProps) {
  const { borderStyle, wrapperClasses, tagStyle } = useRarityMeta(card.rarity);
  const { getColor: getTypeColor } = useCardTypes();
  return (
    <AnimatePresence>
      <motion.div
        key="lightbox"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
          className="flex flex-col items-center gap-4 max-w-xl w-full"
          onClick={e => e.stopPropagation()}
        >
          <div
            className={cn("w-full rounded-3xl border-4 overflow-hidden shadow-2xl relative", ...wrapperClasses)}
            style={borderStyle}
          >
            <RarityOverlay rarity={card.rarity} scale={3} />
            {card.imageUrl ? (
              <img src={card.imageUrl} alt={card.name} className="w-full object-contain bg-white" />
            ) : (
              <div className="w-full aspect-[3/4] bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-400 font-bold">
                No Image
              </div>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold border"
              style={tagStyle}>{card.rarity}</span>
            {packName && (
              <span className="px-3 py-1 rounded-full text-sm font-semibold border"
                style={packColor
                  ? { backgroundColor: packColor + "22", borderColor: packColor, color: packColor }
                  : { backgroundColor: "#0284c722", borderColor: "#0284c7", color: "#0284c7" }}>
                {packName}
              </span>
            )}
            {(card.tags ?? []).map(tag => {
              const c = getTypeColor(tag);
              return (
                <span key={tag} className="px-3 py-1 rounded-full text-sm font-semibold border"
                  style={{ backgroundColor: c + "22", borderColor: c, color: c }}>
                  {tag}
                </span>
              );
            })}
            {duplicateCount && duplicateCount > 1 && (
              <span className="px-3 py-1 rounded-full text-sm font-bold bg-slate-100 text-slate-500 border border-slate-300">
                Duplicate ×{duplicateCount}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors flex items-center gap-1 text-sm">
            <X className="w-4 h-4" /> Close
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ── Student Card (owned, in gallery) ── */

interface StudentCardProps {
  card: Card;
  packName?: string;
  packColor?: string | null;
  duplicateCount?: number;
  className?: string;
  onClick?: () => void;
}

export function StudentCard({ card, packName, packColor, duplicateCount, className, onClick }: StudentCardProps) {
  const { borderStyle, wrapperClasses, tagStyle } = useRarityMeta(card.rarity);
  const { getColor: getTypeColor } = useCardTypes();

  return (
    <div
      className={cn("group flex flex-col gap-1.5", onClick && "cursor-pointer", className)}
      onClick={onClick}
    >
      <div
        className={cn(
          "rounded-3xl border-4 shadow-lg transition-all duration-300",
          "group-hover:scale-105 group-hover:-translate-y-1 group-hover:shadow-xl",
          ...wrapperClasses,
        )}
        style={borderStyle}
      >
        <div className="relative overflow-hidden rounded-[20px]">
          <RarityOverlay rarity={card.rarity} />
          {card.imageUrl ? (
            <img src={card.imageUrl} alt="Card" className="w-full object-contain bg-white" loading="lazy" />
          ) : (
            <div className="w-full aspect-[3/4] bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-400 text-sm font-bold">
              No Image
            </div>
          )}
        </div>
      </div>

      {/* Tags row */}
      <div className="flex flex-wrap gap-1 px-0.5">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border"
          style={tagStyle}>
          {card.rarity}
        </span>
        {packName && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border"
            style={packColor
              ? { backgroundColor: packColor + "22", borderColor: packColor, color: packColor }
              : { backgroundColor: "#0284c722", borderColor: "#0284c7", color: "#0284c7" }}>
            {packName}
          </span>
        )}
        {(card.tags ?? []).map(tag => {
          const c = getTypeColor(tag);
          return (
            <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border"
              style={{ backgroundColor: c + "22", borderColor: c, color: c }}>
              {tag}
            </span>
          );
        })}
      </div>

      {duplicateCount && duplicateCount > 1 && (
        <span className="inline-flex items-center self-start px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-300 mx-0.5">
          ×{duplicateCount} copies
        </span>
      )}
    </div>
  );
}

/* ── Missing Card ── */

interface MissingCardProps {
  cardNumber: string;
  cardBackUrl?: string | null;
  className?: string;
}

export function MissingCard({ cardNumber, cardBackUrl, className }: MissingCardProps) {
  return (
    <div className={cn("flex flex-col gap-1.5 opacity-70", className)}>
      <div className="relative rounded-2xl border-4 border-slate-300 overflow-hidden shadow">
        {cardBackUrl ? (
          <img src={cardBackUrl} alt="Missing card" className="w-full object-contain bg-slate-200" />
        ) : (
          <div className="w-full aspect-[3/4] bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center">
            <div className="w-3/4 h-3/4 rounded-xl border-4 border-slate-200/50 flex items-center justify-center opacity-50">
              <span className="text-slate-100 font-bold text-4xl">?</span>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-black/15" />
      </div>
      <div className="flex flex-wrap gap-1 px-0.5">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-300">
          #{cardNumber}
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-500 border border-slate-300">
          Missing
        </span>
      </div>
      <p className="px-0.5 text-xs text-slate-400 font-mono tracking-widest">???</p>
    </div>
  );
}

/* ── CollectibleCard (Pack Opener flip animation) ── */

interface CollectibleCardProps {
  card: Card;
  isFlipped?: boolean;
  onClick?: () => void;
  className?: string;
  cardBackUrl?: string | null;
  scale?: number;
}

export function CollectibleCard({ card, isFlipped = true, onClick, className, cardBackUrl, scale = 2 }: CollectibleCardProps) {
  const { borderStyle, wrapperClasses, tagStyle } = useRarityMeta(card.rarity);
  const { getColor: getTypeColor } = useCardTypes();

  return (
    <div
      className={cn("flex flex-col gap-2", onClick && "cursor-pointer", className)}
      onClick={onClick}
    >
      <div className="relative w-full perspective-1000">
        {card.imageUrl
          ? <img src={card.imageUrl} aria-hidden className="w-full block invisible" />
          : <div className="w-full aspect-[3/4]" />
        }
        <motion.div
          className="absolute inset-0 preserve-3d"
          initial={false}
          animate={{ rotateY: isFlipped ? 0 : 180 }}
          transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
        >
          {/* Front */}
          <div
            className={cn(
              "absolute inset-0 backface-hidden rounded-3xl border-4 overflow-hidden shadow-lg",
              ...wrapperClasses,
            )}
            style={borderStyle}
          >
            <RarityOverlay rarity={card.rarity} scale={scale} />
            {card.imageUrl ? (
              <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 text-slate-400 text-sm font-bold">
                No image
              </div>
            )}
          </div>

          {/* Back */}
          <div className="absolute inset-0 backface-hidden rounded-3xl border-4 border-slate-600 rotate-y-180 overflow-hidden shadow-lg">
            {cardBackUrl ? (
              <img src={cardBackUrl} alt="Card Back" className="w-full h-full object-cover" />
            ) : (
              <img src={`${import.meta.env.BASE_URL}images/card-back.png`} alt="Card Back" className="w-full h-full object-cover" />
            )}
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {isFlipped && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap gap-1 px-0.5"
          >
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border"
              style={tagStyle}>
              {card.rarity}
            </span>
            {(card.tags ?? []).map(tag => {
              const c = getTypeColor(tag);
              return (
                <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border"
                  style={{ backgroundColor: c + "22", borderColor: c, color: c }}>
                  {tag}
                </span>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
