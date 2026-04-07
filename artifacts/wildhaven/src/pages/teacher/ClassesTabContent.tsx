import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Edit2, Trash2, BookOpen, User, Users, Check, X, Search, Loader2, ArrowLeft, Gift, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PackBankWidget } from "@/components/PackBankWidget";

const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

export interface ClassItem { id: number; name: string; teacher: string | null; color?: string | null; }
interface StudentItem { id: number; name: string; classIds: number[]; }

interface Props {
  onDataChange?: () => void;
}

const CLASS_PRESETS = [
  "#6366f1","#3b82f6","#10b981","#f59e0b","#ef4444",
  "#8b5cf6","#06b6d4","#f97316","#d946ef","#14b8a6",
  "#ec4899","#22c55e","#64748b","#f43f5e","#84cc16",
];

export function ClassesTabContent({ onDataChange }: Props) {
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewingClassId, setViewingClassId] = useState<number | null>(null);
  const viewingClass = viewingClassId !== null ? classes.find(c => c.id === viewingClassId) : null;
  const studentsInViewedClass = viewingClassId !== null
    ? students.filter(s => (s.classIds ?? []).includes(viewingClassId))
    : [];

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createTeacher, setCreateTeacher] = useState("");
  const [createColor, setCreateColor] = useState("#6366f1");
  const [createColorHex, setCreateColorHex] = useState("#6366f1");
  const [isCreating, setIsCreating] = useState(false);

  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editTeacher, setEditTeacher] = useState("");
  const [editColor, setEditColor] = useState("#6366f1");
  const [editColorHex, setEditColorHex] = useState("#6366f1");
  const [isSaving, setIsSaving] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [togglingStudents, setTogglingStudents] = useState<Set<number>>(new Set());

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [classGiveOpen, setClassGiveOpen] = useState(false);
  const [classGiveQty, setClassGiveQty] = useState(1);
  const [classGiving, setClassGiving] = useState(false);

  const uniqueTeachers = useMemo(
    () => Array.from(new Set(classes.map(c => c.teacher).filter(Boolean) as string[])).sort(),
    [classes]
  );

  const handleGiveToClass = async () => {
    if (!viewingClassId || studentsInViewedClass.length === 0 || classGiving) return;
    setClassGiving(true);
    try {
      await Promise.all(
        studentsInViewedClass.map(s =>
          fetch(`${API}/students/${s.id}/inventory/adjust`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ delta: classGiveQty }),
          })
        )
      );
      toast({ title: `${classGiveQty} pack${classGiveQty !== 1 ? "s" : ""} given to all ${studentsInViewedClass.length} students!` });
      setClassGiveOpen(false);
      setClassGiveQty(1);
    } catch {
      toast({ title: "Failed to give packs to class", variant: "destructive" });
    } finally {
      setClassGiving(false);
    }
  };

  const fetchData = useCallback(async () => {
    const [cls, stu] = await Promise.all([
      fetch(`${API}/classes`).then(r => r.json()),
      fetch(`${API}/students`).then(r => r.json()),
    ]);
    setClasses(cls);
    setStudents(stu);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const studentCount = (classId: number) =>
    students.filter(s => (s.classIds ?? []).includes(classId)).length;

  const DEFAULT_COLOR = "#6366f1";

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch(`${API}/classes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName.trim(), teacher: createTeacher.trim() || null, color: createColor }),
      });
      if (!res.ok) throw new Error();
      toast({ title: `Class "${createName.trim()}" created!` });
      setCreateName(""); setCreateTeacher(""); setCreateColor(DEFAULT_COLOR); setCreateColorHex(DEFAULT_COLOR); setIsCreateOpen(false);
      await fetchData();
      onDataChange?.();
    } catch {
      toast({ title: "Failed to create class", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const openEdit = (cls: ClassItem) => {
    setEditingClass(cls);
    setEditName(cls.name);
    setEditTeacher(cls.teacher ?? "");
    const col = cls.color || DEFAULT_COLOR;
    setEditColor(col);
    setEditColorHex(col);
    setStudentSearch("");
    setTogglingStudents(new Set());
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass || !editName.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${API}/classes/${editingClass.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), teacher: editTeacher.trim() || null, color: editColor }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Class updated!" });
      setEditingClass(null);
      await fetchData();
      onDataChange?.();
    } catch {
      toast({ title: "Failed to update class", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStudent = useCallback(async (studentId: number, currentlyIn: boolean) => {
    if (!editingClass || togglingStudents.has(studentId)) return;
    setTogglingStudents(prev => new Set([...prev, studentId]));
    try {
      if (currentlyIn) {
        await fetch(`${API}/students/${studentId}/classes/${editingClass.id}`, { method: "DELETE" });
      } else {
        await fetch(`${API}/students/${studentId}/classes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ classId: editingClass.id }),
        });
      }
      setStudents(prev => prev.map(s => {
        if (s.id !== studentId) return s;
        const newClassIds = currentlyIn
          ? (s.classIds ?? []).filter(id => id !== editingClass.id)
          : [...(s.classIds ?? []), editingClass.id];
        return { ...s, classIds: newClassIds };
      }));
    } catch {
      toast({ title: "Failed to update student", variant: "destructive" });
    } finally {
      setTogglingStudents(prev => { const s = new Set(prev); s.delete(studentId); return s; });
    }
  }, [editingClass, togglingStudents, toast]);

  const handleDelete = async (id: number) => {
    setIsDeleting(true);
    try {
      await fetch(`${API}/classes/${id}`, { method: "DELETE" });
      const cls = classes.find(c => c.id === id);
      toast({ title: `Class "${cls?.name}" deleted.` });
      setDeletingId(null);
      await fetchData();
      onDataChange?.();
    } catch {
      toast({ title: "Failed to delete class", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const editStudentList = useMemo(() => {
    if (!editingClass) return [];
    const inClass = students.filter(s => (s.classIds ?? []).includes(editingClass.id));
    const notInClass = students.filter(s => !(s.classIds ?? []).includes(editingClass.id));
    const all = [
      ...inClass.sort((a, b) => a.name.localeCompare(b.name)),
      ...notInClass.sort((a, b) => a.name.localeCompare(b.name)),
    ];
    const q = studentSearch.trim().toLowerCase();
    return q ? all.filter(s => s.name.toLowerCase().includes(q)) : all;
  }, [editingClass, students, studentSearch]);

  const inClassCount = editingClass
    ? students.filter(s => (s.classIds ?? []).includes(editingClass.id)).length
    : 0;

  const renderColorPicker = (
    color: string, hexVal: string,
    setColor: (v: string) => void, setHex: (v: string) => void
  ) => (
    <div className="space-y-2">
      <label className="text-sm font-semibold">Class Colour</label>
      <div className="flex items-end gap-3">
        <label
          className="relative block w-10 h-10 rounded-xl border-2 border-border shadow-sm hover:border-primary transition-colors cursor-pointer overflow-hidden shrink-0"
          style={{ backgroundColor: color }}
          title="Open colour picker"
        >
          <input
            type="color"
            value={color}
            onChange={e => { setColor(e.target.value); setHex(e.target.value); }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </label>
        <div className="flex items-center border rounded-lg overflow-hidden bg-background shadow-sm flex-1">
          <span className="px-2.5 py-2 text-sm text-muted-foreground font-mono bg-muted border-r select-none">#</span>
          <input
            type="text"
            value={hexVal.replace(/^#/, "").toUpperCase()}
            onChange={e => {
              const raw = e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
              setHex("#" + raw);
              if (raw.length === 6) setColor("#" + raw.toLowerCase());
            }}
            onBlur={() => setHex(color)}
            className="flex-1 px-2 py-2 text-sm font-mono bg-transparent outline-none"
            placeholder="6366F1"
            maxLength={6}
            spellCheck={false}
          />
          <div className="w-7 h-7 rounded-md mr-1 border border-border shrink-0" style={{ backgroundColor: color }} />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {CLASS_PRESETS.map(hex => (
          <button
            key={hex}
            type="button"
            onClick={() => { setColor(hex); setHex(hex); }}
            className={cn(
              "w-6 h-6 rounded-full border-2 transition-all",
              color.toLowerCase() === hex ? "border-foreground scale-110 shadow-md" : "border-transparent hover:scale-105"
            )}
            style={{ backgroundColor: hex }}
            title={hex}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-muted-foreground mt-1">Manage your classes and their assigned teachers.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="font-bold shrink-0">
          <Plus className="w-4 h-4 mr-2" /> New Class
        </Button>
      </div>

      {/* ── Student list view for a selected class ── */}
      {viewingClassId !== null && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <button
              onClick={() => { setViewingClassId(null); setClassGiveOpen(false); setClassGiveQty(1); }}
              className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Classes
            </button>
            {viewingClass && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: viewingClass.color || "#6366f1" }} />
                <span className="font-bold font-display text-lg">{viewingClass.name}</span>
                {viewingClass.teacher && <span className="text-sm text-muted-foreground">· {viewingClass.teacher}</span>}
              </div>
            )}
            {studentsInViewedClass.length > 0 && !classGiveOpen && (
              <button
                onClick={() => { setClassGiveOpen(true); setClassGiveQty(1); }}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm font-bold transition-colors"
              >
                <Gift className="w-3.5 h-3.5" /> Give Packs to Class
              </button>
            )}
            {classGiveOpen && (
              <div className="ml-auto flex items-center gap-1.5 p-1.5 rounded-xl border bg-muted/50">
                <button onClick={() => setClassGiveQty(q => Math.max(1, q - 1))} className="w-7 h-7 rounded-lg border bg-white hover:bg-slate-50 flex items-center justify-center text-muted-foreground font-bold transition-colors">
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-8 text-center text-sm font-bold">{classGiveQty}</span>
                <button onClick={() => setClassGiveQty(q => q + 1)} className="w-7 h-7 rounded-lg border bg-white hover:bg-slate-50 flex items-center justify-center text-muted-foreground font-bold transition-colors">
                  <Plus className="w-3 h-3" />
                </button>
                <button
                  onClick={handleGiveToClass}
                  disabled={classGiving}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-40"
                >
                  {classGiving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  {classGiving ? "Giving…" : `Give to all ${studentsInViewedClass.length}`}
                </button>
                <button
                  onClick={() => { setClassGiveOpen(false); setClassGiveQty(1); }}
                  disabled={classGiving}
                  className="w-7 h-7 rounded-lg border bg-white hover:bg-slate-50 text-muted-foreground flex items-center justify-center transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {studentsInViewedClass.length === 0 ? (
            <div className="py-16 text-center border border-dashed rounded-2xl bg-card">
              <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground font-medium">No students in this class.</p>
              <p className="text-sm text-muted-foreground mt-1">Use the Edit button on this class to add students.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {studentsInViewedClass.map(student => (
                <Card key={student.id} className="p-5 flex flex-col gap-3 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xl font-display shrink-0">
                      {student.name[0].toUpperCase()}
                    </div>
                    <p className="font-bold text-base font-display leading-tight truncate">{student.name}</p>
                  </div>
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Inventory</p>
                    <PackBankWidget studentId={student.id} />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {viewingClassId === null && loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3].map(i => <div key={i} className="h-36 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      )}

      {viewingClassId === null && !loading && classes.length === 0 && (
        <div className="py-20 text-center border border-dashed rounded-2xl bg-card">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground font-medium">No classes yet.</p>
          <p className="text-sm text-muted-foreground mt-1">Click "New Class" to create your first one.</p>
        </div>
      )}

      {viewingClassId === null && !loading && classes.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map(cls => {
            const count = studentCount(cls.id);
            const isConfirmingDelete = deletingId === cls.id;
            const clsColor = cls.color || "#6366f1";
            return (
              <Card key={cls.id} className="p-5 flex flex-col gap-4 hover:shadow-md transition-shadow rounded-2xl overflow-hidden" style={{ borderTopColor: clsColor, borderTopWidth: 3 }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: clsColor + "22" }}>
                      <BookOpen className="w-5 h-5" style={{ color: clsColor }} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-lg font-display leading-tight truncate">{cls.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className={cn("text-sm truncate", cls.teacher ? "text-foreground" : "text-muted-foreground italic")}>
                          {cls.teacher || "No teacher assigned"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4 shrink-0" />
                  <span>{count} student{count !== 1 ? "s" : ""}</span>
                </div>

                <div className="flex items-center gap-2 mt-auto pt-1 border-t border-border/50">
                  {isConfirmingDelete ? (
                    <>
                      <span className="text-xs text-destructive font-semibold flex-1">Delete this class?</span>
                      <Button size="sm" variant="destructive" disabled={isDeleting} onClick={() => handleDelete(cls.id)} className="h-7 px-2 text-xs">
                        <Check className="w-3.5 h-3.5 mr-1" /> {isDeleting ? "Deleting…" : "Yes"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeletingId(null)} disabled={isDeleting} className="h-7 px-2 text-xs">
                        <X className="w-3.5 h-3.5 mr-1" /> No
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => setViewingClassId(cls.id)} className="h-7 px-2 text-xs gap-1.5 flex-1">
                        <Users className="w-3.5 h-3.5" /> Students
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(cls)} className="h-7 px-2 text-xs gap-1.5">
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeletingId(cls.id)} className="h-7 px-2 text-xs gap-1.5 text-destructive hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Create Dialog ── */}
      <Dialog open={isCreateOpen} onOpenChange={open => { if (!isCreating) { setIsCreateOpen(open); if (!open) { setCreateName(""); setCreateTeacher(""); } } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Class</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Class Name <span className="text-destructive">*</span></label>
              <Input required autoFocus value={createName} onChange={e => setCreateName(e.target.value)} placeholder="e.g. Period 1, Room 4B…" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Teacher</label>
              <Input
                value={createTeacher}
                onChange={e => setCreateTeacher(e.target.value)}
                placeholder="e.g. Ms. Smith"
                list="teacher-datalist"
              />
              <datalist id="teacher-datalist">
                {uniqueTeachers.map(t => <option key={t} value={t} />)}
              </datalist>
            </div>
            {renderColorPicker(createColor, createColorHex, setCreateColor, setCreateColorHex)}
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} disabled={isCreating}>Cancel</Button>
              <Button type="submit" disabled={isCreating || !createName.trim()} className="font-bold">
                {isCreating ? "Creating…" : "Create Class"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editingClass} onOpenChange={open => { if (!isSaving && !open) setEditingClass(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle>Edit Class</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <form id="edit-class-form" onSubmit={handleSaveEdit} className="px-6 pt-5 pb-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Class Name <span className="text-destructive">*</span></label>
                <Input required autoFocus value={editName} onChange={e => setEditName(e.target.value)} placeholder="e.g. Period 1, Room 4B…" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Teacher</label>
                <Input
                  value={editTeacher}
                  onChange={e => setEditTeacher(e.target.value)}
                  placeholder="e.g. Ms. Smith"
                  list="teacher-datalist"
                />
              </div>
              {renderColorPicker(editColor, editColorHex, setEditColor, setEditColorHex)}
            </form>

            <div className="px-6 pb-5 border-t">
              <div className="flex items-center justify-between pt-4 pb-3">
                <div>
                  <p className="font-semibold text-sm">Students</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{inClassCount} in this class · tick to add, untick to remove</p>
                </div>
                <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {inClassCount} / {students.length}
                </span>
              </div>

              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Search students…" className="pl-8 h-8 text-sm" />
                {studentSearch && (
                  <button type="button" onClick={() => setStudentSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {students.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No students yet. Add students from the Students tab first.</p>
              ) : editStudentList.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No students match your search.</p>
              ) : (
                <div className="space-y-1 max-h-56 overflow-y-auto pr-1 -mr-1">
                  {editStudentList.map(student => {
                    const inClass = editingClass ? (student.classIds ?? []).includes(editingClass.id) : false;
                    const isToggling = togglingStudents.has(student.id);
                    return (
                      <button
                        key={student.id}
                        type="button"
                        disabled={isToggling}
                        onClick={() => toggleStudent(student.id, inClass)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                          inClass ? "bg-primary/10 hover:bg-primary/15" : "hover:bg-muted",
                          isToggling && "opacity-60 cursor-not-allowed"
                        )}
                      >
                        <div className={cn(
                          "w-[18px] h-[18px] rounded flex items-center justify-center shrink-0 border transition-colors",
                          inClass ? "bg-primary border-primary" : "border-border bg-background"
                        )}>
                          {isToggling
                            ? <Loader2 className="w-3 h-3 animate-spin text-primary" />
                            : inClass && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs shrink-0">
                          {student.name[0].toUpperCase()}
                        </div>
                        <span className={cn("flex-1 truncate font-medium", inClass ? "text-foreground" : "text-muted-foreground")}>
                          {student.name}
                        </span>
                        {inClass && <span className="text-xs text-primary font-semibold shrink-0">In class</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-4 border-t shrink-0 flex items-center justify-end gap-2 bg-background">
            <Button type="button" variant="ghost" onClick={() => setEditingClass(null)} disabled={isSaving}>Close</Button>
            <Button type="submit" form="edit-class-form" disabled={isSaving || !editName.trim()} className="font-bold">
              {isSaving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
