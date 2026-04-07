import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import { Card } from "@workspace/api-client-react";
import { CollectibleCard } from "./CollectibleCard";
import { Button } from "@/components/ui/button";
import { PackageOpen, ArrowLeft, ChevronsRight, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCardRarities } from "@/contexts/CardRaritiesContext";

interface PackOpenerProps {
  cards: Card[];
  onComplete: () => void;
  onOpenAnother?: () => void;
  onBack?: () => void;
  extraAction?: React.ReactNode;
  packCoverUrl?: string | null;
  cardBackUrl?: string | null;
  packOpenSoundUrl?: string | null;
  cardFlipSoundUrl?: string | null;
  backgroundImageUrl?: string | null;
  duplicateCardIds?: number[];
  rarityCoins?: Record<string, number>;
  packColor?: string | null;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function playAudioUrl(url: string) {
  try {
    const audio = new Audio(url);
    audio.volume = 0.8;
    audio.play().catch(() => {});
  } catch { /* silently skip */ }
}

function playCardFlipSynth() {
  try {
    const ctx = new AudioContext();
    const dur = 0.18;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.3));
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1800;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(1.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    src.start();
  } catch { /* silently skip */ }
}

function playEpicSynth() {
  try {
    const ctx = new AudioContext();
    const t = ctx.currentTime;
    // Rising arpeggio of three tones — bright and powerful
    [0, 4, 7].forEach((semitone, i) => {
      const freq = 440 * Math.pow(2, semitone / 12);
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      const start = t + i * 0.12;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.35, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.55);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(start); osc.stop(start + 0.55);
    });
  } catch { /* silently skip */ }
}

function playMythicSynth() {
  try {
    const ctx = new AudioContext();
    const t = ctx.currentTime;
    // Ethereal shimmer — high bell-like tone with gentle chorus
    [0, 12, 19].forEach((semitone, i) => {
      const freq = 880 * Math.pow(2, semitone / 12);
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t + i * 0.08);
      osc.frequency.linearRampToValueAtTime(freq * 1.04, t + i * 0.08 + 0.3);
      const gain = ctx.createGain();
      const start = t + i * 0.08;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.3, start + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.9);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(start); osc.stop(start + 0.9);
    });
  } catch { /* silently skip */ }
}

function playLegendarySynth() {
  try {
    const ctx = new AudioContext();
    const t = ctx.currentTime;
    // Full dramatic hit — bass thud + rising chord + high shimmer
    const bass = ctx.createOscillator();
    bass.type = "sine";
    bass.frequency.setValueAtTime(80, t);
    bass.frequency.exponentialRampToValueAtTime(40, t + 0.4);
    const bassGain = ctx.createGain();
    bassGain.gain.setValueAtTime(0.6, t);
    bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    bass.connect(bassGain); bassGain.connect(ctx.destination);
    bass.start(t); bass.stop(t + 0.5);

    [0, 4, 7, 12].forEach((semitone, i) => {
      const freq = 220 * Math.pow(2, semitone / 12);
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      const start = t + i * 0.06;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.28, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 1.1);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(start); osc.stop(start + 1.1);
    });

    const shimmer = ctx.createOscillator();
    shimmer.type = "sine";
    shimmer.frequency.value = 1760;
    const shimGain = ctx.createGain();
    shimGain.gain.setValueAtTime(0, t + 0.18);
    shimGain.gain.linearRampToValueAtTime(0.15, t + 0.28);
    shimGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    shimmer.connect(shimGain); shimGain.connect(ctx.destination);
    shimmer.start(t + 0.18); shimmer.stop(t + 1.2);
  } catch { /* silently skip */ }
}

