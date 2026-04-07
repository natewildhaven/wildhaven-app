import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Edit2, Trash2, BookOpen, User, Users, Check, X, Search, Loader2, ArrowLeft, Gift, Minus, GripVertical } from "lucide-react";
import { TeacherLayout } from "./Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PackBankWidget } from "@/components/PackBankWidget";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const API = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "") + "/api";
const UNASSIGNED_KEY = "__unassigned__";

interface ClassItem { id: number; name: string; teacher: string | null; color?: string | null; sortOrder: number; }
interface StudentItem { id: number; name: string; classIds: number[]; }

// ── Sortable class row ──────────────────────────────────────────────────────
function SortableClassRow({
  cls, count, deletingId, isDeleting,
  onView, onEdit, onDeleteRequest, onDeleteCancel, onDeleteConfirm,
}: {
  cls: ClassItem; count: number; deletingId: number | null; isDeleting: boolean;
  onView: () => void; onEdit: () => void; onDeleteRequest: () => void;
  onDeleteCancel: () => void; onDeleteConfirm: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cls.id });
  const clsColor = cls.color || "#6366f1";
  const isConfirming = deletingId === cls.id;
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, zIndex: isDragging ? 50 : undefined }}>
      <Card className="flex items-center gap-2.5 px-3 py-2.5 hover:shadow-sm transition-shadow rounded-xl overflow-hidden" style={{ borderLeftColor: clsColor, borderLeftWidth: 3 }}>
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground/60 shrink-0 touch-none p-0.5 -ml-1" title="Drag to reorder">
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: clsColor + "22" }}>
          <BookOpen className="w-3.5 h-3.5" style={{ color: clsColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold font-display leading-tight truncate text-sm">{cls.name}</p>
          <p className="text-xs text-muted-foreground">{count} student{count !== 1 ? "s" : ""}</p>
        </div>
        {isConfirming ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-destructive font-semibold hidden sm:inline">Delete?</span>
            <Button size="sm" variant="destructive" disabled={isDeleting} onClick={onDeleteConfirm} className="h-6 px-2 text-xs">
              <Check className="w-3 h-3 mr-1" />{isDeleting ? "…" : "Yes"}
            </Button>
            <Button size="sm" variant="ghost" onClick={onDeleteCancel} disabled={isDeleting} className="h-6 px-2 text-xs">
              <X className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1 shrink-0">
            <Button size="sm" variant="secondary" onClick={onView} className="h-7 px-2 text-xs gap-1.5">
              <Users className="w-3.5 h-3.5" /><span className="hidden sm:inline">Students</span>
            </Button>
            <Button size="sm" variant="ghost" onClick={onEdit} className="h-7 px-2 text-xs">
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="ghost" onClick={onDeleteRequest} className="h-7 px-2 text-xs text-destructive hover:text-destructive">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Sortable teacher section ────────────────────────────────────────────────
function SortableTeacherSection({
  teacherKey, label, groupClasses, sensors,
  deletingId, isDeleting, studentCount,
  onView, onEdit, onDeleteRequest, onDeleteCancel, onDeleteConfirm,
  onClassDragEnd,
}: {
  teacherKey: string; label: string; groupClasses: ClassItem[]; sensors: ReturnType<typeof useSensors>;
  deletingId: number | null; isDeleting: boolean; studentCount: (id: number) => number;
  onView: (id: number) => void; onEdit: (cls: ClassItem) => void;
  onDeleteRequest: (id: number) => void; onDeleteCancel: () => void; onDeleteConfirm: (id: number) => void;
  onClassDragEnd: (event: DragEndEvent, teacherKey: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: teacherKey });
  const isUnassigned = teacherKey === UNASSIGNED_KEY;
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground/60 shrink-0 touch-none p-0.5" title="Drag to reorder teachers">
            <GripVertical className="w-4 h-4" />
          </button>
          <User className={cn("w-4 h-4 shrink-0", isUnassigned ? "text-muted-foreground/50" : "text-muted-foreground")} />
          <h3 className={cn("text-sm font-bold uppercase tracking-wide", isUnassigned ? "text-muted-foreground/60 italic" : "text-muted-foreground")}>
            {label}
          </h3>
          <span className="text-xs font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
            {groupClasses.length}
          </span>
        </div>
        <div className="pl-6">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => onClassDragEnd(e, teacherKey)}>
            <SortableContext items={groupClasses.map(c => c.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1.5">
                {groupClasses.map(cls => (
                  <SortableClassRow
                    key={cls.id}
                    cls={cls}
                    count={studentCount(cls.id)}
                    deletingId={deletingId}
                    isDeleting={isDeleting}
                    onView={() => onView(cls.id)}
                    onEdit={() => onEdit(cls)}
                    onDeleteRequest={() => onDeleteRequest(cls.id)}
                    onDeleteCancel={onDeleteCancel}
                    onDeleteConfirm={() => onDeleteConfirm(cls.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function TeacherClasses() {
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [teacherOrder, setTeacherOrder] = useState<string[]>([]);

  // ── View Students state ──
  const [viewingClassId, setViewingClassId] = useState<number | null>(null);
  const viewingClass = viewingClassId !== null ? classes.find(c => c.id === viewingClassId) : null;
  const studentsInViewedClass = viewingClassId !== null
    ? students.filter(s => (s.classIds ?? []).includes(viewingClassId))
    : [];

  // ── Create dialog ──
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createTeacher, setCreateTeacher] = useState("");
  const [createColor, setCreateColor] = useState("#6366f1");
  const [createColorHex, setCreateColorHex] = useState("#6366f1");
  const [isCreating, setIsCreating] = useState(false);

  // ── Edit dialog ──
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editTeacher, setEditTeacher] = useState("");
  const [editColor, setEditColor] = useState("#6366f1");
  const [editColorHex, setEditColorHex] = useState("#6366f1");
  const [isSaving, setIsSaving] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [togglingStudents, setTogglingStudents] = useState<Set<number>>(new Set());

  // ── Delete confirm ──
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Give packs to entire class ──
  const [classGiveOpen, setClassGiveOpen] = useState(false);
  const [classGiveQty, setClassGiveQty] = useState(1);
  const [classGiving, setClassGiving] = useState(false);

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
    const [cls, stu, order] = await Promise.all([
      fetch(`${API}/classes`).then(r => r.json()),
      fetch(`${API}/students`).then(r => r.json()),
      fetch(`${API}/teacher-order`).then(r => r.json()).catch(() => []),
    ]);
    setClasses(cls);
    setStudents(stu);
    setTeacherOrder(Array.isArray(order) ? order : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const studentCount = (classId: number) =>
    students.filter(s => (s.classIds ?? []).includes(classId)).length;

  const DEFAULT_COLOR = "#6366f1";

  // ── DnD sensors ──
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ── Computed: teacher groups ──
  const classesByTeacher = useMemo(() => {
    const map = new Map<string, ClassItem[]>();
    for (const cls of classes) {
      const key = cls.teacher?.trim() || UNASSIGNED_KEY;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(cls);
    }
    return map;
  }, [classes]);

  const orderedTeacherKeys = useMemo(() => {
    const allKeys = [...classesByTeacher.keys()];
    const inOrder = teacherOrder.filter(k => allKeys.includes(k));
    const remaining = allKeys.filter(k => !inOrder.includes(k));
    return [...inOrder, ...remaining];
  }, [classesByTeacher, teacherOrder]);

  const teacherLabel = (key: string) => key === UNASSIGNED_KEY ? "No Teacher Assigned" : key;

  // ── Teacher drag end ──
  const handleTeacherDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setTeacherOrder(prev => {
      const allKeys = [...classesByTeacher.keys()];
      const currentOrder = allKeys.map(k => prev.includes(k) ? prev.indexOf(k) : Infinity);
      const inOrder = prev.filter(k => allKeys.includes(k));
      const remaining = allKeys.filter(k => !prev.includes(k));
      const fullOrder = [...inOrder, ...remaining];
      const oldIndex = fullOrder.indexOf(active.id as string);
      const newIndex = fullOrder.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const newOrder = arrayMove(fullOrder, oldIndex, newIndex);
      fetch(`${API}/teacher-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: newOrder }),
      }).catch(() => toast({ title: "Failed to save teacher order", variant: "destructive" }));
      return newOrder;
    });
  }, [classesByTeacher, toast]);

  // ── Class drag end within a teacher group ──
  const handleClassDragEnd = useCallback((event: DragEndEvent, teacherKey: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = Number(active.id);
    const overId = Number(over.id);
    setClasses(prev => {
      const groupItems = prev.filter(c => (c.teacher?.trim() || UNASSIGNED_KEY) === teacherKey);
      const oldIndex = groupItems.findIndex(c => c.id === activeId);
      const newIndex = groupItems.findIndex(c => c.id === overId);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const newGroupItems = arrayMove(groupItems, oldIndex, newIndex);
      const updates = newGroupItems.map((c, i) => ({ id: c.id, sortOrder: i }));
      fetch(`${API}/classes/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: updates }),
      }).catch(() => toast({ title: "Failed to save class order", variant: "destructive" }));
      let groupIdx = 0;
      return prev.map(c => {
        if ((c.teacher?.trim() || UNASSIGNED_KEY) === teacherKey) {
          return { ...newGroupItems[groupIdx++], sortOrder: groupIdx - 1 };
        }
        return c;
      });
    });
  }, [toast]);

  // ── Create ──
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
    } catch {
      toast({ title: "Failed to create class", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  // ── Edit: open ──
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

  // ── Edit: save ──
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
    } catch {
      toast({ title: "Failed to update class", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Edit: toggle student membership ──
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

  // ── Delete ──
  const handleDelete = async (id: number) => {
    setIsDeleting(true);
    try {
      await fetch(`${API}/classes/${id}`, { method: "DELETE" });
      const cls = classes.find(c => c.id === id);
      toast({ title: `Class "${cls?.name}" deleted.` });
      setDeletingId(null);
      await fetchData();
    } catch {
      toast({ title: "Failed to delete class", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Filtered student list for edit dialog ──
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

  const CLASS_PRESETS = [
    "#6366f1","#3b82f6","#10b981","#f59e0b","#ef4444",
    "#8b5cf6","#06b6d4","#f97316","#d946ef","#14b8a6",
    "#ec4899","#22c55e","#64748b","#f43f5e","#84cc16",
  ];

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
          />
        ))}
      </div>
    </div>
  );

  return (
    <TeacherLayout>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Classes</h1>
          <p className="text-muted-foreground mt-1">
            Manage your classes and their assigned teachers.
          </p>
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
                {viewingClass.teacher && (
                  <span className="text-sm text-muted-foreground">· {viewingClass.teacher}</span>
                )}
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
                <button onClick={handleGiveToClass} disabled={classGiving} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-40">
                  {classGiving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  {classGiving ? "Giving…" : `Give to all ${studentsInViewedClass.length}`}
                </button>
                <button onClick={() => { setClassGiveOpen(false); setClassGiveQty(1); }} disabled={classGiving} className="w-7 h-7 rounded-lg border bg-white hover:bg-slate-50 text-muted-foreground flex items-center justify-center transition-colors">
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

      {/* ── Loading ── */}
      {viewingClassId === null && loading && (
        <div className="space-y-6">
          {[1, 2].map(i => (
            <div key={i}>
              <div className="h-5 w-32 rounded-full bg-muted animate-pulse mb-3" />
              <div className="space-y-2 pl-6">
                {[1, 2].map(j => <div key={j} className="h-12 rounded-xl bg-muted animate-pulse" />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty ── */}
      {viewingClassId === null && !loading && classes.length === 0 && (
        <div className="py-20 text-center border border-dashed rounded-2xl bg-card">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground font-medium">No classes yet.</p>
          <p className="text-sm text-muted-foreground mt-1">Click "New Class" to create your first one.</p>
        </div>
      )}

      {/* ── Teacher-grouped sortable list ── */}
      {viewingClassId === null && !loading && classes.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTeacherDragEnd}>
          <SortableContext items={orderedTeacherKeys} strategy={verticalListSortingStrategy}>
            <div>
              {orderedTeacherKeys.map(teacherKey => {
                const groupClasses = classesByTeacher.get(teacherKey) ?? [];
                return (
                  <SortableTeacherSection
                    key={teacherKey}
                    teacherKey={teacherKey}
                    label={teacherLabel(teacherKey)}
                    groupClasses={groupClasses}
                    sensors={sensors}
                    deletingId={deletingId}
                    isDeleting={isDeleting}
                    studentCount={studentCount}
                    onView={id => setViewingClassId(id)}
                    onEdit={openEdit}
                    onDeleteRequest={id => setDeletingId(id)}
                    onDeleteCancel={() => setDeletingId(null)}
                    onDeleteConfirm={id => handleDelete(id)}
                    onClassDragEnd={handleClassDragEnd}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
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
              <Input
                required autoFocus
                value={createName}
                onChange={e => setCreateName(e.target.value)}
                placeholder="e.g. 3B Mathematics"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Teacher Name</label>
              <Input
                value={createTeacher}
                onChange={e => setCreateTeacher(e.target.value)}
                placeholder="e.g. Mrs. Smith"
              />
            </div>
            {renderColorPicker(createColor, createColorHex, setCreateColor, setCreateColorHex)}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} disabled={isCreating}>Cancel</Button>
              <Button type="submit" disabled={isCreating || !createName.trim()}>
                {isCreating ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creating…</> : "Create Class"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editingClass} onOpenChange={open => { if (!open && !isSaving) setEditingClass(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
          </DialogHeader>
          {editingClass && (
            <div className="space-y-5 mt-2">
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Class Name <span className="text-destructive">*</span></label>
                  <Input required value={editName} onChange={e => setEditName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Teacher Name</label>
                  <Input value={editTeacher} onChange={e => setEditTeacher(e.target.value)} placeholder="e.g. Mrs. Smith" />
                </div>
                {renderColorPicker(editColor, editColorHex, setEditColor, setEditColorHex)}
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="ghost" onClick={() => setEditingClass(null)} disabled={isSaving}>Cancel</Button>
                  <Button type="submit" disabled={isSaving || !editName.trim()}>
                    {isSaving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</> : "Save Changes"}
                  </Button>
                </div>
              </form>

              {/* Students section */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold">Students in this class <span className="text-muted-foreground font-normal">({inClassCount})</span></p>
                </div>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    placeholder="Search students…"
                    className="pl-9"
                  />
                </div>
                <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                  {editStudentList.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No students found</p>
                  )}
                  {editStudentList.map(student => {
                    const isIn = (student.classIds ?? []).includes(editingClass.id);
                    const isToggling = togglingStudents.has(student.id);
                    return (
                      <button
                        key={student.id}
                        onClick={() => toggleStudent(student.id, isIn)}
                        disabled={isToggling}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                          isIn ? "bg-primary/8 hover:bg-primary/12" : "hover:bg-muted/60"
                        )}
                      >
                        <div className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all", isIn ? "bg-primary border-primary" : "border-border")}>
                          {isToggling ? <Loader2 className="w-3 h-3 animate-spin text-primary" /> : isIn ? <Check className="w-3 h-3 text-white" /> : null}
                        </div>
                        <span className="text-sm font-medium flex-1 truncate">{student.name}</span>
                        {isIn && <span className="text-xs text-primary font-semibold shrink-0">In class</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </TeacherLayout>
  );
}
