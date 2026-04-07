import { useState, useEffect, useCallback } from "react";
import { Check, X, Coins, Edit2, Layers, Box } from "lucide-react";

const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

interface Props {
  studentId: number;
  onCountChange?: (count: number) => void;
}

export function PackBankWidget({ studentId, onCountChange }: Props) {
  const [count, setCount] = useState(0);
  const [coins, setCoins] = useState(0);
  const [cardCount, setCardCount] = useState(0);
  const [collectibleCount, setCollectibleCount] = useState(0);

  // Pack editing
  const [editingPacks, setEditingPacks] = useState(false);
  const [packInput, setPackInput] = useState("");
  const [isSavingPacks, setIsSavingPacks] = useState(false);

  // Coin editing
  const [editingCoins, setEditingCoins] = useState(false);
  const [coinInput, setCoinInput] = useState("");
  const [isSavingCoins, setIsSavingCoins] = useState(false);

  const fetchInventory = useCallback(async () => {
    try {
      const data: { count: number; coins: number; cardCount: number; collectibleCount: number } = await fetch(`${API}/students/${studentId}/inventory`).then(r => r.json());
      setCount(data.count ?? 0);
      setCoins(data.coins ?? 0);
      setCardCount(data.cardCount ?? 0);
      setCollectibleCount(data.collectibleCount ?? 0);
      onCountChange?.(data.count ?? 0);
    } catch { /* ignore */ }
  }, [studentId]);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  // ── Pack edit ──
  const startEditPacks = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPackInput(String(count));
    setEditingPacks(true);
  };

  const cancelPacks = () => { setEditingPacks(false); setPackInput(""); };

  const handleSavePacks = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newTotal = parseInt(packInput, 10);
    if (isNaN(newTotal) || newTotal < 0) return;
    setIsSavingPacks(true);
    try {
      const delta = newTotal - count;
      const res = await fetch(`${API}/students/${studentId}/inventory/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta }),
      });
      const data = await res.json();
      const updated = data.count ?? newTotal;
      setCount(updated);
      onCountChange?.(updated);
    } catch { /* ignore */ } finally {
      setIsSavingPacks(false);
      cancelPacks();
    }
  };

  // ── Coin edit ──
  const startEditCoins = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCoinInput(String(coins));
    setEditingCoins(true);
  };

  const cancelCoins = () => { setEditingCoins(false); setCoinInput(""); };

  const handleSaveCoins = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newTotal = parseInt(coinInput, 10);
    if (isNaN(newTotal) || newTotal < 0) return;
    setIsSavingCoins(true);
    try {
      const delta = newTotal - coins;
      const res = await fetch(`${API}/students/${studentId}/coins/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta }),
      });
      const data = await res.json();
      setCoins(data.coins ?? newTotal);
    } catch { /* ignore */ } finally {
      setIsSavingCoins(false);
      cancelCoins();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Stats row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Packs */}
        <div className="flex items-center gap-1">
          <span className="text-sm font-bold text-primary">{count}</span>
          <span className="text-xs text-muted-foreground">pack{count !== 1 ? "s" : ""}</span>
          {!editingPacks && (
            <button
              onClick={startEditPacks}
              className="ml-0.5 p-0.5 rounded hover:bg-primary/10 text-primary/60 transition-colors"
              title="Edit packs"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Coins */}
        <div className="flex items-center gap-1 text-amber-600">
          <Coins className="w-3.5 h-3.5" />
          <span className="text-sm font-bold">{coins}</span>
          {!editingCoins && (
            <button
              onClick={startEditCoins}
              className="ml-0.5 p-0.5 rounded hover:bg-amber-100 text-amber-500 transition-colors"
              title="Edit coins"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Counts */}
        <div className="flex items-center gap-3 ml-auto">
          <div className="flex items-center gap-1 text-sky-600">
            <Layers className="w-3.5 h-3.5" />
            <span className="text-sm font-bold">{cardCount}</span>
            <span className="text-xs text-muted-foreground">card{cardCount !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex items-center gap-1 text-violet-600">
            <Box className="w-3.5 h-3.5" />
            <span className="text-sm font-bold">{collectibleCount}</span>
            <span className="text-xs text-muted-foreground">collectible{collectibleCount !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>

      {/* Pack edit inline */}
      {editingPacks && (
        <div
          className="flex items-center gap-1.5 p-2 rounded-xl border bg-primary/5 border-primary/20"
          onClick={e => e.stopPropagation()}
        >
          <span className="text-xs text-primary font-semibold shrink-0">Packs</span>
          <input
            type="number"
            min="0"
            value={packInput}
            onChange={e => setPackInput(e.target.value)}
            className="flex-1 w-16 text-sm font-bold text-center border border-primary/30 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
            autoFocus
            onKeyDown={e => { if (e.key === "Enter") handleSavePacks(e as unknown as React.MouseEvent); if (e.key === "Escape") cancelPacks(); }}
          />
          <button
            onClick={handleSavePacks}
            disabled={isSavingPacks}
            className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-40"
          >
            <Check className="w-3 h-3" /> Set
          </button>
          <button
            onClick={() => cancelPacks()}
            className="w-7 h-7 rounded-lg border bg-white hover:bg-slate-50 text-muted-foreground flex items-center justify-center transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Coin edit inline */}
      {editingCoins && (
        <div
          className="flex items-center gap-1.5 p-2 rounded-xl border bg-amber-50 border-amber-200"
          onClick={e => e.stopPropagation()}
        >
          <Coins className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <input
            type="number"
            min="0"
            value={coinInput}
            onChange={e => setCoinInput(e.target.value)}
            className="flex-1 w-16 text-sm font-bold text-center border border-amber-300 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            autoFocus
            onKeyDown={e => { if (e.key === "Enter") handleSaveCoins(e as unknown as React.MouseEvent); if (e.key === "Escape") cancelCoins(); }}
          />
          <span className="text-xs text-amber-700 font-semibold">coins</span>
          <button
            onClick={handleSaveCoins}
            disabled={isSavingCoins}
            className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-colors disabled:opacity-40"
          >
            <Check className="w-3 h-3" /> Set
          </button>
          <button
            onClick={() => cancelCoins()}
            className="w-7 h-7 rounded-lg border bg-white hover:bg-slate-50 text-muted-foreground flex items-center justify-center transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
