import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import {
  Plus, PackageSearch, Trash2, CheckCircle2, XCircle,
  Loader2, Layers, Gift,
} from "lucide-react";
import { useListPacks } from "@workspace/api-client-react";
import { useCreatePack, useDeletePack } from "@/hooks/use-packs";
import { TeacherLayout } from "./Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useCardRarities } from "@/contexts/CardRaritiesContext";

/** Compute the normalised pull-rate % for each rarity actually in a pack. */
function computePackRates(pack: {
  commonChance: number; rareChance: number; epicChance: number;
  mythicChance: number; legendaryChance: number;
  customRarityChances?: Record<string, number> | null;
  packRarities?: string[];
}): { name: string; pct: number }[] {
  const present = pack.packRarities ?? [];
  if (present.length === 0) return [];

  const allWeights: Record<string, number> = {
    Common: pack.commonChance,
    Rare: pack.rareChance,
    Epic: pack.epicChance,
    Mythic: pack.mythicChance,
    Legendary: pack.legendaryChance,
    ...(pack.customRarityChances ?? {}),
  };

  const filtered: Record<string, number> = {};
  for (const name of present) {
    if (allWeights[name] && allWeights[name] > 0) filtered[name] = allWeights[name];
  }

  const total = Object.values(filtered).reduce((s, v) => s + v, 0);
  if (total === 0) return [];

  return Object.entries(filtered)
    .map(([name, w]) => ({ name, pct: Math.round((w / total) * 100) }))
    .sort((a, b) => b.pct - a.pct);
}

const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

type Tab = "packs" | "boxes";

interface MysteryBox { id: number; name: string; description?: string | null; coverImageUrl?: string | null; coinPrice: number; availableInShop: boolean; }