function playPackOpenSound() {
  try {
    const ctx = new AudioContext();

    // Short noise burst (paper/foil rip)
    const ripDuration = 0.28;
    const ripSamples = Math.floor(ctx.sampleRate * ripDuration);
    const ripBuffer = ctx.createBuffer(1, ripSamples, ctx.sampleRate);
    const ripData = ripBuffer.getChannelData(0);
    for (let i = 0; i < ripSamples; i++) {
      const env = Math.exp(-i / (ripSamples * 0.25));
      ripData[i] = (Math.random() * 2 - 1) * env;
    }
    const ripSource = ctx.createBufferSource();
    ripSource.buffer = ripBuffer;

    const ripFilter = ctx.createBiquadFilter();
    ripFilter.type = "bandpass";
    ripFilter.frequency.value = 3000;
    ripFilter.Q.value = 0.8;

    const ripGain = ctx.createGain();
    ripGain.gain.setValueAtTime(1.6, ctx.currentTime);
    ripGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + ripDuration);

    ripSource.connect(ripFilter);
    ripFilter.connect(ripGain);
    ripGain.connect(ctx.destination);
    ripSource.start(ctx.currentTime);

    // Whoosh (low sweep)
    const whooshDuration = 0.4;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(220, ctx.currentTime + 0.05);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + whooshDuration);

    const whooshGain = ctx.createGain();
    whooshGain.gain.setValueAtTime(0.4, ctx.currentTime + 0.05);
    whooshGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + whooshDuration);

    osc.connect(whooshGain);
    whooshGain.connect(ctx.destination);
    osc.start(ctx.currentTime + 0.05);
    osc.stop(ctx.currentTime + whooshDuration);

    // Sparkle ping at the end
    const ping = ctx.createOscillator();
    ping.type = "sine";
    ping.frequency.setValueAtTime(880, ctx.currentTime + 0.22);
    ping.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.45);

    const pingGain = ctx.createGain();
    pingGain.gain.setValueAtTime(0, ctx.currentTime + 0.22);
    pingGain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.26);
    pingGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);

    ping.connect(pingGain);
    pingGain.connect(ctx.destination);
    ping.start(ctx.currentTime + 0.22);
    ping.stop(ctx.currentTime + 0.55);
  } catch {
    // Audio not available — silently skip
  }
}

/* ── Confetti colour configs ── */

const CONFETTI_CONFIG: Record<string, { colors: string[]; pieces: number; gravity?: number }> = {
  red:     { colors: ["#FF4444", "#FF7777", "#FFAAAA", "#CC0000", "#FF2222"], pieces: 320, gravity: 0.15 },
  blue:    { colors: ["#4488FF", "#77AAFF", "#AACCFF", "#0055CC", "#2266FF"], pieces: 320, gravity: 0.15 },
  green:   { colors: ["#44CC77", "#77EE99", "#AAFFCC", "#00AA44", "#22DD66"], pieces: 320, gravity: 0.15 },
  gold:    { colors: ["#FFD700", "#FFA500", "#FFF8DC", "#FFFACD", "#FFB347"], pieces: 500, gravity: 0.14 },
  pink:    { colors: ["#FF66BB", "#FF99CC", "#FFCCEE", "#FF3388", "#FF55AA"], pieces: 320, gravity: 0.15 },
  purple:  { colors: ["#A855F7", "#C084FC", "#E9D5FF", "#7C3AED", "#DDD6FE"], pieces: 280, gravity: 0.18 },
  rainbow: { colors: ["#FF4444","#FF8800","#FFEE00","#44DD44","#4488FF","#8844FF","#FF44BB"], pieces: 420, gravity: 0.14 },
};

