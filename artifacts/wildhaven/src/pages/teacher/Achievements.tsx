import { useState, useEffect, useRef } from "react";
import { Trophy, Plus, Trash2, Upload, X, Check, Package, Star, CreditCard, GripVertical, ChevronUp, ChevronDown, Tag } from "lucide-react";
import { TeacherLayout } from "./Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useListPacks, useListCards } from "@workspace/api-client-react";
import { useCardTypes } from "@/contexts/CardTypesContext";

const API = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "") + "/api";

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API}/uploads/image`, { method: "POST", body: fd });
  if (!res.ok) throw new Error("Upload failed");
  return (await res.json()).url as string;
}

// ── Rule types ────────────────────────────────────────────────────────────────

type ConditionType = "pack_complete" | "rarity_count" | "has_card" | "has_any_cards" | "has_all_cards" | "total_cards" | "type_complete" | "type_count";

interface PackCompleteCondition { type: "pack_complete"; packId: number }
interface RarityCountCondition { type: "rarity_count"; rarity: string; count: number }
interface HasCardCondition { type: "has_card"; cardId: number }
interface HasAnyCardsCondition { type: "has_any_cards"; cardIds: number[] }
interface HasAllCardsCondition { type: "has_all_cards"; cardIds: number[] }
interface TotalCardsCondition { type: "total_cards"; count: number }
interface TypeCompleteCondition { type: "type_complete"; typeName: string }
interface TypeCountCondition { type: "type_count"; typeName: string; count: number }

type Condition = PackCompleteCondition | RarityCountCondition | HasCardCondition | HasAnyCardsCondition | HasAllCardsCondition | TotalCardsCondition | TypeCompleteCondition | TypeCountCondition;

interface AchievementRule { operator: "AND" | "OR"; conditions: Condition[] }

interface Achievement {
  id: number;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  rules: AchievementRule;
  createdAt: string;
}

const RARITIES = ["Common", "Rare", "Epic", "Mythic", "Legendary"];

const CONDITION_LABELS: Record<ConditionType, string> = {
  pack_complete: "Complete a pack (all cards)",
  rarity_count: "Has N cards of rarity",
  has_card: "Has a specific card",
  has_any_cards: "Has any of these cards (OR)",
  has_all_cards: "Has all of these cards (AND)",
  total_cards: "Has X total unique cards",
  type_complete: "Has all cards of a type",
  type_count: "Has N cards of a type",
};

// ── Condition editor ──────────────────────────────────────────────────────────

interface ConditionEditorProps {
  condition: Condition;
  onChange: (c: Condition) => void;
  onRemove: () => void;
  packs: { id: number; name: string }[];
  cards: { id: number; name: string; packId: number; cardNumber: string }[];
  cardTypes: { id: number; name: string; color: string }[];
}

function ConditionEditor({ condition, onChange, onRemove, packs, cards, cardTypes }: ConditionEditorProps) {
  const [expanded, setExpanded] = useState(false);

  const changeType = (type: ConditionType) => {
    if (type === "pack_complete") onChange({ type, packId: packs[0]?.id ?? 0 });
    else if (type === "rarity_count") onChange({ type, rarity: "Common", count: 1 });
    else if (type === "has_card") onChange({ type, cardId: cards[0]?.id ?? 0 });
    else if (type === "has_any_cards") onChange({ type, cardIds: [] });
    else if (type === "has_all_cards") onChange({ type, cardIds: [] });
    else if (type === "total_cards") onChange({ type, count: 1 });
    else if (type === "type_complete") onChange({ type, typeName: cardTypes[0]?.name ?? "" });
    else if (type === "type_count") onChange({ type, typeName: cardTypes[0]?.name ?? "", count: 1 });
  };

  const toggleCard = (cardId: number, current: number[]) => {
    const next = current.includes(cardId) ? current.filter(id => id !== cardId) : [...current, cardId];
    if (condition.type === "has_any_cards") onChange({ ...condition, cardIds: next });
    if (condition.type === "has_all_cards") onChange({ ...condition, cardIds: next });
  };

  return (
    <div className="border rounded-xl bg-slate-50 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <select
          value={condition.type}
          onChange={e => changeType(e.target.value as ConditionType)}
          className="flex-1 border rounded-lg px-2 py-1.5 text-sm bg-white"
        >
          {Object.entries(CONDITION_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <button onClick={onRemove} className="text-red-400 hover:text-red-600 shrink-0"><X className="w-4 h-4" /></button>
      </div>

      {condition.type === "pack_complete" && (
        <select
          value={condition.packId}
          onChange={e => onChange({ ...condition, packId: Number(e.target.value) })}
          className="w-full border rounded-lg px-2 py-1.5 text-sm bg-white"
        >
          {packs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}

      {condition.type === "rarity_count" && (
        <div className="flex gap-2">
          <select
            value={condition.rarity}
            onChange={e => onChange({ ...condition, rarity: e.target.value })}
            className="flex-1 border rounded-lg px-2 py-1.5 text-sm bg-white"
          >
            {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-muted-foreground">×</span>
            <Input
              type="number" min={1}
              value={condition.count}
              onChange={e => onChange({ ...condition, count: Number(e.target.value) })}
              className="w-20 h-8 text-sm"
            />
          </div>
        </div>
      )}

      {condition.type === "total_cards" && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Min unique cards:</span>
          <Input
            type="number" min={1}
            value={condition.count}
            onChange={e => onChange({ ...condition, count: Number(e.target.value) })}
            className="w-24 h-8 text-sm"
          />
        </div>
      )}

      {condition.type === "type_complete" && (
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
          {cardTypes.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No card types defined yet — add them in Settings.</p>
          ) : (
            <select
              value={condition.typeName}
              onChange={e => onChange({ ...condition, typeName: e.target.value })}
              className="flex-1 border rounded-lg px-2 py-1.5 text-sm bg-white"
            >
              {cardTypes.map(t => (
                <option key={t.id} value={t.name} style={{ color: t.color }}>{t.name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {condition.type === "type_count" && (
        <div className="flex gap-2 items-center">
          <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
          {cardTypes.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No card types defined yet — add them in Settings.</p>
          ) : (
            <>
              <select
                value={condition.typeName}
                onChange={e => onChange({ ...condition, typeName: e.target.value })}
                className="flex-1 border rounded-lg px-2 py-1.5 text-sm bg-white"
              >
                {cardTypes.map(t => (
                  <option key={t.id} value={t.name} style={{ color: t.color }}>{t.name}</option>
                ))}
              </select>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-sm text-muted-foreground">×</span>
                <Input
                  type="number" min={1}
                  value={condition.count}
                  onChange={e => onChange({ ...condition, count: Number(e.target.value) })}
                  className="w-20 h-8 text-sm"
                />
              </div>
            </>
          )}
        </div>
      )}

      {condition.type === "has_card" && (
        <select
          value={condition.cardId}
          onChange={e => onChange({ ...condition, cardId: Number(e.target.value) })}
          className="w-full border rounded-lg px-2 py-1.5 text-sm bg-white"
        >
          {cards.map(c => {
            const pack = packs.find(p => p.id === c.packId);
            return <option key={c.id} value={c.id}>#{c.cardNumber} {c.name} ({pack?.name ?? "?"})</option>;
          })}
        </select>
      )}

      {(condition.type === "has_any_cards" || condition.type === "has_all_cards") && (
        <div className="space-y-1.5">
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-xs text-primary font-semibold"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {condition.cardIds.length} card{condition.cardIds.length !== 1 ? "s" : ""} selected — click to {expanded ? "hide" : "pick"}
          </button>
          {expanded && (
            <div className="max-h-48 overflow-y-auto border rounded-lg bg-white divide-y">
              {packs.map(pack => {
                const packCards = cards.filter(c => c.packId === pack.id);
                if (packCards.length === 0) return null;
                return (
                  <div key={pack.id} className="p-2">
                    <p className="text-xs font-bold text-muted-foreground mb-1">{pack.name}</p>
                    <div className="flex flex-wrap gap-1">
                      {packCards.map(c => {
                        const selected = condition.cardIds.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            onClick={() => toggleCard(c.id, condition.cardIds)}
                            className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-all ${selected ? "bg-primary text-white border-primary" : "bg-white text-slate-600 border-slate-300 hover:border-primary"}`}
                          >
                            {selected && <Check className="w-3 h-3 inline mr-0.5" />}#{c.cardNumber} {c.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Rule builder ──────────────────────────────────────────────────────────────

