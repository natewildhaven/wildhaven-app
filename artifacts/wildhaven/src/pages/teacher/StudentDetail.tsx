import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { ArrowLeft, Trash2, Plus, Coins, Package, Edit2, Check, X } from "lucide-react";
import { useGetStudentCollection, useListCards } from "@workspace/api-client-react";
import { useAddCollectionEntry, useRemoveCollectionEntry } from "@/hooks/use-collections";
import { TeacherLayout } from "./Layout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const API = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "") + "/api";

export default function TeacherStudentDetail() {
  const [, params] = useRoute("/teacher/student/:id");
  const studentId = Number(params?.id);
  
  const { data: collection, isLoading: isColLoading } = useGetStudentCollection(studentId);
  const { data: allCards, isLoading: isCardsLoading } = useListCards();
  
  const { mutateAsync: addEntry, isPending: isAdding } = useAddCollectionEntry();
  const { mutateAsync: removeEntry } = useRemoveCollectionEntry();
  const { toast } = useToast();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string>("");

  const [coins, setCoins] = useState<number | null>(null);
  const [packs, setPacks] = useState<number | null>(null);

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
      .then(d => { setCoins(d.coins ?? 0); setPacks(d.count ?? 0); })
      .catch(() => {});
  }, [studentId]);

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCardId) return;
    try {
      await addEntry({ studentId, data: { cardId: Number(selectedCardId) } });
      setIsAddOpen(false);
      setSelectedCardId("");
      toast({ title: "Card added to student collection." });
    } catch {
      toast({ title: "Failed to add card", variant: "destructive" });
    }
  };

  const handleRemove = async (entryId: number) => {
    if (!confirm("Remove this specific card from their collection?")) return;
    try {
      await removeEntry({ studentId, entryId });
      toast({ title: "Card removed." });
    } catch {
      toast({ title: "Failed to remove card", variant: "destructive" });
    }
  };

  const handleSavePacks = async () => {
    const newTotal = parseInt(packInput, 10);
    if (isNaN(newTotal) || newTotal < 0 || packs === null) return;
    setIsSavingPacks(true);
    try {
      const res = await fetch(`${API}/students/${studentId}/inventory/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta: newTotal - packs }),
      });
      const data = await res.json();
      setPacks(data.count ?? newTotal);
    } catch { /* ignore */ } finally {
      setIsSavingPacks(false);
      setEditingPacks(false);
    }
  };

  const handleSaveCoins = async () => {
    const newTotal = parseInt(coinInput, 10);
    if (isNaN(newTotal) || newTotal < 0 || coins === null) return;
    setIsSavingCoins(true);
    try {
      const res = await fetch(`${API}/students/${studentId}/coins/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta: newTotal - coins }),
      });
      const data = await res.json();
      setCoins(data.coins ?? newTotal);
    } catch { /* ignore */ } finally {
      setIsSavingCoins(false);
      setEditingCoins(false);
    }
  };

  if (isColLoading || isCardsLoading) return <TeacherLayout><div className="p-8 text-center">Loading...</div></TeacherLayout>;
  if (!collection) return <TeacherLayout><div className="p-8 text-center">Student not found.</div></TeacherLayout>;

  return (
    <TeacherLayout>
      <div className="mb-6 flex justify-between items-center">
        <Link href="/teacher/dashboard" className="text-primary hover:underline flex items-center font-semibold text-sm">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
        </Link>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border mb-6">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-primary">{collection.student.name}'s Collection</h1>
            <p className="text-muted-foreground mt-1">Total Cards: {collection.totalCards} • Unique: {collection.uniqueCards}</p>
          </div>
          <Button onClick={() => setIsAddOpen(true)} className="font-bold">
            <Plus className="mr-2 h-4 w-4" /> Manually Add Card
          </Button>
        </div>

        <div className="mt-4 pt-4 border-t flex flex-col gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Packs pill */}
            <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-1.5">
              <Package className="w-4 h-4 text-primary" />
              <span className="font-bold text-primary">{packs ?? "…"} pack{packs !== 1 ? "s" : ""}</span>
              {!editingPacks && (
                <button
                  onClick={() => { setPackInput(String(packs ?? 0)); setEditingPacks(true); }}
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
              <span className="font-bold text-amber-700">{coins ?? "…"} coins</span>
              {!editingCoins && (
                <button
                  onClick={() => { setCoinInput(String(coins ?? 0)); setEditingCoins(true); }}
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
            <div className="flex items-center gap-1.5 p-2 rounded-xl border bg-primary/5 border-primary/20 max-w-xs">
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
            <div className="flex items-center gap-1.5 p-2 rounded-xl border bg-amber-50 border-amber-200 max-w-xs">
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

      <div className="bg-white rounded-2xl border overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b">
              <th className="p-4 font-bold text-muted-foreground">Card</th>
              <th className="p-4 font-bold text-muted-foreground">Pack ID</th>
              <th className="p-4 font-bold text-muted-foreground">Rarity</th>
              <th className="p-4 font-bold text-muted-foreground text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {collection.entries.map((entry) => (
              <tr key={entry.id} className="border-b last:border-0 hover:bg-slate-50">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    {entry.card.imageUrl ? (
                       <img src={entry.card.imageUrl} className="w-10 h-14 object-cover rounded bg-slate-100" loading="lazy" />
                    ) : (
                       <div className="w-10 h-14 bg-slate-100 rounded border border-slate-200"></div>
                    )}
                    <div>
                      <p className="font-bold font-display">{entry.card.name}</p>
                      <p className="text-xs text-muted-foreground">#{entry.card.cardNumber.toString().padStart(3, '0')}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4 font-mono text-sm">{entry.card.packId}</td>
                <td className="p-4">
                  <Badge variant="outline">{entry.card.rarity}</Badge>
                </td>
                <td className="p-4 text-right">
                  <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleRemove(entry.id)}>
                    <Trash2 className="w-4 h-4 mr-2" /> Remove
                  </Button>
                </td>
              </tr>
            ))}
            {collection.entries.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted-foreground">
                  No cards in collection yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manually Award Card</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCard} className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Select Card from Global Pool</label>
              <Select value={selectedCardId} onValueChange={setSelectedCardId}>
                <SelectTrigger>
                  <SelectValue placeholder="Search or select a card..." />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {allCards?.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      Pack {c.packId} - #{c.cardNumber} {c.name} ({c.rarity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isAdding || !selectedCardId}>Award Card</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </TeacherLayout>
  );
}