export default function TeacherPacksAndBoxes() {
  const initialTab: Tab = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tab") === "boxes" ? "boxes" : "packs";
  const [tab, setTab] = useState<Tab>(initialTab);
  const { data: packs, isLoading, refetch: refetchPacks } = useListPacks();
  const { mutateAsync: createPack, isPending } = useCreatePack();
  const { mutateAsync: deletePack } = useDeletePack();
  const { toast } = useToast();
  const { getColor } = useCardRarities();

  /* Pack dialog */
  const [isAddPackOpen, setIsAddPackOpen] = useState(false);
  const [packName, setPackName] = useState("");
  const [packDesc, setPackDesc] = useState("");
  const [optimisticAvail, setOptimisticAvail] = useState<Record<number, boolean>>({});

  /* Box state */
  const [boxes, setBoxes] = useState<MysteryBox[]>([]);
  const [loadingBoxes, setLoadingBoxes] = useState(false);
  const [isAddBoxOpen, setIsAddBoxOpen] = useState(false);
  const [newBoxName, setNewBoxName] = useState("");
  const [newBoxDesc, setNewBoxDesc] = useState("");
  const [creatingBox, setCreatingBox] = useState(false);

  const fetchBoxes = useCallback(async () => {
    setLoadingBoxes(true);
    try {
      const data = await fetch(`${API}/mystery-boxes`).then(r => r.json());
      setBoxes(data as MysteryBox[]);
    } catch { } finally { setLoadingBoxes(false); }
  }, []);

  useEffect(() => { if (tab === "boxes") fetchBoxes(); }, [tab, fetchBoxes]);

  /* ── Handlers ── */
  const handleAddPack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packName.trim()) return;
    try {
      await createPack({ data: { name: packName.trim(), description: packDesc.trim() || null, coverImageUrl: null } });
      setIsAddPackOpen(false);
      setPackName(""); setPackDesc("");
      toast({ title: "Pack created! Open it to set images and pull rates." });
    } catch { toast({ title: "Error creating pack", variant: "destructive" }); }
  };

  const handleDeletePack = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    if (!confirm("Delete this pack and all its cards permanently?")) return;
    await deletePack({ packId: id });
    toast({ title: "Pack deleted." });
  };

  const handleToggleAvailability = async (e: React.MouseEvent, id: number, current: boolean) => {
    e.preventDefault();
    const next = !current;
    setOptimisticAvail(prev => ({ ...prev, [id]: next }));
    try {
      await fetch(`${API}/packs/${id}/availability`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available: next }),
      });
      await refetchPacks();
    } catch {
      setOptimisticAvail(prev => ({ ...prev, [id]: current }));
      toast({ title: "Failed to update availability", variant: "destructive" });
    } finally {
      setOptimisticAvail(prev => { const n = { ...prev }; delete n[id]; return n; });
    }
  };

  const handleCreateBox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoxName.trim()) return;
    setCreatingBox(true);
    try {
      const res = await fetch(`${API}/mystery-boxes`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBoxName.trim(), description: newBoxDesc.trim() || null, coinPrice: 50 }),
      });
      if (!res.ok) throw new Error();
      setIsAddBoxOpen(false);
      setNewBoxName(""); setNewBoxDesc("");
      await fetchBoxes();
      toast({ title: "Box created! Open it to add collectibles and set drop rates." });
    } catch { toast({ title: "Failed to create box", variant: "destructive" }); }
    finally { setCreatingBox(false); }
  };

  const handleDeleteBox = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    if (!confirm("Delete this mystery box and all its collectibles?")) return;
    try {
      await fetch(`${API}/mystery-boxes/${id}`, { method: "DELETE" });
      setBoxes(prev => prev.filter(b => b.id !== id));
      toast({ title: "Deleted!" });
    } catch { toast({ title: "Failed to delete", variant: "destructive" }); }
  };

  return (
    <TeacherLayout>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Packs & Boxes</h1>
          <p className="text-muted-foreground mt-1">Manage card packs and mystery boxes.</p>
        </div>
        {tab === "packs" && (
          <Button onClick={() => setIsAddPackOpen(true)} className="font-bold">
            <Plus className="mr-2 h-4 w-4" /> Create Pack
          </Button>
        )}
        {tab === "boxes" && (
          <Button onClick={() => setIsAddBoxOpen(true)} className="font-bold">
            <Plus className="mr-2 h-4 w-4" /> Create Box
          </Button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border mb-6">
        {(["packs", "boxes"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 text-sm font-bold border-b-2 transition-colors -mb-px",
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            {t === "packs" ? <><Layers className="w-4 h-4" /> Card Packs</> : <><Gift className="w-4 h-4" /> Mystery Boxes</>}
          </button>
        ))}
      </div>

      {/* ── Card Packs tab ── */}
      {tab === "packs" && (
        isLoading ? (
          <div className="p-8 text-center text-xl text-muted-foreground">Loading...</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
            {packs?.map(pack => {
              const serverAvail = (pack as typeof pack & { available?: boolean }).available !== false;
              const available = pack.id in optimisticAvail ? optimisticAvail[pack.id] : serverAvail;
              return (
                <Link key={pack.id} href={`/teacher/packs/${pack.id}`}>
                  <div className="group h-full cursor-pointer">
                    <Card className={cn("h-full overflow-hidden flex flex-col hover:-translate-y-1 transition-all duration-300 hover:shadow-xl border-2 hover:border-primary/50", !available && "opacity-60")}>
                      <div className="h-40 bg-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent z-10" />
                        <img
                          src={pack.coverImageUrl || `${import.meta.env.BASE_URL}images/pack-art.png`}
                          alt={pack.name}
                          className="h-full object-contain relative z-10 group-hover:scale-110 transition-transform duration-500 drop-shadow-xl"
                        />
                        <div className="absolute top-2 right-2 z-30 flex gap-1">
                          <button onClick={(e) => handleToggleAvailability(e, pack.id, available)}
                            title={available ? "Mark as unavailable" : "Mark as available"}
                            className="p-1.5 rounded-full bg-white/90 shadow transition-all hover:scale-110">
                            {available ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                          </button>
                          <button onClick={(e) => handleDeletePack(e, pack.id)}
                            className="p-1.5 bg-white/90 text-destructive rounded-full hover:bg-destructive hover:text-white transition-all shadow opacity-0 group-hover:opacity-100">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="p-4 flex-1 flex flex-col bg-white">
                        <h3 className="text-xl font-bold font-display">{pack.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{pack.description || "No description."}</p>
                        <div className="mt-3 flex flex-wrap gap-1">
                          {(() => {
                            const rates = computePackRates(pack);
                            if (rates.length === 0) return <span className="text-xs text-muted-foreground italic">No cards yet</span>;
                            return rates.map(({ name, pct }) => {
                              const color = getColor(name) ?? "#888";
                              return (
                                <span key={name} className="text-xs font-bold px-1.5 py-0.5 rounded"
                                  style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}55` }}>
                                  {name} {pct}%
                                </span>
                              );
                            });
                          })()}
                        </div>
                        <div className="mt-auto pt-3 flex items-center text-primary font-bold text-sm">
                          <PackageSearch className="w-4 h-4 mr-1" /> Manage Cards &rarr;
                        </div>
                      </div>
                    </Card>
                  </div>
                </Link>
              );
            })}
          </div>
        )
      )}

      {/* ── Mystery Boxes tab ── */}
      {tab === "boxes" && (
        loadingBoxes ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
        ) : boxes.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Sparkles className="w-12 h-12 mx-auto mb-3 text-purple-200" />
            <p className="font-display font-bold text-lg">No mystery boxes yet</p>
            <p className="text-sm mt-1">Click Create Box to get started.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
            {boxes.map(box => (
              <Link key={box.id} href={`/teacher/boxes/${box.id}`}>
                <div className="group h-full cursor-pointer">
                  <Card className="h-full overflow-hidden flex flex-col hover:-translate-y-1 transition-all duration-300 hover:shadow-xl border-2 hover:border-primary/50">
                    <div className="h-40 bg-purple-50 flex items-center justify-center p-4 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent z-10" />
                      {box.coverImageUrl ? (
                        <img src={box.coverImageUrl} alt={box.name} loading="lazy"
                          className="h-full object-contain relative z-10 group-hover:scale-110 transition-transform duration-500 drop-shadow-xl" />
                      ) : (
                        <Sparkles className="w-16 h-16 text-purple-300 relative z-10 group-hover:scale-110 transition-transform duration-500" />
                      )}
                      <div className="absolute top-2 right-2 z-30">
                        <button onClick={(e) => handleDeleteBox(e, box.id)}
                          className="p-1.5 bg-white/90 text-destructive rounded-full hover:bg-destructive hover:text-white transition-all shadow opacity-0 group-hover:opacity-100">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {box.availableInShop && (
                        <div className="absolute top-2 left-2 z-30">
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold shadow">In Shop</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex-1 flex flex-col bg-white">
                      <h3 className="text-xl font-bold font-display">{box.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{box.description || "No description."}</p>
                      <div className="mt-3 flex flex-wrap gap-1">
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: "#a855f722", color: "#a855f7", border: "1px solid #a855f755" }}>
                          {box.coinPrice} coins
                        </span>
                      </div>
                      <div className="mt-auto pt-3 flex items-center text-primary font-bold text-sm">
                        <Sparkles className="w-4 h-4 mr-1" /> Manage Collectibles &rarr;
                      </div>
                    </div>
                  </Card>
                </div>
              </Link>
            ))}
          </div>
        )
      )}

      {/* ── Create Pack dialog ── */}
      <Dialog open={isAddPackOpen} onOpenChange={setIsAddPackOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">Create New Pack</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">You can set images and pull rates after creating the pack.</p>
          <form onSubmit={handleAddPack} className="space-y-4 mt-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Pack Name *</label>
              <Input required value={packName} onChange={e => setPackName(e.target.value)} placeholder="e.g. Starter Forest Pack" autoFocus />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Description</label>
              <Input value={packDesc} onChange={e => setPackDesc(e.target.value)} placeholder="Short description..." />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsAddPackOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending} className="font-bold">
                {isPending ? "Creating..." : "Create Pack"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Create Box dialog ── */}
      <Dialog open={isAddBoxOpen} onOpenChange={setIsAddBoxOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">Create New Box</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">You can add collectibles and set drop rates after creating the box.</p>
          <form onSubmit={handleCreateBox} className="space-y-4 mt-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Box Name *</label>
              <Input required value={newBoxName} onChange={e => setNewBoxName(e.target.value)} placeholder="e.g. Forest Creatures Box" autoFocus />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Description</label>
              <Input value={newBoxDesc} onChange={e => setNewBoxDesc(e.target.value)} placeholder="Short description..." />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsAddBoxOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={creatingBox} className="font-bold">
                {creatingBox ? "Creating..." : "Create Box"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </TeacherLayout>
  );
}
