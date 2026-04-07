import { useState, useRef, useCallback, useEffect } from "react";
import { Download, Loader2, X, Plus, ClipboardPaste, UserPlus, FileUp, LayoutGrid, Box } from "lucide-react";
import { TeacherLayout } from "./Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "") + "/api";

interface Class { id: number; name: string; }
interface Student { id: number; name: string; pin: string; classIds: number[]; }
interface CardInfo { id: number; cardNumber: number; name: string; packName: string; }
interface OverviewData {
  students: Student[];
  cards: CardInfo[];
  matrix: Record<number, Record<number, number>>;
}

/* ── Multi-select class popover ── */
function ClassMultiSelect({
  studentId,
  classIds,
  classes,
  onAdd,
  onRemove,
}: {
  studentId: number;
  classIds: number[];
  classes: Class[];
  onAdd: (studentId: number, classId: number) => void;
  onRemove: (studentId: number, classId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const assigned = classIds.map(id => classes.find(c => c.id === id)).filter(Boolean) as Class[];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex flex-wrap gap-1 items-center min-h-[28px] w-full text-left px-1.5 py-1 rounded hover:bg-slate-100 transition-colors"
      >
        {assigned.length === 0 ? (
          <span className="text-xs text-muted-foreground italic">No class — click to assign</span>
        ) : (
          assigned.map(cls => (
            <span key={cls.id} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 whitespace-nowrap">
              {cls.name}
              <span
                role="button"
                onClick={e => { e.stopPropagation(); onRemove(studentId, cls.id); }}
                className="text-primary/50 hover:text-primary cursor-pointer"
              >
                <X className="w-2.5 h-2.5" />
              </span>
            </span>
          ))
        )}
      </button>

      {open && classes.length > 0 && (
        <div className="absolute top-full left-0 z-50 mt-1 bg-white border rounded-lg shadow-xl p-1.5 min-w-[160px]">
          {classes.map(cls => {
            const checked = classIds.includes(cls.id);
            return (
              <label key={cls.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={e => { if (e.target.checked) onAdd(studentId, cls.id); else onRemove(studentId, cls.id); }}
                  className="accent-primary"
                />
                {cls.name}
              </label>
            );
          })}
        </div>
      )}

      {open && classes.length === 0 && (
        <div className="absolute top-full left-0 z-50 mt-1 bg-white border rounded-lg shadow-xl p-3 text-xs text-muted-foreground whitespace-nowrap">
          No classes yet — create one in the Students tab.
        </div>
      )}
    </div>
  );
}

/* ── New student row (pending creation) ── */
interface NewStudentRow {
  localId: string;
  name: string;
  isSaving: boolean;
  counts: Record<number, number>;
}

type MatrixTab = "cards" | "collectibles";

export default function StudentsMatrix() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<MatrixTab>("cards");
  const [data, setData] = useState<OverviewData | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [localMatrix, setLocalMatrix] = useState<Record<number, Record<number, number>>>({});
  const [newRows, setNewRows] = useState<NewStudentRow[]>([]);
  const tableRef = useRef<HTMLTableElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [overviewRes, classesRes] = await Promise.all([
        fetch(`${API_BASE}/admin/overview`),
        fetch(`${API_BASE}/classes`),
      ]);
      const json: OverviewData = await overviewRes.json();
      const cls: Class[] = await classesRes.json();
      setData(json);
      setLocalMatrix(json.matrix);
      setClasses(cls);
    } catch {
      toast({ title: "Failed to load data", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Cell editing (existing students) ── */
  const handleCellChange = (studentId: number, cardId: number, val: string) => {
    const count = Math.max(0, parseInt(val) || 0);
    setLocalMatrix(prev => ({ ...prev, [studentId]: { ...prev[studentId], [cardId]: count } }));
  };

  const handleCellBlur = async (studentId: number, cardId: number) => {
    const count = localMatrix[studentId]?.[cardId] ?? 0;
    const orig = data?.matrix[studentId]?.[cardId] ?? 0;
    if (count === orig) return;
    try {
      await fetch(`${API_BASE}/admin/cell`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, cardId, count }),
      });
      setData(prev => {
        if (!prev) return prev;
        const newMatrix = { ...prev.matrix, [studentId]: { ...prev.matrix[studentId], [cardId]: count } };
        return { ...prev, matrix: newMatrix };
      });
    } catch {
      toast({ title: "Failed to save cell", variant: "destructive" });
    }
  };

  /* ── Class assignment ── */
  const handleAddClass = async (studentId: number, classId: number) => {
    await fetch(`${API_BASE}/students/${studentId}/classes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId }),
    });
    setData(prev => prev ? {
      ...prev,
      students: prev.students.map(s => s.id === studentId ? { ...s, classIds: [...(s.classIds ?? []), classId] } : s),
    } : prev);
  };

  const handleRemoveClass = async (studentId: number, classId: number) => {
    await fetch(`${API_BASE}/students/${studentId}/classes/${classId}`, { method: "DELETE" });
    setData(prev => prev ? {
      ...prev,
      students: prev.students.map(s => s.id === studentId ? { ...s, classIds: (s.classIds ?? []).filter(id => id !== classId) } : s),
    } : prev);
  };

  /* ── New student rows ── */
  const addNewRow = () => {
    setNewRows(prev => [...prev, { localId: Math.random().toString(36).slice(2), name: "", isSaving: false, counts: {} }]);
  };

  const updateNewRowName = (localId: string, name: string) =>
    setNewRows(prev => prev.map(r => r.localId === localId ? { ...r, name } : r));

  const updateNewRowCount = (localId: string, cardId: number, val: string) => {
    const count = Math.max(0, parseInt(val) || 0);
    setNewRows(prev => prev.map(r => r.localId === localId ? { ...r, counts: { ...r.counts, [cardId]: count } } : r));
  };

  const removeNewRow = (localId: string) =>
    setNewRows(prev => prev.filter(r => r.localId !== localId));

  const saveNewStudent = async (localId: string) => {
    const row = newRows.find(r => r.localId === localId);
    if (!row || !row.name.trim()) return;

    // Check name doesn't conflict
    if (data?.students.some(s => s.name.toLowerCase() === row.name.trim().toLowerCase())) {
      toast({ title: `Student "${row.name.trim()}" already exists`, variant: "destructive" });
      return;
    }

    setNewRows(prev => prev.map(r => r.localId === localId ? { ...r, isSaving: true } : r));
    try {
      const pin = generatePin(data?.students ?? []);
      const res = await fetch(`${API_BASE}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: row.name.trim(), pin }),
      });
      if (!res.ok) throw new Error();
      const student = await res.json();

      // Save any pending card counts
      const updates = Object.entries(row.counts)
        .filter(([, c]) => c > 0)
        .map(([cardId, count]) => ({ studentId: student.id, cardId: Number(cardId), count }));

      if (updates.length > 0) {
        await fetch(`${API_BASE}/admin/batch-update`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updates }),
        });
      }

      toast({ title: `Student "${row.name.trim()}" added! PIN: ${pin}` });
      setNewRows(prev => prev.filter(r => r.localId !== localId));
      await fetchData();
    } catch {
      toast({ title: "Failed to create student", variant: "destructive" });
      setNewRows(prev => prev.map(r => r.localId === localId ? { ...r, isSaving: false } : r));
    }
  };

  /* ── Shared text-data processor (used by both paste and CSV upload) ── */
  const processTextData = useCallback(async (text: string) => {
    if (!data) return;
    const lines = text.split("\n").map(l => l.trimEnd()).filter(l => l.trim());
    if (lines.length === 0) return;

    const sep = lines[0].includes("\t") ? "\t" : ",";
    const cells0 = lines[0].split(sep).map(c => c.trim());

    // Detect header row: first cell is non-numeric text and not an existing student name
    let headerRow: string[] | null = null;
    let dataLines = lines;
    if (cells0[0] && isNaN(Number(cells0[0])) && !data.students.some(s => s.name.toLowerCase() === cells0[0].toLowerCase())) {
      headerRow = cells0;
      dataLines = lines.slice(1);
    }

    // Detect Classes column position and card start column
    let classesColIdx = -1;
    let cardStartCol = 1;
    if (headerRow) {
      for (let i = 1; i < Math.min(headerRow.length, 4); i++) {
        if (["class", "classes"].includes(headerRow[i].toLowerCase())) {
          classesColIdx = i;
          cardStartCol = i + 1;
          break;
        }
      }
    }

    const existingUpdates: { studentId: number; cardId: number; count: number }[] = [];
    const toCreate: { name: string; className: string; counts: { cardId: number; count: number }[] }[] = [];

    for (const line of dataLines) {
      const cells = line.split(sep).map(c => c.trim());
      const name = cells[0];
      if (!name) continue;

      const className = classesColIdx >= 0 ? (cells[classesColIdx] ?? "").trim() : "";

      const cardCounts: { cardId: number; count: number }[] = [];
      for (let ci = cardStartCol; ci < cells.length; ci++) {
        const raw = cells[ci];
        if (!raw || raw === "-") continue;
        const count = Math.max(0, parseInt(raw) || 0);
        let card: CardInfo | undefined;
        if (headerRow && headerRow[ci]) {
          // Support "Card1", "Card 1", "1" formats in header
          const headerVal = headerRow[ci].replace(/^[Cc]ard\s*/i, "").trim();
          const n = parseInt(headerVal);
          card = isNaN(n)
            ? data.cards.find(c => c.name.toLowerCase() === headerRow![ci].toLowerCase())
            : data.cards.find(c => c.cardNumber === n);
        } else {
          card = data.cards[ci - cardStartCol];
        }
        if (!card) continue;
        cardCounts.push({ cardId: card.id, count });
      }

      const existing = data.students.find(s => s.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        existingUpdates.push(...cardCounts.map(d => ({ studentId: existing.id, ...d })));
        // Assign class if given and not already assigned
        if (className) {
          const cls = classes.find(c => c.name.toLowerCase() === className.toLowerCase());
          if (cls && !existing.classIds.includes(cls.id)) {
            await fetch(`${API_BASE}/students/${existing.id}/classes`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ classId: cls.id }),
            });
          }
        }
      } else {
        toCreate.push({ name, className, counts: cardCounts });
      }
    }

    if (existingUpdates.length > 0) {
      await batchSave(existingUpdates, data);
    }

    if (toCreate.length > 0) {
      let createdCount = 0;
      const snap = data;
      for (const ns of toCreate) {
        const pin = generatePin([...(snap?.students ?? []), ...toCreate.slice(0, createdCount).map((_, i) => ({ pin: "" + i } as Student))]);
        const res = await fetch(`${API_BASE}/students`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: ns.name, pin }),
        });
        if (!res.ok) continue;
        const student = await res.json();
        if (ns.counts.length > 0) {
          await fetch(`${API_BASE}/admin/batch-update`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ updates: ns.counts.map(c => ({ studentId: student.id, ...c })) }),
          });
        }
        // Assign class if given
        if (ns.className) {
          const cls = classes.find(c => c.name.toLowerCase() === ns.className.toLowerCase());
          if (cls) {
            await fetch(`${API_BASE}/students/${student.id}/classes`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ classId: cls.id }),
            });
          }
        }
        createdCount++;
      }
      toast({ title: `${toCreate.length} new student${toCreate.length > 1 ? "s" : ""} created and saved` });
      await fetchData();
    } else if (existingUpdates.length === 0) {
      toast({ title: "No matching data found" });
    } else {
      await fetchData();
    }
  }, [data, classes]);

  /* ── CSV file upload ── */
  const handleCsvUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      if (!text?.trim()) {
        toast({ title: "CSV file is empty", variant: "destructive" });
        return;
      }
      await processTextData(text);
    };
    reader.readAsText(file);
  }, [processTextData, toast]);

  /* ── Paste handler ── */
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    if (!data) return;
    const text = e.clipboardData.getData("text");
    if (!text.trim()) return;
    e.preventDefault();
    await processTextData(text);
  }, [data, processTextData]);

  async function batchSave(
    updates: { studentId: number; cardId: number; count: number }[],
    snap: OverviewData,
  ) {
    if (updates.length === 0) return;
    try {
      await fetch(`${API_BASE}/admin/batch-update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const newMatrix = { ...snap.matrix };
      for (const u of updates) {
        newMatrix[u.studentId] = { ...newMatrix[u.studentId], [u.cardId]: u.count };
      }
      setData({ ...snap, matrix: newMatrix });
      setLocalMatrix(newMatrix);
      toast({ title: `Saved ${updates.length} cell${updates.length !== 1 ? "s" : ""}` });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  }

  /* ── CSV export ── */
  const exportCsv = () => {
    if (!data) return;
    const header = ["Student", "Classes", ...data.cards.map(c => `${c.cardNumber}`)];
    const rows = data.students.map(s => {
      const classNames = (s.classIds ?? []).map(id => classes.find(c => c.id === id)?.name ?? "").filter(Boolean).join("; ");
      return [s.name, classNames, ...data.cards.map(c => localMatrix[s.id]?.[c.id] ?? 0)];
    });
    const csv = [header, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "wildhaven-collection-matrix.csv"; a.click();
  };

  const tabBar = (
    <div className="mb-5">
      <h1 className="text-3xl font-display font-bold mb-4">Matrix</h1>
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("cards")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
            activeTab === "cards"
              ? "bg-white shadow text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <LayoutGrid className="w-4 h-4" /> Cards
        </button>
        <button
          onClick={() => setActiveTab("collectibles")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
            activeTab === "collectibles"
              ? "bg-white shadow text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Box className="w-4 h-4" /> Collectibles
        </button>
      </div>
    </div>
  );

  if (activeTab === "collectibles") {
    return (
      <TeacherLayout>
        {tabBar}
        <CollectiblesMatrix />
      </TeacherLayout>
    );
  }

  if (isLoading) {
    return (
      <TeacherLayout>
        {tabBar}
        <div className="flex items-center justify-center py-32 gap-3 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-lg">Loading collection data...</span>
        </div>
      </TeacherLayout>
    );
  }

  if (!data) {
    return (
      <TeacherLayout>
        {tabBar}
        <div className="py-24 text-center text-muted-foreground">
          <h2 className="text-2xl font-display font-bold mb-2">No data available</h2>
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      {tabBar}
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
            <ClipboardPaste className="w-4 h-4" />
            <span>Paste a spreadsheet directly — columns: <strong className="text-foreground">Student Name · Classes · Card #1 · Card #2…</strong></span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">New student names are created automatically. Cells auto-save on blur.</p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          <Button variant="outline" onClick={() => csvInputRef.current?.click()}>
            <FileUp className="w-4 h-4 mr-2" /> Upload CSV
          </Button>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,.tsv,text/csv"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleCsvUpload(f); e.target.value = ""; }}
          />
          <Button variant="outline" onClick={addNewRow}>
            <UserPlus className="w-4 h-4 mr-2" /> Add Student Row
          </Button>
          <Button variant="outline" onClick={exportCsv}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-auto max-h-[calc(100vh-280px)]" onPaste={handlePaste}>
          <table ref={tableRef} className="text-sm border-collapse">
            <thead className="sticky top-0 z-20 bg-white">
              <tr>
                <th className="sticky left-0 z-30 bg-slate-50 border-b border-r px-4 py-2.5 text-left font-bold min-w-[160px] whitespace-nowrap">
                  Student
                </th>
                <th className="border-b border-r px-3 py-2.5 text-left font-bold min-w-[200px] whitespace-nowrap bg-white">
                  Classes
                </th>
                {data.cards.map(card => (
                  <th key={card.id} className="border-b border-r px-2 py-1 text-center font-bold min-w-[52px] bg-white">
                    <div className="text-xs font-bold text-foreground">#{card.cardNumber}</div>
                    <div className="text-[10px] text-muted-foreground font-normal truncate max-w-[48px]" title={`${card.packName}: ${card.name}`}>
                      {card.packName.slice(0, 6)}
                    </div>
                  </th>
                ))}
                <th className="border-b px-3 py-2.5 text-center font-bold min-w-[60px] bg-slate-50 text-muted-foreground text-xs">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Existing students */}
              {data.students.map((student, si) => {
                const rowTotal = data.cards.reduce((sum, c) => sum + (localMatrix[student.id]?.[c.id] ?? 0), 0);
                const rowBg = si % 2 === 0 ? "bg-white" : "bg-slate-50/50";
                const stickyBg = si % 2 === 0 ? "bg-white" : "bg-slate-50";
                return (
                  <tr key={student.id} className={cn("hover:bg-blue-50/30 transition-colors", rowBg)}>
                    <td className={cn("sticky left-0 z-10 border-b border-r px-4 py-1.5 font-semibold whitespace-nowrap", stickyBg)}>
                      <div>{student.name}</div>
                      <div className="text-xs text-muted-foreground font-mono font-normal">PIN: {student.pin}</div>
                    </td>
                    <td className="border-b border-r px-1.5 py-1">
                      <ClassMultiSelect
                        studentId={student.id}
                        classIds={student.classIds ?? []}
                        classes={classes}
                        onAdd={handleAddClass}
                        onRemove={handleRemoveClass}
                      />
                    </td>
                    {data.cards.map(card => {
                      const val = localMatrix[student.id]?.[card.id] ?? 0;
                      const orig = data.matrix[student.id]?.[card.id] ?? 0;
                      const isDirty = val !== orig;
                      return (
                        <td key={card.id} className={cn("border-b border-r text-center p-0", isDirty && "bg-yellow-50")}>
                          <input
                            type="number"
                            min={0}
                            value={val}
                            onChange={e => handleCellChange(student.id, card.id, e.target.value)}
                            onBlur={() => handleCellBlur(student.id, card.id)}
                            className={cn(
                              "w-full h-full text-center py-1.5 px-0 text-sm font-medium outline-none bg-transparent",
                              "focus:bg-blue-50 focus:ring-2 focus:ring-inset focus:ring-blue-400",
                              isDirty && "font-bold text-amber-700",
                              val === 0 && !isDirty && "text-slate-300",
                              val > 0 && !isDirty && "text-slate-800",
                            )}
                            style={{ minWidth: 52 }}
                          />
                        </td>
                      );
                    })}
                    <td className={cn("border-b px-3 py-1.5 text-center font-bold text-sm", si % 2 === 0 ? "bg-slate-50" : "bg-slate-100")}>
                      {rowTotal}
                    </td>
                  </tr>
                );
              })}

              {/* New student rows */}
              {newRows.map(row => (
                <tr key={row.localId} className="bg-amber-50/50 hover:bg-amber-50 transition-colors border-t-2 border-amber-200">
                  <td className="sticky left-0 z-10 border-b border-r px-2 py-1.5 bg-amber-50">
                    <div className="flex items-center gap-1.5">
                      <Input
                        autoFocus
                        value={row.name}
                        onChange={e => updateNewRowName(row.localId, e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveNewStudent(row.localId); }}
                        placeholder="Student name…"
                        className="h-8 text-sm min-w-[120px]"
                        disabled={row.isSaving}
                      />
                      <button
                        onClick={() => saveNewStudent(row.localId)}
                        disabled={!row.name.trim() || row.isSaving}
                        className="text-green-600 hover:text-green-800 disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Create student"
                      >
                        {row.isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      </button>
                      <button onClick={() => removeNewRow(row.localId)} className="text-muted-foreground hover:text-destructive">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-[10px] text-amber-600 mt-0.5 ml-0.5">New — PIN auto-assigned</div>
                  </td>
                  <td className="border-b border-r px-2 py-1.5 text-xs text-muted-foreground italic">
                    Assign classes after saving
                  </td>
                  {data.cards.map(card => {
                    const val = row.counts[card.id] ?? 0;
                    return (
                      <td key={card.id} className="border-b border-r text-center p-0">
                        <input
                          type="number"
                          min={0}
                          value={val || ""}
                          onChange={e => updateNewRowCount(row.localId, card.id, e.target.value)}
                          placeholder="0"
                          className="w-full h-full text-center py-1.5 px-0 text-sm font-medium outline-none bg-transparent focus:bg-blue-50 focus:ring-2 focus:ring-inset focus:ring-blue-400 text-slate-600"
                          style={{ minWidth: 52 }}
                          disabled={row.isSaving}
                        />
                      </td>
                    );
                  })}
                  <td className="border-b px-3 py-1.5 text-center text-xs text-muted-foreground bg-amber-50">
                    —
                  </td>
                </tr>
              ))}

              {/* Empty state */}
              {data.students.length === 0 && newRows.length === 0 && (
                <tr>
                  <td colSpan={data.cards.length + 3} className="py-16 text-center text-muted-foreground">
                    <p className="font-semibold">No students yet</p>
                    <p className="text-sm mt-1">Paste a spreadsheet above or click "Add Student Row"</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t bg-slate-50 text-xs text-muted-foreground">
          {data.students.length} students · {data.cards.length} cards
        </div>
      </div>
    </TeacherLayout>
  );
}

/* ── Collectibles matrix ── */

interface FigurineInfo {
  id: number;
  boxId: number;
  boxName: string;
  figurineNumber: number;
  name: string;
  imageUrl?: string | null;
  rarityName?: string | null;
  rarityColor?: string | null;
}

interface FigurinesOverviewData {
  students: Array<{ id: number; name: string; pin: string; classIds: number[] }>;
  figurines: FigurineInfo[];
  owned: Record<number, number[]>;
}

function CollectiblesMatrix() {
  const { toast } = useToast();
  const [data, setData] = useState<FigurinesOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [localOwned, setLocalOwned] = useState<Record<number, Set<number>>>({});
  const tableRef = useRef<HTMLTableElement>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/figurines-overview`);
      const json: FigurinesOverviewData = await res.json();
      setData(json);
      const owned: Record<number, Set<number>> = {};
      for (const [sid, fids] of Object.entries(json.owned)) {
        owned[Number(sid)] = new Set(fids);
      }
      setLocalOwned(owned);
    } catch {
      toast({ title: "Failed to load collectibles data", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleToggle = async (studentId: number, figurineId: number) => {
    const current = localOwned[studentId]?.has(figurineId) ?? false;
    const next = !current;
    setLocalOwned(prev => {
      const s = new Set(prev[studentId] ?? []);
      if (next) s.add(figurineId); else s.delete(figurineId);
      return { ...prev, [studentId]: s };
    });
    try {
      await fetch(`${API_BASE}/admin/figurine-cell`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, figurineId, owned: next }),
      });
      setData(prev => {
        if (!prev) return prev;
        const newOwned = { ...prev.owned };
        if (next) {
          newOwned[studentId] = [...(newOwned[studentId] ?? []).filter(id => id !== figurineId), figurineId];
        } else {
          newOwned[studentId] = (newOwned[studentId] ?? []).filter(id => id !== figurineId);
        }
        return { ...prev, owned: newOwned };
      });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
      setLocalOwned(prev => {
        const s = new Set(prev[studentId] ?? []);
        if (current) s.add(figurineId); else s.delete(figurineId);
        return { ...prev, [studentId]: s };
      });
    }
  };

  const exportCsv = () => {
    if (!data) return;
    const header = ["Student", ...data.figurines.map(f => `${f.boxName}: ${f.name}`)];
    const rows = data.students.map(s =>
      [s.name, ...data.figurines.map(f => (localOwned[s.id]?.has(f.id) ? "1" : "0"))]
    );
    const csv = [header, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "wildhaven-collectibles-matrix.csv"; a.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32 gap-3 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-lg">Loading collectibles data...</span>
      </div>
    );
  }

  if (!data || data.figurines.length === 0) {
    return (
      <div className="py-24 text-center text-muted-foreground">
        <Box className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <h2 className="text-xl font-bold mb-1">No collectibles yet</h2>
        <p className="text-sm">Add collectibles to mystery boxes in the Packs &amp; Boxes section.</p>
      </div>
    );
  }

  const boxGroups: { boxId: number; boxName: string; figurines: FigurineInfo[] }[] = [];
  for (const fig of data.figurines) {
    const grp = boxGroups.find(g => g.boxId === fig.boxId);
    if (grp) grp.figurines.push(fig);
    else boxGroups.push({ boxId: fig.boxId, boxName: fig.boxName, figurines: [fig] });
  }

  return (
    <>
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            Click a cell to toggle ownership. Changes save instantly.
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv} className="shrink-0">
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-auto max-h-[calc(100vh-320px)]">
          <table ref={tableRef} className="text-sm border-collapse">
            <thead className="sticky top-0 z-20 bg-white">
              <tr>
                <th className="sticky left-0 z-30 bg-slate-50 border-b border-r px-4 py-2.5 text-left font-bold min-w-[160px] whitespace-nowrap" rowSpan={2}>
                  Student
                </th>
                {boxGroups.map(grp => (
                  <th
                    key={grp.boxId}
                    colSpan={grp.figurines.length}
                    className="border-b border-r px-2 py-1.5 text-center text-xs font-bold bg-slate-100 text-slate-600 whitespace-nowrap"
                  >
                    {grp.boxName}
                  </th>
                ))}
                <th className="border-b px-3 py-2.5 text-center font-bold min-w-[60px] bg-slate-50 text-muted-foreground text-xs" rowSpan={2}>
                  Total
                </th>
              </tr>
              <tr>
                {data.figurines.map(fig => (
                  <th key={fig.id} className="border-b border-r px-1.5 py-1 text-center font-medium min-w-[52px] bg-white">
                    <div className="flex flex-col items-center gap-0.5">
                      {fig.imageUrl && (
                        <img src={fig.imageUrl} alt={fig.name} className="w-6 h-6 object-contain rounded" loading="lazy" />
                      )}
                      <div className="text-[10px] font-bold text-foreground leading-tight">#{fig.figurineNumber}</div>
                      <div
                        className="text-[9px] font-normal leading-tight truncate max-w-[48px]"
                        style={{ color: fig.rarityColor ?? "#64748b" }}
                        title={`${fig.name} (${fig.rarityName ?? ""})`}
                      >
                        {fig.name.length > 7 ? fig.name.slice(0, 6) + "…" : fig.name}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.students.map((student, si) => {
                const rowOwned = localOwned[student.id] ?? new Set();
                const total = rowOwned.size;
                const rowBg = si % 2 === 0 ? "bg-white" : "bg-slate-50/50";
                const stickyBg = si % 2 === 0 ? "bg-white" : "bg-slate-50";
                return (
                  <tr key={student.id} className={cn("hover:bg-blue-50/30 transition-colors", rowBg)}>
                    <td className={cn("sticky left-0 z-10 border-b border-r px-4 py-1.5 font-semibold whitespace-nowrap", stickyBg)}>
                      <div>{student.name}</div>
                      <div className="text-xs text-muted-foreground font-mono font-normal">PIN: {student.pin}</div>
                    </td>
                    {data.figurines.map(fig => {
                      const isOwned = rowOwned.has(fig.id);
                      return (
                        <td
                          key={fig.id}
                          className={cn(
                            "border-b border-r text-center p-0 cursor-pointer transition-colors",
                            isOwned ? "bg-emerald-50 hover:bg-emerald-100" : "hover:bg-slate-100"
                          )}
                          onClick={() => handleToggle(student.id, fig.id)}
                          title={`${student.name} — ${fig.name}`}
                        >
                          <div className="flex items-center justify-center py-2 px-1">
                            {isOwned ? (
                              <span
                                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[11px] font-bold"
                                style={{ backgroundColor: fig.rarityColor ?? "#10b981" }}
                              >✓</span>
                            ) : (
                              <span className="inline-block w-5 h-5 rounded-full border-2 border-slate-200" />
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td className={cn("border-b px-3 py-1.5 text-center font-bold text-sm", si % 2 === 0 ? "bg-slate-50" : "bg-slate-100")}>
                      {total}
                    </td>
                  </tr>
                );
              })}
              {data.students.length === 0 && (
                <tr>
                  <td colSpan={data.figurines.length + 2} className="py-16 text-center text-muted-foreground">
                    <p className="font-semibold">No students yet</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t bg-slate-50 text-xs text-muted-foreground">
          {data.students.length} students · {data.figurines.length} collectibles across {boxGroups.length} box{boxGroups.length !== 1 ? "es" : ""}
        </div>
      </div>
    </>
  );
}

function generatePin(existingStudents: { pin?: string }[]): string {
  const used = new Set(existingStudents.map(s => s.pin).filter(Boolean));
  let pin = "";
  do { pin = String(Math.floor(1000 + Math.random() * 9000)); } while (used.has(pin));
  return pin;
}
