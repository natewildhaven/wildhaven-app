import { useState, useMemo, useCallback, useEffect } from "react";
import { GraduationCap, Plus, BookOpen, Users, X, ChevronDown, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
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

export interface ClassItem { id: number; name: string; teacher: string | null; color?: string | null; }

interface Props {
  classes: ClassItem[];
  onRefresh: () => Promise<void>;
}

function useLocalTeachers() {
  const KEY = "wildhaven_extra_teachers";
  const [extra, setExtra] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
  });
  const save = useCallback((list: string[]) => {
    setExtra(list);
    localStorage.setItem(KEY, JSON.stringify(list));
  }, []);
  return [extra, save] as const;
}

// ── Sortable class row inside a teacher card ─────────────────────────────────
function SortableClassRow({
  cls, isReassigning, allTeacherNames, reassignTeacher, isSaving,
  onToggleReassign, onChangeTeacher, onSave, onCancel,
}: {
  cls: ClassItem; isReassigning: boolean; allTeacherNames: string[]; reassignTeacher: string;
  isSaving: boolean;
  onToggleReassign: () => void;
  onChangeTeacher: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cls.id });
  const col = cls.color || "#6366f1";
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="relative"
    >
      <div
        className={cn(
          "flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-sm font-semibold border transition-all",
          isReassigning ? "ring-2 ring-primary/30" : ""
        )}
        style={{ backgroundColor: col + "22", borderColor: col, color: col }}
      >
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground/70 shrink-0 touch-none"
          title="Drag to reorder"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <BookOpen className="w-3.5 h-3.5 shrink-0" />
        <span className="flex-1 min-w-0 truncate">{cls.name}</span>
        <button
          onClick={onToggleReassign}
          className="ml-0.5 opacity-70 hover:opacity-100 transition-opacity shrink-0"
          title="Reassign teacher"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {isReassigning && (
        <div className="absolute top-full mt-1 left-0 z-20 bg-white border rounded-xl shadow-lg p-3 w-56">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Reassign "{cls.name}" to:</p>
          <select
            className="w-full border rounded-lg px-2 py-1.5 text-sm mb-2 bg-background"
            value={reassignTeacher}
            onChange={e => onChangeTeacher(e.target.value)}
          >
            <option value="">— No teacher —</option>
            {allTeacherNames.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="flex gap-1.5">
            <Button size="sm" className="flex-1 h-7 text-xs" disabled={isSaving} onClick={onSave}>
              {isSaving ? "Saving…" : "Save"}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancel}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sortable teacher card ────────────────────────────────────────────────────
function SortableTeacherCard({
  teacher, teacherClasses, unassignedClasses, allTeacherNames,
  sensors, isSaving,
  reassigning, reassignTeacher,
  onRemoveTeacher, onToggleReassign, onChangeTeacher, onSaveReassign, onCancelReassign,
  onAssignClass, onClassDragEnd,
}: {
  teacher: string; teacherClasses: ClassItem[]; unassignedClasses: ClassItem[];
  allTeacherNames: string[]; sensors: ReturnType<typeof useSensors>;
  isSaving: boolean; reassigning: number | null; reassignTeacher: string;
  onRemoveTeacher: (name: string) => void;
  onToggleReassign: (id: number) => void;
  onChangeTeacher: (v: string) => void;
  onSaveReassign: (classId: number, teacher: string) => void;
  onCancelReassign: () => void;
  onAssignClass: (classId: number, teacher: string) => void;
  onClassDragEnd: (event: DragEndEvent, teacher: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: teacher });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}>
      <Card className="p-5 rounded-2xl">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground/60 shrink-0 touch-none p-1"
              title="Drag to reorder teachers"
            >
              <GripVertical className="w-4 h-4" />
            </button>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-lg font-display shrink-0">
              {teacher[0].toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-lg font-display leading-tight">{teacher}</p>
              <p className="text-xs text-muted-foreground">{teacherClasses.length} class{teacherClasses.length !== 1 ? "es" : ""}</p>
            </div>
          </div>
          <button
            onClick={() => onRemoveTeacher(teacher)}
            className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
            title="Remove teacher"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {teacherClasses.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No classes assigned yet.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => onClassDragEnd(e, teacher)}>
            <SortableContext items={teacherClasses.map(c => c.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-1.5">
                {teacherClasses.map(cls => (
                  <SortableClassRow
                    key={cls.id}
                    cls={cls}
                    isReassigning={reassigning === cls.id}
                    allTeacherNames={allTeacherNames}
                    reassignTeacher={reassignTeacher}
                    isSaving={isSaving}
                    onToggleReassign={() => onToggleReassign(cls.id)}
                    onChangeTeacher={onChangeTeacher}
                    onSave={() => onSaveReassign(cls.id, reassignTeacher)}
                    onCancel={onCancelReassign}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {unassignedClasses.length > 0 && (
          <div className="mt-3 pt-3 border-t border-dashed">
            <p className="text-xs text-muted-foreground mb-2">Assign an unassigned class:</p>
            <div className="flex gap-2 flex-wrap">
              {unassignedClasses.map(cls => (
                <button
                  key={cls.id}
                  onClick={() => onAssignClass(cls.id, teacher)}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground transition-colors disabled:opacity-50"
                >
                  <Plus className="w-3 h-3" /> {cls.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function TeachersTabContent({ classes, onRefresh }: Props) {
  const { toast } = useToast();
  const [extraTeachers, saveExtraTeachers] = useLocalTeachers();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState("");
  const [reassigning, setReassigning] = useState<number | null>(null);
  const [reassignTeacher, setReassignTeacher] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Teacher ordering (persisted to API)
  const [teacherOrder, setTeacherOrder] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    fetch(`${API}/teacher-order`)
      .then(r => r.ok ? r.json() : [])
      .then(order => setTeacherOrder(Array.isArray(order) ? order : []))
      .catch(() => {});
  }, []);

  const allTeacherNames = useMemo(() => {
    const fromClasses = classes.map(c => c.teacher).filter(Boolean) as string[];
    return Array.from(new Set([...fromClasses, ...extraTeachers]));
  }, [classes, extraTeachers]);

  const orderedTeacherNames = useMemo(() => {
    const inOrder = teacherOrder.filter(k => allTeacherNames.includes(k));
    const remaining = allTeacherNames.filter(k => !inOrder.includes(k));
    return [...inOrder, ...remaining];
  }, [allTeacherNames, teacherOrder]);

  const teacherMap = useMemo(() => {
    const map = new Map<string, ClassItem[]>();
    for (const t of allTeacherNames) map.set(t, []);
    for (const cls of classes) {
      if (cls.teacher && map.has(cls.teacher)) map.get(cls.teacher)!.push(cls);
    }
    return map;
  }, [allTeacherNames, classes]);

  const unassignedClasses = useMemo(() => classes.filter(c => !c.teacher), [classes]);

  const handleTeacherDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setTeacherOrder(prev => {
      const allKeys = allTeacherNames;
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
  }, [allTeacherNames, toast]);

  const handleClassDragEnd = useCallback((event: DragEndEvent, teacher: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const groupItems = (teacherMap.get(teacher) ?? []);
    const oldIndex = groupItems.findIndex(c => c.id === Number(active.id));
    const newIndex = groupItems.findIndex(c => c.id === Number(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    const newGroupItems = arrayMove(groupItems, oldIndex, newIndex);
    const updates = newGroupItems.map((c, i) => ({ id: c.id, sortOrder: i }));
    fetch(`${API}/classes/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: updates }),
    }).catch(() => toast({ title: "Failed to save class order", variant: "destructive" }));
    // optimistic update via onRefresh
    onRefresh();
  }, [teacherMap, onRefresh, toast]);

  const handleAddTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newTeacherName.trim();
    if (!name || allTeacherNames.includes(name)) return;
    saveExtraTeachers([...extraTeachers, name]);
    setNewTeacherName("");
    setAddDialogOpen(false);
    toast({ title: `Teacher "${name}" added!` });
  };

  const handleRemoveTeacher = (name: string) => {
    if (teacherMap.get(name)?.length) {
      toast({ title: "Unassign all classes first before removing this teacher.", variant: "destructive" });
      return;
    }
    saveExtraTeachers(extraTeachers.filter(t => t !== name));
    setTeacherOrder(prev => prev.filter(t => t !== name));
    toast({ title: `Teacher "${name}" removed.` });
  };

  const handleReassignClass = async (classId: number, newTeacher: string) => {
    setIsSaving(true);
    try {
      await fetch(`${API}/classes/${classId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacher: newTeacher || null }),
      });
      await onRefresh();
      toast({ title: "Class teacher updated!" });
    } catch {
      toast({ title: "Failed to update teacher", variant: "destructive" });
    } finally {
      setIsSaving(false);
      setReassigning(null);
      setReassignTeacher("");
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <p className="text-muted-foreground mt-1">Manage teachers and their class assignments.</p>
        <Button onClick={() => setAddDialogOpen(true)} className="font-bold shrink-0">
          <Plus className="w-4 h-4 mr-2" /> New Teacher
        </Button>
      </div>

      {allTeacherNames.length === 0 && unassignedClasses.length === 0 && (
        <div className="py-20 text-center border border-dashed rounded-2xl bg-card">
          <GraduationCap className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground font-medium">No teachers yet.</p>
          <p className="text-sm text-muted-foreground mt-1">Add a teacher or assign one to a class in the Classes tab.</p>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTeacherDragEnd}>
        <SortableContext items={orderedTeacherNames} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {orderedTeacherNames.map(teacher => (
              <SortableTeacherCard
                key={teacher}
                teacher={teacher}
                teacherClasses={teacherMap.get(teacher) ?? []}
                unassignedClasses={unassignedClasses}
                allTeacherNames={allTeacherNames}
                sensors={sensors}
                isSaving={isSaving}
                reassigning={reassigning}
                reassignTeacher={reassignTeacher}
                onRemoveTeacher={handleRemoveTeacher}
                onToggleReassign={(id) => {
                  const cls = classes.find(c => c.id === id);
                  setReassigning(reassigning === id ? null : id);
                  setReassignTeacher(cls?.teacher ?? "");
                }}
                onChangeTeacher={setReassignTeacher}
                onSaveReassign={handleReassignClass}
                onCancelReassign={() => { setReassigning(null); setReassignTeacher(""); }}
                onAssignClass={handleReassignClass}
                onClassDragEnd={handleClassDragEnd}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {unassignedClasses.length > 0 && (
        <Card className="p-5 rounded-2xl border-dashed mt-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <p className="font-bold font-display text-muted-foreground">Unassigned Classes</p>
              <p className="text-xs text-muted-foreground">{unassignedClasses.length} class{unassignedClasses.length !== 1 ? "es" : ""} without a teacher</p>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            {unassignedClasses.map(cls => {
              const col = cls.color || "#6366f1";
              const isReassigning = reassigning === cls.id;
              return (
                <div key={cls.id} className="relative">
                  <div
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border",
                      isReassigning ? "ring-2 ring-primary/30" : ""
                    )}
                    style={{ backgroundColor: col + "22", borderColor: col, color: col }}
                  >
                    <BookOpen className="w-3.5 h-3.5 shrink-0" />
                    <span className="flex-1">{cls.name}</span>
                    <button
                      onClick={() => { setReassigning(isReassigning ? null : cls.id); setReassignTeacher(""); }}
                      className="ml-0.5 opacity-70 hover:opacity-100 transition-opacity"
                      title="Assign a teacher"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {isReassigning && (
                    <div className="absolute top-full mt-1 left-0 z-20 bg-white border rounded-xl shadow-lg p-3 w-56">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Assign "{cls.name}" to:</p>
                      <select
                        className="w-full border rounded-lg px-2 py-1.5 text-sm mb-2 bg-background"
                        value={reassignTeacher}
                        onChange={e => setReassignTeacher(e.target.value)}
                      >
                        <option value="">— No teacher —</option>
                        {allTeacherNames.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          className="flex-1 h-7 text-xs"
                          disabled={isSaving || !reassignTeacher}
                          onClick={() => handleReassignClass(cls.id, reassignTeacher)}
                        >
                          {isSaving ? "Saving…" : "Assign"}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setReassigning(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Dialog open={addDialogOpen} onOpenChange={open => { if (!open) setNewTeacherName(""); setAddDialogOpen(open); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add New Teacher</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddTeacher} className="space-y-4 mt-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Teacher Name <span className="text-destructive">*</span></label>
              <Input
                required
                autoFocus
                value={newTeacherName}
                onChange={e => setNewTeacherName(e.target.value)}
                placeholder="e.g. Ms. Smith"
              />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!newTeacherName.trim()} className="font-bold">Add Teacher</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
