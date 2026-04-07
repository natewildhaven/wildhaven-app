import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Package, Sparkles, Coins, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const API = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "") + "/api";

interface Pack {
  id: number;
  name: string;
  coverImageUrl?: string | null;
  coinPrice: number;
  color?: string | null;
}

interface MysteryBox {
  id: number;
  name: string;
  coverImageUrl?: string | null;
  coinPrice: number;
}

interface FigurineResult {
  id: number;
  name: string;
  imageUrl?: string | null;
  figurineNumber?: number;
  rarityName?: string | null;
  rarityColor?: string | null;
  rarityCoinValue?: number | null;
}

interface PurchaseResult {
  type: "pack" | "box";
  savedToInventory: boolean;
  remainingCoins: number;
  packId?: number;
  packName?: string;
  cards?: { id: number; name: string; rarity: string; imageUrl?: string | null; packId?: number }[];
  duplicateCardIds?: number[];
  boxId?: number;
  figurine?: FigurineResult;
  isDuplicate?: boolean;
  coinsAwarded?: number;
}

interface Props {
  studentId: number;
  coins: number;
  onClose: () => void;
  onPurchaseComplete: (result: PurchaseResult) => void;
}

type Tab = "packs" | "boxes";
type Step = "browse" | "confirm" | "success";

