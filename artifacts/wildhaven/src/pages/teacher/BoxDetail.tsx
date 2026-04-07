import { useState, useCallback, useEffect } from "react";
import { useRoute, Link } from "wouter";
import {
  ArrowLeft, Upload, Save, X, Loader2, Plus, Trash2, Edit2,
  Sparkles, ChevronDown, ChevronUp, Settings, Check,
} from "lucide-react";
import { TeacherLayout } from "./Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

interface FigurineRarity { id: number; name: string; color: string; coinValue: number; sortOrder: number; }
interface Figurine {
  id: number; name: string; imageUrl?: string | null; glowColor?: string | null;
  figurineNumber: number; rarityId: number; rarityName?: string | null; rarityColor?: string | null;
}
interface RarityProb { rarityId: number; probability: number; }
interface MysteryBox {
  id: number; name: string; description?: string | null;
  coverImageUrl?: string | null; coinPrice: number; availableInShop: boolean;
}

/* ── Image upload button ── */
function ImageUpload({ current, onUpload, label, size = "md" }: {
  current?: string | null; onUpload: (url: string) => void; label: string; size?: "sm" | "md";
}) {
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
      if (!res.ok) throw new Error();
      const data = await res.json();
      onUpload(data.url);
    } catch { toast({ title: "Upload failed", variant: "destructive" }); }
    finally { setUploading(false); e.target.value = ""; }
  };

  return (
    <label className={cn(
      "flex items-center gap-2 rounded-xl border cursor-pointer transition-colors font-bold",
      size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
      uploading ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/50 border-border"
    )}>
      {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
      {current ? "Change" : label}
      <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
    </label>
  );
}

