import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

export interface CardRarityEffects {
  surface: string[];
  border: string[];
  glow: string[];
  confetti: string[];
}

export interface CardRarityConfig {
  id: number;
  name: string;
  color: string;
  iconUrl: string | null;
  soundUrl: string | null;
  coinValue: number;
  sortOrder: number;
  effects: CardRarityEffects;
}

const DEFAULT_EFFECTS: CardRarityEffects = { surface: [], border: [], glow: [], confetti: [] };

const BUILTIN_DEFAULTS: Record<string, { effects: CardRarityEffects; color: string; coinValue: number }> = {
  Common:    { color: "#22c55e", coinValue: 1,  effects: { surface: [],          border: [],          glow: [],               confetti: [] } },
  Rare:      { color: "#3b82f6", coinValue: 2,  effects: { surface: [],          border: [],          glow: [],               confetti: [] } },
  Epic:      { color: "#a855f7", coinValue: 4,  effects: { surface: ["sparkle"], border: [],          glow: ["bright-shadow"], confetti: [] } },
  Mythic:    { color: "#64748b", coinValue: 5,  effects: { surface: ["ember"],   border: [],          glow: ["ember-glow"],    confetti: [] } },
  Legendary: { color: "#eab308", coinValue: 10, effects: { surface: [],          border: ["rainbow"], glow: [],               confetti: [] } },
};

/** Normalise any old-format effects object coming from the DB to the new { surface, border, glow, confetti } shape */
function normaliseEffects(raw: unknown): CardRarityEffects {
  if (!raw || typeof raw !== "object") return DEFAULT_EFFECTS;
  const e = raw as Record<string, unknown>;
  if (Array.isArray(e.surface)) {
    return {
      surface: (e.surface as string[]) ?? [],
      border: (e.border as string[]) ?? [],
      glow: (e.glow as string[]) ?? [],
      confetti: (e.confetti as string[]) ?? [],
    };
  }
  // Old format
  const surface: string[] = [];
  const border: string[] = [];
  const glow: string[] = [];
  const confetti: string[] = [];
  if (e.particles === "sparkle") surface.push("sparkle");
  if (e.particles === "ember") surface.push("ember");
  if (e.prismaticBorder === true) border.push("rainbow");
  if (e.emberGlow === true) glow.push("ember-glow");
  if (e.brightShadow === true) glow.push("bright-shadow");
  if (e.confetti === "gold") confetti.push("gold");
  if (e.confetti === "purple") confetti.push("purple");
  return { surface, border, glow, confetti };
}

interface CardRaritiesContextValue {
  rarities: CardRarityConfig[];
  loading: boolean;
  getEffects: (rarityName: string) => CardRarityEffects;
  getColor: (rarityName: string) => string;
  getIconUrl: (rarityName: string) => string | null;
  getSoundUrl: (rarityName: string) => string | null;
  getCoinValue: (rarityName: string) => number;
  refetch: () => void;
}

const CardRaritiesContext = createContext<CardRaritiesContextValue>({
  rarities: [],
  loading: true,
  getEffects: (name) => BUILTIN_DEFAULTS[name]?.effects ?? DEFAULT_EFFECTS,
  getColor: (name) => BUILTIN_DEFAULTS[name]?.color ?? "#6b7280",
  getIconUrl: () => null,
  getSoundUrl: () => null,
  getCoinValue: (name) => BUILTIN_DEFAULTS[name]?.coinValue ?? 1,
  refetch: () => {},
});

export function CardRaritiesProvider({ children }: { children: ReactNode }) {
  const [rarities, setRarities] = useState<CardRarityConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${API}/card-rarities`)
      .then(r => r.json())
      .then((data: CardRarityConfig[]) => {
        if (!cancelled) {
          setRarities(data.map(r => ({ ...r, effects: normaliseEffects(r.effects) })));
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tick]);

  const getEffects = (name: string): CardRarityEffects => {
    const r = rarities.find(x => x.name === name);
    if (r) return normaliseEffects(r.effects);
    return BUILTIN_DEFAULTS[name]?.effects ?? DEFAULT_EFFECTS;
  };

  const getColor = (name: string): string => {
    const r = rarities.find(x => x.name === name);
    return r?.color ?? BUILTIN_DEFAULTS[name]?.color ?? "#6b7280";
  };

  const getIconUrl = (name: string): string | null => {
    const r = rarities.find(x => x.name === name);
    return r?.iconUrl ?? null;
  };

  const getSoundUrl = (name: string): string | null => {
    const r = rarities.find(x => x.name === name);
    return r?.soundUrl ?? null;
  };

  const getCoinValue = (name: string): number => {
    const r = rarities.find(x => x.name === name);
    return r?.coinValue ?? BUILTIN_DEFAULTS[name]?.coinValue ?? 1;
  };

  const refetch = useCallback(() => setTick(t => t + 1), []);

  return (
    <CardRaritiesContext.Provider value={{ rarities, loading, getEffects, getColor, getIconUrl, getSoundUrl, getCoinValue, refetch }}>
      {children}
    </CardRaritiesContext.Provider>
  );
}

export function useCardRarities() {
  return useContext(CardRaritiesContext);
}
