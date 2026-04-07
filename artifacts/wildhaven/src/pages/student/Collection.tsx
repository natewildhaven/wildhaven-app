import { useState, useMemo, useEffect, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut, Eye, EyeOff, X, Package, Loader2, Coins, Sparkles, ShoppingCart, Trophy, ArrowLeft,
} from "lucide-react";
import epicIcon from "@assets/Epic_1774130170598.png";
import mythicIcon from "@assets/Mythic_1774130170598.png";
import commonIcon from "@assets/common_1775387198745.png";
import rareIcon from "@assets/Rare_1775387198745.png";
import packIcon from "@assets/photo_1775322249804.png";
import coinsIcon from "@assets/money_1775322249805.png";
import flashCardIcon from "@assets/flash-card_1775323268519.png";
import trophyIcon from "@assets/trophy_1775323416367.png";
import giftBoxIcon from "@assets/gift-box_1775323416367.png";
import legendaryIcon from "@assets/Legendary_1774130170598.png";
import logoImg from "@assets/Logo_ONLY_(1)_1774133205744.png";
import meadowBg from "@assets/Flowery_Meadow_1774133232233.jpg";
import { useGetStudentCollection, useListCards, useListPacks } from "@workspace/api-client-react";
import { useSettings } from "@/hooks/use-settings";
import { useCardRarities } from "@/contexts/CardRaritiesContext";
import { useCardTypes } from "@/contexts/CardTypesContext";
import { useToast } from "@/hooks/use-toast";
import { StudentCard, MissingCard, CardLightbox } from "@/components/CollectibleCard";
import { PackOpener } from "@/components/PackOpener";
import { BoxOpener } from "@/components/BoxOpener";
import { SpendCoinsShop } from "@/components/SpendCoinsShop";
import { Card } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, metallicFilterStyle } from "@/lib/utils";

const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";


type GridItem =
  | { type: "owned"; card: Card; packName: string | undefined; packColor: string | null | undefined; packBackUrl: string | null | undefined; count: number }
  | { type: "missing"; card: Card; packBackUrl: string | null | undefined };

interface BoxInventoryEntry { boxId: number; count: number; boxName?: string | null; boxCoverImageUrl?: string | null; }
interface Figurine { figurineId: number; name: string; imageUrl?: string | null; glowColor?: string | null; figurineNumber?: number; boxId?: number; rarityId?: number; rarityName?: string | null; rarityColor?: string | null; awardedAt?: string; }
interface AllFigurine { id: number; name: string; imageUrl?: string | null; glowColor?: string | null; figurineNumber?: number; boxId: number; rarityId?: number; rarityName?: string | null; rarityColor?: string | null; }
interface MysteryBox { id: number; name: string; coverImageUrl?: string | null; coinPrice: number; }
interface BoxResult { figurine: { id: number; name: string; imageUrl?: string | null; glowColor?: string | null; figurineNumber?: number; rarityName?: string | null; rarityColor?: string | null; rarityCoinValue?: number | null }; isDuplicate: boolean; coinsAwarded: number; remainingCoins: number; }

type MainTab = "cards" | "figurines" | "achievements";
const RARITY_RANK: Record<string, number> = { Common: 0, Rare: 1, Epic: 2, Mythic: 3, Legendary: 4 };