/* ── Single figurine row ── */
function FigurineRow({ fig, rarities, onDelete, onUpdate }: {
  fig: Figurine; rarities: FigurineRarity[];
  onDelete: (id: number) => void;
  onUpdate: (id: number, changes: Partial<Figurine & { imageUrl: string }>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(fig.name);
  const [rarityId, setRarityId] = useState(fig.rarityId);
  const [glowColor, setGlowColor] = useState(fig.glowColor ?? "");
  const [glowHexInput, setGlowHexInput] = useState(fig.glowColor ?? "");
  const [saving, setSaving] = useState(false);

  const rarity = rarities.find(r => r.id === fig.rarityId);
  const effectiveGlow = fig.glowColor ?? rarity?.color;

  const setGlow = (hex: string) => { setGlowColor(hex); setGlowHexInput(hex); };
  const clearGlow = () => { setGlowColor(""); setGlowHexInput(""); };

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(fig.id, { name, rarityId, glowColor: glowColor || null });
    setSaving(false);
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
      <div className="w-10 text-xs text-muted-foreground font-mono shrink-0">
        #{String(fig.figurineNumber).padStart(3, "0")}
      </div>
      <div className="relative shrink-0">
        {fig.imageUrl ? (
          <img src={fig.imageUrl} alt={fig.name} className="w-10 h-10 object-contain rounded-lg bg-muted" loading="lazy" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
        {effectiveGlow && (
          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm"
            style={{ backgroundColor: effectiveGlow }} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex flex-col gap-2">
            {/* Name + rarity row */}
            <div className="flex items-center gap-2 flex-wrap">
              <Input value={name} onChange={e => setName(e.target.value)}
                className="h-7 text-sm flex-1 min-w-28" />
              <select value={rarityId} onChange={e => setRarityId(Number(e.target.value))}
                className="h-7 rounded-lg border border-border text-sm px-2 bg-background">
                {rarities.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>

            {/* Glow colour picker */}
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Glow Colour</span>
                {glowColor && (
                  <button onClick={clearGlow}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    <X className="w-3 h-3" /> Reset to rarity
                  </button>
                )}
              </div>

              {/* Wheel + hex input */}
              <div className="flex items-end gap-3">
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <span className="text-xs text-muted-foreground font-medium">Wheel</span>
                  <label
                    className="relative block w-10 h-10 rounded-xl border-2 border-border shadow-sm hover:border-primary transition-colors cursor-pointer overflow-hidden"
                    style={{ backgroundColor: glowColor || rarity?.color || "#6b7280" }}
                    title="Open colour picker"
                  >
                    <input
                      type="color"
                      value={glowColor || rarity?.color || "#6b7280"}
                      onChange={e => setGlow(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 drop-shadow" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="1.5" strokeOpacity="0.7"/>
                        <path d="M12 3a9 9 0 0 1 0 18" stroke="white" strokeWidth="1.5" strokeOpacity="0.4"/>
                      </svg>
                    </span>
                  </label>
                </div>

                <div className="flex-1 space-y-1">
                  <span className="text-xs text-muted-foreground font-medium">Hex value</span>
                  <div className="flex items-center border rounded-lg overflow-hidden bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 shadow-sm">
                    <span className="px-2 py-1.5 text-sm text-muted-foreground font-mono bg-muted border-r select-none">#</span>
                    <input
                      type="text"
                      value={glowHexInput.replace(/^#/, "").toUpperCase()}
                      onChange={e => {
                        const raw = e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
                        setGlowHexInput("#" + raw);
                        if (raw.length === 6) setGlowColor("#" + raw.toLowerCase());
                      }}
                      onBlur={() => setGlowHexInput(glowColor || rarity?.color || "#6b7280")}
                      className="flex-1 px-2 py-1.5 text-sm font-mono bg-transparent outline-none"
                      placeholder={(rarity?.color ?? "#6b7280").replace(/^#/, "").toUpperCase()}
                      maxLength={6}
                      spellCheck={false}
                    />
                    <div className="w-7 h-7 rounded-md mr-1 border border-border shrink-0"
                      style={{ backgroundColor: glowColor || rarity?.color || "#6b7280" }} />
                  </div>
                </div>
              </div>

              {/* Preset swatches */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  "#10b981","#3b82f6","#8b5cf6","#f59e0b","#ef4444",
                  "#06b6d4","#f97316","#d946ef","#14b8a6","#6366f1",
                  "#84cc16","#ec4899","#64748b","#f43f5e","#22c55e",
                ].map(hex => (
                  <button
                    key={hex}
                    onClick={() => setGlow(hex)}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-all",
                      (glowColor || "").toLowerCase() === hex
                        ? "border-foreground scale-110 shadow-md"
                        : "border-transparent hover:scale-105 hover:shadow-sm"
                    )}
                    style={{ backgroundColor: hex }}
                    title={hex}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">{fig.name}</span>
            {rarity && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white shrink-0"
                style={{ backgroundColor: rarity.color }}>
                {rarity.name}
              </span>
            )}
            {fig.glowColor && <span className="text-xs text-muted-foreground shrink-0">✦ custom glow</span>}
          </div>
        )}
      </div>

      <ImageUpload size="sm" current={fig.imageUrl} label="Image"
        onUpload={(url) => onUpdate(fig.id, { imageUrl: url })} />

      {editing ? (
        <div className="flex gap-1 shrink-0">
          <button onClick={handleSave} disabled={saving}
            className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary/90 disabled:opacity-50">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => { setEditing(false); setName(fig.name); setRarityId(fig.rarityId); setGlowColor(fig.glowColor ?? ""); setGlowHexInput(fig.glowColor ?? ""); }}
            className="w-7 h-7 rounded-lg border hover:bg-muted flex items-center justify-center">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex gap-1 shrink-0">
          <button onClick={() => setEditing(true)}
            className="w-7 h-7 rounded-lg border hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(fig.id)}
            className="w-7 h-7 rounded-lg border hover:bg-red-50 hover:border-red-300 flex items-center justify-center text-muted-foreground hover:text-red-600">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function TeacherBoxDetail() {
  const [, params] = useRoute("/teacher/boxes/:id");
  const boxId = Number(params?.id);
  const { toast } = useToast();

  const [box, setBox] = useState<MysteryBox | null>(null);
  const [rarities, setRarities] = useState<FigurineRarity[]>([]);
  const [figurines, setFigurines] = useState<Figurine[]>([]);
  const [rarityProbs, setRarityProbs] = useState<RarityProb[]>([]);
  const [loading, setLoading] = useState(true);

  /* Settings panel */
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCoinPrice, setEditCoinPrice] = useState(50);
  const [editShopAvail, setEditShopAvail] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [coverSaving, setCoverSaving] = useState(false);

  /* Figurine add form */
  const [addName, setAddName] = useState("");
  const [addRarityId, setAddRarityId] = useState(0);
  const [addImageUrl, setAddImageUrl] = useState("");
  const [addingFig, setAddingFig] = useState(false);

  /* Drop rates tab */
  const [activeTab, setActiveTab] = useState<"figurines" | "droprates">("figurines");
  const [probsSaving, setProbsSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [boxRes, raritiesRes, figsRes, probsRes] = await Promise.all([
        fetch(`${API}/mystery-boxes/${boxId}`).then(r => r.json()),
        fetch(`${API}/figurine-rarities`).then(r => r.json()),
        fetch(`${API}/mystery-boxes/${boxId}/figurines`).then(r => r.json()),
        fetch(`${API}/mystery-boxes/${boxId}/rarity-probs`).then(r => r.json()),
      ]);
      const b = boxRes as MysteryBox;
      setBox(b);
      setEditName(b.name);
      setEditDesc(b.description ?? "");
      setEditCoinPrice(b.coinPrice);
      setEditShopAvail(b.availableInShop);
      const rars = raritiesRes as FigurineRarity[];
      setRarities(rars);
      setAddRarityId(rars[0]?.id ?? 0);
      setFigurines(figsRes as Figurine[]);
      setRarityProbs(probsRes as RarityProb[]);
    } catch { toast({ title: "Failed to load box", variant: "destructive" }); }
    finally { setLoading(false); }
  }, [boxId, toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      const res = await fetch(`${API}/mystery-boxes/${boxId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, description: editDesc || null, coinPrice: editCoinPrice, availableInShop: editShopAvail }),
      });
      if (!res.ok) throw new Error();
      setBox(prev => prev ? { ...prev, name: editName, description: editDesc || null, coinPrice: editCoinPrice, availableInShop: editShopAvail } : prev);
      toast({ title: "Settings saved!" });
      setSettingsOpen(false);
    } catch { toast({ title: "Failed to save", variant: "destructive" }); }
    finally { setSettingsSaving(false); }
  };

  const handleCoverUpload = async (url: string) => {
    setCoverSaving(true);
    try {
      await fetch(`${API}/mystery-boxes/${boxId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverImageUrl: url }),
      });
      setBox(prev => prev ? { ...prev, coverImageUrl: url } : prev);
      toast({ title: "Cover image updated!" });
    } catch { toast({ title: "Failed to update cover", variant: "destructive" }); }
    finally { setCoverSaving(false); }
  };

  const handleAddFigurine = async () => {
    if (!addName || !addRarityId) return;
    setAddingFig(true);
    try {
      const res = await fetch(`${API}/mystery-boxes/${boxId}/figurines`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName, rarityId: addRarityId,
          imageUrl: addImageUrl || null,
          figurineNumber: (figurines.length > 0 ? Math.max(...figurines.map(f => f.figurineNumber)) : 0) + 1,
        }),
      });
      if (!res.ok) throw new Error();
      setAddName(""); setAddImageUrl(""); setAddRarityId(rarities[0]?.id ?? 0);
      await fetchAll();
      toast({ title: `${addName} added!` });
    } catch { toast({ title: "Failed to add", variant: "destructive" }); }
    finally { setAddingFig(false); }
  };

  const handleDeleteFigurine = async (id: number) => {
    if (!confirm("Delete this collectible?")) return;
    try {
      await fetch(`${API}/figurines/${id}`, { method: "DELETE" });
      setFigurines(prev => prev.filter(f => f.id !== id));
    } catch { toast({ title: "Failed", variant: "destructive" }); }
  };

  const handleUpdateFigurine = async (id: number, changes: Partial<Figurine & { imageUrl: string }>) => {
    try {
      await fetch(`${API}/figurines/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      await fetchAll();
    } catch { toast({ title: "Failed to update", variant: "destructive" }); }
  };

  const updateProb = (rarityId: number, value: number) => {
    setRarityProbs(prev => {
      const exists = prev.find(p => p.rarityId === rarityId);
      if (exists) return prev.map(p => p.rarityId === rarityId ? { ...p, probability: value } : p);
      return [...prev, { rarityId, probability: value }];
    });
  };

  const handleSaveProbs = async () => {
    setProbsSaving(true);
    try {
      await fetch(`${API}/mystery-boxes/${boxId}/rarity-probs`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rarityProbs.map(p => ({ rarityId: p.rarityId, probability: p.probability }))),
      });
      toast({ title: "Drop rates saved!" });
    } catch { toast({ title: "Failed to save", variant: "destructive" }); }
    finally { setProbsSaving(false); }
  };

  const probTotal = rarityProbs.reduce((s, p) => s + (p.probability || 0), 0);
  const settingsChanged = box && (editName !== box.name || editDesc !== (box.description ?? "") || editCoinPrice !== box.coinPrice || editShopAvail !== box.availableInShop);

  if (loading) {
    return (
      <TeacherLayout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </TeacherLayout>
    );
  }

  if (!box) {
    return (
      <TeacherLayout>
        <div className="p-8 text-center text-muted-foreground">Box not found.</div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      {/* Back + header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/teacher/packs?tab=boxes">
          <button className="p-2 rounded-xl border hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {box.coverImageUrl ? (
            <img src={box.coverImageUrl} alt={box.name} className="w-12 h-12 object-contain rounded-xl bg-muted shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-display font-bold truncate">{box.name}</h1>
            <p className="text-sm text-muted-foreground">
              {figurines.length} collectible{figurines.length !== 1 ? "s" : ""}
              {box.availableInShop && <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">In Shop</span>}
            </p>
          </div>
        </div>
      </div>

      {/* ── Settings accordion ── */}
      <div className="mb-6 border border-border rounded-2xl overflow-hidden">
        <button
          onClick={() => setSettingsOpen(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/40 transition-colors"
        >
          <div className="flex items-center gap-2 font-bold text-sm">
            <Settings className="w-4 h-4 text-muted-foreground" />
            Box Settings
          </div>
          {settingsOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {settingsOpen && (
          <div className="border-t border-border px-5 py-4 bg-muted/20 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Box Name</label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Box name" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Description</label>
              <Input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Short description (optional)" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Coin Price</label>
              <Input type="number" min={0} value={editCoinPrice} onChange={e => setEditCoinPrice(parseInt(e.target.value, 10) || 0)} className="w-28" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Shop Availability</label>
              <button
                onClick={() => setEditShopAvail(v => !v)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-bold transition-colors",
                  editShopAvail ? "bg-green-50 border-green-300 text-green-700" : "border-border text-muted-foreground hover:bg-muted/50"
                )}
              >
                {editShopAvail ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                {editShopAvail ? "Available in Shop" : "Hidden from Shop"}
              </button>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Cover Image</label>
              <div className="flex items-center gap-3">
                {box.coverImageUrl && (
                  <img src={box.coverImageUrl} alt="Cover" className="w-14 h-14 object-contain rounded-xl border border-border bg-muted" />
                )}
                <ImageUpload current={box.coverImageUrl} label="Upload Cover" onUpload={handleCoverUpload} />
                {coverSaving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              </div>
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button size="sm" onClick={handleSaveSettings} disabled={!settingsChanged || settingsSaving}>
                {settingsSaving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                Save Settings
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Section tabs ── */}
      <div className="flex gap-1 border-b border-border mb-6">
        {(["figurines", "droprates"] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 text-sm font-bold border-b-2 transition-colors -mb-px",
              activeTab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            {t === "figurines" ? `Collectibles${figurines.length > 0 ? ` (${figurines.length})` : ""}` : "Drop Rates"}
          </button>
        ))}
      </div>

      {/* ── Figurines tab ── */}
      {activeTab === "figurines" && (
        <div className="max-w-3xl space-y-6">
          {figurines.length > 0 ? (
            <div className="border border-border rounded-2xl overflow-hidden bg-card">
              {figurines.map(fig => (
                <FigurineRow key={fig.id} fig={fig} rarities={rarities}
                  onDelete={handleDeleteFigurine} onUpdate={handleUpdateFigurine} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-2xl">
              <Sparkles className="w-10 h-10 mx-auto mb-3 text-purple-200" />
              <p className="font-display font-bold text-lg">No collectibles yet</p>
              <p className="text-sm mt-1">Add your first collectible below.</p>
            </div>
          )}

          {/* Add figurine */}
          <div className="p-4 rounded-2xl border border-dashed border-border bg-muted/20 space-y-3">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Add Collectible</h4>
            <div className="flex flex-wrap gap-2">
              <Input value={addName} onChange={e => setAddName(e.target.value)}
                placeholder="Collectible name" className="h-8 text-sm flex-1 min-w-32"
                onKeyDown={e => e.key === "Enter" && handleAddFigurine()} />
              <select value={addRarityId} onChange={e => setAddRarityId(Number(e.target.value))}
                className="h-8 rounded-lg border border-border text-sm px-2 bg-background">
                {rarities.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                {addImageUrl && (
                  <img src={addImageUrl} alt="preview" className="w-8 h-8 object-contain rounded-lg border border-border bg-muted" />
                )}
                <ImageUpload current={addImageUrl || null} label="Add Image" onUpload={(url) => setAddImageUrl(url)} />
              </div>
              <Button size="sm" onClick={handleAddFigurine} disabled={!addName || !addRarityId || addingFig} className="h-8">
                {addingFig ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
                Add Collectible
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Drop Rates tab ── */}
      {activeTab === "droprates" && (
        <div className="max-w-sm space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold">Rarity Drop Rates</span>
            <span className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded-full",
              probTotal === 100 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
            )}>
              Total: {probTotal}%
            </span>
          </div>
          {rarities.map(rarity => {
            const prob = rarityProbs.find(p => p.rarityId === rarity.id)?.probability ?? 0;
            return (
              <div key={rarity.id} className="flex items-center gap-3">
                <span className="w-24 px-2 py-0.5 rounded-full text-xs font-bold text-white text-center shrink-0"
                  style={{ backgroundColor: rarity.color }}>
                  {rarity.name}
                </span>
                <Input
                  type="number" min={0} max={100} value={prob}
                  onChange={e => updateProb(rarity.id, parseInt(e.target.value, 10) || 0)}
                  className="h-8 w-20 text-sm font-bold"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            );
          })}
          <Button size="sm" onClick={handleSaveProbs} disabled={probsSaving} className="mt-2">
            {probsSaving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
            Save Drop Rates
          </Button>
        </div>
      )}
    </TeacherLayout>
  );
}