export function PackOpener({ cards, onComplete, onOpenAnother, onBack, extraAction, packCoverUrl, cardBackUrl, packOpenSoundUrl, cardFlipSoundUrl, backgroundImageUrl, duplicateCardIds, rarityCoins, packColor }: PackOpenerProps) {
  const duplicateSet = new Set(duplicateCardIds ?? []);
  const [phase, setPhase] = useState<"intro" | "shaking" | "ripping" | "cards">("intro");
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [isFlippingAll, setIsFlippingAll] = useState(false);
  const flipAllTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [activeConfetti, setActiveConfetti] = useState<Array<{ id: number; colors: string[]; pieces: number; gravity: number }>>([]);

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const urls = [
      cardBackUrl ?? packCoverUrl,
      ...cards.map(c => c.imageUrl).filter(Boolean),
    ].filter((u): u is string => !!u);
    urls.forEach(url => { const img = new window.Image(); img.src = url; });
  }, []);

  const handlePackClick = useCallback(() => {
    if (phase !== "intro") return;
    if (packOpenSoundUrl) playAudioUrl(packOpenSoundUrl);
    else playPackOpenSound();
    setPhase("shaking");
    setTimeout(() => setPhase("ripping"), 900);
    setTimeout(() => setPhase("cards"), 1800);
  }, [phase, packOpenSoundUrl]);

  const handleCardClick = (index: number) => {
    const rarity = cards[index]?.rarity;
    const raritySoundUrl = rarity ? getSoundUrl(rarity) : null;
    if (raritySoundUrl) {
      playAudioUrl(raritySoundUrl);
    } else if (cardFlipSoundUrl) {
      playAudioUrl(cardFlipSoundUrl);
    } else if (rarity === "Legendary") {
      playLegendarySynth();
    } else if (rarity === "Mythic") {
      playMythicSynth();
    } else if (rarity === "Epic") {
      playEpicSynth();
    } else {
      playCardFlipSynth();
    }
    setFlipped(prev => ({ ...prev, [index]: true }));

    // Trigger per-card confetti burst from confetti layer
    if (rarity) {
      const effects = getEffects(rarity);
      const confettiTypes: string[] = [
        ...(effects.confetti ?? []),
        // Backward compat: old surface confetti flags
        ...(effects.surface ?? [])
          .filter(s => s === "confetti-gold" || s === "confetti-purple")
          .map(s => s === "confetti-gold" ? "gold" : "purple"),
      ];
      if (confettiTypes.length > 0) {
        const cfg = CONFETTI_CONFIG[confettiTypes[0]] ?? CONFETTI_CONFIG["rainbow"];
        const burstId = Date.now() + Math.random();
        setActiveConfetti(prev => [...prev, { id: burstId, colors: cfg.colors, pieces: cfg.pieces, gravity: cfg.gravity ?? 0.15 }]);
        setTimeout(() => setActiveConfetti(prev => prev.filter(c => c.id !== burstId)), 4500);
      }
    }
  };

  const handleFlipAll = useCallback((currentFlipped: Record<number, boolean>) => {
    if (isFlippingAll) return;
    const unflipped = cards.map((_, i) => i).filter(i => !currentFlipped[i]);
    if (unflipped.length === 0) return;
    setIsFlippingAll(true);
    flipAllTimers.current.forEach(clearTimeout);
    flipAllTimers.current = [];
    unflipped.forEach((cardIndex, step) => {
      const t = setTimeout(() => {
        handleCardClick(cardIndex);
        if (step === unflipped.length - 1) setIsFlippingAll(false);
      }, step * 380);
      flipAllTimers.current.push(t);
    });
  }, [isFlippingAll, cards]);

  const { getEffects, getSoundUrl } = useCardRarities();

  const allFlipped = cards.length > 0 && Object.keys(flipped).length === cards.length;
  const hasLegendary = cards.some(c => c.rarity === "Legendary");
  const hasEpic = cards.some(c => c.rarity === "Epic");
  const hasMythic = cards.some(c => c.rarity === "Mythic");

  const packImage = packCoverUrl || `${import.meta.env.BASE_URL}images/pack-art.png`;

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex flex-col items-center justify-center p-4 md:p-6 overflow-y-auto",
      backgroundImageUrl ? "" : "bg-black/85 backdrop-blur-md"
    )}>
      {backgroundImageUrl && (
        <>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${backgroundImageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(4px) brightness(0.9)",
              transform: "scale(1.1)",
              zIndex: -1,
            }}
          />
          <div className="absolute inset-0 bg-black/15" style={{ zIndex: -1 }} />
        </>
      )}
      {activeConfetti.map(burst => (
        <Confetti
          key={burst.id}
          width={windowSize.width}
          height={windowSize.height}
          colors={burst.colors}
          numberOfPieces={burst.pieces}
          recycle={false}
          gravity={burst.gravity}
        />
      ))}

      {/* Back button — only available before the pack is tapped */}
      {phase === "intro" && onBack && (
        <button
          onClick={onBack}
          className="absolute top-5 left-5 flex items-center gap-1.5 text-white/70 hover:text-white font-semibold text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      )}

      <AnimatePresence mode="wait">
        {/* intro / shaking / ripping — all share key="pack-area" so no wait gap between them */}
        {(phase === "intro" || phase === "shaking" || phase === "ripping") && (
          <motion.div
            key="pack-area"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center"
          >
            {/* ── Intro / Shaking: single image ── */}
            {(phase === "intro" || phase === "shaking") && (
              <motion.div
                className="cursor-pointer flex flex-col items-center"
                onClick={handlePackClick}
              >
                <motion.div
                  animate={
                    phase === "shaking"
                      ? { x: [0, -8, 8, -8, 8, -4, 4, 0], rotate: [0, -4, 4, -4, 4, -2, 2, 0], scale: [1, 1.06, 1.06, 1.06, 1.06, 1.06, 1.06, 1] }
                      : { y: [0, -15, 0] }
                  }
                  transition={
                    phase === "shaking"
                      ? { duration: 0.25, repeat: Infinity }
                      : { duration: 3, repeat: Infinity, ease: "easeInOut" }
                  }
                >
                  <img
                    src={packImage}
                    alt="Pack"
                    className="w-72 md:w-96 object-contain"
                    style={{ filter: `drop-shadow(0 0 40px ${packColor ? hexToRgba(packColor, 0.7) : "rgba(34,197,94,0.6)"})` }}
                  />
                </motion.div>
                <motion.p
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-white font-display text-2xl md:text-3xl mt-10 tracking-wide font-bold"
                >
                  {phase === "intro" ? "Tap to Open!" : "Opening..."}
                </motion.p>
              </motion.div>
            )}

            {/* ── Ripping: two clip-path pieces ── */}
            {phase === "ripping" && (
              <>
                {/* White flash on rip */}
                <motion.div
                  className="fixed inset-0 bg-white pointer-events-none z-10"
                  initial={{ opacity: 0.65 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                />
                <div className="relative w-72 md:w-96">
                  {/* invisible sizer so the container has the pack's natural height */}
                  <img src={packImage} className="w-full invisible block" aria-hidden />

                  {/* Bottom piece — slides down and fades */}
                  <motion.img
                    src={packImage}
                    alt=""
                    aria-hidden
                    className="absolute inset-0 w-full h-full object-contain"
                    style={{
                      clipPath: "polygon(0 20%, 8% 17%, 16% 22%, 24% 18%, 33% 23%, 42% 18%, 51% 22%, 60% 17%, 69% 22%, 78% 18%, 87% 23%, 94% 20%, 100% 19%, 100% 100%, 0 100%)",
                    }}
                    initial={{ y: 0, opacity: 1 }}
                    animate={{ y: 130, opacity: 0 }}
                    transition={{ delay: 0.05, duration: 0.65, ease: "easeIn" }}
                  />

                  {/* Top piece — flies upward with rotation */}
                  <motion.img
                    src={packImage}
                    alt="Pack opening"
                    className="absolute inset-0 w-full h-full object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]"
                    style={{
                      clipPath: "polygon(0 0, 100% 0, 100% 19%, 94% 20%, 87% 23%, 78% 18%, 69% 22%, 60% 17%, 51% 22%, 42% 18%, 33% 23%, 24% 18%, 16% 22%, 8% 17%, 0 20%)",
                      transformOrigin: "60% 100%",
                    }}
                    initial={{ y: 0, rotate: 0, x: 0, opacity: 1 }}
                    animate={{ y: -320, rotate: 22, x: 70, opacity: 0 }}
                    transition={{ duration: 0.7, ease: [0.1, 0.6, 0.5, 1] }}
                  />
                </div>
              </>
            )}
          </motion.div>
        )}

        {phase === "cards" && (
          <motion.div
            key="cards"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center w-full"
          >
            <h2 className="text-3xl md:text-4xl font-display text-white mb-3 font-bold drop-shadow-lg">
              {allFlipped
                ? hasLegendary ? "🌟 LEGENDARY!! 🌟" : hasEpic ? "✨ Epic find!" : hasMythic ? "💫 Mythic!" : "Amazing finds!"
                : "Tap each card to reveal!"}
            </h2>

            <div className={cn(
              "flex justify-center w-full",
              cards.length > 4 ? "flex-wrap gap-6 md:gap-8" : "flex-nowrap gap-6 md:gap-10 lg:gap-14"
            )}>
              {cards.map((card, i) => {
                const isDuplicate = duplicateSet.has(card.id);
                const coinValue = isDuplicate ? (rarityCoins?.[card.rarity] ?? 1) : 0;
                const isRevealed = !!flipped[i];
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 140, rotate: -8 + (i * 5) }}
                    animate={{ opacity: 1, y: 0, rotate: 0 }}
                    transition={{ delay: i * 0.15, type: "spring", stiffness: 200, damping: 20 }}
                    className={cn(
                      "flex flex-col items-center",
                      cards.length === 1 ? "w-64 sm:w-80 md:w-[26rem] lg:w-[30rem]" :
                      cards.length === 2 ? "w-56 sm:w-72 md:w-[22rem] lg:w-[26rem]" :
                      cards.length === 3 ? "w-48 sm:w-64 md:w-80 lg:w-[22rem]" :
                      cards.length === 4 ? "w-40 sm:w-52 md:w-64 lg:w-72" :
                      "w-36 sm:w-44 md:w-56"
                    )}
                  >
                    <CollectibleCard
                      card={card}
                      isFlipped={isRevealed}
                      onClick={() => !isRevealed && handleCardClick(i)}
                      cardBackUrl={cardBackUrl ?? packCoverUrl}
                    />
                    {isDuplicate && isRevealed && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.7, y: -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: 0.35, type: "spring", stiffness: 260, damping: 18 }}
                        className="flex flex-col items-center gap-0.5 mt-2 pointer-events-none"
                      >
                        <span className="bg-slate-400/90 text-white text-[10px] sm:text-xs font-extrabold px-2.5 py-0.5 rounded-full shadow-lg tracking-widest uppercase border border-slate-300 whitespace-nowrap">
                          Duplicate
                        </span>
                        <span className="flex items-center gap-1 bg-amber-400 text-amber-900 text-[11px] sm:text-sm font-bold px-2.5 py-0.5 rounded-full shadow border border-amber-300 whitespace-nowrap">
                          <Coins className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          +{coinValue} coin{coinValue !== 1 ? "s" : ""}
                        </span>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {!allFlipped && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: cards.length * 0.15 + 0.2 }}
                className="mt-10"
              >
                <Button
                  variant="outline"
                  onClick={() => handleFlipAll(flipped)}
                  disabled={isFlippingAll}
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white font-bold gap-3 backdrop-blur-sm text-2xl px-12 py-8 rounded-full h-auto"
                >
                  <ChevronsRight className="w-7 h-7" />
                  {isFlippingAll ? "Revealing…" : "Flip All"}
                </Button>
              </motion.div>
            )}

            {allFlipped && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-12 flex flex-col items-center gap-3"
              >
                {onOpenAnother && (
                  <Button
                    size="lg"
                    variant="secondary"
                    className="text-lg px-10 py-6 rounded-full font-bold hover:scale-105 transition-transform gap-2"
                    onClick={onOpenAnother}
                  >
                    <PackageOpen className="w-5 h-5" /> Open Another Pack
                  </Button>
                )}
                {extraAction}
                <Button
                  size="lg"
                  className="text-xl px-12 py-8 rounded-full shadow-[0_0_30px_rgba(34,197,94,0.5)] hover:scale-105 transition-transform"
                  onClick={onComplete}
                >
                  {onOpenAnother ? "Done" : "Awesome!"}
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