export function SpendCoinsShop({ studentId, coins, onClose, onPurchaseComplete }: Props) {
  const [tab, setTab] = useState<Tab>("packs");
  const [packs, setPacks] = useState<Pack[]>([]);
  const [boxes, setBoxes] = useState<MysteryBox[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("browse");
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
  const [selectedBox, setSelectedBox] = useState<MysteryBox | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [currentCoins, setCurrentCoins] = useState(coins);
  const [error, setError] = useState<string | null>(null);

  const fetchShop = useCallback(async () => {
    setLoading(true);
    try {
      const [packsRes, boxesRes] = await Promise.all([
        fetch(`${API}/packs`).then(r => r.json()),
        fetch(`${API}/mystery-boxes`).then(r => r.json()),
      ]);
      setPacks((packsRes as Pack[]).filter((p: Pack & { availableInShop?: boolean }) => p.availableInShop));
      setBoxes((boxesRes as MysteryBox[]).filter((b: MysteryBox & { availableInShop?: boolean }) => (b as MysteryBox & { availableInShop?: boolean }).availableInShop));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchShop(); }, [fetchShop]);

  const handleSelectPack = (pack: Pack) => {
    setSelectedPack(pack);
    setSelectedBox(null);
    setStep("confirm");
    setError(null);
  };

  const handleSelectBox = (box: MysteryBox) => {
    setSelectedBox(box);
    setSelectedPack(null);
    setStep("confirm");
    setError(null);
  };

  const handleBuy = async (saveToInventory: boolean) => {
    if (purchasing) return;
    setPurchasing(true);
    setError(null);
    try {
      if (selectedPack) {
        const res = await fetch(`${API}/students/${studentId}/shop/buy-pack`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ packId: selectedPack.id, saveToInventory }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Purchase failed");
          return;
        }
        const data = await res.json();
        setCurrentCoins(data.remainingCoins);
        onPurchaseComplete({
          type: "pack",
          savedToInventory: saveToInventory,
          remainingCoins: data.remainingCoins,
          packId: selectedPack.id,
          packName: selectedPack.name,
          cards: data.cards,
          duplicateCardIds: data.duplicateCardIds,
          coinsAwarded: data.coinsAwarded,
        });
        onClose();
      } else if (selectedBox) {
        const res = await fetch(`${API}/students/${studentId}/shop/buy-box`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ boxId: selectedBox.id, saveToInventory }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Purchase failed");
          return;
        }
        const data = await res.json();
        setCurrentCoins(data.remainingCoins);
        onPurchaseComplete({
          type: "box",
          savedToInventory: saveToInventory,
          remainingCoins: data.remainingCoins,
          boxId: selectedBox.id,
          figurine: data.figurine,
          isDuplicate: data.isDuplicate,
          coinsAwarded: data.coinsAwarded,
        });
        onClose();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPurchasing(false);
    }
  };

  const selectedItem = selectedPack ?? selectedBox;
  const selectedPrice = selectedPack?.coinPrice ?? selectedBox?.coinPrice ?? 0;
  const canAfford = currentCoins >= selectedPrice;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-md overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4 sticky top-0 bg-black/60 backdrop-blur-sm border-b border-white/10 z-10">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-6 h-6 text-primary" />
          <h2 className="text-white text-2xl font-display font-bold">Coin Shop</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-400/30 rounded-xl px-3 py-1.5">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-amber-300 font-bold text-sm">{currentCoins} coins</span>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === "browse" && (
          <motion.div key="browse" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 px-6 py-6">
            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setTab("packs")}
                className={cn(
                  "flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm transition-all",
                  tab === "packs" ? "bg-primary text-white shadow" : "bg-white/10 text-white/60 hover:bg-white/20"
                )}
              >
                <Package className="w-4 h-4" /> Card Packs
              </button>
              <button
                onClick={() => setTab("boxes")}
                className={cn(
                  "flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm transition-all",
                  tab === "boxes" ? "bg-primary text-white shadow" : "bg-white/10 text-white/60 hover:bg-white/20"
                )}
              >
                <Sparkles className="w-4 h-4" /> Mystery Boxes
              </button>
            </div>

            {loading ? (
              <div className="py-20 text-center text-white/50">Loading shop...</div>
            ) : tab === "packs" ? (
              packs.length === 0 ? (
                <div className="py-20 text-center text-white/50 font-display">No packs available in the shop right now.</div>
              ) : (
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {packs.map(pack => (
                    <button
                      key={pack.id}
                      onClick={() => handleSelectPack(pack)}
                      className={cn(
                        "group flex flex-col items-center gap-2 text-center p-3 rounded-2xl border transition-all",
                        currentCoins >= pack.coinPrice
                          ? "border-white/20 bg-white/5 hover:bg-white/10 hover:border-primary/50"
                          : "border-white/10 bg-white/5 opacity-60 cursor-not-allowed"
                      )}
                      disabled={currentCoins < pack.coinPrice}
                    >
                      <div className="w-full aspect-[3/4] rounded-xl overflow-hidden bg-white/10 relative">
                        {pack.coverImageUrl ? (
                          <img src={pack.coverImageUrl} alt={pack.name} className="w-full h-full object-contain" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-8 h-8 text-white/30" />
                          </div>
                        )}
                      </div>
                      <p className="text-white font-bold text-sm font-display leading-tight">{pack.name}</p>
                      <div className="flex items-center gap-1 bg-amber-500/20 border border-amber-400/30 rounded-lg px-2 py-1">
                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-amber-300 font-bold text-sm">{pack.coinPrice}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )
            ) : (
              boxes.length === 0 ? (
                <div className="py-20 text-center text-white/50 font-display">No mystery boxes available in the shop right now.</div>
              ) : (
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {boxes.map(box => (
                    <button
                      key={box.id}
                      onClick={() => handleSelectBox(box)}
                      className={cn(
                        "group flex flex-col items-center gap-2 text-center p-3 rounded-2xl border transition-all",
                        currentCoins >= box.coinPrice
                          ? "border-white/20 bg-white/5 hover:bg-white/10 hover:border-purple-500/50"
                          : "border-white/10 bg-white/5 opacity-60 cursor-not-allowed"
                      )}
                      disabled={currentCoins < box.coinPrice}
                    >
                      <div className="w-full aspect-square rounded-xl overflow-hidden bg-white/10 relative">
                        {box.coverImageUrl ? (
                          <img src={box.coverImageUrl} alt={box.name} className="w-full h-full object-contain" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Sparkles className="w-8 h-8 text-white/30" />
                          </div>
                        )}
                      </div>
                      <p className="text-white font-bold text-sm font-display leading-tight">{box.name}</p>
                      <div className="flex items-center gap-1 bg-amber-500/20 border border-amber-400/30 rounded-lg px-2 py-1">
                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-amber-300 font-bold text-sm">{box.coinPrice}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )
            )}
          </motion.div>
        )}

        {step === "confirm" && selectedItem && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center px-6 py-10 gap-6"
          >
            <div className="w-40 h-auto rounded-2xl overflow-hidden shadow-2xl">
              {(selectedPack?.coverImageUrl ?? selectedBox?.coverImageUrl) ? (
                <img
                  src={(selectedPack?.coverImageUrl ?? selectedBox?.coverImageUrl) ?? undefined}
                  alt={selectedItem.name}
                  className="w-full object-contain"
                />
              ) : (
                <div className="w-full aspect-square bg-white/10 flex items-center justify-center rounded-2xl">
                  {selectedPack ? <Package className="w-14 h-14 text-white/30" /> : <Sparkles className="w-14 h-14 text-white/30" />}
                </div>
              )}
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-white text-3xl font-display font-bold">{selectedItem.name}</h3>
              <div className="flex items-center justify-center gap-2">
                <Coins className="w-5 h-5 text-amber-400" />
                <span className="text-amber-300 font-bold text-xl">{selectedPrice} coins</span>
              </div>
              <p className="text-white/50 text-sm">You have {currentCoins} coins</p>
            </div>

            {!canAfford && (
              <p className="text-red-400 font-bold text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
                Not enough coins!
              </p>
            )}

            {error && (
              <p className="text-red-400 font-bold text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
                {error}
              </p>
            )}

            <div className="flex flex-col gap-3 w-full max-w-sm">
              <Button
                onClick={() => handleBuy(false)}
                disabled={!canAfford || purchasing}
                className="flex items-center gap-2 rounded-2xl py-4 font-bold text-base"
                size="lg"
              >
                <Sparkles className="w-5 h-5" />
                {purchasing ? "Buying…" : "Buy & Open"}
              </Button>
              <button
                onClick={() => { setStep("browse"); setSelectedPack(null); setSelectedBox(null); setError(null); }}
                className="text-white/50 text-sm hover:text-white/80 transition-colors py-2"
              >
                ← Back to shop
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