export default function StudentCollection() {
  const [, params] = useRoute("/collection/:id");
  const studentId = Number(params?.id);
  const [, setLocation] = useLocation();
  const fromTeacher = useMemo(() => new URLSearchParams(window.location.search).get("from") === "teacher", []);
  const settings = useSettings();
  const bgUrl = settings.backgroundImageUrl || meadowBg;
  const { rarities: contextRarities } = useCardRarities();
  const { types: cardTypes } = useCardTypes();

  // Card tab state — empty Set = "show all"; non-empty = show only these
  const [selectedPacks, setSelectedPacks] = useState<Set<string>>(new Set());
  const [selectedRarities, setSelectedRarities] = useState<Set<string>>(new Set());
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());

  const toggleFilter = (set: Set<string>, value: string): Set<string> => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value); else next.add(value);
    return next;
  };
  const [showMissing, setShowMissing] = useState(false);
  const [lightboxCard, setLightboxCard] = useState<{ card: Card; packName?: string; packColor?: string | null; count?: number } | null>(null);

  // Main tab
  const [mainTab, setMainTab] = useState<MainTab>("cards");

  // Inventory state
  const [choicePackCount, setChoicePackCount] = useState(0);
  const [coinsCount, setCoinsCount] = useState(0);
  const [boxInventory, setBoxInventory] = useState<BoxInventoryEntry[]>([]);

  // Shop
  const [showShop, setShowShop] = useState(false);

  // Pack opening
  const [showPackPicker, setShowPackPicker] = useState(false);
  const [openingPack, setOpeningPack] = useState<{ id: number; name: string; color: string | null; coverImageUrl?: string | null; cardBackImageUrl?: string | null } | null>(null);
  const [openedCards, setOpenedCards] = useState<Card[]>([]);
  const [openedDuplicateIds, setOpenedDuplicateIds] = useState<number[]>([]);
  const [isOpeningInventory, setIsOpeningInventory] = useState(false);

  // Box opening
  const [openingBox, setOpeningBox] = useState<MysteryBox | null>(null);
  const [boxResult, setBoxResult] = useState<BoxResult | null>(null);
  const [isOpeningBox, setIsOpeningBox] = useState(false);

  // Figurine collection
  const [ownedFigurines, setOwnedFigurines] = useState<Figurine[]>([]);
  const [allFigurines, setAllFigurines] = useState<AllFigurine[]>([]);
  const [mysteryBoxes, setMysteryBoxes] = useState<MysteryBox[]>([]);
  const [figurineBoxFilter, setFigurineBoxFilter] = useState<number | "all">("all");
  const [figurineRarityFilter, setFigurineRarityFilter] = useState<string>("all");
  const [showMissingFigurines, setShowMissingFigurines] = useState(true);

  // Achievements
  interface EarnedAchievement { achievementId: number; earnedAt: string }
  interface AchievementDef { id: number; name: string; description?: string | null; imageUrl?: string | null }
  const [earnedAchievements, setEarnedAchievements] = useState<EarnedAchievement[]>([]);
  const [allAchievements, setAllAchievements] = useState<AchievementDef[]>([]);
  const { toast } = useToast();

  const fetchAchievements = useCallback(async () => {
    if (!studentId) return;
    const [earnedRes, allRes] = await Promise.all([
      fetch(`${API}/students/${studentId}/achievements`).then(r => r.json()),
      fetch(`${API}/achievements`).then(r => r.json()),
    ]);
    setEarnedAchievements(earnedRes);
    setAllAchievements(allRes);
  }, [studentId]);

  useEffect(() => { fetchAchievements(); }, [fetchAchievements]);

  const checkAchievements = useCallback(async () => {
    if (!studentId) return;
    try {
      const res = await fetch(`${API}/students/${studentId}/achievements/check`, { method: "POST" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.newlyEarned && data.newlyEarned.length > 0) {
        for (const a of data.newlyEarned) {
          toast({ title: `🏆 Achievement Unlocked!`, description: a.name });
        }
        fetchAchievements();
      }
    } catch { /* silent */ }
  }, [studentId, toast, fetchAchievements]);

  const fetchAll = useCallback(async () => {
    if (!studentId) return;
    try {
      const [invRes, boxInvRes, ownedFigRes, allFigRes, boxesRes] = await Promise.all([
        fetch(`${API}/students/${studentId}/inventory`).then(r => r.json()),
        fetch(`${API}/students/${studentId}/box-inventory`).then(r => r.json()),
        fetch(`${API}/students/${studentId}/figurines`).then(r => r.json()),
        fetch(`${API}/mystery-boxes`).then(async boxesData => {
          const boxes: MysteryBox[] = await boxesData.json();
          const figPromises = boxes.map(b => fetch(`${API}/mystery-boxes/${b.id}/figurines`).then(r => r.json()));
          const figArrays: AllFigurine[][] = await Promise.all(figPromises);
          return figArrays.flat();
        }),
        fetch(`${API}/mystery-boxes`).then(r => r.json()),
      ]);
      setChoicePackCount(invRes.count ?? 0);
      setCoinsCount(invRes.coins ?? 0);
      setBoxInventory((boxInvRes as BoxInventoryEntry[]).filter((e: BoxInventoryEntry) => e.count > 0));
      setOwnedFigurines(ownedFigRes as Figurine[]);
      setAllFigurines(allFigRes);
      setMysteryBoxes(boxesRes as MysteryBox[]);
    } catch { /* silent */ }
  }, [studentId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleOpenChoicePack = async (pack: { id: number; name: string; color: string | null; coverImageUrl?: string | null; cardBackImageUrl?: string | null }) => {
    if (isOpeningInventory) return;
    setIsOpeningInventory(true);
    setShowPackPicker(false);
    setOpeningPack(pack);
    const backUrl = pack.cardBackImageUrl ?? pack.coverImageUrl;
    if (backUrl) { const img = new window.Image(); img.src = backUrl; }
    try {
      const res = await fetch(`${API}/students/${studentId}/inventory/open`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId: pack.id }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setOpenedCards(data.cards ?? []);
      setOpenedDuplicateIds(data.duplicateCardIds ?? []);
      setChoicePackCount(data.remainingCount ?? 0);
      setCoinsCount(data.remainingCoins ?? coinsCount);
    } catch { setOpeningPack(null); setIsOpeningInventory(false); }
  };

  const handleOpenBox = async (boxEntry: BoxInventoryEntry) => {
    if (isOpeningBox) return;
    setIsOpeningBox(true);
    const boxInfo = mysteryBoxes.find(b => b.id === boxEntry.boxId);
    if (!boxInfo) { setIsOpeningBox(false); return; }
    setOpeningBox(boxInfo);
    try {
      const res = await fetch(`${API}/students/${studentId}/box-inventory/open`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boxId: boxEntry.boxId }),
      });
      if (!res.ok) throw new Error("Failed");
      const data: BoxResult = await res.json();
      setBoxResult(data);
      setCoinsCount(data.remainingCoins);
    } catch { setOpeningBox(null); setIsOpeningBox(false); }
  };

  // Achievement modal
  const [achievementModal, setAchievementModal] = useState<{ id: number; name: string; description?: string | null; imageUrl?: string | null; earned: boolean } | null>(null);

  const { data: collection, isLoading: isColLoading } = useGetStudentCollection(studentId);
  const { data: allPacks, isLoading: isPacksLoading } = useListPacks();
  const { data: allCards, isLoading: isCardsLoading } = useListCards();
  // All cards (same fetch) for computing rarity totals
  const allCardsForStats = allCards;

  const packMap = useMemo(() => {
    if (!allPacks) return new Map<number, { name: string; color: string | null; cardBackImageUrl: string | null }>();
    return new Map(allPacks.map(p => [p.id, { name: p.name, color: p.color ?? null, cardBackImageUrl: p.cardBackImageUrl }]));
  }, [allPacks]);

  const rarityTotals = useMemo(() => {
    if (!allCardsForStats) return {} as Record<string, number>;
    const map: Record<string, number> = {};
    for (const c of allCardsForStats) {
      if (c.rarity) map[c.rarity] = (map[c.rarity] ?? 0) + 1;
    }
    return map;
  }, [allCardsForStats]);

  const cardCountMap = useMemo(() => {
    if (!collection) return new Map<number, number>();
    const map = new Map<number, number>();
    for (const e of collection.entries) map.set(e.cardId, (map.get(e.cardId) ?? 0) + 1);
    return map;
  }, [collection]);

  const ownedCardIds = useMemo(() => {
    if (!collection) return new Set<number>();
    return new Set(collection.entries.map(e => e.cardId));
  }, [collection]);

  // Preload all owned card images into browser cache as soon as data arrives
  useEffect(() => {
    if (!allCards || !collection) return;
    const owned = new Set(collection.entries.map(e => e.cardId));
    const urls: string[] = [];
    for (const c of allCards) {
      if (c.imageUrl && owned.has(c.id)) urls.push(c.imageUrl);
    }
    if (allPacks) {
      for (const p of allPacks) {
        if (p.coverImageUrl) urls.push(p.coverImageUrl);
        if (p.cardBackImageUrl) urls.push(p.cardBackImageUrl);
      }
    }
    urls.forEach(url => { const img = new window.Image(); img.src = url; });
  }, [allCards, collection, allPacks]);

  const rarityOwnedCounts = useMemo(() => {
    if (!allCardsForStats) return {} as Record<string, number>;
    const map: Record<string, number> = {};
    for (const c of allCardsForStats) {
      if (c.rarity && ownedCardIds.has(c.id)) map[c.rarity] = (map[c.rarity] ?? 0) + 1;
    }
    return map;
  }, [allCardsForStats, ownedCardIds]);

  const gridItems = useMemo<GridItem[]>(() => {
    if (!allCards) return [];
    const filtered = allCards.filter(c => {
      if (selectedPacks.size > 0 && !selectedPacks.has(c.packId.toString())) return false;
      if (selectedRarities.size > 0 && !selectedRarities.has(c.rarity ?? "")) return false;
      if (selectedTypes.size > 0 && !(c as Card & { tags?: string[] | null }).tags?.some(t => selectedTypes.has(t))) return false;
      return true;
    });
    const items: GridItem[] = [];
    for (const card of filtered) {
      const packInfo = packMap.get(card.packId);
      if (ownedCardIds.has(card.id)) {
        items.push({ type: "owned", card, packName: packInfo?.name, packColor: packInfo?.color, packBackUrl: packInfo?.cardBackImageUrl, count: cardCountMap.get(card.id) ?? 1 });
      } else if (showMissing) {
        items.push({ type: "missing", card, packBackUrl: packInfo?.cardBackImageUrl });
      }
    }
    items.sort((a, b) => {
      const x = a.card.cardNumber, y = b.card.cardNumber;
      const xNum = /^\d+$/.test(x), yNum = /^\d+$/.test(y);
      if (xNum && yNum) return parseInt(x) - parseInt(y);
      if (xNum) return -1;
      if (yNum) return 1;
      return x.localeCompare(y, undefined, { numeric: true, sensitivity: "base" });
    });
    return items;
  }, [allCards, ownedCardIds, showMissing, selectedPacks, selectedRarities, selectedTypes, packMap, cardCountMap]);

  const ownedCount = gridItems.filter(i => i.type === "owned").length;
  const missingCount = gridItems.filter(i => i.type === "missing").length;

  // Figurines data
  const ownedFigurineIds = useMemo(() => new Set(ownedFigurines.map(f => f.figurineId)), [ownedFigurines]);

  const displayedFigurines = useMemo(() => {
    let filtered = figurineBoxFilter === "all" ? allFigurines : allFigurines.filter(f => f.boxId === figurineBoxFilter);
    if (figurineRarityFilter !== "all") filtered = filtered.filter(f => f.rarityName === figurineRarityFilter);
    if (!showMissingFigurines) filtered = filtered.filter(f => ownedFigurineIds.has(f.id));
    return [...filtered].sort((a, b) => (a.figurineNumber ?? 0) - (b.figurineNumber ?? 0));
  }, [allFigurines, figurineBoxFilter, figurineRarityFilter, showMissingFigurines, ownedFigurineIds]);

  // Box mastery
  const boxMastery = useMemo(() => {
    return mysteryBoxes.map(box => {
      const total = allFigurines.filter(f => f.boxId === box.id).length;
      const owned = ownedFigurines.filter(f => f.boxId === box.id).length;
      return { boxId: box.id, boxName: box.name, total, owned };
    });
  }, [mysteryBoxes, allFigurines, ownedFigurines]);

  const totalBoxInventory = boxInventory.reduce((s, e) => s + e.count, 0);

  const isRarestFigurine = useMemo(() => {
    if (!boxResult || !openingBox) return false;
    const boxFigs = allFigurines.filter(f => f.boxId === openingBox.id);
    if (boxFigs.length === 0) return false;
    const maxRank = Math.max(...boxFigs.map(f => RARITY_RANK[f.rarityName ?? ""] ?? 0));
    return (RARITY_RANK[boxResult.figurine.rarityName ?? ""] ?? 0) >= maxRank;
  }, [boxResult, openingBox, allFigurines]);

  const handleLogout = () => {
    sessionStorage.removeItem("wildhaven_student_id");
    setLocation("/");
  };

  const isLoading = isColLoading || isPacksLoading || isCardsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8 flex flex-col gap-8">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {[...Array(10)].map((_, i) => <Skeleton key={i} className="aspect-[3/4] w-full rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!collection) return <div className="p-8 text-center"><h1 className="text-2xl font-display">Student not found</h1></div>;

  const overallProgress = collection.totalCards > 0 ? (collection.uniqueCards / collection.totalCards) * 100 : 0;

  return (
    <div className="min-h-screen pb-20" style={{ backgroundImage: `url(${bgUrl})`, backgroundSize: "cover", backgroundAttachment: "fixed", backgroundPosition: "center" }}>

      {/* Pack Picker Overlay */}
      <AnimatePresence>
        {showPackPicker && (
          <motion.div key="pack-picker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-sm overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 sticky top-0 bg-black/60 backdrop-blur-sm border-b border-white/10">
              <h2 className="text-white text-2xl font-display font-bold">Choose a Pack to Open</h2>
              <button onClick={() => setShowPackPicker(false)} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center px-6 py-10">
              {(allPacks ?? []).filter(p => (p as typeof p & { available?: boolean }).available !== false).length === 0 ? (
                <div className="py-20 text-center text-white/60 text-lg font-display">No packs are available right now.</div>
              ) : (
                <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 max-w-5xl w-full mx-auto">
                  {(allPacks ?? []).filter(p => (p as typeof p & { available?: boolean }).available !== false).map(pack => (
                    <button key={pack.id} onClick={() => handleOpenChoicePack({ id: pack.id, name: pack.name, color: pack.color ?? null, coverImageUrl: pack.coverImageUrl, cardBackImageUrl: pack.cardBackImageUrl })}
                      className="group flex flex-col items-center gap-3 text-center focus:outline-none">
                      <div className="relative w-full rounded-2xl overflow-hidden shadow-xl group-hover:shadow-[0_0_40px_rgba(255,255,255,0.25)] group-hover:scale-105 transition-all duration-200 border-2 border-white/10 group-hover:border-white/30">
                        {pack.coverImageUrl ? (
                          <>
                            <img src={pack.coverImageUrl} aria-hidden className="w-full block invisible" loading="lazy" />
                            <img src={pack.coverImageUrl} alt={pack.name} className="absolute inset-0 w-full h-full object-contain" loading="lazy" />
                          </>
                        ) : (
                          <div className="w-full aspect-[3/4] flex items-center justify-center bg-white/10"><Package className="w-16 h-16 text-white/30" /></div>
                        )}
                      </div>
                      <p className="font-bold text-lg font-display text-white leading-tight">{pack.name}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pack Loading State */}
      <AnimatePresence>
        {openingPack && openedCards.length === 0 && (
          <motion.div key="pack-loading" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="relative w-48 sm:w-64">
              {openingPack.coverImageUrl ? (
                <img src={openingPack.coverImageUrl} alt={openingPack.name} className="w-full rounded-2xl shadow-2xl" />
              ) : (
                <div className="w-full aspect-[3/4] rounded-2xl bg-white/10 flex items-center justify-center">
                  <Package className="w-20 h-20 text-white/30" />
                </div>
              )}
              <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-black/40">
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              </div>
            </div>
            <p className="mt-6 text-white text-xl font-display font-bold animate-pulse">Opening {openingPack.name}…</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pack Opener */}
      {openingPack && openedCards.length > 0 && (
        <PackOpener
          cards={openedCards}
          packCoverUrl={openingPack.coverImageUrl ?? undefined}
          cardBackUrl={openingPack.cardBackImageUrl ?? undefined}
          packColor={openingPack.color}
          backgroundImageUrl={settings.backgroundImageUrl}
          packOpenSoundUrl={settings.packOpenSoundUrl}
          cardFlipSoundUrl={settings.cardFlipSoundUrl}
          duplicateCardIds={openedDuplicateIds}
          rarityCoins={{ Common: settings.coinValueCommon, Rare: settings.coinValueRare, Epic: settings.coinValueEpic, Mythic: settings.coinValueMythic, Legendary: settings.coinValueLegendary }}
          onComplete={() => { setOpeningPack(null); setOpenedCards([]); setOpenedDuplicateIds([]); setIsOpeningInventory(false); fetchAll(); checkAchievements(); }}
        />
      )}

      {/* Box Loading State */}
      <AnimatePresence>
        {openingBox && !boxResult && (
          <motion.div key="box-loading" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="relative w-48 sm:w-56">
              {openingBox.coverImageUrl ? (
                <img src={openingBox.coverImageUrl} alt={openingBox.name} className="w-full rounded-2xl shadow-2xl" />
              ) : (
                <div className="w-full aspect-square rounded-2xl bg-white/10 flex items-center justify-center">
                  <Sparkles className="w-20 h-20 text-white/30" />
                </div>
              )}
              <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-black/40">
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              </div>
            </div>
            <p className="mt-6 text-white text-xl font-display font-bold animate-pulse">Opening {openingBox.name}…</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Box Opener Animation */}
      <AnimatePresence>
        {openingBox && boxResult && (
          <BoxOpener
            box={openingBox}
            figurine={boxResult.figurine}
            isDuplicate={boxResult.isDuplicate}
            coinsAwarded={boxResult.coinsAwarded}
            onComplete={() => { setOpeningBox(null); setBoxResult(null); setIsOpeningBox(false); fetchAll(); checkAchievements(); }}
            boxOpenSoundUrl={settings.boxOpenSoundUrl}
            figurineRevealSoundUrl={settings.figurineRevealSoundUrl}
            isRarest={isRarestFigurine}
          />
        )}
      </AnimatePresence>

      {/* Spend Coins Shop */}
      <AnimatePresence>
        {showShop && (
          <SpendCoinsShop
            studentId={studentId}
            coins={coinsCount}
            onClose={() => setShowShop(false)}
            onPurchaseComplete={(result) => {
              setCoinsCount(result.remainingCoins);
              if (result.type === "box" && !result.savedToInventory && result.figurine) {
                const box = mysteryBoxes.find(b => b.id === result.boxId);
                if (box) {
                  setOpeningBox(box);
                  setBoxResult({
                    figurine: result.figurine,
                    isDuplicate: result.isDuplicate ?? false,
                    coinsAwarded: result.coinsAwarded ?? 0,
                    remainingCoins: result.remainingCoins,
                  });
                }
              }
              if (result.type === "pack" && !result.savedToInventory && result.packId && result.cards) {
                // Cards already drawn atomically by the shop endpoint — use them directly
                const pack = allPacks?.find(p => p.id === result.packId);
                if (pack) {
                  setOpeningPack({ id: pack.id, name: pack.name, color: pack.color ?? null, coverImageUrl: pack.coverImageUrl, cardBackImageUrl: pack.cardBackImageUrl });
                  setIsOpeningInventory(true);
                  setOpenedCards(result.cards as typeof openedCards);
                  setOpenedDuplicateIds(result.duplicateCardIds ?? []);
                }
              }
              fetchAll();
            }}
          />
        )}
      </AnimatePresence>

      {/* Lightbox */}
      {lightboxCard && (
        <CardLightbox card={lightboxCard.card} packName={lightboxCard.packName} packColor={lightboxCard.packColor} duplicateCount={lightboxCard.count} onClose={() => setLightboxCard(null)} />
      )}

      {/* Achievement Modal */}
      {achievementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setAchievementModal(null)}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative bg-white rounded-3xl shadow-2xl p-8 flex flex-col items-center gap-4 max-w-2xl w-full text-center"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setAchievementModal(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500">
              <X className="w-4 h-4" />
            </button>
            <div className="relative w-72 h-72">
              {achievementModal.imageUrl ? (
                <img
                  src={achievementModal.imageUrl}
                  alt={achievementModal.name}
                  className="w-full h-full object-contain"
                  style={{ filter: achievementModal.earned ? "none" : "brightness(0)" }}
                />
              ) : (
                <div className={`w-full h-full rounded-2xl flex items-center justify-center ${achievementModal.earned ? "bg-yellow-50 border-2 border-yellow-200" : "bg-slate-900"}`}>
                  <Trophy className="w-20 h-20" style={{ filter: achievementModal.earned ? "none" : "brightness(0) invert(0)" }} />
                </div>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold">{achievementModal.name}</h2>
              {!achievementModal.earned && (
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-0.5">Not yet unlocked</p>
              )}
              {achievementModal.description && (
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{achievementModal.description}</p>
              )}
              {!achievementModal.description && !achievementModal.earned && (
                <p className="text-muted-foreground mt-2 text-sm italic">Keep collecting to unlock this achievement!</p>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Header */}
      <header className="bg-primary text-primary-foreground pb-12 pt-6 px-4 md:px-8 shadow-md relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: `url(${bgUrl})`, backgroundSize: "cover", backgroundPosition: "center" }} />
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <img src={logoImg} className="w-12 h-12" alt="Logo" />
              <h1 className="text-3xl md:text-4xl font-display font-bold tracking-wide">Wildhaven Cards</h1>
            </div>
            <h2 className="text-xl text-primary-foreground/90 font-medium">
              Welcome back, <span className="font-bold">{collection.student.name}</span>!
            </h2>
          </div>
          {fromTeacher ? (
            <Button variant="secondary" onClick={() => setLocation("/teacher/dashboard")} className="font-bold shadow-sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> Teacher Portal
            </Button>
          ) : (
            <Button variant="secondary" onClick={handleLogout} className="font-bold shadow-sm">
              <LogOut className="mr-2 h-4 w-4" /> Exit
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 -mt-8 relative z-20">
        {/* Progress Dashboard */}
        <div className="bg-card rounded-2xl p-6 md:p-8 shadow-xl border border-border/50 mb-6 flex flex-col lg:flex-row gap-8">
          <div className="flex-1 flex flex-col gap-4">
            <div className="flex justify-between items-end">
              <h3 className="text-2xl font-display font-bold drop-shadow-sm">Collection Progress</h3>
              <span className="font-bold text-foreground/70 bg-muted/60 rounded-lg px-2 py-0.5 text-sm">{collection.uniqueCards} / {collection.totalCards} Cards</span>
            </div>
            <div className="relative h-4 w-full overflow-hidden rounded-full bg-secondary/60">
              <div
                className="h-full rounded-full relative overflow-hidden progress-bar-fill"
                style={{ width: `${overallProgress}%`, transition: "width 0.8s ease" }}
              >
                <div className="progress-shimmer absolute inset-0" />
              </div>
            </div>

            {/* Counter rows */}
            <div className="flex flex-col gap-2">

            {/* Row 1: Rarity counters — all rarities from settings */}
            {(() => {
              const staticIconMap: Record<string, string> = { Common: commonIcon, Rare: rareIcon, Epic: epicIcon, Mythic: mythicIcon, Legendary: legendaryIcon };
              const rarityList = contextRarities.length > 0
                ? contextRarities
                : [
                    { name: "Common",    color: "#6b7280", iconUrl: null, sortOrder: 0 },
                    { name: "Rare",      color: "#3b82f6", iconUrl: null, sortOrder: 1 },
                    { name: "Epic",      color: "#a855f7", iconUrl: null, sortOrder: 2 },
                    { name: "Mythic",    color: "#64748b", iconUrl: null, sortOrder: 3 },
                    { name: "Legendary", color: "#eab308", iconUrl: null, sortOrder: 4 },
                  ] as typeof contextRarities;
              return (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {rarityList.map(r => {
                    const iconSrc = r.iconUrl ?? staticIconMap[r.name] ?? null;
                    const color = r.color;
                    const owned = rarityOwnedCounts[r.name] ?? 0;
                    const total = rarityTotals[r.name] ?? 0;
                    return (
                      <div key={r.name} className="border rounded-xl p-3 flex flex-col items-center gap-1.5 flex-1 min-w-[76px]"
                        style={{ backgroundColor: color + "18", borderColor: color + "55", color }}>
                        {iconSrc ? (
                          <img src={iconSrc} alt={r.name} className="w-10 h-10 object-contain drop-shadow-md" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg border-2 border-dashed opacity-40" style={{ borderColor: color }} />
                        )}
                        <div className="text-center min-w-0">
                          <p className="text-xs font-bold opacity-70 leading-tight">{r.name}</p>
                          <p className="font-display font-bold leading-tight">
                            <span className="text-xl">{owned}</span>
                            {total > 0 && <span className="text-sm opacity-60">/{total}</span>}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Row 2: Packs + Coins */}
            <div className="grid grid-cols-2 gap-2">
              {/* Card Packs */}
              <div className="flex items-center justify-between bg-primary/8 border border-primary/20 rounded-xl p-3 gap-3">
                <img src={packIcon} alt="Card Packs" className="w-12 h-12 object-contain shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-muted-foreground leading-tight">Awarded Card Packs</p>
                  <p className="text-xl font-display font-bold text-primary leading-tight">{choicePackCount}</p>
                </div>
                {choicePackCount > 0 && (
                  <button
                    onClick={() => setShowPackPicker(true)}
                    disabled={isOpeningInventory}
                    className="shrink-0 px-2.5 py-1 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-60"
                  >
                    Open
                  </button>
                )}
              </div>
              {/* Coins */}
              <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl p-3 gap-3">
                <img src={coinsIcon} alt="Coins" className="w-12 h-12 object-contain shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-muted-foreground leading-tight">Coins</p>
                  <p className="text-xl font-display font-bold text-amber-600 leading-tight">{coinsCount}</p>
                </div>
                <button
                  onClick={() => setShowShop(true)}
                  className="shrink-0 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 active:scale-95 transition-all"
                >
                  Spend Coins
                </button>
              </div>
            </div>

            </div>{/* end counter rows wrapper */}

            {/* Box inventory */}
            {boxInventory.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {boxInventory.map(entry => (
                  <div key={entry.boxId} className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-xl px-3 py-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span className="font-bold text-purple-700">{entry.count}×</span>
                    <span className="text-sm text-purple-800 font-medium">{entry.boxName ?? "Mystery Box"}</span>
                    <button
                      onClick={() => handleOpenBox(entry)}
                      disabled={isOpeningBox}
                      className="ml-1 px-2 py-0.5 rounded-lg bg-purple-500 text-white text-xs font-bold hover:bg-purple-600 disabled:opacity-60 transition-colors"
                    >
                      Open
                    </button>
                  </div>
                ))}
              </div>
            )}

          </div>

          {/* Right panel — Pack Mastery always */}
          <div className="w-full lg:w-72 flex flex-col gap-2 max-h-64 overflow-y-auto pr-2">
            <h4 className="font-display font-bold text-lg mb-1">Pack Mastery</h4>
            {collection.packProgress.map(p => {
              const pct = p.totalCards > 0 ? Math.min(100, Math.round((p.uniqueOwned / p.totalCards) * 100)) : 0;
              return (
                <div key={p.packId} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.packColor }} />
                      {p.packName}
                    </span>
                    <span className="text-muted-foreground shrink-0 ml-1">{p.uniqueOwned}/{p.totalCards}</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: p.packColor }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tabs: Cards | Mystery Collectibles | Achievements */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMainTab("cards")}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm",
              mainTab === "cards" ? "bg-primary text-white" : "bg-card text-muted-foreground border border-border hover:border-primary/30"
            )}
          >
            <img src={flashCardIcon} alt="Cards" className="w-5 h-5 object-contain" /> Cards
          </button>
          <button
            onClick={() => setMainTab("figurines")}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm",
              mainTab === "figurines" ? "bg-purple-600 text-white" : "bg-card text-muted-foreground border border-border hover:border-purple-300"
            )}
          >
            <img src={giftBoxIcon} alt="Collectibles" className="w-5 h-5 object-contain" /> Collectibles
          </button>
          <button
            onClick={() => { setMainTab("achievements"); checkAchievements(); }}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm",
              mainTab === "achievements" ? "bg-yellow-500 text-white" : "bg-card text-muted-foreground border border-border hover:border-yellow-300"
            )}
          >
            <img src={trophyIcon} alt="Achievements" className="w-5 h-5 object-contain" /> Achievements
          </button>
        </div>

        {/* CARDS TAB */}
        {mainTab === "cards" && (
          <div className="bg-card rounded-xl border border-border/50 shadow-sm p-4 mb-6 flex flex-col gap-3">
            {/* My Cards header */}
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-display font-bold text-foreground">My Card Gallery</h3>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-2">
              {/* Show Missing toggle */}
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => setShowMissing(v => !v)}
                  className={cn("flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold border transition-all whitespace-nowrap",
                    showMissing ? "bg-primary text-white border-primary" : "bg-muted text-muted-foreground border-border hover:border-primary/50 hover:text-primary")}>
                  {showMissing ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  Show Missing Cards
                </button>
              </div>

              {/* Pack pills */}
              {allPacks && allPacks.length > 0 && (
                <div className="flex gap-2 flex-wrap items-center">
                  <span className="text-xs font-semibold text-muted-foreground shrink-0">Pack:</span>
                  <button
                    onClick={() => setSelectedPacks(new Set())}
                    className="px-3 py-1 rounded-full text-xs font-bold border transition-all"
                    style={selectedPacks.size === 0
                      ? { background: "#64748b", color: "#fff", borderColor: "#64748b" }
                      : { borderColor: "#64748b44", color: "#64748b", background: "#64748b11" }}
                  >
                    All Packs
                  </button>
                  {allPacks.map(p => {
                    const active = selectedPacks.has(p.id.toString());
                    const color = p.color ?? "#64748b";
                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPacks(prev => toggleFilter(prev, p.id.toString()))}
                        className="px-3 py-1 rounded-full text-xs font-bold border transition-all"
                        style={active
                          ? { background: color, color: "#fff", borderColor: color }
                          : { backgroundColor: color + "22", borderColor: color, color: color }}
                      >
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Rarity pills */}
              <div className="flex gap-2 flex-wrap items-center">
                <span className="text-xs font-semibold text-muted-foreground shrink-0">Rarity:</span>
                <button
                  onClick={() => setSelectedRarities(new Set())}
                  className="px-3 py-1 rounded-full text-xs font-bold border transition-all"
                  style={selectedRarities.size === 0
                    ? { background: "#64748b", color: "#fff", borderColor: "#64748b" }
                    : { borderColor: "#64748b44", color: "#64748b", background: "#64748b11" }}
                >
                  All Rarities
                </button>
                {[...contextRarities].sort((a, b) => a.sortOrder - b.sortOrder).map(r => (
                  <button
                    key={r.name}
                    onClick={() => setSelectedRarities(prev => toggleFilter(prev, r.name))}
                    className="px-3 py-1 rounded-full text-xs font-bold border transition-all"
                    style={metallicFilterStyle(r.color, selectedRarities.has(r.name))}
                  >
                    {r.name}
                  </button>
                ))}
              </div>

              {/* Type pills (only when types are configured) */}
              {cardTypes.length > 0 && (
                <div className="flex gap-2 flex-wrap items-center">
                  <span className="text-xs font-semibold text-muted-foreground shrink-0">Type:</span>
                  <button
                    onClick={() => setSelectedTypes(new Set())}
                    className="px-3 py-1 rounded-full text-xs font-bold border transition-all"
                    style={selectedTypes.size === 0
                      ? { background: "#64748b", color: "#fff", borderColor: "#64748b" }
                      : { borderColor: "#64748b44", color: "#64748b", background: "#64748b11" }}
                  >
                    All Types
                  </button>
                  {[...cardTypes].sort((a, b) => a.sortOrder - b.sortOrder).map(t => {
                    const active = selectedTypes.has(t.name);
                    return (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTypes(prev => toggleFilter(prev, t.name))}
                        className="px-3 py-1 rounded-full text-xs font-bold border transition-all"
                        style={active
                          ? { background: t.color, color: "#fff", borderColor: t.color }
                          : { backgroundColor: t.color + "22", borderColor: t.color, color: t.color }}
                      >
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t" />

            {/* Card grid with faded white bg */}
            {gridItems.length > 0 ? (
              <div className="rounded-xl bg-white/20 p-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  <AnimatePresence>
                    {gridItems.map((item, i) => (
                      <motion.div key={`${item.type}-${item.card.id}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.08, delay: 0 } }} transition={{ delay: i * 0.02 }}>
                        {item.type === "owned" ? (
                          <StudentCard card={item.card} packName={item.packName} packColor={item.packColor} duplicateCount={item.count}
                            onClick={() => setLightboxCard({ card: item.card, packName: item.packName, packColor: item.packColor, count: item.count })} />
                        ) : (
                          <MissingCard cardNumber={item.card.cardNumber} cardBackUrl={item.packBackUrl ?? undefined} />
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-xl font-display font-bold text-foreground/60">No cards yet!</p>
                <p className="text-muted-foreground mt-2">Open a pack to start your collection.</p>
              </div>
            )}
          </div>
        )}

        {/* FIGURINES TAB */}
        {mainTab === "figurines" && (
          <>
            {/* Filters */}
            <div className="bg-card rounded-xl border border-border/50 shadow-sm p-4 mb-6 flex flex-col gap-3">
              {/* My Collectibles Gallery header */}
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-display font-bold text-foreground">My Collectibles Gallery</h3>
              </div>

              {/* Show Missing toggle */}
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => setShowMissingFigurines(v => !v)}
                  className={cn("flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold border transition-all whitespace-nowrap",
                    showMissingFigurines ? "bg-primary text-white border-primary" : "bg-muted text-muted-foreground border-border hover:border-primary/50 hover:text-primary")}>
                  {showMissingFigurines ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  Hide Missing Collectibles
                </button>
              </div>

              {/* Box filter row */}
              {mysteryBoxes.length > 0 && (
                <div className="flex gap-2 flex-wrap items-center">
                  <span className="text-xs font-semibold text-muted-foreground shrink-0">Box:</span>
                  <button data-active={figurineBoxFilter === "all"} onClick={() => setFigurineBoxFilter("all")}
                    className="px-3 py-1 rounded-full text-xs font-bold border transition-all border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100 data-[active=true]:bg-purple-600 data-[active=true]:text-white data-[active=true]:border-purple-600">
                    All Boxes
                  </button>
                  {mysteryBoxes.map(box => (
                    <button key={box.id} data-active={figurineBoxFilter === box.id} onClick={() => setFigurineBoxFilter(box.id)}
                      className="px-3 py-1 rounded-full text-xs font-bold border transition-all border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100 data-[active=true]:bg-purple-600 data-[active=true]:text-white data-[active=true]:border-purple-600">
                      {box.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Rarity filter row */}
              {(() => {
                const rarities = [...new Set(allFigurines.map(f => f.rarityName).filter(Boolean))] as string[];
                return rarities.length > 0 ? (
                  <div className="flex gap-2 flex-wrap items-center">
                    <span className="text-xs font-semibold text-muted-foreground shrink-0">Rarity:</span>
                    <button data-active={figurineRarityFilter === "all"} onClick={() => setFigurineRarityFilter("all")}
                      className="px-3 py-1 rounded-full text-xs font-bold border transition-all border-slate-300 text-slate-600 bg-slate-50 hover:bg-slate-100 data-[active=true]:bg-slate-600 data-[active=true]:text-white data-[active=true]:border-slate-600">
                      All
                    </button>
                    {rarities.map(r => {
                      const color = allFigurines.find(f => f.rarityName === r)?.rarityColor ?? "#6b7280";
                      return (
                        <button key={r} data-active={figurineRarityFilter === r} onClick={() => setFigurineRarityFilter(r)}
                          className="px-3 py-1 rounded-full text-xs font-bold border transition-all"
                          style={figurineRarityFilter === r
                            ? { backgroundColor: color, borderColor: color, color: "#fff" }
                            : { backgroundColor: color + "22", borderColor: color + "66", color }}>
                          {r}
                        </button>
                      );
                    })}
                  </div>
                ) : null;
              })()}
            </div>

            {displayedFigurines.length === 0 ? (
              <div className="text-center py-20">
                <Sparkles className="w-12 h-12 text-purple-300 mx-auto mb-4" />
                <p className="text-xl font-display font-bold text-foreground/60">
                  {ownedFigurineIds.size === 0 ? "No collectibles yet!" : "No collectibles match your filters"}
                </p>
                <p className="text-muted-foreground mt-2">
                  {ownedFigurineIds.size === 0 ? "Buy a mystery box from the shop to start collecting." : "Try adjusting the filters above."}
                </p>
              </div>
            ) : (
              <section>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  <AnimatePresence>
                    {displayedFigurines.map((fig, i) => {
                      const isOwned = ownedFigurineIds.has(fig.id);
                      return (
                        <motion.div key={fig.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                          className={cn("flex flex-col items-center gap-3 rounded-2xl p-4 border transition-all",
                            isOwned ? "bg-card border-border/50 shadow-sm" : "bg-card/60 border-border/30")}>
                          <div className={cn("relative w-full aspect-square rounded-xl", isOwned ? "overflow-hidden" : "overflow-visible")}>
                            {isOwned ? (
                              fig.imageUrl ? (
                                <img src={fig.imageUrl} alt={fig.name} className="w-full h-full object-contain" loading="eager" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-muted rounded-xl">
                                  <Sparkles className="w-16 h-16 text-purple-400" />
                                </div>
                              )
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                {fig.imageUrl ? (
                                  <img src={fig.imageUrl} alt="???" className="w-full h-full object-contain" style={{ filter: "brightness(0) blur(8px)", transform: "scale(0.92)" }} loading="lazy" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-muted/60 rounded-xl">
                                    <div className="w-16 h-16 rounded-full bg-muted" />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="text-center space-y-1">
                            {fig.rarityName && isOwned && (
                              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ backgroundColor: fig.rarityColor ?? "#6b7280" }}>
                                {fig.rarityName}
                              </span>
                            )}
                            <p className={cn("text-sm font-bold font-display leading-tight", !isOwned && "text-muted-foreground")}>
                              {isOwned ? fig.name : "?????"}
                            </p>
                            {fig.figurineNumber && (
                              <p className="text-xs text-muted-foreground">#{String(fig.figurineNumber).padStart(3, "0")}</p>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </section>
            )}
          </>
        )}

        {/* ACHIEVEMENTS TAB */}
        {mainTab === "achievements" && (
          <div className="bg-card rounded-xl border border-border/50 shadow-sm p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <h3 className="text-xl font-display font-bold text-foreground">Achievements</h3>
            </div>
            {allAchievements.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-xl font-display font-bold text-foreground/60">No achievements yet!</p>
                <p className="text-muted-foreground mt-2">Your teacher will set these up soon.</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-4">
                {allAchievements.map(a => {
                  const earned = earnedAchievements.some(e => e.achievementId === a.id);
                  return (
                    <button
                      key={a.id}
                      title={a.name}
                      onClick={() => setAchievementModal({ id: a.id, name: a.name, description: a.description, imageUrl: a.imageUrl, earned })}
                      className="w-[90px] h-[90px] overflow-hidden transition-all hover:scale-110 hover:drop-shadow-lg focus:outline-none"
                    >
                      {a.imageUrl ? (
                        <img
                          src={a.imageUrl}
                          alt={a.name}
                          className="w-full h-full object-contain"
                          style={{ filter: earned ? "none" : "brightness(0) opacity(0.25)" }}
                        />
                      ) : (
                        <Trophy className={`w-full h-full p-2 ${earned ? "text-yellow-500" : "text-gray-300"}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
