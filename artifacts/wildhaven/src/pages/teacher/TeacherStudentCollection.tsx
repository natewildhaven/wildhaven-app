import { useState, useMemo, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, Gem, Package, Coins, Edit2, Check, X } from "lucide-react";
import epicIcon from "@assets/Epic_1774130170598.png";
import mythicIcon from "@assets/Mythic_1774130170598.png";
import legendaryIcon from "@assets/Legendary_1774130170598.png";
import meadowBg from "@assets/Flowery_Meadow_1774133232233.jpg";
import { useGetStudentCollection, useListCards, useListPacks } from "@workspace/api-client-react";
import { useSettings } from "@/hooks/use-settings";
import { useCardRarities } from "@/contexts/CardRaritiesContext";
import { StudentCard, MissingCard, CardLightbox } from "@/components/CollectibleCard";
import { Card } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TeacherLayout } from "./Layout";
import { cn, metallicFilterStyle } from "@/lib/utils";

const rarityStatIcons: Record<string, string> = {
  Epic: epicIcon,
  Mythic: mythicIcon,
  Legendary: legendaryIcon,
};

type GridItem =
  | { type: "owned"; card: Card; packName: string | undefined; packBackUrl: string | null | undefined; count: number }
  | { type: "missing"; card: Card; packBackUrl: string | null | undefined };

const API = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "") + "/api";

