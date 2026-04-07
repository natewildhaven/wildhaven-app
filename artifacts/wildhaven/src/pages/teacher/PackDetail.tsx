import { useState, useRef, useCallback, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { ArrowLeft, Plus, Image as ImageIcon, Trash2, Upload, Save, X, Check, Loader2, Settings, ChevronDown, ChevronUp, ClipboardPaste, FileUp, Images } from "lucide-react";
import { useGetPack, useUploadCardImage } from "@workspace/api-client-react";
import { useCreateCard, useUpdateCard, useDeleteCard } from "@/hooks/use-cards";
import { useCardRarities } from "@/contexts/CardRaritiesContext";
import { useCardTypes } from "@/contexts/CardTypesContext";
import { useUpdatePack } from "@/hooks/use-packs";
import { TeacherLayout } from "./Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TagsMultiSelect } from "@/components/TagsMultiSelect";

const RARITY_CONFIGS = [
  { key: "commonChance" as const, label: "Common", color: "bg-green-500", light: "bg-green-50 border-green-300", text: "text-green-800" },
  { key: "rareChance" as const, label: "Rare", color: "bg-blue-500", light: "bg-blue-50 border-blue-300", text: "text-blue-800" },
  { key: "epicChance" as const, label: "Epic", color: "bg-purple-500", light: "bg-purple-50 border-purple-300", text: "text-purple-900" },
  { key: "mythicChance" as const, label: "Mythic", color: "bg-slate-400", light: "bg-slate-50 border-slate-300", text: "text-slate-700" },
  { key: "legendaryChance" as const, label: "Legendary", color: "bg-yellow-400", light: "bg-yellow-50 border-yellow-300", text: "text-yellow-900" },
];

type ChanceKey = typeof RARITY_CONFIGS[number]["key"];
type RowStatus = "idle" | "uploading" | "saving" | "saved" | "error";

interface EditRow {
  id: string;
  cardNumber: string;
  name: string;
  rarity: string;
  tags: string[];
  imageFile: File | null;
  imagePreview: string | null;
  status: RowStatus;
}

function makeRow(): EditRow {
  return { id: Math.random().toString(36).slice(2), cardNumber: "", name: "", rarity: "Common", tags: [], imageFile: null, imagePreview: null, status: "idle" };
}

function parseFilename(file: File): { cardNumber: string; name: string } {
  const raw = file.name.replace(/\.[^/.]+$/, "");
  const match = raw.match(/^(\d+)[\s\-_.]+(.+)$/);
  if (match) return { cardNumber: String(parseInt(match[1], 10)), name: match[2].trim() };
  return { cardNumber: "", name: raw.trim() };
}

export default function TeacherPackDetail() {
  const [, params] = useRoute("/teacher/packs/:id");
  const packId = Number(params?.id);
  const { data: pack, isLoading } = useGetPack(packId);

  const { mutateAsync: createCard } = useCreateCard();
  const { mutateAsync: deleteCard } = useDeleteCard();
  const { mutateAsync: updateCard } = useUpdateCard();
  const { mutateAsync: updatePack } = useUpdatePack();
  const { mutateAsync: uploadImage } = useUploadCardImage();
  const { toast } = useToast();
  const { rarities: cardRarities, refetch: refetchRarities } = useCardRarities();
  const { types: cardTypes, refetch: refetchTypes } = useCardTypes();

  useEffect(() => { refetchRarities(); refetchTypes(); }, [refetchRarities, refetchTypes]);

  /** Derive a hex colour from the loaded rarities, falling back to a neutral grey */
  const getRarityColor = useCallback((name: string) =>
    cardRarities.find(r => r.name === name)?.color ?? "#6b7280",
  [cardRarities]);

  // ── Pack Settings state ──
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chances, setChances] = useState<Record<ChanceKey, number>>({ commonChance: 50, rareChance: 30, epicChance: 15, mythicChance: 4, legendaryChance: 1 });
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [backUploading, setBackUploading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [pendingCoverUrl, setPendingCoverUrl] = useState<string | null>(null);
  const [pendingBackUrl, setPendingBackUrl] = useState<string | null>(null);
  const [pendingColor, setPendingColor] = useState<string>("#10b981");
  const [hexInputValue, setHexInputValue] = useState<string>("#10b981");
  const [pendingCardsPerPack, setPendingCardsPerPack] = useState<number>(3);
  const [hideMasteryUntilOwned, setHideMasteryUntilOwned] = useState<boolean>(false);
  const [hideMasterySaving, setHideMasterySaving] = useState(false);
  const [customChances, setCustomChances] = useState<Record<string, number>>({});
  const coverInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

  useEffect(() => {
    if (pack) {
      setChances({ commonChance: pack.commonChance, rareChance: pack.rareChance, epicChance: pack.epicChance, mythicChance: pack.mythicChance, legendaryChance: pack.legendaryChance });
      setCustomChances((pack.customRarityChances as Record<string, number>) ?? {});
      setPendingCardsPerPack(pack.cardsPerPack ?? 3);
      setHideMasteryUntilOwned(pack.hideMasteryUntilOwned ?? false);
      const col = pack.color ?? "#10b981";
      setPendingColor(col);
      setHexInputValue(col);
      setPendingCoverUrl(null); setPendingBackUrl(null); setCoverPreview(null); setBackPreview(null);
    }
  }, [pack?.id]);

  const toggleHideMastery = async (value: boolean) => {
    setHideMasterySaving(true);
    try {
      await fetch(`${API}/packs/${packId}/shop`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hideMasteryUntilOwned: value }),
      });
      setHideMasteryUntilOwned(value);
      toast({ title: value ? "Pack hidden from mastery until student earns a card" : "Pack always shown in mastery list" });
    } catch {
      toast({ title: "Failed to save setting", variant: "destructive" });
    } finally {
      setHideMasterySaving(false);
    }
  };

  const handleImageUpload = async (file: File, kind: "cover" | "back") => {
    if (kind === "cover") { setCoverUploading(true); setCoverPreview(URL.createObjectURL(file)); }
    else { setBackUploading(true); setBackPreview(URL.createObjectURL(file)); }
    try {
      const res = await uploadImage({ data: { file } });
      if (kind === "cover") setPendingCoverUrl(res.url);
      else setPendingBackUrl(res.url);
    } catch {
      toast({ title: "Image upload failed", variant: "destructive" });
    } finally {
      if (kind === "cover") setCoverUploading(false);
      else setBackUploading(false);
    }
  };

  const STANDARD_RARITY_LABELS = new Set(RARITY_CONFIGS.map(r => r.label));

  const saveSettings = async () => {
    setSettingsSaving(true);
    try {
      // Zero out rarities that have no cards in this pack
      const effectiveChances = { ...chances };
      if (packRarityNames.size > 0) {
        for (const r of RARITY_CONFIGS) {
          if (!packRarityNames.has(r.label)) effectiveChances[r.key] = 0;
        }
      }
      // Zero out custom rarities not in this pack
      const effectiveCustomChances: Record<string, number> = {};
      for (const name of customPackRarityNames) {
        effectiveCustomChances[name] = customChances[name] ?? 0;
      }
      await updatePack({
        packId,
        data: {
          ...effectiveChances,
          customRarityChances: effectiveCustomChances,
          color: pendingColor,
          cardsPerPack: pendingCardsPerPack,
          ...(pendingCoverUrl !== null ? { coverImageUrl: pendingCoverUrl } : {}),
          ...(pendingBackUrl !== null ? { cardBackImageUrl: pendingBackUrl } : {}),
        },
      });
      toast({ title: "Pack settings saved!" });
      setPendingCoverUrl(null); setPendingBackUrl(null);
      setCoverPreview(null); setBackPreview(null);
    } catch {
      toast({ title: "Failed to save settings", variant: "destructive" });
    } finally {
      setSettingsSaving(false);
    }
  };

  // Rarities present in this pack (empty set = no cards yet, show all)
  const packRarityNames = new Set((pack?.cards ?? []).map((c: { rarity: string }) => c.rarity));
  const visibleConfigs = packRarityNames.size === 0
    ? RARITY_CONFIGS
    : RARITY_CONFIGS.filter(r => packRarityNames.has(r.label));

  // Custom rarities: in pack but NOT one of the 5 standard labels
  const customPackRarityNames: string[] = packRarityNames.size === 0
    ? []
    : [...packRarityNames].filter(n => !STANDARD_RARITY_LABELS.has(n));

  const standardTotal = visibleConfigs.reduce((a, r) => a + (chances[r.key] ?? 0), 0);
  const customTotal = customPackRarityNames.reduce((a, n) => a + (customChances[n] ?? 0), 0);
  const total = standardTotal + customTotal;

  // ── Add Cards table state ──
  const [rows, setRows] = useState<EditRow[]>([makeRow()]);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // ── CSV import — parses and immediately saves all cards to the DB ──
  const [csvImporting, setCsvImporting] = useState(false);

  const handleCsvImport = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) return;
      const sep = lines[0].includes(",") ? "," : "\t";
      let dataLines = lines;
      const firstCell = lines[0].split(sep)[0].trim();
      if (firstCell !== "" && /^[a-zA-Z\s#.]+$/.test(firstCell)) dataLines = lines.slice(1);

      interface ParsedCard { cardNumber: string; name: string; rarity: string; }
      const parsed: ParsedCard[] = dataLines.map(line => {
        const parts = line.split(sep).map(c => c.trim());
        const cardNumber = parts[0];
        const name = parts[1]?.trim();
        if (!name || !cardNumber) return null;
        const rarity = cardRarities.find(r => r.name.toLowerCase() === (parts[2] ?? "").toLowerCase())?.name ?? (cardRarities[0]?.name ?? "Common");
        return { cardNumber, name, rarity };
      }).filter(Boolean) as ParsedCard[];

      if (parsed.length === 0) {
        toast({ title: "No valid rows found in CSV", variant: "destructive" });
        return;
      }

      setCsvImporting(true);
      let saved = 0;
      let skipped = 0;
      for (const card of parsed) {
        try {
          await createCard({ data: { packId, cardNumber: card.cardNumber, name: card.name, rarity: card.rarity, imageUrl: null } });
          saved++;
        } catch {
          skipped++;
        }
      }
      setCsvImporting(false);

      const parts = [`${saved} card${saved !== 1 ? "s" : ""} added`];
      if (skipped > 0) parts.push(`${skipped} skipped (may already exist)`);
      toast({ title: parts.join(" · ") });
    };
    reader.readAsText(file);
  }, [packId, createCard, toast]);

  // ── Multi-image drop ──
  const multiImageInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingImages, setIsDraggingImages] = useState(false);

  const handleMultiImageFiles = useCallback((files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith("image/"));
    if (imageFiles.length === 0) return;
    const newRows: EditRow[] = imageFiles.map(file => {
      const { cardNumber, name } = parseFilename(file);
      return { ...makeRow(), cardNumber, name, imageFile: file, imagePreview: URL.createObjectURL(file) };
    });
    setRows(prev => {
      const existing = prev.filter(r => r.name.trim() || r.cardNumber || r.imageFile || r.status === "saved");
      return [...existing, ...newRows];
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      setIsDraggingImages(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingImages(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingImages(false);
    handleMultiImageFiles(Array.from(e.dataTransfer.files));
  }, [handleMultiImageFiles]);

  // ── Edit existing card state ──
  const [editingCardId, setEditingCardId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editRarity, setEditRarity] = useState<string>("Common");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editCurrentImageUrl, setEditCurrentImageUrl] = useState<string | null>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editImageUploading, setEditImageUploading] = useState(false);
  const editImageRef = useRef<HTMLInputElement>(null);

  const updateRow = (id: string, patch: Partial<EditRow>) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));

  const removeRow = (id: string) =>
    setRows(prev => prev.length === 1 ? [makeRow()] : prev.filter(r => r.id !== id));

  const addRow = () => setRows(prev => [...prev, makeRow()]);

  const handleFileChange = (id: string, file: File | null) => {
    if (!file) return;
    updateRow(id, { imageFile: file, imagePreview: URL.createObjectURL(file) });
  };

  // ── Paste handler: works on individual inputs AND on the container ──
  const applyPasteText = useCallback((text: string, startRowIndex = 0) => {
    const lines = text.split("\n").map(l => l.trimEnd()).filter(l => l.trim());
    if (lines.length === 0) return 0;

    let dataLines = lines;
    // Skip header if first cell is non-numeric text (like "Number", "Card #", etc.)
    const firstCell = lines[0].split("\t")[0].trim();
    if (lines.length > 1 && firstCell !== "" && /^[a-zA-Z\s#.]+$/.test(firstCell)) {
      dataLines = lines.slice(1);
    }

    if (dataLines.length === 0) return 0;

    setRows(prev => {
      const next = [...prev];
      dataLines.forEach((line, i) => {
        const parts = line.split("\t").map(p => p.trim());
        const ri = startRowIndex + i;
        const base = ri < next.length ? { ...next[ri] } : makeRow();

        if (base.status === "saved") return; // don't overwrite saved rows
        base.cardNumber = parts[0] || base.cardNumber;
        if (parts[1] !== undefined) base.name = parts[1] || base.name;
        if (parts[2]) {
          const r = RARITIES.find(rv => rv.toLowerCase() === parts[2].toLowerCase());
          if (r) base.rarity = r;
        }
        if (ri < next.length) next[ri] = base;
        else next.push(base);
      });
      return next;
    });
    return dataLines.length;
  }, []);

  // Table-level paste (when pasting onto the container without a specific input focused)
  const handleTablePaste = useCallback((e: React.ClipboardEvent) => {
    // Only fire if the paste didn't originate from inside an <input>
    if ((e.target as HTMLElement).tagName === "INPUT") return;
    const text = e.clipboardData.getData("text");
    if (!text.trim()) return;
    e.preventDefault();
    // Find the first non-saved row to paste into
    setRows(prev => {
      const firstEditable = prev.findIndex(r => r.status !== "saved");
      const startIdx = firstEditable >= 0 ? firstEditable : prev.length;
      // Re-invoke paste logic inline
      const lines = text.split("\n").map(l => l.trimEnd()).filter(l => l.trim());
      let dataLines = lines;
      const firstCell = lines[0]?.split("\t")[0].trim() ?? "";
      if (lines.length > 1 && firstCell !== "" && /^[a-zA-Z\s#.]+$/.test(firstCell)) {
        dataLines = lines.slice(1);
      }
      const next = [...prev];
      dataLines.forEach((line, i) => {
        const parts = line.split("\t").map(p => p.trim());
        const ri = startIdx + i;
        const base = ri < next.length ? { ...next[ri] } : makeRow();
        if (base.status === "saved") return;
        base.cardNumber = parts[0] || base.cardNumber;
        if (parts[1] !== undefined) base.name = parts[1] || base.name;
        if (parts[2]) {
          const r = cardRarities.find(rv => rv.name.toLowerCase() === parts[2].toLowerCase());
          if (r) base.rarity = r.name;
        }
        if (ri < next.length) next[ri] = base;
        else next.push(base);
      });
      return next;
    });
  }, [cardRarities]);

  // Input-level paste (multi-line paste when a specific input is focused)
  const handleInputPaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>, rowId: string, field: "cardNumber" | "name") => {
    const text = e.clipboardData.getData("text");
    const lines = text.split("\n").map(l => l.trimEnd()).filter(l => l.trim());
    if (lines.length <= 1) return; // single cell → let the browser handle it
    e.preventDefault();
    setRows(prev => {
      const rowIndex = prev.findIndex(r => r.id === rowId);
      if (rowIndex === -1) return prev;
      const next = [...prev];
      lines.forEach((line, i) => {
        const parts = line.split("\t").map(p => p.trim());
        const ri = rowIndex + i;
        const base = ri < next.length ? { ...next[ri] } : makeRow();
        if (base.status === "saved") return;
        if (field === "cardNumber") {
          base.cardNumber = parts[0] || "";
          if (parts[1] !== undefined) base.name = parts[1];
          if (parts[2]) { const r = cardRarities.find(rv => rv.name.toLowerCase() === parts[2].toLowerCase()); if (r) base.rarity = r.name; }
        } else {
          base.name = parts[0] || "";
          if (parts[1]) { const r = cardRarities.find(rv => rv.name.toLowerCase() === parts[1].toLowerCase()); if (r) base.rarity = r.name; }
        }
        if (ri < next.length) next[ri] = base;
        else next.push(base);
      });
      return next;
    });
  }, [cardRarities]);

  const saveRow = async (row: EditRow) => {
    if (!row.name.trim() || !row.cardNumber) return false;
    updateRow(row.id, { status: "saving" });
    try {
      let imageUrl: string | null = null;
      if (row.imageFile) {
        updateRow(row.id, { status: "uploading" });
        const res = await uploadImage({ data: { file: row.imageFile } });
        imageUrl = res.url;
      }
      await createCard({ data: { packId, name: row.name.trim(), cardNumber: row.cardNumber, rarity: row.rarity, tags: row.tags, imageUrl } });
      updateRow(row.id, { status: "saved" });
      return true;
    } catch {
      updateRow(row.id, { status: "error" });
      return false;
    }
  };

  const handleSaveAll = async () => {
    const validRows = rows.filter(r => r.name.trim() && r.cardNumber);
    if (validRows.length === 0) { toast({ title: "No valid rows to save", variant: "destructive" }); return; }
    setIsSavingAll(true);
    let saved = 0;
    for (const row of validRows) {
      if (row.status === "saved") { saved++; continue; }
      if (await saveRow(row)) saved++;
    }
    setIsSavingAll(false);
    if (saved > 0) { toast({ title: `${saved} card${saved > 1 ? "s" : ""} added!` }); setRows([makeRow()]); }
  };

  const handleDelete = async (cardId: number) => {
    if (!confirm("Remove this card permanently?")) return;
    await deleteCard({ cardId });
    toast({ title: "Card removed." });
  };

  const startEdit = (card: { id: number; name: string; rarity: string; tags?: string[] | null; imageUrl: string | null }) => {
    setEditingCardId(card.id);
    setEditName(card.name);
    setEditRarity(card.rarity);
    setEditTags(card.tags ?? []);
    setEditCurrentImageUrl(card.imageUrl);
    setEditImageFile(null);
    setEditImagePreview(null);
  };

  const cancelEdit = () => {
    setEditingCardId(null);
    setEditImageFile(null);
    setEditImagePreview(null);
    setEditCurrentImageUrl(null);
  };

  const saveEdit = async (card: { id: number }) => {
    try {
      let imageUrl: string | null | undefined = undefined;
      if (editImageFile) {
        setEditImageUploading(true);
        try {
          const res = await uploadImage({ data: { file: editImageFile } });
          imageUrl = res.url;
        } finally {
          setEditImageUploading(false);
        }
      } else if (editCurrentImageUrl === null && editImagePreview === null) {
        imageUrl = null; // explicitly cleared
      }
      await updateCard({ cardId: card.id, data: { name: editName, rarity: editRarity, tags: editTags, ...(imageUrl !== undefined ? { imageUrl } : {}) } });
      toast({ title: "Card updated!" });
      cancelEdit();
    } catch { toast({ title: "Failed to update card", variant: "destructive" }); }
  };

  if (isLoading) return <TeacherLayout><div className="p-8 text-center text-xl">Loading...</div></TeacherLayout>;
  if (!pack) return <TeacherLayout><div className="p-8 text-center">Pack not found.</div></TeacherLayout>;

  const sortedCards = [...pack.cards].sort((a, b) => {
    const xNum = /^\d+$/.test(a.cardNumber), yNum = /^\d+$/.test(b.cardNumber);
    if (xNum && yNum) return parseInt(a.cardNumber) - parseInt(b.cardNumber);
    if (xNum) return -1;
    if (yNum) return 1;
    return a.cardNumber.localeCompare(b.cardNumber, undefined, { numeric: true, sensitivity: "base" });
  });
  const currentCoverUrl = coverPreview ?? pack.coverImageUrl ?? null;
  const currentBackUrl = backPreview ?? pack.cardBackImageUrl ?? null;

  return (
    <TeacherLayout>
      <div className="mb-6">
        <Link href="/teacher/packs" className="text-primary hover:underline flex items-center font-semibold text-sm">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Packs
        </Link>
      </div>

      {/* ── PACK HEADER ── */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border mb-5 flex items-center gap-5">
        <div className="w-20 h-20 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
          <img src={currentCoverUrl || `${import.meta.env.BASE_URL}images/pack-art.png`} className="w-full h-full object-contain drop-shadow-md" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-display font-bold text-primary">{pack.name}</h1>
          <p className="text-muted-foreground text-sm">{pack.description || "No description"}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Badge variant="secondary" className="text-base px-4 py-1.5">{pack.cards.length} Cards</Badge>
          <Button variant="outline" onClick={() => setSettingsOpen(v => !v)} className="font-semibold gap-2">
            <Settings className="w-4 h-4" />
            Settings
            {settingsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* ── PACK SETTINGS PANEL ── */}
      {settingsOpen && (
        <div className="bg-white rounded-2xl border shadow-sm mb-6 overflow-hidden">
          <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold font-display text-primary">Pack Settings</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Configure images and pull rates for this pack.</p>
            </div>
            <Button onClick={saveSettings} disabled={settingsSaving || coverUploading || backUploading} className="font-bold">
              {settingsSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Settings</>}
            </Button>
          </div>

          <div className="p-5 grid md:grid-cols-2 gap-8">
            {/* Images */}
            <div className="space-y-5">
              <h3 className="font-bold text-sm text-foreground uppercase tracking-wide">Images</h3>
              {[{ kind: "cover" as const, label: "Pack Cover Image", desc: "Shown on the pack card in the teacher portal.", ref: coverInputRef, url: currentCoverUrl, uploading: coverUploading, pending: pendingCoverUrl },
                { kind: "back" as const, label: "Card Back Image", desc: "Shown for missing cards in the student view.", ref: backInputRef, url: currentBackUrl, uploading: backUploading, pending: pendingBackUrl },
              ].map(img => (
                <div key={img.kind} className="space-y-2">
                  <label className="text-sm font-semibold">{img.label}</label>
                  <p className="text-xs text-muted-foreground">{img.desc}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-20 bg-slate-100 rounded-lg border overflow-hidden shrink-0 flex items-center justify-center">
                      {img.url ? <img src={img.url} className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-slate-300" />}
                    </div>
                    <div className="flex-1">
                      <button
                        onClick={() => img.ref.current?.click()}
                        disabled={img.uploading}
                        className="w-full border-2 border-dashed border-border rounded-lg py-3 flex flex-col items-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                      >
                        {img.uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        <span className="text-xs font-semibold">{img.uploading ? "Uploading..." : img.pending ? "✓ Uploaded – click to replace" : "Upload image"}</span>
                      </button>
                      <input ref={img.ref} type="file" accept="image/*" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, img.kind); e.target.value = ""; }} />
                    </div>
                  </div>
                </div>
              ))}

            </div>

            {/* Pack Theme Colour */}
            <div className="space-y-3">
              <div>
                <h3 className="font-bold text-sm text-foreground uppercase tracking-wide">Pack Theme Colour</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Used for progress bars in the Award Packs view.</p>
              </div>

              {/* Colour wheel trigger + hex input */}
              <div className="flex items-end gap-3">
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <span className="text-xs text-muted-foreground font-medium">Wheel</span>
                  <label
                    className="relative block w-12 h-12 rounded-xl border-2 border-border shadow-sm hover:border-primary transition-colors cursor-pointer overflow-hidden"
                    style={{ backgroundColor: pendingColor }}
                    title="Open colour picker"
                  >
                    <input
                      type="color"
                      value={pendingColor}
                      onChange={e => { setPendingColor(e.target.value); setHexInputValue(e.target.value); }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 drop-shadow" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="1.5" strokeOpacity="0.7"/>
                        <path d="M12 3a9 9 0 0 1 0 18" stroke="white" strokeWidth="1.5" strokeOpacity="0.4"/>
                      </svg>
                    </span>
                  </label>
                </div>

                <div className="flex-1 space-y-1">
                  <span className="text-xs text-muted-foreground font-medium">Hex value</span>
                  <div className="flex items-center border rounded-lg overflow-hidden bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 shadow-sm">
                    <span className="px-2.5 py-2 text-sm text-muted-foreground font-mono bg-muted border-r select-none">#</span>
                    <input
                      type="text"
                      value={hexInputValue.replace(/^#/, "").toUpperCase()}
                      onChange={e => {
                        const raw = e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
                        setHexInputValue("#" + raw);
                        if (raw.length === 6) setPendingColor("#" + raw.toLowerCase());
                      }}
                      onBlur={() => setHexInputValue(pendingColor)}
                      className="flex-1 px-2 py-2 text-sm font-mono bg-transparent outline-none"
                      placeholder="10B981"
                      maxLength={6}
                      spellCheck={false}
                    />
                    <div className="w-8 h-8 rounded-md mr-1.5 border border-border shrink-0" style={{ backgroundColor: pendingColor }} />
                  </div>
                </div>
              </div>

              {/* Preset palette */}
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground font-medium">Presets</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    "#10b981","#3b82f6","#8b5cf6","#f59e0b","#ef4444",
                    "#06b6d4","#f97316","#d946ef","#14b8a6","#6366f1",
                    "#84cc16","#ec4899","#64748b","#f43f5e","#22c55e",
                  ].map(hex => (
                    <button
                      key={hex}
                      onClick={() => { setPendingColor(hex); setHexInputValue(hex); }}
                      className={cn(
                        "w-7 h-7 rounded-full border-2 transition-all",
                        pendingColor.toLowerCase() === hex
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

            {/* Cards per Pack */}
            <div className="space-y-3">
              <div>
                <h3 className="font-bold text-sm text-foreground uppercase tracking-wide">Cards per Pack</h3>
                <p className="text-xs text-muted-foreground mt-0.5">How many cards students receive when opening this pack.</p>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={pendingCardsPerPack}
                  onChange={e => setPendingCardsPerPack(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                  className="w-24 text-center text-2xl font-bold font-display border-2 rounded-xl py-2 bg-background focus:ring-2 focus:ring-primary outline-none"
                />
                <div className="flex flex-col gap-1">
                  <button onClick={() => setPendingCardsPerPack(v => Math.min(20, v + 1))} className="px-3 py-1 text-sm font-bold bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors">+ More</button>
                  <button onClick={() => setPendingCardsPerPack(v => Math.max(1, v - 1))} className="px-3 py-1 text-sm font-bold bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg transition-colors">− Less</button>
                </div>
                <p className="text-sm text-muted-foreground italic">card{pendingCardsPerPack !== 1 ? "s" : ""} per open</p>
              </div>
            </div>

            {/* Pack Mastery Visibility */}
            <div className="space-y-3">
              <div>
                <h3 className="font-bold text-sm text-foreground uppercase tracking-wide">Pack Mastery Visibility</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Control when this pack appears in a student's Pack Mastery progress list.</p>
              </div>
              <button
                onClick={() => !hideMasterySaving && toggleHideMastery(!hideMasteryUntilOwned)}
                disabled={hideMasterySaving}
                className={cn(
                  "w-full flex items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all",
                  hideMasteryUntilOwned
                    ? "border-amber-400 bg-amber-50"
                    : "border-border bg-muted/30 hover:border-primary/30"
                )}
              >
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">
                    {hideMasteryUntilOwned ? "Hidden until first card earned" : "Always visible"}
                  </span>
                  <span className="text-xs text-muted-foreground mt-0.5">
                    {hideMasteryUntilOwned
                      ? "Students only see this pack in mastery once they own at least one card from it."
                      : "All students see this pack in their mastery list regardless of ownership."}
                  </span>
                </div>
                <div className={cn(
                  "shrink-0 w-10 h-6 rounded-full transition-all relative",
                  hideMasteryUntilOwned ? "bg-amber-400" : "bg-muted-foreground/30"
                )}>
                  <div className={cn(
                    "absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all",
                    hideMasteryUntilOwned ? "left-5" : "left-1"
                  )} />
                </div>
              </button>
            </div>

            {/* Rarity Pull Rates */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-foreground uppercase tracking-wide">Pull Rates (%)</h3>
                  {packRarityNames.size > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Showing {visibleConfigs.length} standard{customPackRarityNames.length > 0 ? ` + ${customPackRarityNames.length} custom` : ""} rarity{visibleConfigs.length + customPackRarityNames.length !== 1 ? "ies" : "y"} — only those with cards in this pack.
                    </p>
                  )}
                </div>
                <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full", total === 100 ? "bg-green-100 text-green-800" : total > 100 ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-800")}>
                  Total: {total}%
                </span>
              </div>
              {visibleConfigs.length === 0 && customPackRarityNames.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-2">Add cards to this pack to configure pull rates.</p>
              ) : (
                <div className="space-y-2">
                  {visibleConfigs.map(r => (
                    <div key={r.key} className={cn("flex items-center gap-3 rounded-xl border px-3 py-2", r.light)}>
                      <span className={cn("w-3.5 h-3.5 rounded-full shrink-0", r.color)} />
                      <span className={cn("text-sm font-bold w-20 shrink-0", r.text)}>{r.label}</span>
                      <input type="range" min="0" max="100" value={chances[r.key]}
                        onChange={e => setChances(prev => ({ ...prev, [r.key]: Number(e.target.value) }))} className="flex-1" />
                      <input type="number" min="0" max="100" value={chances[r.key]}
                        onChange={e => setChances(prev => ({ ...prev, [r.key]: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))}
                        className={cn("w-14 text-center text-sm font-bold border rounded-md py-0.5 bg-white", r.text)} />
                      <span className="text-xs text-muted-foreground w-3">%</span>
                    </div>
                  ))}
                  {customPackRarityNames.map(name => {
                    const rarityDef = cardRarities.find((r: { name: string }) => r.name === name);
                    const color = rarityDef?.color ?? "#6b7280";
                    return (
                      <div key={name} className="flex items-center gap-3 rounded-xl border px-3 py-2 bg-gray-50">
                        <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-sm font-bold w-20 shrink-0" style={{ color }}>{name}</span>
                        <input type="range" min="0" max="100" value={customChances[name] ?? 0}
                          onChange={e => setCustomChances(prev => ({ ...prev, [name]: Number(e.target.value) }))} className="flex-1" />
                        <input type="number" min="0" max="100" value={customChances[name] ?? 0}
                          onChange={e => setCustomChances(prev => ({ ...prev, [name]: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))}
                          className="w-14 text-center text-sm font-bold border rounded-md py-0.5 bg-white" style={{ color }} />
                        <span className="text-xs text-muted-foreground w-3">%</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── ADD CARDS TABLE ── */}
      <div className="bg-white rounded-2xl border shadow-sm mb-8">
        <div className="px-5 py-4 border-b flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold font-display text-primary">Add Cards</h2>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Paste from a spreadsheet — columns: <strong className="text-foreground">Number · Name · Rarity</strong> (Rarity is optional)</span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => multiImageInputRef.current?.click()} className="font-semibold">
              <Images className="w-3.5 h-3.5 mr-1" /> Upload Images
            </Button>
            <input
              ref={multiImageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => { const files = Array.from(e.target.files ?? []); if (files.length) handleMultiImageFiles(files); e.target.value = ""; }}
            />
            <Button variant="outline" size="sm" onClick={() => csvInputRef.current?.click()} disabled={csvImporting} className="font-semibold">
              {csvImporting ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <FileUp className="w-3.5 h-3.5 mr-1" />}
              {csvImporting ? "Importing…" : "Upload CSV"}
            </Button>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,.tsv,text/csv"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleCsvImport(f); e.target.value = ""; }}
            />
            <Button variant="outline" size="sm" onClick={addRow} className="font-semibold">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
            </Button>
            <Button size="sm" onClick={handleSaveAll} disabled={isSavingAll} className="font-bold">
              {isSavingAll ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
              Save All
            </Button>
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => multiImageInputRef.current?.click()}
          className={cn(
            "mx-4 my-3 rounded-xl border-2 border-dashed py-4 flex items-center justify-center gap-2 text-sm font-semibold transition-colors cursor-pointer select-none",
            isDraggingImages
              ? "border-primary bg-primary/5 text-primary"
              : "border-border text-muted-foreground hover:border-primary hover:text-primary"
          )}
        >
          <Images className="w-4 h-4" />
          <span>Drop images here — one per card</span>
          <span className="text-xs font-normal opacity-60">(or click to browse)</span>
        </div>

        {/* Paste zone — click to focus, then paste */}
        <div
          ref={tableContainerRef}
          onPaste={handleTablePaste}
          className="overflow-x-auto outline-none focus-within:ring-0"
          tabIndex={-1}
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <th className="px-3 py-2.5 text-left w-20">#</th>
                <th className="px-3 py-2.5 text-left">Name</th>
                <th className="px-3 py-2.5 text-left w-40">Rarity</th>
                <th className="px-3 py-2.5 text-left w-44">Types</th>
                <th className="px-3 py-2.5 text-left w-44">Image</th>
                <th className="px-3 py-2.5 text-center w-20">Status</th>
                <th className="px-2 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className={cn("border-b last:border-0 transition-colors", row.status === "saved" && "bg-green-50", row.status === "error" && "bg-red-50")}>
                  <td className="px-2 py-1.5">
                    <Input type="text" placeholder="#" value={row.cardNumber}
                      onChange={e => updateRow(row.id, { cardNumber: e.target.value })}
                      onPaste={e => handleInputPaste(e, row.id, "cardNumber")}
                      className="h-8 w-20 text-center font-mono text-sm" disabled={row.status === "saved"} />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input placeholder="Card name..." value={row.name}
                      onChange={e => updateRow(row.id, { name: e.target.value })}
                      onPaste={e => handleInputPaste(e, row.id, "name")}
                      className="h-8 text-sm" disabled={row.status === "saved"} />
                  </td>
                  <td className="px-2 py-1.5">
                    <Select value={row.rarity} onValueChange={(v: string) => updateRow(row.id, { rarity: v })} disabled={row.status === "saved"}>
                      <SelectTrigger className="h-8 text-xs font-semibold"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {cardRarities.map(r => (
                          <SelectItem key={r.name} value={r.name}>
                            <span className="inline-block px-2 py-0.5 rounded text-xs font-bold text-white" style={{ backgroundColor: r.color }}>{r.name}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-2 py-1.5">
                    <TagsMultiSelect
                      options={cardTypes}
                      value={row.tags}
                      onChange={tags => updateRow(row.id, { tags })}
                      disabled={row.status === "saved"}
                      className="w-full"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      {row.imagePreview ? (
                        <div className="relative w-8 h-10 shrink-0">
                          <img src={row.imagePreview} className="w-full h-full object-cover rounded border" />
                          <button onClick={() => updateRow(row.id, { imageFile: null, imagePreview: null })}
                            className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-4 h-4 flex items-center justify-center">
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ) : null}
                      <button
                        onClick={() => { if (!row.imageFile) fileInputRefs.current[row.id]?.click(); }}
                        disabled={row.status === "saved"}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors",
                          row.imageFile ? "border-green-400 bg-green-50 text-green-700" : "border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary",
                          "disabled:opacity-40 disabled:cursor-not-allowed"
                        )}
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        {row.imageFile ? "Replace" : "Upload"}
                      </button>
                      <input
                        ref={el => { fileInputRefs.current[row.id] = el; }}
                        type="file" accept="image/*" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleFileChange(row.id, f); e.target.value = ""; }}
                      />
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {row.status === "idle" && <span className="text-xs text-muted-foreground">–</span>}
                    {row.status === "uploading" && <Loader2 className="w-4 h-4 animate-spin text-blue-500 mx-auto" />}
                    {row.status === "saving" && <Loader2 className="w-4 h-4 animate-spin text-primary mx-auto" />}
                    {row.status === "saved" && <Check className="w-4 h-4 text-green-600 mx-auto" />}
                    {row.status === "error" && <X className="w-4 h-4 text-destructive mx-auto" />}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {row.status !== "saved" && (
                      <button onClick={() => removeRow(row.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── EXISTING CARDS ── */}
      {sortedCards.length > 0 && (
        <div className="bg-white rounded-2xl border shadow-sm">
          <div className="px-5 py-4 border-b">
            <h2 className="text-lg font-bold font-display text-primary">Cards in this Pack</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <th className="px-3 py-2.5 text-left w-16">#</th>
                  <th className="px-3 py-2.5 text-center w-20">Image</th>
                  <th className="px-3 py-2.5 text-left">Name</th>
                  <th className="px-3 py-2.5 text-left w-36">Rarity</th>
                  <th className="px-3 py-2.5 text-left w-44">Types</th>
                  <th className="px-3 py-2.5 text-center w-28">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedCards.map(card => (
                  <tr key={card.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2 font-mono text-sm font-bold text-muted-foreground">#{card.cardNumber}</td>
                    <td className="px-2 py-1.5 text-center">
                      {editingCardId === card.id ? (
                        <div className="flex flex-col items-center gap-1.5">
                          {/* Preview: new file takes priority, then existing URL */}
                          {(editImagePreview || editCurrentImageUrl) ? (
                            <div className="relative w-10 h-12 mx-auto">
                              <img src={editImagePreview ?? editCurrentImageUrl!} className="w-full h-full object-cover rounded border" />
                              <button
                                onClick={() => { setEditImageFile(null); setEditImagePreview(null); setEditCurrentImageUrl(null); }}
                                className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-4 h-4 flex items-center justify-center"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="w-10 h-12 bg-slate-100 rounded border mx-auto flex items-center justify-center">
                              <ImageIcon className="w-4 h-4 text-slate-300" />
                            </div>
                          )}
                          <button
                            onClick={() => editImageRef.current?.click()}
                            disabled={editImageUploading}
                            className="text-xs text-primary hover:underline font-semibold disabled:opacity-40"
                          >
                            {editImageUploading ? "Uploading…" : editImageFile ? "Replace" : "Upload"}
                          </button>
                          <input ref={editImageRef} type="file" accept="image/*" className="hidden"
                            onChange={e => {
                              const f = e.target.files?.[0];
                              if (f) { setEditImageFile(f); setEditImagePreview(URL.createObjectURL(f)); }
                              e.target.value = "";
                            }}
                          />
                        </div>
                      ) : card.imageUrl ? (
                        <img src={card.imageUrl} className="w-10 h-12 object-cover rounded border mx-auto" loading="lazy" />
                      ) : (
                        <div className="w-10 h-12 bg-slate-100 rounded border mx-auto flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-slate-300" />
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {editingCardId === card.id ? (
                        <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-7 text-sm" autoFocus />
                      ) : (
                        <span className="font-medium">{card.name}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {editingCardId === card.id ? (
                        <Select value={editRarity} onValueChange={(v: string) => setEditRarity(v)}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {cardRarities.map(r => (
                              <SelectItem key={r.name} value={r.name}>
                                <span className="inline-block px-2 py-0.5 rounded text-xs font-bold text-white" style={{ backgroundColor: r.color }}>{r.name}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ backgroundColor: getRarityColor(card.rarity) }}>{card.rarity}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {editingCardId === card.id ? (
                        <TagsMultiSelect
                          options={cardTypes}
                          value={editTags}
                          onChange={setEditTags}
                          className="w-full"
                        />
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {(card.tags ?? []).length === 0 ? (
                            <span className="text-xs text-muted-foreground italic">—</span>
                          ) : (card.tags ?? []).map(tag => {
                            const typeColor = cardTypes.find(t => t.name === tag)?.color ?? "#6b7280";
                            return (
                              <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full font-semibold border"
                                style={{ backgroundColor: typeColor + "22", borderColor: typeColor, color: typeColor, fontSize: "10px" }}>
                                {tag}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {editingCardId === card.id ? (
                          <>
                            <button onClick={() => saveEdit(card)} disabled={editImageUploading} className="text-green-600 hover:text-green-800 transition-colors disabled:opacity-40"><Check className="w-4 h-4" /></button>
                            <button onClick={cancelEdit} disabled={editImageUploading} className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"><X className="w-4 h-4" /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(card)} className="text-muted-foreground hover:text-primary transition-colors text-xs font-semibold underline">Edit</button>
                            <button onClick={() => handleDelete(card.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </TeacherLayout>
  );
}