interface RuleBuilderProps {
  rules: AchievementRule;
  onChange: (r: AchievementRule) => void;
  packs: { id: number; name: string }[];
  cards: { id: number; name: string; packId: number; cardNumber: string }[];
  cardTypes: { id: number; name: string; color: string }[];
}

function RuleBuilder({ rules, onChange, packs, cards, cardTypes }: RuleBuilderProps) {
  const addCondition = () => {
    const newCondition: Condition = packs.length > 0
      ? { type: "pack_complete", packId: packs[0].id }
      : { type: "rarity_count", rarity: "Common", count: 1 };
    onChange({ ...rules, conditions: [...rules.conditions, newCondition] });
  };

  const updateCondition = (i: number, c: Condition) => {
    const conditions = [...rules.conditions];
    conditions[i] = c;
    onChange({ ...rules, conditions });
  };

  const removeCondition = (i: number) => {
    onChange({ ...rules, conditions: rules.conditions.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-muted-foreground">Student must meet</span>
        <select
          value={rules.operator}
          onChange={e => onChange({ ...rules, operator: e.target.value as "AND" | "OR" })}
          className="border rounded-lg px-2 py-1 text-sm bg-white font-bold"
        >
          <option value="AND">ALL conditions (AND)</option>
          <option value="OR">ANY condition (OR)</option>
        </select>
      </div>

      {rules.conditions.length === 0 && (
        <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl text-muted-foreground text-sm">
          No conditions yet — add one below
        </div>
      )}

      <div className="space-y-2">
        {rules.conditions.map((c, i) => (
          <ConditionEditor
            key={i}
            condition={c}
            onChange={cond => updateCondition(i, cond)}
            onRemove={() => removeCondition(i)}
            packs={packs}
            cards={cards}
            cardTypes={cardTypes}
          />
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={addCondition} className="w-full">
        <Plus className="w-4 h-4 mr-1.5" /> Add Condition
      </Button>
    </div>
  );
}

// ── Achievement form dialog ───────────────────────────────────────────────────

interface AchievementFormProps {
  initial?: Achievement;
  packs: { id: number; name: string }[];
  cards: { id: number; name: string; packId: number; cardNumber: string }[];
  cardTypes: { id: number; name: string; color: string }[];
  onSave: (a: Achievement) => void;
  onCancel: () => void;
}

function AchievementForm({ initial, packs, cards, cardTypes, onSave, onCancel }: AchievementFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  const [rules, setRules] = useState<AchievementRule>(initial?.rules ?? { operator: "AND", conditions: [] });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setImageUrl(url);
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const url = initial ? `${API}/achievements/${initial.id}` : `${API}/achievements`;
      const method = initial ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null, imageUrl: imageUrl || null, rules }),
      });
      if (!res.ok) throw new Error("Save failed");
      const saved = await res.json();
      onSave(saved);
      toast({ title: initial ? "Achievement updated" : "Achievement created" });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold font-display">{initial ? "Edit Achievement" : "New Achievement"}</h2>
          <button onClick={onCancel}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <div className="p-6 space-y-6">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Achievement Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Pack Master" />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Description <span className="font-normal text-muted-foreground">(shown when students click the badge)</span></label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Collect your first complete pack!"
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Image */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Badge Image (PNG)</label>
            <div className="flex items-center gap-3">
              {imageUrl ? (
                <div className="relative w-16 h-16">
                  <img src={imageUrl} alt="badge" className="w-full h-full object-contain rounded-xl border" loading="lazy" />
                  <button onClick={() => setImageUrl("")} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300">
                  <Trophy className="w-8 h-8" />
                </div>
              )}
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                <Upload className="w-4 h-4 mr-1.5" /> {uploading ? "Uploading…" : "Upload PNG"}
              </Button>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ""; }} />
            </div>
          </div>

          {/* Rule builder */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Unlock Conditions</label>
            <RuleBuilder rules={rules} onChange={setRules} packs={packs} cards={cards} cardTypes={cardTypes} />
          </div>
        </div>
        <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : initial ? "Save Changes" : "Create Achievement"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Condition summary (for display) ─────────────────────────────────────────

function conditionSummary(
  c: Condition,
  packs: { id: number; name: string }[],
  cards: { id: number; name: string; cardNumber: string }[]
): string {
  if (c.type === "pack_complete") {
    const pack = packs.find(p => p.id === c.packId);
    return `Complete "${pack?.name ?? "Unknown"}" pack`;
  }
  if (c.type === "rarity_count") return `Has ≥${c.count} ${c.rarity} card${c.count !== 1 ? "s" : ""}`;
  if (c.type === "has_card") {
    const card = cards.find(card => card.id === c.cardId);
    return `Has #${card?.cardNumber ?? "?"} ${card?.name ?? "Unknown"}`;
  }
  if (c.type === "has_any_cards") return `Has any of ${c.cardIds.length} card${c.cardIds.length !== 1 ? "s" : ""}`;
  if (c.type === "has_all_cards") return `Has all of ${c.cardIds.length} card${c.cardIds.length !== 1 ? "s" : ""}`;
  if (c.type === "total_cards") return `Has ≥${c.count} total unique card${c.count !== 1 ? "s" : ""}`;
  if (c.type === "type_complete") return `Has all "${c.typeName}" type cards`;
  if (c.type === "type_count") return `Has ≥${c.count} "${c.typeName}" card${c.count !== 1 ? "s" : ""}`;
  return "Unknown condition";
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TeacherAchievements() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Achievement | undefined>();
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const { toast } = useToast();
  const { data: packs = [] } = useListPacks();
  const { data: allCards = [] } = useListCards();
  const { types: cardTypes } = useCardTypes();

  const cards = allCards.map(c => ({ id: c.id, name: c.name, packId: c.packId, cardNumber: c.cardNumber }));
  const packList = packs.map(p => ({ id: p.id, name: p.name }));
  const cardTypeList = cardTypes.map(t => ({ id: t.id, name: t.name, color: t.color }));

  const fetchAchievements = async () => {
    try {
      const res = await fetch(`${API}/achievements`);
      const data = await res.json();
      setAchievements(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAchievements(); }, []);

  const handleSave = (saved: Achievement) => {
    setAchievements(prev => {
      const idx = prev.findIndex(a => a.id === saved.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
      return [...prev, saved];
    });
    setFormOpen(false);
    setEditing(undefined);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this achievement? Students who earned it will also lose it.")) return;
    await fetch(`${API}/achievements/${id}`, { method: "DELETE" });
    setAchievements(prev => prev.filter(a => a.id !== id));
    toast({ title: "Achievement deleted" });
  };

  const handleDragReorder = async (fromId: number, toId: number) => {
    if (fromId === toId) return;
    const fromIdx = achievements.findIndex(a => a.id === fromId);
    const toIdx = achievements.findIndex(a => a.id === toId);
    if (fromIdx === -1 || toIdx === -1) return;
    const next = [...achievements];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    const reindexed = next.map((a, i) => ({ ...a, displayOrder: i }));
    setAchievements(reindexed);
    await fetch(`${API}/achievements/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reindexed.map(a => ({ id: a.id, displayOrder: a.displayOrder }))),
    });
  };

  return (
    <TeacherLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-500" /> Achievements
            </h1>
            <p className="text-muted-foreground mt-1">Create badge achievements students unlock automatically when conditions are met.</p>
          </div>
          <Button onClick={() => { setEditing(undefined); setFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-1.5" /> New Achievement
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading…</div>
        ) : achievements.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed rounded-2xl">
            <Trophy className="w-16 h-16 mx-auto text-slate-200 mb-4" />
            <p className="text-xl font-display font-bold text-slate-400">No achievements yet</p>
            <p className="text-muted-foreground mt-1 mb-6">Create your first achievement to get started.</p>
            <Button onClick={() => setFormOpen(true)}><Plus className="w-4 h-4 mr-1.5" /> New Achievement</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {achievements.map((a) => (
              <div
                key={a.id}
                draggable
                onDragStart={() => setDraggedId(a.id)}
                onDragOver={e => { e.preventDefault(); setDragOverId(a.id); }}
                onDrop={() => { if (draggedId !== null) handleDragReorder(draggedId, a.id); setDragOverId(null); }}
                onDragEnd={() => { setDraggedId(null); setDragOverId(null); }}
                className={`bg-white rounded-2xl border shadow-sm p-5 flex gap-4 transition-all ${
                  draggedId === a.id ? "opacity-40 scale-95" : ""
                } ${dragOverId === a.id && draggedId !== a.id ? "border-primary ring-2 ring-primary/20 shadow-md" : ""}`}
              >
                <div className="shrink-0">
                  {a.imageUrl ? (
                    <img src={a.imageUrl} alt={a.name} className="w-16 h-16 object-contain rounded-xl border bg-slate-50" loading="lazy" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl border bg-slate-50 flex items-center justify-center">
                      <Trophy className="w-8 h-8 text-yellow-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold font-display text-lg leading-tight">{a.name}</h3>
                  {a.rules.conditions.length === 0 ? (
                    <p className="text-xs text-muted-foreground mt-1 italic">No conditions — will never unlock</p>
                  ) : (
                    <ul className="mt-1.5 space-y-0.5">
                      {a.rules.conditions.slice(0, 3).map((c, i) => (
                        <li key={i} className="text-xs text-slate-600 flex items-start gap-1">
                          <span className="text-slate-400 shrink-0 mt-0.5">{a.rules.operator === "AND" ? "AND" : i === 0 ? "  " : " OR"}</span>
                          {conditionSummary(c, packList, cards)}
                        </li>
                      ))}
                      {a.rules.conditions.length > 3 && (
                        <li className="text-xs text-muted-foreground">+{a.rules.conditions.length - 3} more…</li>
                      )}
                    </ul>
                  )}
                  <div className="flex gap-2 mt-3 items-center">
                    <Button variant="outline" size="sm" onClick={() => { setEditing(a); setFormOpen(true); }}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(a.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <div className="ml-auto text-slate-300 cursor-grab active:cursor-grabbing" title="Drag to reorder">
                      <GripVertical className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {formOpen && (
        <AchievementForm
          initial={editing}
          packs={packList}
          cards={cards}
          cardTypes={cardTypeList}
          onSave={handleSave}
          onCancel={() => { setFormOpen(false); setEditing(undefined); }}
        />
      )}
    </TeacherLayout>
  );
}