export default function TeacherStudentCollection() {
  const [, params] = useRoute("/teacher/student/:id/collection");
  const studentId = Number(params?.id);
  const settings = useSettings();
  const bgUrl = settings.backgroundImageUrl || meadowBg;
  const { rarities: contextRarities, getColor, getIconUrl } = useCardRarities();

  const [selectedPack, setSelectedPack] = useState<string>("all");
  const [selectedRarity, setSelectedRarity] = useState<string>("all");
  const [showMissing, setShowMissing] = useState(false);
  const [lightboxCard, setLightboxCard] = useState<{ card: Card; packName?: string; count?: number } | null>(null);

  const [packCount, setPackCount] = useState<number | null>(null);
  const [coinCount, setCoinCount] = useState<number | null>(null);

  // Pack editing
  const [editingPacks, setEditingPacks] = useState(false);
  const [packInput, setPackInput] = useState("");
  const [isSavingPacks, setIsSavingPacks] = useState(false);

  // Coin editing
  const [editingCoins, setEditingCoins] = useState(false);
  const [coinInput, setCoinInput] = useState("");
  const [isSavingCoins, setIsSavingCoins] = useState(false);

  useEffect(() => {
    if (!studentId) return;
    fetch(`${API}/students/${studentId}/inventory`)
      .then(r => r.json())
      .then(d => { setPackCount(d.count ?? 0); setCoinCount(d.coins ?? 0); })
      .catch(() => {});
  }, [studentId]);

  const handleSavePacks = async () => {
    const newTotal = parseInt(packInput, 10);
    if (isNaN(newTotal) || newTotal < 0 || packCount === null) return;
    setIsSavingPacks(true);
    try {
      const res = await fetch(`${API}/students/${studentId}/inventory/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta: newTotal - packCount }),
      });
      const data = await res.json();
      setPackCount(data.count ?? newTotal);
    } catch { /* ignore */ } finally {
      setIsSavingPacks(false);
      setEditingPacks(false);
    }
  };

  const handleSaveCoins = async () => {
    const newTotal = parseInt(coinInput, 10);
    if (isNaN(newTotal) || newTotal < 0 || coinCount === null) return;
    setIsSavingCoins(true);
    try {
      const res = await fetch(`${API}/students/${studentId}/coins/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta: newTotal - coinCount }),
      });
      const data = await res.json();
      setCoinCount(data.coins ?? newTotal);
    } catch { /* ignore */ } finally {
      setIsSavingCoins(false);
      setEditingCoins(false);
    }
  };

  const { data: collection, isLoading: isColLoading } = useGetStudentCollection(studentId);
  const { data: allPacks, isLoading: isPacksLoading } = useListPacks();
  const packFilter = selectedPack !== "all" ? Number(selectedPack) : undefined;
  const { data: allCards, isLoading: isCardsLoading } = useListCards(packFilter ? { packId: packFilter } : undefined);
  const { data: allCardsUnfiltered } = useListCards(undefined);

  const packMap = useMemo(() => {
    if (!allPacks) return new Map<number, { name: string; cardBackImageUrl: string | null }>();
    return new Map(allPacks.map(p => [p.id, { name: p.name, cardBackImageUrl: p.cardBackImageUrl }]));
  }, [allPacks]);

  const cardCountMap = useMemo(() => {
    if (!collection) return new Map<number, number>();
    const map = new Map<number, number>();
    for (const e of collection.entries) {
      map.set(e.cardId, (map.get(e.cardId) ?? 0) + 1);
    }
    return map;
  }, [collection]);

  const ownedCardIds = useMemo(() => {
    if (!collection) return new Set<number>();
    return new Set(collection.entries.map(e => e.cardId));
  }, [collection]);

  const rarityStatsMap = useMemo(() => {
    const map = new Map<string, { owned: number; total: number }>();
    if (!allCardsUnfiltered) return map;
    for (const card of allCardsUnfiltered) {
      const cur = map.get(card.rarity) ?? { owned: 0, total: 0 };
      map.set(card.rarity, { total: cur.total + 1, owned: cur.owned + (ownedCardIds.has(card.id) ? 1 : 0) });
    }
    return map;
  }, [allCardsUnfiltered, ownedCardIds]);

  const gridItems = useMemo<GridItem[]>(() => {
    if (!allCards) return [];
    const filtered = allCards.filter(c => selectedRarity === "all" || c.rarity === selectedRarity);
    const items: GridItem[] = [];
    for (const card of filtered) {
      const packInfo = packMap.get(card.packId);
      if (ownedCardIds.has(card.id)) {
        const count = cardCountMap.get(card.id) ?? 1;
        items.push({ type: "owned", card, packName: packInfo?.name, packBackUrl: packInfo?.cardBackImageUrl, count });
      } else if (showMissing) {
        items.push({ type: "missing", card, packBackUrl: packInfo?.cardBackImageUrl });
      }
    }
    items.sort((a, b) => a.card.cardNumber - b.card.cardNumber);
    return items;
  }, [allCards, ownedCardIds, showMissing, selectedRarity, packMap, cardCountMap]);

  const ownedCount = gridItems.filter(i => i.type === "owned").length;
  const missingCount = gridItems.filter(i => i.type === "missing").length;
  const isLoading = isColLoading || isPacksLoading || isCardsLoading;

  if (isLoading) {
    return (
      <TeacherLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64 rounded-xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />)}
          </div>
        </div>
      </TeacherLayout>
    );
  }

  if (!collection) {
    return (
      <TeacherLayout>
        <div className="p-8 text-center">
          <h1 className="text-2xl font-display">Student not found</h1>
        </div>
      </TeacherLayout>
    );
  }

  const overallProgress = collection.totalCards > 0 ? (collection.uniqueCards / collection.totalCards) * 100 : 0;

  return (
    <TeacherLayout
      bgClassName="min-h-screen flex flex-col"
      bgStyle={{ backgroundImage: `url(${bgUrl})`, backgroundSize: "cover", backgroundAttachment: "fixed", backgroundPosition: "center" }}
    >
      {lightboxCard && (
        <CardLightbox
          card={lightboxCard.card}
          packName={lightboxCard.packName}
          duplicateCount={lightboxCard.count}
          onClose={() => setLightboxCard(null)}
        />
      )}

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Link href="/teacher/dashboard" className="text-primary hover:underline flex items-center font-semibold text-sm">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Students
        </Link>
        <span className="text-muted-foreground/40">·</span>
        <h1 className="text-2xl font-display font-bold text-primary">{collection.student.name}'s Collection</h1>
      </div>

      {/* Progress dashboard */}
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/50 mb-6 flex flex-col gap-5">

        {/* Collection progress — full width */}
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <h3 className="text-xl font-display font-bold">Collection Progress</h3>
            <span className="text-muted-foreground font-bold">{collection.uniqueCards} / {collection.totalCards} Cards</span>
          </div>
          <Progress value={overallProgress} className="h-4" />
        </div>

        <div className="border-t" />

        {/* Bottom row: rarity counters + inventory  |  Pack Mastery */}
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 flex flex-col gap-4">

            {/* Rarity stat tiles — horizontally scrollable */}
            <div className="overflow-x-auto pb-1">
              <div className="flex gap-3 min-w-max">
                {[...contextRarities].sort((a, b) => a.sortOrder - b.sortOrder).map(r => {
                  const stats = rarityStatsMap.get(r.name);
                  const iconUrl = getIconUrl(r.name) ?? rarityStatIcons[r.name];
                  return (
                    <div key={r.name}
                      className="flex-shrink-0 min-w-[130px] border rounded-xl p-3 flex items-center gap-3"
                      style={metallicFilterStyle(r.color, false)}>
                      {iconUrl
                        ? <img src={iconUrl} alt={r.name} className="w-9 h-9 object-contain drop-shadow-md flex-shrink-0" />
                        : <span className="w-9 h-9 rounded-full flex-shrink-0 border-2" style={{ backgroundColor: r.color + "33", borderColor: r.color }} />
                      }
                      <div className="min-w-0">
                        <p className="text-xs font-bold opacity-70 truncate">{r.name}</p>
                        <p className="text-xl font-display font-bold leading-tight">
                          {stats?.owned ?? 0}
                        </p>
                        {stats && <p className="text-[10px] opacity-50">of {stats.total}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Inventory */}
            <div className="pt-1 border-t">
              <h4 className="text-sm font-bold text-muted-foreground mb-2">Inventory</h4>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Packs pill */}
                  <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-1.5">
                    <Package className="w-4 h-4 text-primary" />
                    <span className="font-bold text-primary">{packCount ?? 0}</span>
                    <span className="text-xs text-muted-foreground">pack{packCount !== 1 ? "s" : ""}</span>
                    {!editingPacks && (
                      <button
                        onClick={() => { setPackInput(String(packCount ?? 0)); setEditingPacks(true); }}
                        className="ml-0.5 p-0.5 rounded hover:bg-primary/10 text-primary/50 transition-colors"
                        title="Edit packs"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {/* Coins pill */}
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                    <Coins className="w-4 h-4 text-amber-600" />
                    <span className="font-bold text-amber-700">{coinCount ?? 0}</span>
                    <span className="text-xs text-amber-600">coins</span>
                    {!editingCoins && (
                      <button
                        onClick={() => { setCoinInput(String(coinCount ?? 0)); setEditingCoins(true); }}
                        className="ml-0.5 p-0.5 rounded hover:bg-amber-100 text-amber-400 transition-colors"
                        title="Edit coins"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Pack edit inline */}
                {editingPacks && (
                  <div className="flex items-center gap-1.5 p-2 rounded-xl border bg-primary/5 border-primary/20">
                    <span className="text-xs text-primary font-semibold shrink-0">Packs</span>
                    <input
                      type="number"
                      min="0"
                      value={packInput}
                      onChange={e => setPackInput(e.target.value)}
                      className="flex-1 w-16 text-sm font-bold text-center border border-primary/30 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                      autoFocus
                      onKeyDown={e => { if (e.key === "Enter") handleSavePacks(); if (e.key === "Escape") setEditingPacks(false); }}
                    />
                    <button
                      onClick={handleSavePacks}
                      disabled={isSavingPacks}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-40"
                    >
                      <Check className="w-3 h-3" /> Set
                    </button>
                    <button
                      onClick={() => setEditingPacks(false)}
                      className="w-7 h-7 rounded-lg border bg-white hover:bg-slate-50 text-muted-foreground flex items-center justify-center transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Coin edit inline */}
                {editingCoins && (
                  <div className="flex items-center gap-1.5 p-2 rounded-xl border bg-amber-50 border-amber-200">
                    <Coins className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <input
                      type="number"
                      min="0"
                      value={coinInput}
                      onChange={e => setCoinInput(e.target.value)}
                      className="flex-1 w-16 text-sm font-bold text-center border border-amber-300 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                      autoFocus
                      onKeyDown={e => { if (e.key === "Enter") handleSaveCoins(); if (e.key === "Escape") setEditingCoins(false); }}
                    />
                    <span className="text-xs text-amber-700 font-semibold">coins</span>
                    <button
                      onClick={handleSaveCoins}
                      disabled={isSavingCoins}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-colors disabled:opacity-40"
                    >
                      <Check className="w-3 h-3" /> Set
                    </button>
                    <button
                      onClick={() => setEditingCoins(false)}
                      className="w-7 h-7 rounded-lg border bg-white hover:bg-slate-50 text-muted-foreground flex items-center justify-center transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pack Mastery */}
          <div className="w-full lg:w-72 flex flex-col gap-2 max-h-48 overflow-y-auto pr-2">
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
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border/50 shadow-sm p-4 mb-6 flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex gap-2 flex-wrap flex-1">
            <button
              onClick={() => setSelectedRarity("all")}
              className="px-3 py-1 rounded-full text-sm font-bold border transition-all border-primary/30 text-primary bg-primary/5 hover:bg-primary/10"
              style={selectedRarity === "all" ? { background: "var(--primary)", color: "#fff", borderColor: "var(--primary)" } : {}}
            >
              All
            </button>
            {[...contextRarities].sort((a, b) => a.sortOrder - b.sortOrder).map(r => (
              <button
                key={r.name}
                onClick={() => setSelectedRarity(r.name)}
                className="px-3 py-1 rounded-full text-sm font-bold border transition-all"
                style={metallicFilterStyle(r.color, selectedRarity === r.name)}
              >
                {r.name}
              </button>
            ))}
          </div>
          <div className="w-full md:w-56">
            <Select value={selectedPack} onValueChange={setSelectedPack}>
              <SelectTrigger className="rounded-xl font-bold">
                <SelectValue placeholder="All Packs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Packs</SelectItem>
                {allPacks?.map(p => (
                  <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center justify-between border-t pt-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-muted-foreground">Show missing cards</span>
            {showMissing && missingCount > 0 && (
              <span className="text-xs bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full font-semibold">
                {missingCount} missing
              </span>
            )}
          </div>
          <Button
            variant={showMissing ? "default" : "outline"}
            size="sm"
            onClick={() => setShowMissing(v => !v)}
            className="font-bold gap-2"
          >
            {showMissing ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {showMissing ? "Showing" : "Hidden"}
          </Button>
        </div>
      </div>

      {/* Card grid */}
      {gridItems.length > 0 ? (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-xl font-display font-bold">Cards</h3>
            <span className="text-sm text-muted-foreground font-semibold">
              {ownedCount} collected{showMissing && missingCount > 0 ? ` · ${missingCount} missing` : ""}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            <AnimatePresence>
              {gridItems.map((item, i) => (
                <motion.div
                  key={`${item.type}-${item.card.id}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.02 }}
                >
                  {item.type === "owned" ? (
                    <StudentCard
                      card={item.card}
                      packName={item.packName}
                      duplicateCount={item.count}
                      onClick={() => setLightboxCard({ card: item.card, packName: item.packName, count: item.count })}
                    />
                  ) : (
                    <MissingCard cardNumber={item.card.cardNumber} cardBackUrl={item.packBackUrl} />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>
      ) : ownedCount === 0 && !showMissing ? (
        <div className="py-24 text-center text-muted-foreground">
          <Gem className="mx-auto h-16 w-16 mb-4 opacity-20" />
          <h3 className="text-xl font-display font-bold">No cards collected yet</h3>
          <p className="mt-1">Open a pack for this student to get started!</p>
        </div>
      ) : (
        <div className="py-24 text-center text-muted-foreground">
          <Gem className="mx-auto h-16 w-16 mb-4 opacity-20" />
          <h3 className="text-xl font-display font-bold">No cards in this filter</h3>
        </div>
      )}
    </TeacherLayout>
  );
}
