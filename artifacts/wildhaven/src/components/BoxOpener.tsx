import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import { Sparkles, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FigurineResult {
  id: number;
  name: string;
  imageUrl?: string | null;
  glowColor?: string | null;
  figurineNumber?: number;
  rarityName?: string | null;
  rarityColor?: string | null;
  rarityCoinValue?: number | null;
}

interface BoxInfo {
  id: number;
  name: string;
  coverImageUrl?: string | null;
}

type Phase = "idle" | "shaking" | "lifting" | "revealed";

interface Props {
  box: BoxInfo;
  figurine: FigurineResult;
  isDuplicate: boolean;
  coinsAwarded: number;
  onComplete: () => void;
  boxOpenSoundUrl?: string | null;
  figurineRevealSoundUrl?: string | null;
  isRarest?: boolean;
}

function playAudioUrl(url: string) {
  try {
    const audio = new Audio(url);
    audio.play().catch(() => {});
  } catch { /* ignore */ }
}

export function BoxOpener({ box, figurine, isDuplicate, coinsAwarded, onComplete, boxOpenSoundUrl, figurineRevealSoundUrl, isRarest }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    const handle = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  // Preload figurine image immediately so it's ready when revealed
  useEffect(() => {
    if (figurine.imageUrl) {
      const img = new Image();
      img.src = figurine.imageUrl;
    }
  }, [figurine.imageUrl]);

  const startOpen = () => {
    if (boxOpenSoundUrl) playAudioUrl(boxOpenSoundUrl);
    setPhase("shaking");
    setTimeout(() => setPhase("lifting"), 700);
    setTimeout(() => {
      setPhase("revealed");
      if (figurineRevealSoundUrl) playAudioUrl(figurineRevealSoundUrl);
    }, 1500);
  };

  const rarityColor = figurine.glowColor ?? figurine.rarityColor ?? "#6b7280";

  const confettiColors = isRarest
    ? ["#FFD700", "#FFA500", "#FFE066", "#FFF8DC", "#FFFACD", "#F9A825"]
    : ["#22c55e", "#3b82f6", "#a855f7", "#f97316", "#ec4899", "#14b8a6", "#f59e0b", "#ef4444"];

  const boxImg = box.coverImageUrl ? (
    <img src={box.coverImageUrl} alt={box.name} className="w-full rounded-2xl shadow-2xl" />
  ) : (
    <div className="w-full aspect-square rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
      <Sparkles className="w-16 h-16 text-white/20" />
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm px-4"
    >
      {/* Confetti when revealed */}
      {phase === "revealed" && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          colors={confettiColors}
          numberOfPieces={isRarest ? 600 : 300}
          recycle={false}
          gravity={0.18}
        />
      )}

      <AnimatePresence mode="wait">

        {/* ── Idle ── */}
        {phase === "idle" && (
          <motion.div
            key="idle"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.05, opacity: 0 }}
            transition={{ exit: { duration: 0.2 } }}
            className="flex flex-col items-center gap-6"
          >
            <p className="text-white/70 text-lg font-display">You received a</p>
            <h2 className="text-white text-4xl font-display font-bold text-center">{box.name}</h2>
            <div className="relative w-[min(88vw,520px)]">{boxImg}</div>
            <Button
              onClick={startOpen}
              size="lg"
              className="px-10 py-4 text-lg font-bold rounded-2xl bg-primary hover:bg-primary/90 shadow-lg hover:shadow-primary/30 transition-all"
            >
              Open Box!
            </Button>
          </motion.div>
        )}

        {/* ── Shaking ── */}
        {phase === "shaking" && (
          <motion.div
            key="shaking"
            className="flex flex-col items-center gap-6"
          >
            <div className="w-[min(88vw,520px)]">
              <motion.div
                animate={{ x: [0, -8, 8, -6, 6, -4, 4, 0], rotate: [0, -3, 3, -2, 2, 0] }}
                transition={{ duration: 0.65, ease: "easeInOut" }}
                className="w-full"
              >
                {boxImg}
              </motion.div>
            </div>
            <p className="text-white/60 text-lg font-display animate-pulse">Something's happening…</p>
          </motion.div>
        )}

        {/* ── Lid lifting ── */}
        {phase === "lifting" && (
          <motion.div
            key="lifting"
            className="flex flex-col items-center gap-6"
          >
            <div className="relative w-[min(88vw,520px)]">
              {box.coverImageUrl ? (
                <>
                  {/* Invisible sizer */}
                  <img src={box.coverImageUrl} aria-hidden className="w-full invisible block rounded-2xl" />

                  {/* Body — bottom 80% — fades out */}
                  <motion.img
                    src={box.coverImageUrl}
                    alt=""
                    aria-hidden
                    className="absolute inset-0 w-full h-full object-contain rounded-2xl"
                    style={{ clipPath: "inset(20% 0 0 0 round 1rem)" }}
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    transition={{ delay: 0.5, duration: 0.3 }}
                  />

                  {/* Lid — top 20% — lifts up */}
                  <motion.img
                    src={box.coverImageUrl}
                    alt="Box opening"
                    className="absolute inset-0 w-full h-full object-contain rounded-2xl drop-shadow-2xl"
                    style={{ clipPath: "inset(0 0 80% 0 round 1rem)", transformOrigin: "center bottom" }}
                    initial={{ y: 0, opacity: 1 }}
                    animate={{ y: -140, opacity: 0 }}
                    transition={{ duration: 0.75, ease: [0.2, 0.8, 0.4, 1] }}
                  />
                </>
              ) : (
                <motion.div
                  className="w-full aspect-square rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center"
                  animate={{ opacity: 0, scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Sparkles className="w-16 h-16 text-white/20" />
                </motion.div>
              )}
            </div>
            <p className="text-white/60 text-lg font-display animate-pulse">Here it comes…</p>
          </motion.div>
        )}

        {/* ── Revealed ── */}
        {phase === "revealed" && (
          <motion.div
            key="revealed"
            initial={{ scale: 0.4, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
            className="relative w-full flex flex-col items-center"
          >
            {/* Glow + figurine — fills almost the full screen */}
            <div className="relative flex items-center justify-center">
              <motion.div
                className="absolute rounded-full blur-3xl"
                style={{
                  width: "min(60vw, 55vh)",
                  height: "min(60vw, 55vh)",
                  backgroundColor: rarityColor,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                transition={{ duration: 0.4 }}
              />
              {figurine.imageUrl ? (
                <motion.img
                  src={figurine.imageUrl}
                  alt={figurine.name}
                  className="relative object-contain drop-shadow-2xl rounded-2xl"
                  style={{ width: "min(76vw, 64vh)", height: "min(76vw, 64vh)" }}
                  initial={{ y: 20, scale: 0.85 }}
                  animate={{ y: 0, scale: 1 }}
                  transition={{ delay: 0.05, type: "spring", stiffness: 180 }}
                />
              ) : (
                <div
                  className="relative rounded-2xl flex items-center justify-center"
                  style={{
                    width: "min(76vw, 64vh)",
                    height: "min(76vw, 64vh)",
                    backgroundColor: `${rarityColor}20`,
                    border: `2px solid ${rarityColor}40`,
                  }}
                >
                  <Sparkles className="w-36 h-36" style={{ color: rarityColor }} />
                </div>
              )}
            </div>

            {/* Info + button — compact strip below */}
            <div className="flex flex-col items-center gap-3 text-center mt-3 w-full px-4">
              <div className="flex items-center gap-3 justify-center flex-wrap">
                {figurine.rarityName && (
                  <motion.span
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.15, type: "spring" }}
                    className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white"
                    style={{ backgroundColor: rarityColor }}
                  >
                    {figurine.rarityName}
                  </motion.span>
                )}
                <h2 className="text-white text-2xl font-display font-bold">{figurine.name}</h2>
                {figurine.figurineNumber && (
                  <span className="text-white/50 text-sm">#{String(figurine.figurineNumber).padStart(3, "0")}</span>
                )}
              </div>

              {isDuplicate && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl border",
                    "bg-amber-50 border-amber-200 text-amber-800"
                  )}
                >
                  <Coins className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-bold">Duplicate! +{coinsAwarded} coin{coinsAwarded !== 1 ? "s" : ""}</span>
                </motion.div>
              )}

              <Button
                onClick={onComplete}
                size="lg"
                className="w-full max-w-xs rounded-2xl font-bold text-lg"
              >
                {isDuplicate ? "Collect Coins" : "Add to Collection"}
              </Button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  );
}
