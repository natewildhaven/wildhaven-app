import { useState, useEffect, useCallback } from "react";
import { TeacherLayout } from "./Layout";
import { Package, Sparkles, Coins, ToggleLeft, ToggleRight, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

interface Pack {
  id: number; name: string; coverImageUrl?: string | null;
  available: boolean; availableInShop: boolean; coinPrice: number;
}

interface MysteryBox {
  id: number; name: string; coverImageUrl?: string | null;
  availableInShop: boolean; coinPrice: number;
}

function PackShopCard({ pack, onSave }: { pack: Pack; onSave: (id: number, changes: Partial<Pack>) => Promise<void> }) {
  const [price, setPrice] = useState(String(pack.coinPrice));
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    await onSave(pack.id, { availableInShop: !pack.availableInShop });
    setToggling(false);
  };

  const handleSavePrice = async () => {
    const n = parseInt(price, 10);
    if (isNaN(n) || n < 0) return;
    setSaving(true);
    await onSave(pack.id, { coinPrice: n });
    setSaving(false);
  };

  return (
    <div className={cn("flex flex-col gap-3 p-4 rounded-2xl border transition-all",
      pack.availableInShop ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30")}>
      <div className="flex items-start gap-3">
        {pack.coverImageUrl ? (
          <img src={pack.coverImageUrl} alt={pack.name} className="w-14 h-20 object-contain rounded-xl shadow-sm flex-shrink-0" loading="lazy" />
        ) : (
          <div className="w-14 h-20 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
            <Package className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base leading-tight">{pack.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Card Pack</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Coins className="w-4 h-4 text-amber-500 shrink-0" />
        <Input
          type="number" min={0} value={price} onChange={e => setPrice(e.target.value)}
          className="h-8 w-24 text-sm font-bold" placeholder="Price"
        />
        <button onClick={handleSavePrice} disabled={saving} className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors disabled:opacity-50">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
        </button>
      </div>

      <button onClick={handleToggle} disabled={toggling}
        className={cn("flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold transition-all",
          pack.availableInShop ? "bg-primary text-white hover:bg-primary/90" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
        {toggling ? <Loader2 className="w-4 h-4 animate-spin" /> : pack.availableInShop ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
        {pack.availableInShop ? "In Shop" : "Hidden from Shop"}
      </button>
    </div>
  );
}

function BoxShopCard({ box, onSave }: { box: MysteryBox; onSave: (id: number, changes: Partial<MysteryBox>) => Promise<void> }) {
  const [price, setPrice] = useState(String(box.coinPrice));
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    await onSave(box.id, { availableInShop: !box.availableInShop });
    setToggling(false);
  };

  const handleSavePrice = async () => {
    const n = parseInt(price, 10);
    if (isNaN(n) || n < 0) return;
    setSaving(true);
    await onSave(box.id, { coinPrice: n });
    setSaving(false);
  };

  return (
    <div className={cn("flex flex-col gap-3 p-4 rounded-2xl border transition-all",
      box.availableInShop ? "border-purple-400/40 bg-purple-50/50" : "border-border bg-muted/30")}>
      <div className="flex items-start gap-3">
        {box.coverImageUrl ? (
          <img src={box.coverImageUrl} alt={box.name} className="w-14 h-14 object-contain rounded-xl shadow-sm flex-shrink-0" loading="lazy" />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-purple-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base leading-tight">{box.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Mystery Box</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Coins className="w-4 h-4 text-amber-500 shrink-0" />
        <Input
          type="number" min={0} value={price} onChange={e => setPrice(e.target.value)}
          className="h-8 w-24 text-sm font-bold" placeholder="Price"
        />
        <button onClick={handleSavePrice} disabled={saving} className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors disabled:opacity-50">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
        </button>
      </div>

      <button onClick={handleToggle} disabled={toggling}
        className={cn("flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold transition-all",
          box.availableInShop ? "bg-purple-600 text-white hover:bg-purple-700" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
        {toggling ? <Loader2 className="w-4 h-4 animate-spin" /> : box.availableInShop ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
        {box.availableInShop ? "In Shop" : "Hidden from Shop"}
      </button>
    </div>
  );
}

export default function TeacherShop() {
  const { toast } = useToast();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [boxes, setBoxes] = useState<MysteryBox[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [packsRes, boxesRes] = await Promise.all([
        fetch(`${API}/packs`).then(r => r.json()),
        fetch(`${API}/mystery-boxes`).then(r => r.json()),
      ]);
      setPacks(packsRes as Pack[]);
      setBoxes(boxesRes as MysteryBox[]);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSavePack = async (id: number, changes: Partial<Pack>) => {
    try {
      const res = await fetch(`${API}/packs/${id}/shop`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Save failed");
      }
      setPacks(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p));
      toast({ title: "Saved!" });
    } catch (e) {
      toast({ title: "Error saving", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    }
  };

  const handleSaveBox = async (id: number, changes: Partial<MysteryBox>) => {
    try {
      await fetch(`${API}/mystery-boxes/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      setBoxes(prev => prev.map(b => b.id === id ? { ...b, ...changes } : b));
      toast({ title: "Saved!" });
    } catch {
      toast({ title: "Error saving", variant: "destructive" });
    }
  };

  const shopPacksCount = packs.filter(p => p.availableInShop).length;
  const shopBoxesCount = boxes.filter(b => b.availableInShop).length;

  return (
    <TeacherLayout>
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-10">
        <div>
          <h1 className="text-3xl font-display font-bold">Coin Shop</h1>
          <p className="text-muted-foreground mt-1">
            Manage which packs and mystery boxes students can buy with their coins, and set prices.
          </p>
          <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
            <span className="font-semibold text-primary">{shopPacksCount} pack{shopPacksCount !== 1 ? "s" : ""} in shop</span>
            <span className="font-semibold text-purple-600">{shopBoxesCount} box{shopBoxesCount !== 1 ? "es" : ""} in shop</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <section>
              <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" /> Card Packs
              </h2>
              {packs.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">No packs created yet. Create packs from the Packs page first.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {packs.map(pack => (
                    <PackShopCard key={pack.id} pack={pack} onSave={handleSavePack} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" /> Mystery Boxes
              </h2>
              {boxes.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">No mystery boxes created yet. Create them from the Mystery Boxes page.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {boxes.map(box => (
                    <BoxShopCard key={box.id} box={box} onSave={handleSaveBox} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </TeacherLayout>
  );
}
