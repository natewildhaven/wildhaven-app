import { useEffect, useRef, useState, useCallback } from "react";
import { Settings2, Upload, Trash2, Image, Music, Volume2, Check, Sparkles, KeyRound, Eye, EyeOff, Coins, ShieldCheck, AlertTriangle, Loader2, Plus, X, Save, ChevronDown, Archive, RotateCcw, Clock } from "lucide-react";
import { TeacherLayout } from "./Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSettings, useUpdateSetting } from "@/hooks/use-settings";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useCardRarities } from "@/contexts/CardRaritiesContext";
import { useCardTypes, type CardType } from "@/contexts/CardTypesContext";
import { RarityPreviewCard } from "@/components/CollectibleCard";

const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

async function uploadFile(file: File, endpoint: "image" | "audio"): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API}/uploads/${endpoint}`, { method: "POST", body: fd });
  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return data.url as string;
}

/* ── Reusable upload row ── */
type SettingKey =
  | "background_image_url"
  | "pack_open_sound_url"
  | "card_flip_sound_url"
  | "epic_flip_sound_url"
  | "mythic_flip_sound_url"
  | "legendary_flip_sound_url"
  | "box_open_sound_url"
  | "figurine_reveal_sound_url";

interface SettingRowProps {
  label: string;
  description: string;
  icon: React.ReactNode;
  currentUrl: string | null;
  accept: string;
  uploadType: "image" | "audio";
  settingKey: SettingKey;
  previewType: "image" | "audio";
  onUpdate: (key: SettingKey, value: string | null) => Promise<void>;
}

function SettingRow({ label, description, icon, currentUrl, accept, uploadType, settingKey, previewType, onUpdate }: SettingRowProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file, uploadType);
      await onUpdate(settingKey, url);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast({ title: "Upload failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    await onUpdate(settingKey, null);
  };

  return (
    <div className="bg-card rounded-2xl border border-border/60 p-6 flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-lg">{label}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>

      {/* Current value preview */}
      {currentUrl && previewType === "image" && (
        <div className="relative rounded-xl overflow-hidden border border-border/60 aspect-video bg-muted">
          <img src={currentUrl} alt="Current background" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <span className="absolute bottom-2 left-3 text-white text-xs font-semibold">Current</span>
        </div>
      )}
      {currentUrl && previewType === "audio" && (
        <div className="rounded-xl border border-border/60 bg-muted/40 p-4 flex flex-col gap-2">
          <p className="text-xs font-semibold text-muted-foreground">Current file</p>
          <audio controls className="w-full" src={currentUrl} />
        </div>
      )}

      {!currentUrl && (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 py-8 flex flex-col items-center gap-2 text-muted-foreground">
          {previewType === "image" ? <Image className="w-8 h-8 opacity-40" /> : <Music className="w-8 h-8 opacity-40" />}
          <span className="text-sm">No file set — using default</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? (
            <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />Uploading…</span>
          ) : saved ? (
            <span className="flex items-center gap-2 text-green-600"><Check className="w-4 h-4" />Saved!</span>
          ) : (
            <><Upload className="w-4 h-4" />Upload {previewType === "image" ? "Image" : "Sound"}</>
          )}
        </Button>
        {currentUrl && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive gap-2"
            onClick={handleRemove}
          >
            <Trash2 className="w-4 h-4" /> Remove
          </Button>
        )}
      </div>
    </div>
  );
}

/* ── Rarity Sounds Section ── */
function RaritySoundsSection() {
  const { rarities, refetch } = useCardRarities();
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const [uploading, setUploading] = useState<Record<number, boolean>>({});
  const [playing, setPlaying] = useState<Record<number, HTMLAudioElement | null>>({});
  const { toast } = useToast();

  const handleUpload = async (rarityId: number, file: File) => {
    setUploading(prev => ({ ...prev, [rarityId]: true }));
    try {
      const url = await uploadFile(file, "audio");
      const res = await fetch(`${API}/card-rarities/${rarityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soundUrl: url }),
      });
      if (!res.ok) throw new Error();
      refetch();
    } catch {
      toast({ title: "Upload failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setUploading(prev => ({ ...prev, [rarityId]: false }));
      const ref = fileRefs.current[rarityId];
      if (ref) ref.value = "";
    }
  };

  const handleRemove = async (rarityId: number) => {
    const res = await fetch(`${API}/card-rarities/${rarityId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ soundUrl: null }),
    });
    if (res.ok) refetch();
  };

  const handlePlay = (rarityId: number, url: string) => {
    const existing = playing[rarityId];
    if (existing) { existing.pause(); existing.currentTime = 0; setPlaying(prev => ({ ...prev, [rarityId]: null })); return; }
    const audio = new Audio(url);
    audio.volume = 0.8;
    audio.onended = () => setPlaying(prev => ({ ...prev, [rarityId]: null }));
    audio.play().catch(() => {});
    setPlaying(prev => ({ ...prev, [rarityId]: audio }));
  };

  if (!rarities.length) return <div className="text-sm text-muted-foreground">Loading rarities…</div>;

  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      {rarities.map((rarity, idx) => (
        <div key={rarity.id} className={cn("flex items-center gap-3 px-4 py-3", idx > 0 && "border-t border-border/40")}>
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: rarity.color }} />
          <span className="font-semibold text-sm w-24 shrink-0">{rarity.name}</span>
          <div className="flex-1 min-w-0">
            {rarity.soundUrl ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePlay(rarity.id, rarity.soundUrl!)}
                  className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors shrink-0"
                  title={playing[rarity.id] ? "Stop" : "Preview"}
                >
                  {playing[rarity.id] ? "■" : "▶"}
                </button>
                <span className="text-xs text-muted-foreground truncate">Custom sound uploaded</span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground italic">Using card flip fallback</span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              ref={el => { fileRefs.current[rarity.id] = el; }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(rarity.id, f); }}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              disabled={!!uploading[rarity.id]}
              onClick={() => fileRefs.current[rarity.id]?.click()}
            >
              {uploading[rarity.id] ? (
                <span className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-3 h-3" />
              )}
              {rarity.soundUrl ? "Replace" : "Upload"}
            </Button>
            {rarity.soundUrl && (
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleRemove(rarity.id)}>
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Global Sounds Section ── */
type GlobalSoundEntry = {
  key: SettingKey;
  label: string;
  description: string;
  icon: React.ReactNode;
  currentUrl: string | null;
};

function GlobalSoundsSection({ entries, onUpdate }: {
  entries: GlobalSoundEntry[];
  onUpdate: (key: SettingKey, value: string | null) => Promise<void>;
}) {
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [playing, setPlaying] = useState<Record<string, HTMLAudioElement | null>>({});
  const { toast } = useToast();

  const handleUpload = async (key: SettingKey, file: File) => {
    setUploading(prev => ({ ...prev, [key]: true }));
    try {
      const url = await uploadFile(file, "audio");
      await onUpdate(key, url);
    } catch {
      toast({ title: "Upload failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setUploading(prev => ({ ...prev, [key]: false }));
      const ref = fileRefs.current[key];
      if (ref) ref.value = "";
    }
  };

  const handlePlay = (key: string, url: string) => {
    const existing = playing[key];
    if (existing) {
      existing.pause();
      existing.currentTime = 0;
      setPlaying(prev => ({ ...prev, [key]: null }));
      return;
    }
    const audio = new Audio(url);
    audio.volume = 0.8;
    audio.onended = () => setPlaying(prev => ({ ...prev, [key]: null }));
    audio.play().catch(() => {});
    setPlaying(prev => ({ ...prev, [key]: audio }));
  };

  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      {entries.map((entry, idx) => (
        <div key={entry.key} className={cn("flex items-center gap-3 px-4 py-3", idx > 0 && "border-t border-border/40")}>
          <div className="text-muted-foreground shrink-0">{entry.icon}</div>
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-sm">{entry.label}</span>
            <p className="text-xs text-muted-foreground leading-snug">{entry.description}</p>
            {entry.currentUrl && (
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={() => handlePlay(entry.key, entry.currentUrl!)}
                  className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors shrink-0 text-[10px]"
                  title={playing[entry.key] ? "Stop" : "Preview"}
                >
                  {playing[entry.key] ? "■" : "▶"}
                </button>
                <span className="text-xs text-muted-foreground">Custom sound uploaded</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              ref={el => { fileRefs.current[entry.key] = el; }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(entry.key, f); }}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              disabled={!!uploading[entry.key]}
              onClick={() => fileRefs.current[entry.key]?.click()}
            >
              {uploading[entry.key]
                ? <span className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
                : <Upload className="w-3 h-3" />}
              {entry.currentUrl ? "Replace" : "Upload"}
            </Button>
            {entry.currentUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                onClick={() => onUpdate(entry.key, null)}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Coin Values Section ── */
type CoinSettingKey = "coin_value_common" | "coin_value_rare" | "coin_value_epic" | "coin_value_mythic" | "coin_value_legendary";

const RARITIES_COIN: { label: string; key: CoinSettingKey; defaultValue: number; color: string }[] = [
  { label: "Common", key: "coin_value_common", defaultValue: 1, color: "text-green-700 bg-green-50 border-green-200" },
  { label: "Rare", key: "coin_value_rare", defaultValue: 2, color: "text-blue-700 bg-blue-50 border-blue-200" },
  { label: "Epic", key: "coin_value_epic", defaultValue: 4, color: "text-purple-700 bg-purple-50 border-purple-200" },
  { label: "Mythic", key: "coin_value_mythic", defaultValue: 5, color: "text-slate-700 bg-slate-50 border-slate-200" },
  { label: "Legendary", key: "coin_value_legendary", defaultValue: 10, color: "text-yellow-700 bg-yellow-50 border-yellow-200" },
];

function CoinValuesSection({ settings, updateSetting }: { settings: ReturnType<typeof useSettings>; updateSetting: ReturnType<typeof useUpdateSetting> }) {
  const { toast } = useToast();
  const [localValues, setLocalValues] = useState<Record<CoinSettingKey, string>>({
    coin_value_common: String(settings.coinValueCommon),
    coin_value_rare: String(settings.coinValueRare),
    coin_value_epic: String(settings.coinValueEpic),
    coin_value_mythic: String(settings.coinValueMythic),
    coin_value_legendary: String(settings.coinValueLegendary),
  });
  const [saving, setSaving] = useState<CoinSettingKey | null>(null);
  const [saved, setSaved] = useState<CoinSettingKey | null>(null);

  const handleChange = (key: CoinSettingKey, val: string) => {
    setLocalValues(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = async (key: CoinSettingKey) => {
    const num = parseInt(localValues[key], 10);
    if (isNaN(num) || num < 0) {
      toast({ title: "Invalid value", description: "Must be a non-negative number.", variant: "destructive" });
      return;
    }
    setSaving(key);
    try {
      await updateSetting(key, String(num));
      setSaved(key);
      setTimeout(() => setSaved(null), 2000);
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border/60 p-6 flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Coins className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-display font-bold text-lg">Coins per Duplicate Rarity</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Set how many coins students receive when they open a duplicate card of each rarity.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {RARITIES_COIN.map(({ label, key, color }) => (
          <div key={key} className={`flex flex-col gap-1.5 border rounded-xl px-3 py-2.5 ${color}`}>
            <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min={0}
                value={localValues[key]}
                onChange={e => handleChange(key, e.target.value)}
                onBlur={() => handleSave(key)}
                onKeyDown={e => e.key === "Enter" && handleSave(key)}
                disabled={saving === key}
                className="w-full text-center font-bold text-lg h-10 bg-white/80 border-current/30"
              />
              {saved === key && <Check className="w-4 h-4 text-green-600 shrink-0" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Figurine Rarities Section ── */

interface FigurineRarity { id: number; name: string; color: string; coinValue: number; sortOrder: number; }

function FigurineRaritiesSection() {
  const { toast } = useToast();
  const [rarities, setRarities] = useState<FigurineRarity[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6b7280");
  const [newCoinValue, setNewCoinValue] = useState(5);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#6b7280");
  const [editCoinValue, setEditCoinValue] = useState(5);
  const [saving, setSaving] = useState(false);

  const fetchRarities = useCallback(async () => {
    try {
      const res = await fetch(`${API}/figurine-rarities`);
      setRarities(await res.json());
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRarities(); }, [fetchRarities]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await fetch(`${API}/figurine-rarities`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), color: newColor, coinValue: newCoinValue, sortOrder: rarities.length }),
      });
      setNewName(""); setNewColor("#6b7280"); setNewCoinValue(5);
      await fetchRarities();
      toast({ title: "Rarity created!" });
    } catch { toast({ title: "Failed", variant: "destructive" }); }
    finally { setCreating(false); }
  };

  const handleEdit = (rarity: FigurineRarity) => {
    setEditingId(rarity.id); setEditName(rarity.name); setEditColor(rarity.color); setEditCoinValue(rarity.coinValue);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await fetch(`${API}/figurine-rarities/${editingId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, color: editColor, coinValue: editCoinValue }),
      });
      setEditingId(null);
      await fetchRarities();
      toast({ title: "Saved!" });
    } catch { toast({ title: "Failed", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this rarity? This cannot be undone.")) return;
    try {
      await fetch(`${API}/figurine-rarities/${id}`, { method: "DELETE" });
      await fetchRarities();
      toast({ title: "Deleted!" });
    } catch { toast({ title: "Failed", variant: "destructive" }); }
  };

  return (
    <div className="bg-card rounded-2xl border border-border/60 p-6 flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-display font-bold text-lg">Collectible Rarities</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Define the rarity tiers for mystery box collectibles. Set names, colours, and duplicate coin values.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-2">
          {rarities.map(rarity => (
            <div key={rarity.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-muted/20">
              {editingId === rarity.id ? (
                <>
                  <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer border border-border" />
                  <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8 flex-1 text-sm font-bold" placeholder="Rarity name" />
                  <div className="flex items-center gap-1 shrink-0">
                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                    <Input type="number" min={0} value={editCoinValue} onChange={e => setEditCoinValue(Number(e.target.value))} className="h-8 w-16 text-sm font-bold text-center" />
                  </div>
                  <button onClick={handleSaveEdit} disabled={saving} className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary/90 disabled:opacity-50">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => setEditingId(null)} className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-muted">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-lg shrink-0 border border-white/20" style={{ backgroundColor: rarity.color }} />
                  <span className="flex-1 font-bold text-sm">{rarity.name}</span>
                  <div className="flex items-center gap-1 text-amber-600 text-sm font-bold shrink-0">
                    <Coins className="w-3.5 h-3.5 text-amber-500" /> {rarity.coinValue} coins
                  </div>
                  <button onClick={() => handleEdit(rarity)} className="w-8 h-8 rounded-lg border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted">
                    <Plus className="w-3.5 h-3.5 rotate-45" />
                  </button>
                  <button onClick={() => handleDelete(rarity.id)} className="w-8 h-8 rounded-lg border flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 hover:border-red-300">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add new rarity */}
      <div className="flex items-center gap-2 flex-wrap p-3 rounded-xl border border-dashed border-border bg-background">
        <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer border border-border shrink-0" />
        <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="New rarity name" className="h-8 flex-1 min-w-28 text-sm font-bold" onKeyDown={e => e.key === "Enter" && handleCreate()} />
        <div className="flex items-center gap-1 shrink-0">
          <Coins className="w-3.5 h-3.5 text-amber-500" />
          <Input type="number" min={0} value={newCoinValue} onChange={e => setNewCoinValue(Number(e.target.value))} className="h-8 w-16 text-sm font-bold text-center" placeholder="Coins" />
        </div>
        <Button size="sm" onClick={handleCreate} disabled={!newName.trim() || creating} className="h-8 shrink-0">
          {creating ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
          Add
        </Button>
      </div>
    </div>
  );
}

/* ── Dedup Section ── */
interface DedupStatus {
  cleanedAt: string | null;
  pendingDuplicates: number;
}

interface DedupResult {
  studentsAffected: number;
  duplicatesRemoved: number;
  coinsAwarded: number;
  cleanedAt: string;
}

function DedupSection() {
  const { toast } = useToast();
  const [status, setStatus] = useState<DedupStatus | null>(null);
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<DedupResult | null>(null);

  useEffect(() => {
    fetch(`${API}/admin/dedup-status`)
      .then(r => r.json())
      .then(setStatus)
      .catch(() => {});
  }, []);

  const handleRun = async () => {
    setRunning(true);
    try {
      const res = await fetch(`${API}/admin/dedup-collections`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      const data: DedupResult = await res.json();
      setLastResult(data);
      setStatus({ cleanedAt: data.cleanedAt, pendingDuplicates: 0 });
      if (data.duplicatesRemoved === 0) {
        toast({ title: "No duplicates found", description: "All collections are already clean." });
      } else {
        toast({
          title: "Cleanup complete!",
          description: `Removed ${data.duplicatesRemoved} duplicate${data.duplicatesRemoved !== 1 ? "s" : ""} across ${data.studentsAffected} student${data.studentsAffected !== 1 ? "s" : ""} and awarded ${data.coinsAwarded} coins.`,
        });
      }
    } catch {
      toast({ title: "Cleanup failed", description: "Could not reach the server.", variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const formattedDate = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="bg-card rounded-2xl border border-border/60 p-6 flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-display font-bold text-lg">Clean Up Existing Duplicates</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Scan all student collections, remove any extra copies of cards already owned, and award coins based on the current rarity coin values above. The first copy of each card is always kept.
          </p>
        </div>
      </div>

      {status && status.pendingDuplicates > 0 && !lastResult && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-amber-700 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span><strong>{status.pendingDuplicates}</strong> duplicate entr{status.pendingDuplicates !== 1 ? "ies" : "y"} found across all collections.</span>
        </div>
      )}

      {(status?.cleanedAt || lastResult) && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-green-700 text-sm">
          <Check className="w-4 h-4 shrink-0" />
          <span>
            Last cleaned: <strong>{formattedDate((lastResult?.cleanedAt ?? status?.cleanedAt)!)}</strong>
            {lastResult && lastResult.duplicatesRemoved > 0 && (
              <> — removed <strong>{lastResult.duplicatesRemoved}</strong> duplicate{lastResult.duplicatesRemoved !== 1 ? "s" : ""}, awarded <strong>{lastResult.coinsAwarded}</strong> coins</>
            )}
            {lastResult && lastResult.duplicatesRemoved === 0 && " — no duplicates found"}
          </span>
        </div>
      )}

      {status && status.pendingDuplicates === 0 && !lastResult && status.cleanedAt === null && (
        <div className="text-sm text-muted-foreground">No duplicates found in any student collection.</div>
      )}

      <Button
        onClick={handleRun}
        disabled={running}
        variant="outline"
        className="self-start gap-2 font-semibold border-amber-300 text-amber-700 hover:bg-amber-50"
      >
        {running ? <><Loader2 className="w-4 h-4 animate-spin" /> Running…</> : <><ShieldCheck className="w-4 h-4" /> Run Cleanup Now</>}
      </Button>
    </div>
  );
}

/* ── Card Rarities Section ── */

interface CardRarityEffectsNew { surface: string[]; border: string[]; glow: string[]; confetti: string[]; }
interface CardRarity { id: number; name: string; color: string; icon: string; iconUrl: string | null; coinValue: number; sortOrder: number; effects: CardRarityEffectsNew | null; }

const SURFACE_OPTIONS = [
  { value: "gleam",          label: "✨ Gleam"           },
  { value: "shine",          label: "🌈 Holographic Shine" },
  { value: "sparkle",        label: "✦ Sparkle"          },
  { value: "ember",          label: "🔥 Embers"           },
  { value: "constellation",  label: "✶ Constellation"    },
  { value: "fireflies",      label: "🪲 Fireflies"        },
  { value: "snow",           label: "❄ Snowfall"         },
  { value: "bubbles",        label: "🫧 Bubbles"          },
  { value: "petals",         label: "🌸 Petals"           },
  { value: "hearts",         label: "💛 Hearts"           },
  { value: "stars",          label: "⭐ Shooting Stars"   },
  { value: "rain",           label: "🌧 Rain"             },
];
const BORDER_OPTIONS = [
  { value: "rainbow",    label: "🌈 Rainbow Cycle"   },
  { value: "electric",   label: "⚡ Electric Blue"   },
  { value: "fire",       label: "🔥 Fiery Orange"    },
  { value: "lava",       label: "🌋 Lava Red"        },
  { value: "ice",        label: "🧊 Icy Blue"        },
  { value: "ocean",      label: "🌊 Ocean"           },
  { value: "forest",     label: "🌿 Forest Green"    },
  { value: "golden",     label: "✨ Golden"          },
  { value: "dawn",       label: "🌅 Dawn"            },
  { value: "neon-pink",  label: "💜 Neon Purple"     },
  { value: "neon-blue",  label: "💙 Neon Teal"       },
  { value: "neon-green", label: "💚 Neon Green"      },
  { value: "stardust",   label: "🌟 Stardust"        },
  { value: "void",       label: "🌌 Void Dark"       },
  { value: "pulse",      label: "💫 Pulse"           },
];
const GLOW_OPTIONS = [
  { value: "ember-glow",    label: "🟠 Ember"        },
  { value: "bright-shadow", label: "🟣 Violet"       },
  { value: "aura",          label: "🔵 Aura"         },
  { value: "golden-glow",   label: "✨ Golden"       },
  { value: "pulse-glow",    label: "💫 Pulse"        },
  { value: "neon-glow",     label: "🟢 Neon Teal"   },
  { value: "moonbeam",      label: "🌙 Moonbeam"     },
  { value: "rose-glow",     label: "❤️ Rose"         },
];
const CONFETTI_OPTIONS = [
  { value: "gold",    label: "🥇 Gold"    },
  { value: "rainbow", label: "🌈 Rainbow" },
  { value: "red",     label: "🔴 Red"     },
  { value: "blue",    label: "🔵 Blue"    },
  { value: "green",   label: "🟢 Green"   },
  { value: "pink",    label: "🩷 Pink"    },
  { value: "purple",  label: "💜 Purple"  },
];

function EffectMultiSelect({ label, options, selected, onChange }: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const btnRef = useRef<HTMLButtonElement>(null);

  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const estimatedH = Math.min(options.length * 28 + 56, 260);
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < estimatedH;
      setDropdownStyle(openUp
        ? { position: "fixed", bottom: window.innerHeight - rect.top + 4, left: rect.left, minWidth: 176, zIndex: 9999 }
        : { position: "fixed", top: rect.bottom + 4, left: rect.left, minWidth: 176, zIndex: 9999 }
      );
    }
    setOpen(o => !o);
  };

  return (
    <div className="relative">
      <button ref={btnRef} type="button" onClick={handleToggle}
        className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-border bg-background text-xs hover:bg-muted transition-colors whitespace-nowrap">
        <span className="text-muted-foreground font-medium">{label}</span>
        {selected.length > 0 && (
          <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-[10px] font-bold leading-5">{selected.length}</span>
        )}
        <ChevronDown className="w-3 h-3 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            className="bg-popover border border-border rounded-xl shadow-xl p-1.5 max-h-64 overflow-y-auto"
            style={dropdownStyle}
          >
            {selected.length > 0 && (
              <button onClick={() => onChange([])}
                className="w-full text-left px-2 py-1 text-xs text-muted-foreground hover:bg-muted rounded-lg mb-1">
                Clear all
              </button>
            )}
            {options.map(opt => (
              <label key={opt.value} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-muted cursor-pointer text-xs">
                <input type="checkbox" checked={selected.includes(opt.value)} onChange={() => toggle(opt.value)}
                  className="rounded border-border" />
                {opt.label}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CardRaritiesSection() {
  const { toast } = useToast();
  const { refetch: refetchContext } = useCardRarities();
  const [rarities, setRarities] = useState<CardRarity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#6b7280");
  const [editIconUrl, setEditIconUrl] = useState<string | null>(null);
  const [editCoinValue, setEditCoinValue] = useState(1);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [editEffects, setEditEffects] = useState<CardRarityEffectsNew>({ surface: [], border: [], glow: [], confetti: [] });
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Add new rarity
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6b7280");
  const [newCoinValue, setNewCoinValue] = useState(1);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchRarities = useCallback(async () => {
    try {
      const res = await fetch(`${API}/card-rarities`);
      setRarities(await res.json());
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRarities(); }, [fetchRarities]);

  const startEdit = (r: CardRarity) => {
    setEditingId(r.id);
    setEditName(r.name);
    setEditColor(r.color);
    setEditIconUrl(r.iconUrl ?? null);
    setEditCoinValue(r.coinValue ?? 1);
    const raw = r.effects as Record<string, unknown> | null;
    if (raw && Array.isArray(raw.surface)) {
      // Strip legacy confetti-* entries from surface and migrate them to confetti[]
      const rawSurface = (raw.surface as string[]);
      const legacyConfetti = rawSurface
        .filter(v => v.startsWith("confetti-"))
        .map(v => v.replace("confetti-", ""));
      const cleanSurface = rawSurface.filter(v => !v.startsWith("confetti-"));
      const existingConfetti = (raw.confetti as string[]) ?? [];
      const mergedConfetti = [...new Set([...existingConfetti, ...legacyConfetti])];
      setEditEffects({
        surface:  cleanSurface,
        border:   (raw.border as string[]) ?? [],
        glow:     (raw.glow   as string[]) ?? [],
        confetti: mergedConfetti,
      });
    } else {
      // Fallback for any lingering old-format records in browser state
      const surface: string[] = [];
      const border: string[] = [];
      const glow: string[] = [];
      const confetti: string[] = [];
      if (raw?.particles === "sparkle") surface.push("sparkle");
      if (raw?.particles === "ember") surface.push("ember");
      if (raw?.prismaticBorder === true) border.push("rainbow");
      if (raw?.emberGlow === true) glow.push("ember-glow");
      if (raw?.brightShadow === true) glow.push("bright-shadow");
      if (raw?.confetti === "gold") confetti.push("gold");
      if (raw?.confetti === "purple") confetti.push("purple");
      setEditEffects({ surface, border, glow, confetti });
    }
  };

  const handleIconUpload = async (file: File) => {
    setUploadingIcon(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API}/uploads/image`, { method: "POST", body: form });
      const data = await res.json();
      if (data.url) setEditIconUrl(data.url);
      else toast({ title: "Upload failed", variant: "destructive" });
    } catch { toast({ title: "Upload failed", variant: "destructive" }); }
    finally { setUploadingIcon(false); }
  };

  const handleSave = async (id: number) => {
    setSaving(true);
    try {
      await fetch(`${API}/card-rarities/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), color: editColor, iconUrl: editIconUrl, coinValue: editCoinValue, effects: editEffects }),
      });
      await fetchRarities();
      refetchContext();
      setEditingId(null);
      toast({ title: "Card rarity updated!" });
    } catch { toast({ title: "Failed", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      await fetch(`${API}/card-rarities/restore-defaults`, { method: "POST" });
      await fetchRarities();
      refetchContext();
      setEditingId(null);
      toast({ title: "Defaults restored!" });
    } catch { toast({ title: "Failed", variant: "destructive" }); }
    finally { setRestoring(false); }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`${API}/card-rarities`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), color: newColor, coinValue: newCoinValue, sortOrder: rarities.length }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: err.error ?? "Failed to create rarity", variant: "destructive" });
        return;
      }
      await fetchRarities();
      refetchContext();
      setNewName(""); setNewColor("#6b7280"); setNewCoinValue(1);
      toast({ title: "Rarity created!" });
    } catch { toast({ title: "Failed", variant: "destructive" }); }
    finally { setCreating(false); }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete the "${name}" rarity? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await fetch(`${API}/card-rarities/${id}`, { method: "DELETE" });
      await fetchRarities();
      refetchContext();
      if (editingId === id) setEditingId(null);
      toast({ title: "Rarity deleted" });
    } catch { toast({ title: "Failed", variant: "destructive" }); }
    finally { setDeleting(null); }
  };

  if (loading) return <div className="py-4 text-muted-foreground text-sm">Loading…</div>;

  return (
    <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
      <div className="flex items-center justify-between gap-4 flex-wrap px-6 pt-5 pb-3">
        <p className="text-sm text-muted-foreground">Click a rarity to edit its name, icon, duplicate coin value, and card effects.</p>
        <Button variant="outline" size="sm" onClick={handleRestore} disabled={restoring} className="shrink-0 text-xs">
          {restoring ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />Restoring…</> : "Restore Defaults"}
        </Button>
      </div>

      <div className="flex flex-col divide-y divide-border/50">
        {rarities.map(r => (
          <div key={r.id} className={editingId === r.id ? "px-6 py-4 bg-muted/40" : "px-6 py-3"}>
            {editingId === r.id ? (
              <div className="flex gap-6 items-start">
              <div className="flex-1 flex flex-col gap-4">
                {/* Row 1: name + colour */}
                <div className="flex items-center gap-3 flex-wrap">
                  <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8 text-sm w-44" placeholder="Name" />
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    Colour
                    <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-border p-0.5 bg-background" />
                  </label>
                  <span
                    className="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full text-white"
                    style={{ backgroundColor: editColor }}
                  >{editName || "Preview"}</span>
                </div>
                {/* Row 2: icon + coin value */}
                <div className="flex items-start gap-6 border-t border-border/40 pt-3">
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Icon</span>
                    <div className="flex items-center gap-3">
                      {editIconUrl ? (
                        <div className="relative group">
                          <img src={editIconUrl} alt="icon" className="w-12 h-12 object-contain rounded-lg border border-border bg-muted/30" />
                          <button
                            onClick={() => setEditIconUrl(null)}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-xs items-center justify-center hidden group-hover:flex"
                          >×</button>
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg border border-dashed border-border bg-muted/30 flex items-center justify-center text-muted-foreground/40">
                          <Image className="w-5 h-5" />
                        </div>
                      )}
                      <label className="cursor-pointer">
                        <span className="text-xs text-muted-foreground hover:text-foreground border border-border/60 rounded-lg px-2.5 py-1.5 hover:bg-muted transition-colors font-medium inline-flex items-center gap-1.5">
                          {uploadingIcon ? <><Loader2 className="w-3 h-3 animate-spin" />Uploading…</> : <><Upload className="w-3 h-3" />Upload PNG</>}
                        </span>
                        <input type="file" accept="image/png,image/webp,image/gif,image/*" className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleIconUpload(f); }} />
                      </label>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Coins per duplicate</span>
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-amber-500 shrink-0" />
                      <Input
                        type="number" min={0} value={editCoinValue}
                        onChange={e => setEditCoinValue(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-20 h-8 text-center font-bold text-sm"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground/60">Awarded when student draws a duplicate</p>
                  </div>
                </div>
                {/* Row 3: effects */}
                <div className="flex flex-col gap-2 border-t border-border/40 pt-3">
                  <span className="text-xs font-medium text-muted-foreground">Card effects</span>
                  <div className="flex flex-wrap gap-2">
                    <EffectMultiSelect
                      label="Surface"
                      options={SURFACE_OPTIONS}
                      selected={editEffects.surface}
                      onChange={v => setEditEffects(e => ({ ...e, surface: v }))}
                    />
                    <EffectMultiSelect
                      label="Border"
                      options={BORDER_OPTIONS}
                      selected={editEffects.border}
                      onChange={v => setEditEffects(e => ({ ...e, border: v }))}
                    />
                    <EffectMultiSelect
                      label="Glow"
                      options={GLOW_OPTIONS}
                      selected={editEffects.glow}
                      onChange={v => setEditEffects(e => ({ ...e, glow: v }))}
                    />
                    <EffectMultiSelect
                      label="Confetti"
                      options={CONFETTI_OPTIONS}
                      selected={editEffects.confetti}
                      onChange={v => setEditEffects(e => ({ ...e, confetti: v }))}
                    />
                  </div>
                  {(editEffects.surface.length > 0 || editEffects.border.length > 0 || editEffects.glow.length > 0 || editEffects.confetti.length > 0) && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {editEffects.surface.map(v => <span key={v} className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-1.5 py-0.5 text-[11px]">{v}</span>)}
                      {editEffects.border.map(v => <span key={v} className="bg-violet-50 text-violet-700 border border-violet-200 rounded px-1.5 py-0.5 text-[11px]">{v}</span>)}
                      {editEffects.glow.map(v => <span key={v} className="bg-amber-50 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5 text-[11px]">{v}</span>)}
                      {editEffects.confetti.map(v => <span key={v} className="bg-pink-50 text-pink-700 border border-pink-200 rounded px-1.5 py-0.5 text-[11px]">🎊 {v}</span>)}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleSave(r.id)} disabled={saving} className="h-7 text-xs px-3">
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Save className="w-3 h-3 mr-1" />Save</>}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="h-7 text-xs px-3">Cancel</Button>
                </div>
              </div>
              {/* Live preview card */}
              <div className="shrink-0 pt-1">
                <RarityPreviewCard
                  effects={editEffects}
                  color={editColor}
                  name={editName}
                  iconUrl={editIconUrl}
                />
              </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {r.iconUrl ? (
                  <img src={r.iconUrl} alt={r.name} className="w-8 h-8 object-contain shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded border border-dashed border-border/60 bg-muted/30 shrink-0" />
                )}
                <span
                  className="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full text-white shrink-0"
                  style={{ backgroundColor: r.color }}
                >
                  {r.name}
                </span>
                <div className="flex gap-1.5 text-xs text-muted-foreground flex-1 flex-wrap items-center">
                  <span className="flex items-center gap-0.5"><Coins className="w-3 h-3 text-amber-500" />{r.coinValue ?? 1}</span>
                  {(r.effects?.surface ?? []).filter(v => !v.startsWith("confetti-")).map(v => <span key={v} className="bg-muted rounded px-1.5 py-0.5">{v}</span>)}
                  {(r.effects?.border ?? []).map(v => <span key={v} className="bg-violet-100/60 text-violet-700 rounded px-1.5 py-0.5">{v}</span>)}
                  {(r.effects?.glow ?? []).map(v => <span key={v} className="bg-amber-100/60 text-amber-700 rounded px-1.5 py-0.5">{v}</span>)}
                  {(r.effects?.confetti ?? []).map(v => <span key={v} className="bg-pink-50 text-pink-700 border border-pink-200 rounded px-1.5 py-0.5">🎊 {v}</span>)}
                </div>
                <button onClick={() => startEdit(r)}
                  className="text-xs text-muted-foreground hover:text-foreground border border-border/60 rounded-lg px-2.5 py-1 hover:bg-muted transition-colors shrink-0 font-medium">
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(r.id, r.name)}
                  disabled={deleting === r.id}
                  className="w-7 h-7 rounded-lg border border-border/60 flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors shrink-0"
                >
                  {deleting === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add new rarity row */}
      <div className="px-6 py-4 border-t border-border/50 bg-muted/20">
        <p className="text-xs font-medium text-muted-foreground mb-3">Add new rarity</p>
        <div className="flex items-center gap-3 flex-wrap">
          <Input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Rarity name"
            className="h-8 text-sm w-36 font-bold"
            onKeyDown={e => e.key === "Enter" && handleCreate()}
          />
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Colour
            <input
              type="color"
              value={newColor}
              onChange={e => setNewColor(e.target.value)}
              className="w-8 h-8 rounded-lg cursor-pointer border border-border p-0.5 bg-background"
            />
          </label>
          {newName && (
            <span
              className="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full text-white shrink-0"
              style={{ backgroundColor: newColor }}
            >{newName}</span>
          )}
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            <Input
              type="number" min={0} value={newCoinValue}
              onChange={e => setNewCoinValue(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-16 h-8 text-center font-bold text-sm"
            />
            <span>coins/dup</span>
          </label>
          <Button size="sm" onClick={handleCreate} disabled={!newName.trim() || creating} className="h-8 shrink-0">
            {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Plus className="w-3.5 h-3.5 mr-1" />Add Rarity</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ChangePasswordSection() {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "New password and confirmation must be identical.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 4) {
      toast({ title: "Password too short", description: "Must be at least 4 characters.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`${API}/auth/teacher/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Password updated!", description: "Your new password is active." });
        setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      } else {
        toast({ title: "Failed to update password", description: data.error ?? "Unknown error", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Could not connect to server.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-5 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <KeyRound className="w-4 h-4" />
        </div>
        <div>
          <p className="font-semibold text-sm">Teacher Portal Password</p>
          <p className="text-xs text-muted-foreground">Change the password used to access the teacher portal.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <Input
            type={showCurrent ? "text" : "password"}
            placeholder="Current password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            required
          />
          <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
            {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <div className="relative">
          <Input
            type={showNew ? "text" : "password"}
            placeholder="New password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            required
          />
          <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
            {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <Input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          required
        />
        <Button type="submit" disabled={isSaving || !currentPassword || !newPassword || !confirmPassword} className="w-full font-bold gap-2">
          {isSaving ? "Saving…" : <><Check className="w-4 h-4" /> Update Password</>}
        </Button>
      </form>
    </div>
  );
}

/* ── Card Types Section ── */

function CardTypesSection() {
  const { toast } = useToast();
  const { refetch: refetchContext } = useCardTypes();
  const [types, setTypes] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#6b7280");
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6b7280");
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchTypes = useCallback(async () => {
    try {
      const res = await fetch(`${API}/card-types`);
      setTypes(await res.json());
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTypes(); }, [fetchTypes]);

  const startEdit = (t: CardType) => { setEditingId(t.id); setEditName(t.name); setEditColor(t.color); };

  const handleSave = async (id: number) => {
    setSaving(true);
    try {
      await fetch(`${API}/card-types/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), color: editColor }),
      });
      await fetchTypes();
      refetchContext();
      setEditingId(null);
      toast({ title: "Card type updated!" });
    } catch { toast({ title: "Failed", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`${API}/card-types`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), color: newColor, sortOrder: types.length }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: err.error ?? "Failed to create type", variant: "destructive" });
        return;
      }
      await fetchTypes();
      refetchContext();
      setNewName(""); setNewColor("#6b7280");
      toast({ title: "Card type created!" });
    } catch { toast({ title: "Failed", variant: "destructive" }); }
    finally { setCreating(false); }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete the "${name}" type? Cards with this tag will keep it but it won't appear in dropdowns.`)) return;
    setDeleting(id);
    try {
      await fetch(`${API}/card-types/${id}`, { method: "DELETE" });
      await fetchTypes();
      refetchContext();
      if (editingId === id) setEditingId(null);
      toast({ title: "Card type deleted" });
    } catch { toast({ title: "Failed", variant: "destructive" }); }
    finally { setDeleting(null); }
  };

  if (loading) return <div className="py-4 text-muted-foreground text-sm">Loading…</div>;

  return (
    <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
      <div className="px-6 pt-5 pb-3">
        <p className="text-sm text-muted-foreground">
          Card types are simple colour-coded labels you can attach to cards (e.g. "Plant", "Animal", "Fossil"). They have no effect on rarity or card effects.
        </p>
      </div>

      <div className="flex flex-col divide-y divide-border/50">
        {types.length === 0 && (
          <div className="px-6 py-4 text-sm text-muted-foreground italic">No card types yet. Add one below.</div>
        )}
        {types.map(t => (
          <div key={t.id} className={editingId === t.id ? "px-6 py-4 bg-muted/40" : "px-6 py-3"}>
            {editingId === t.id ? (
              <div className="flex items-center gap-3 flex-wrap">
                <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8 text-sm w-44" placeholder="Name" />
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  Colour
                  <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-border p-0.5 bg-background" />
                </label>
                <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border"
                  style={{ backgroundColor: editColor + "22", borderColor: editColor, color: editColor }}>
                  {editName || "Preview"}
                </span>
                <div className="flex items-center gap-2 ml-auto">
                  <Button size="sm" onClick={() => handleSave(t.id)} disabled={saving} className="h-7 text-xs">
                    {saving ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Saving…</> : <><Save className="w-3 h-3 mr-1" />Save</>}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-7 text-xs">Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border"
                  style={{ backgroundColor: t.color + "22", borderColor: t.color, color: t.color }}>
                  {t.name}
                </span>
                <div className="flex items-center gap-2 ml-auto">
                  <button onClick={() => startEdit(t)} className="text-xs text-muted-foreground hover:text-primary font-semibold underline">Edit</button>
                  <button onClick={() => handleDelete(t.id, t.name)} disabled={deleting === t.id}
                    className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40">
                    {deleting === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add new */}
      <div className="px-6 py-4 border-t border-border/50 bg-muted/20">
        <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Add new type</p>
        <div className="flex items-center gap-3 flex-wrap">
          <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Type name…" className="h-8 text-sm w-44"
            onKeyDown={e => { if (e.key === "Enter") handleCreate(); }} />
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Colour
            <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)}
              className="w-8 h-8 rounded-lg cursor-pointer border border-border p-0.5 bg-background" />
          </label>
          {newName && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border"
              style={{ backgroundColor: newColor + "22", borderColor: newColor, color: newColor }}>
              {newName}
            </span>
          )}
          <Button size="sm" onClick={handleCreate} disabled={creating || !newName.trim()} className="h-8 text-xs gap-1.5">
            {creating ? <><Loader2 className="w-3 h-3 animate-spin" />Adding…</> : <><Plus className="w-3 h-3" />Add Type</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
/* ── Backups Section ── */
interface BackupItem {
  id: number;
  label: string;
  createdAt: string;
}

function BackupsSection() {
  const { toast } = useToast();
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const fetchBackups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/backups`);
      const data = await res.json();
      setBackups(data);
    } catch {
      toast({ title: "Failed to load backups", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchBackups(); }, [fetchBackups]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch(`${API}/backups`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      if (!res.ok) throw new Error();
      await fetchBackups();
      toast({ title: "Backup created", description: "Current student data has been saved." });
    } catch {
      toast({ title: "Backup failed", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (id: number) => {
    setRestoringId(id);
    setConfirmId(null);
    try {
      const res = await fetch(`${API}/backups/${id}/restore`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast({ title: "Restore complete", description: `${data.restoredStudents} student(s) restored successfully.` });
    } catch {
      toast({ title: "Restore failed", variant: "destructive" });
    } finally {
      setRestoringId(null);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`${API}/backups/${id}`, { method: "DELETE" });
      setBackups(prev => prev.filter(b => b.id !== id));
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b border-border">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Archive className="w-4 h-4 text-primary" />
          Saved Backups
          <span className="text-xs font-normal text-muted-foreground">({backups.length}/60 kept)</span>
        </div>
        <Button size="sm" onClick={handleCreate} disabled={creating}>
          {creating ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
          Save Now
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground text-sm gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading backups…
        </div>
      ) : backups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm gap-2">
          <Clock className="w-8 h-8 opacity-30" />
          <p>No backups yet. Auto-saves run daily at 2 AM.</p>
          <p className="text-xs">Click "Save Now" to create one immediately.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {backups.map(b => (
            <li key={b.id} className="flex items-center gap-3 px-4 py-3">
              <Archive className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{b.label}</p>
                <p className="text-xs text-muted-foreground">{new Date(b.createdAt).toLocaleString()}</p>
              </div>
              {confirmId === b.id ? (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-amber-600 font-medium">Restore this backup?</span>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRestore(b.id)}
                    disabled={restoringId === b.id}
                  >
                    {restoringId === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Yes, restore"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmId(null)}>Cancel</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmId(b.id)}
                    disabled={restoringId !== null}
                  >
                    <RotateCcw className="w-3 h-3 mr-1.5" />
                    Restore
                  </Button>
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
                    title="Delete backup"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type SettingsTab = "sounds" | "rarities" | "types" | "data" | "backups";

export default function TeacherSettings() {
  const settings = useSettings();
  const updateSetting = useUpdateSetting();
  const [tab, setTab] = useState<SettingsTab>("sounds");

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: "sounds", label: "Card Opening & Sounds" },
    { id: "rarities", label: "Rarities" },
    { id: "types", label: "Card Types" },
    { id: "data", label: "Data & Security" },
    { id: "backups", label: "Backups" },
  ];

  return (
    <TeacherLayout>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Settings2 className="w-5 h-5" />
          </div>
          <h1 className="text-3xl font-display font-bold">Settings</h1>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-border/60">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Card Opening & Sounds */}
      {tab === "sounds" && (
        <div className="grid gap-6 max-w-2xl">
          <SettingRow
            label="Title Logo"
            description="The logo shown above both login screens. Replaces the default Wildhaven Collectible Cards title image."
            icon={<Image className="w-5 h-5" />}
            currentUrl={settings.titleImageUrl}
            accept="image/jpeg,image/png,image/webp,image/gif"
            uploadType="image"
            settingKey="title_image_url"
            previewType="image"
            onUpdate={updateSetting}
          />

          <SettingRow
            label="Background Image"
            description="Shown behind the student login screen and collection pages. Replaces the default flowery meadow."
            icon={<Image className="w-5 h-5" />}
            currentUrl={settings.backgroundImageUrl}
            accept="image/jpeg,image/png,image/webp,image/gif"
            uploadType="image"
            settingKey="background_image_url"
            previewType="image"
            onUpdate={updateSetting}
          />

          <div>
            <h2 className="text-base font-display font-bold mb-1">Event Sounds</h2>
            <p className="text-sm text-muted-foreground mb-3">Sounds that play during key moments. Leave unset to use built-in defaults.</p>
            <GlobalSoundsSection
              onUpdate={updateSetting}
              entries={[
                {
                  key: "pack_open_sound_url",
                  label: "Pack Opening",
                  description: "Plays when a student taps the pack to open it.",
                  icon: <Volume2 className="w-4 h-4" />,
                  currentUrl: settings.packOpenSoundUrl,
                },
                {
                  key: "box_open_sound_url",
                  label: "Mystery Box Opening",
                  description: "Plays when a student taps 'Open Box!'.",
                  icon: <Volume2 className="w-4 h-4" />,
                  currentUrl: settings.boxOpenSoundUrl,
                },
                {
                  key: "figurine_reveal_sound_url",
                  label: "Collectible Reveal",
                  description: "Plays the moment a collectible appears after opening a box.",
                  icon: <Volume2 className="w-4 h-4" />,
                  currentUrl: settings.figurineRevealSoundUrl,
                },
                {
                  key: "card_flip_sound_url",
                  label: "Card Flip (Default)",
                  description: "Default card reveal sound. Used when no rarity-specific sound is set.",
                  icon: <Music className="w-4 h-4" />,
                  currentUrl: settings.cardFlipSoundUrl,
                },
              ]}
            />
          </div>

          <div>
            <h2 className="text-base font-display font-bold mb-1">Rarity Card Flip Sounds</h2>
            <p className="text-sm text-muted-foreground mb-3">Upload a custom sound per rarity. Falls back to the Card Flip sound above (or a built-in synth) if not set.</p>
            <RaritySoundsSection />
          </div>
        </div>
      )}

      {/* Tab: Rarities */}
      {tab === "rarities" && (
        <div className="grid gap-6 max-w-2xl">
          <div>
            <h2 className="text-lg font-display font-bold">Collectible Rarities</h2>
            <p className="text-sm text-muted-foreground mt-0.5 mb-3">Configure the rarity tiers used in mystery boxes. These are shared across all mystery boxes.</p>
            <FigurineRaritiesSection />
          </div>

          <div>
            <h2 className="text-lg font-display font-bold">Card Rarities</h2>
            <p className="text-sm text-muted-foreground mt-0.5 mb-3">Configure each card rarity tier — upload a counter icon, set duplicate coin rewards, and choose card effects.</p>
            <CardRaritiesSection />
          </div>
        </div>
      )}

      {/* Tab: Card Types */}
      {tab === "types" && (
        <div className="grid gap-6 max-w-2xl">
          <div>
            <h2 className="text-lg font-display font-bold">Card Types</h2>
            <p className="text-sm text-muted-foreground mt-0.5 mb-3">Create and manage card type labels. Assign one or more types to any card in the pack editor.</p>
            <CardTypesSection />
          </div>
        </div>
      )}

      {/* Tab: Data & Security */}
      {tab === "data" && (
        <div className="grid gap-6 max-w-2xl">
          <div>
            <h2 className="text-lg font-display font-bold">Data Management</h2>
            <p className="text-sm text-muted-foreground mt-0.5 mb-3">One-time tools for managing existing collection data.</p>
            <DedupSection />
          </div>

          <div>
            <h2 className="text-lg font-display font-bold">Security</h2>
            <p className="text-sm text-muted-foreground mt-0.5 mb-3">Manage access to the teacher portal.</p>
            <ChangePasswordSection />
          </div>
        </div>
      )}

      {/* Tab: Backups */}
      {tab === "backups" && (
        <div className="grid gap-6 max-w-2xl">
          <div>
            <h2 className="text-lg font-display font-bold">Daily Backups</h2>
            <p className="text-sm text-muted-foreground mt-0.5 mb-3">
              Student card collections, collectibles, packs, coins, and achievements are automatically saved every day at 2 AM.
              The last 10 backups are kept. Restoring a backup brings every student back to exactly how they were at that point —
              students added after the backup are left untouched.
            </p>
            <BackupsSection />
          </div>
        </div>
      )}
    </TeacherLayout>
  );
}
