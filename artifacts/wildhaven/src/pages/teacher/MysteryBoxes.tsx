import { useState, useEffect, useCallback } from "react";
import { TeacherLayout } from "./Layout";
import { Plus, Sparkles, Trash2, Edit2, ChevronDown, ChevronRight, Loader2, Upload, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const API = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "") + "/api";

interface FigurineRarity { id: number; name: string; color: string; coinValue: number; sortOrder: number; }
interface Figurine { id: number; name: string; imageUrl?: string | null; figurineNumber: number; rarityId: number; rarityName?: string | null; rarityColor?: string | null; }
interface RarityProb { id?: number; rarityId: number; probability: number; rarityName?: string | null; rarityColor?: string | null; }
interface MysteryBox { id: number; name: string; description?: string | null; coverImageUrl?: string | null; coinPrice: number; availableInShop: boolean; }

function ImageUpload({ current, onUpload, label }: { current?: string | null; onUpload: (url: string) => void; label: string }) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch(`${API}/uploads/image`, { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      onUpload(data.url);
    } catch { toast({ title: "Upload failed", variant: "destructive" }); }
    finally { setUploading(false); e.target.value = ""; }
  };

  return (
    <div className="flex items-center gap-3">
      {current && <img src={current} alt={label} className="w-12 h-12 object-contain rounded-lg border border-border" />}
      <label className={cn("flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold border cursor-pointer transition-colors",
        uploading ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/50 border-border")}>
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {current ? "Change" : label}
        <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
      </label>
    </div>
  );
}

function FigurineRow({ fig, rarities, boxId, onDelete, onUpdate }: {
  fig: Figurine; rarities: FigurineRarity[]; boxId: number;
  onDelete: (id: number) => void; onUpdate: (id: number, changes: Partial<Figurine & { imageUrl: string }>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(fig.name);
  const [rarityId, setRarityId] = useState(fig.rarityId);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(fig.id, { name, rarityId });
    setSaving(false);
    setEditing(false);
  };

  const rarity = rarities.find(r => r.id === fig.rarityId);

  return (
    <div className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
      <div className="w-8 text-xs text-muted-foreground font-mono shrink-0">#{String(fig.figurineNumber).padStart(3, "0")}</div>
      {fig.imageUrl ? (
        <img src={fig.imageUrl} alt={fig.name} className="w-10 h-10 object-contain rounded-lg bg-muted shrink-0" loading="lazy" />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-2 flex-wrap">
            <Input value={name} onChange={e => setName(e.target.value)} className="h-7 text-sm flex-1 min-w-32" />
            <select value={rarityId} onChange={e => setRarityId(Number(e.target.value))}
              className="h-7 rounded-lg border border-border text-sm px-2 bg-background">
              {rarities.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">{fig.name}</span>
            {rarity && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white shrink-0" style={{ backgroundColor: rarity.color }}>
                {rarity.name}
              </span>
            )}
          </div>
        )}
      </div>
      <ImageUpload
        current={fig.imageUrl}
        label="Image"
        onUpload={(url) => onUpdate(fig.id, { imageUrl: url })}
      />
      {editing ? (
        <div className="flex gap-1 shrink-0">
          <button onClick={handleSave} disabled={saving} className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary/90 disabled:opacity-50">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => { setEditing(false); setName(fig.name); setRarityId(fig.rarityId); }} className="w-7 h-7 rounded-lg border hover:bg-muted flex items-center justify-center">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex gap-1 shrink-0">
          <button onClick={() => setEditing(true)} className="w-7 h-7 rounded-lg border hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(fig.id)} className="w-7 h-7 rounded-lg border hover:bg-red-50 hover:border-red-300 flex items-center justify-center text-muted-foreground hover:text-red-600">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function BoxPanel({ box, rarities, onUpdate, onDelete }: {
  box: MysteryBox; rarities: FigurineRarity[];
  onUpdate: (id: number, changes: Partial<MysteryBox>) => Promise<void>;
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [figurines, setFigurines] = useState<Figurine[]>([]);
  const [rarityProbs, setRarityProbs] = useState<RarityProb[]>([]);
  const [loadingFigs, setLoadingFigs] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(box.name);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Add figurine form
  const [addName, setAddName] = useState("");
  const [addRarityId, setAddRarityId] = useState<number>(rarities[0]?.id ?? 0);
  const [addImageUrl, setAddImageUrl] = useState("");
  const [addingFig, setAddingFig] = useState(false);

  const fetchFigurines = useCallback(async () => {
    setLoadingFigs(true);
    try {
      const [figsRes, probsRes] = await Promise.all([
        fetch(`${API}/mystery-boxes/${box.id}/figurines`).then(r => r.json()),
        fetch(`${API}/mystery-boxes/${box.id}/rarity-probs`).then(r => r.json()),
      ]);
      setFigurines(figsRes as Figurine[]);
      setRarityProbs(probsRes as RarityProb[]);
    } catch { /* ignore */ } finally { setLoadingFigs(false); }
  }, [box.id]);

  useEffect(() => { if (expanded) fetchFigurines(); }, [expanded, fetchFigurines]);

  const handleSaveName = async () => {
    setSaving(true);
    await onUpdate(box.id, { name });
    setSaving(false);
    setEditing(false);
  };

  const handleAddFigurine = async () => {
    if (!addName || !addRarityId) return;
    setAddingFig(true);
    try {
      const res = await fetch(`${API}/mystery-boxes/${box.id}/figurines`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName, rarityId: addRarityId,
          imageUrl: addImageUrl || null,
          figurineNumber: (figurines.length > 0 ? Math.max(...figurines.map(f => f.figurineNumber)) : 0) + 1,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setAddName(""); setAddImageUrl("");
      await fetchFigurines();
      toast({ title: `${addName} added!` });
    } catch { toast({ title: "Failed to add collectible", variant: "destructive" }); }
    finally { setAddingFig(false); }
  };

  const handleDeleteFigurine = async (id: number) => {
    if (!confirm("Delete this collectible?")) return;
    try {
      await fetch(`${API}/figurines/${id}`, { method: "DELETE" });
      await fetchFigurines();
    } catch { toast({ title: "Failed", variant: "destructive" }); }
  };

  const handleUpdateFigurine = async (id: number, changes: Partial<Figurine & { imageUrl: string }>) => {
    try {
      await fetch(`${API}/figurines/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      await fetchFigurines();
    } catch { toast({ title: "Failed to update", variant: "destructive" }); }
  };

  const handleSaveRarityProbs = async () => {
    try {
      await fetch(`${API}/mystery-boxes/${box.id}/rarity-probs`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rarityProbs.map(p => ({ rarityId: p.rarityId, probability: p.probability }))),
      });
      toast({ title: "Rarity probabilities saved!" });
    } catch { toast({ title: "Failed to save", variant: "destructive" }); }
  };

  const updateProb = (rarityId: number, value: number) => {
    setRarityProbs(prev => {
      const exists = prev.find(p => p.rarityId === rarityId);
      if (exists) return prev.map(p => p.rarityId === rarityId ? { ...p, probability: value } : p);
      const rarity = rarities.find(r => r.id === rarityId);
      return [...prev, { rarityId, probability: value, rarityName: rarity?.name, rarityColor: rarity?.color }];
    });
  };

  const probTotal = rarityProbs.reduce((s, p) => s + (p.probability || 0), 0);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <button onClick={() => setExpanded(v => !v)} className="p-1 rounded-lg hover:bg-muted transition-colors">
          {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
        {box.coverImageUrl ? (
          <img src={box.coverImageUrl} alt={box.name} className="w-12 h-12 object-contain rounded-xl bg-muted flex-shrink-0" loading="lazy" />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-purple-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <Input value={name} onChange={e => setName(e.target.value)} className="h-8 font-bold" />
              <button onClick={handleSaveName} disabled={saving} className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary/90 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              </button>
              <button onClick={() => { setEditing(false); setName(box.name); }} className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base truncate">{box.name}</h3>
              <button onClick={() => setEditing(true)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">{figurines.length > 0 ? `${figurines.length} collectible${figurines.length !== 1 ? "s" : ""}` : "No collectibles yet"}</p>
        </div>
        <ImageUpload current={box.coverImageUrl} label="Cover" onUpload={(url) => onUpdate(box.id, { coverImageUrl: url })} />
        <button onClick={() => onDelete(box.id)} className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 text-muted-foreground transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-border/50 p-4 space-y-6 bg-muted/20">
          {/* Rarity Probabilities */}
          <div>
            <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
              Rarity Probabilities
              <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", probTotal === 100 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
                Total: {probTotal}%
              </span>
            </h4>
            <div className="space-y-2">
              {rarities.map(rarity => {
                const prob = rarityProbs.find(p => p.rarityId === rarity.id)?.probability ?? 0;
                return (
                  <div key={rarity.id} className="flex items-center gap-3">
                    <span className="w-20 px-2 py-0.5 rounded-full text-xs font-bold text-white text-center" style={{ backgroundColor: rarity.color }}>
                      {rarity.name}
                    </span>
                    <Input
                      type="number" min={0} max={100} value={prob}
                      onChange={e => updateProb(rarity.id, parseInt(e.target.value, 10) || 0)}
                      className="h-7 w-20 text-sm font-bold"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                );
              })}
            </div>
            <Button size="sm" onClick={handleSaveRarityProbs} className="mt-3 h-8">
              <Save className="w-3.5 h-3.5 mr-1.5" /> Save Probabilities
            </Button>
          </div>

          {/* Figurines List */}
          <div>
            <h4 className="font-bold text-sm mb-3">Collectibles</h4>
            {loadingFigs ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : figurines.length > 0 ? (
              <div className="space-y-0">
                {figurines.map(fig => (
                  <FigurineRow key={fig.id} fig={fig} rarities={rarities} boxId={box.id}
                    onDelete={handleDeleteFigurine} onUpdate={handleUpdateFigurine} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic py-2">No collectibles added yet.</p>
            )}

            {/* Add Figurine */}
            <div className="mt-4 p-3 rounded-xl border border-dashed border-border bg-background space-y-2">
              <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Add Collectible</h5>
              <div className="flex flex-wrap gap-2">
                <Input value={addName} onChange={e => setAddName(e.target.value)} placeholder="Collectible name" className="h-8 text-sm flex-1 min-w-32" />
                <select value={addRarityId} onChange={e => setAddRarityId(Number(e.target.value))}
                  className="h-8 rounded-lg border border-border text-sm px-2 bg-background">
                  {rarities.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <ImageUpload current={addImageUrl || null} label="Add Image" onUpload={(url) => setAddImageUrl(url)} />
                <Button size="sm" onClick={handleAddFigurine} disabled={!addName || !addRarityId || addingFig} className="h-8">
                  {addingFig ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
                  Add
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TeacherMysteryBoxes() {
  const { toast } = useToast();
  const [boxes, setBoxes] = useState<MysteryBox[]>([]);
  const [rarities, setRarities] = useState<FigurineRarity[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBoxName, setNewBoxName] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [boxesRes, raritiesRes] = await Promise.all([
        fetch(`${API}/mystery-boxes`).then(r => r.json()),
        fetch(`${API}/figurine-rarities`).then(r => r.json()),
      ]);
      setBoxes(boxesRes as MysteryBox[]);
      setRarities(raritiesRes as FigurineRarity[]);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCreateBox = async () => {
    if (!newBoxName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`${API}/mystery-boxes`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBoxName.trim(), coinPrice: 50 }),
      });
      if (!res.ok) throw new Error("Failed");
      setNewBoxName("");
      await fetchAll();
      toast({ title: "Mystery box created!" });
    } catch { toast({ title: "Failed to create box", variant: "destructive" }); }
    finally { setCreating(false); }
  };

  const handleUpdateBox = async (id: number, changes: Partial<MysteryBox>) => {
    try {
      await fetch(`${API}/mystery-boxes/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      setBoxes(prev => prev.map(b => b.id === id ? { ...b, ...changes } : b));
    } catch { toast({ title: "Failed to save", variant: "destructive" }); }
  };

  const handleDeleteBox = async (id: number) => {
    if (!confirm("Delete this mystery box and all its collectibles?")) return;
    try {
      await fetch(`${API}/mystery-boxes/${id}`, { method: "DELETE" });
      setBoxes(prev => prev.filter(b => b.id !== id));
      toast({ title: "Deleted!" });
    } catch { toast({ title: "Failed to delete", variant: "destructive" }); }
  };

  if (rarities.length === 0 && !loading) {
    return (
      <TeacherLayout>
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-8">
          <h1 className="text-3xl font-display font-bold mb-2">Mystery Boxes</h1>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
            <Sparkles className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <p className="font-bold text-amber-800">Set up collectible rarities first</p>
            <p className="text-sm text-amber-700 mt-1">Go to Settings → Collectible Rarities to create your rarity tiers before adding mystery boxes.</p>
          </div>
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Mystery Boxes</h1>
          <p className="text-muted-foreground mt-1">Create mystery boxes and manage their collectibles and rarity drop rates.</p>
        </div>

        {/* Create new box */}
        <div className="flex gap-3">
          <Input value={newBoxName} onChange={e => setNewBoxName(e.target.value)} placeholder="New box name (e.g. Forest Creatures)"
            className="font-semibold" onKeyDown={e => e.key === "Enter" && handleCreateBox()} />
          <Button onClick={handleCreateBox} disabled={!newBoxName.trim() || creating}>
            {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Create Box
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
        ) : boxes.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Sparkles className="w-12 h-12 mx-auto mb-3 text-purple-200" />
            <p className="font-display font-bold text-lg">No mystery boxes yet</p>
            <p className="text-sm mt-1">Create your first mystery box above.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {boxes.map(box => (
              <BoxPanel key={box.id} box={box} rarities={rarities} onUpdate={handleUpdateBox} onDelete={handleDeleteBox} />
            ))}
          </div>
        )}
      </div>
    </TeacherLayout>
  );
}
