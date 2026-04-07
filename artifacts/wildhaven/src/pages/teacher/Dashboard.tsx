import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { Plus, Trash2, Edit, BookOpen, X, Check, CheckSquare, Square, Users, Eye, Filter, RefreshCw, GraduationCap } from "lucide-react";
import { useListStudents } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCreateStudent, useDeleteStudent } from "@/hooks/use-students";
import { TeacherLayout } from "./Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PackBankWidget } from "@/components/PackBankWidget";
import { ClassesTabContent } from "./ClassesTabContent";
import { TeachersTabContent } from "./TeachersTabContent";

type MainTab = "students" | "classes" | "teachers";

const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

interface ClassItem { id: number; name: string; teacher: string | null; color?: string | null; }
type StudentWithClasses = { id: number; name: string; pin: string; classIds: number[]; };

export default function TeacherDashboard() {
  const [tab, setTab] = useState<MainTab>("students");
  const { data: rawStudents, isLoading, refetch: refetchStudents } = useListStudents();
  const students = (rawStudents ?? []) as StudentWithClasses[];

  const { mutateAsync: createStudent, isPending: isCreating } = useCreateStudent();
  const { mutateAsync: deleteStudent } = useDeleteStudent();
  const { toast } = useToast();

  const queryClient = useQueryClient();
  const { data: classes = [] } = useQuery<ClassItem[]>({
    queryKey: ["classes"],
    queryFn: () => fetch(`${API}/classes`).then(r => r.json()),
    staleTime: 60_000,
  });
  const refetchClasses = useCallback(() =>
    queryClient.invalidateQueries({ queryKey: ["classes"] }),
  [queryClient]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPin, setNewPin] = useState("");
  const [pinError, setPinError] = useState("");

  // ── Add Class dialog ──
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassTeacher, setNewClassTeacher] = useState("");
  const [isAddingClass, setIsAddingClass] = useState(false);

  // ── Bulk assign-to-class dialog ──
  const [isAssignClassOpen, setIsAssignClassOpen] = useState(false);
  const [assignClassId, setAssignClassId] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);

  // ── Filter state ──
  const [filterClassIds, setFilterClassIds] = useState<Set<number>>(new Set());
  const [filterTeachers, setFilterTeachers] = useState<Set<string>>(new Set());

  // Derived filter values (computed early so toggleSelectAll can use them)
  const uniqueTeachers = Array.from(new Set(classes.map(c => c.teacher).filter(Boolean) as string[])).sort();
  const hasFilters = filterClassIds.size > 0 || filterTeachers.size > 0;
  const filteredStudents = (rawStudents ?? [] as StudentWithClasses[]).filter(student => {
    if (filterClassIds.size > 0) {
      const inClass = ((student as StudentWithClasses).classIds ?? []).some(id => filterClassIds.has(id));
      if (!inClass) return false;
    }
    if (filterTeachers.size > 0) {
      const studentClasses = ((student as StudentWithClasses).classIds ?? []).map(id => classes.find(c => c.id === id)).filter(Boolean) as ClassItem[];
      const hasTeacher = studentClasses.some(c => c.teacher && filterTeachers.has(c.teacher));
      if (!hasTeacher) return false;
    }
    return true;
  }) as StudentWithClasses[];

  const toggleClassFilter = (id: number) => {
    setFilterClassIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleTeacherFilter = (name: string) => {
    setFilterTeachers(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };
  const clearFilters = () => { setFilterClassIds(new Set()); setFilterTeachers(new Set()); };

  // ── Selection state ──
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<"selected" | "all" | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);


  // Clear selection if students change (e.g., after delete)
  useEffect(() => {
    setSelected(prev => {
      const ids = new Set(students.map(s => s.id));
      const next = new Set([...prev].filter(id => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [students]);

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (filteredStudents.every(s => selected.has(s.id)) && filteredStudents.length > 0) {
      setSelected(prev => {
        const next = new Set(prev);
        filteredStudents.forEach(s => next.delete(s.id));
        return next;
      });
    } else {
      setSelected(prev => new Set([...prev, ...filteredStudents.map(s => s.id)]));
    }
  };

  const generateUniquePin = useCallback(() => {
    const usedPins = new Set(students.map(s => s.pin));
    let pin: string;
    let attempts = 0;
    do {
      pin = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
      attempts++;
    } while (usedPins.has(pin) && attempts < 200);
    return pin;
  }, [students]);

  // ── Regenerate PIN ──
  const [regeneratingPins, setRegeneratingPins] = useState<Set<number>>(new Set());

  const handleRegeneratePin = useCallback(async (studentId: number) => {
    if (regeneratingPins.has(studentId)) return;
    setRegeneratingPins(prev => new Set([...prev, studentId]));
    const newPin = generateUniquePin();
    try {
      const res = await fetch(`${API}/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: newPin }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed");
      }
      await refetchStudents();
      toast({ title: `PIN updated to ${newPin}` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update PIN";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setRegeneratingPins(prev => { const s = new Set(prev); s.delete(studentId); return s; });
    }
  }, [regeneratingPins, generateUniquePin, refetchStudents, toast]);

  const openAddDialog = useCallback(() => {
    setNewName("");
    setNewPin(generateUniquePin());
    setPinError("");
    setIsAddOpen(true);
  }, [generateUniquePin]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || newPin.length !== 4) return;
    setPinError("");
    try {
      await createStudent({ data: { name: newName, pin: newPin } });
      setIsAddOpen(false);
      setNewName("");
      setNewPin("");
      toast({ title: "Student added!" });
    } catch (err: unknown) {
      const status = err && typeof err === "object" && "status" in err ? (err as { status: number }).status : 0;
      if (status === 409) {
        setPinError("This PIN is already in use. Try a different one.");
      } else {
        toast({ title: "Error adding student", variant: "destructive" });
      }
    }
  };

  const handleAddClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    setIsAddingClass(true);
    try {
      await fetch(`${API}/classes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newClassName.trim(), teacher: newClassTeacher.trim() || null }),
      });
      await refetchClasses();
      const name = newClassName.trim();
      setNewClassName(""); setNewClassTeacher("");
      setIsAddClassOpen(false);
      toast({ title: `Class "${name}" created!` });
    } catch {
      toast({ title: "Error creating class", variant: "destructive" });
    } finally {
      setIsAddingClass(false);
    }
  };

  const handleBulkAssignClass = async () => {
    if (!assignClassId) return;
    setIsAssigning(true);
    const selectedStudents = students.filter(s => selected.has(s.id));
    const classId = Number(assignClassId);
    try {
      await Promise.all(
        selectedStudents.map(s =>
          fetch(`${API}/students/${s.id}/classes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ classId }),
          })
        )
      );
      await refetchStudents();
      const cls = classes.find(c => c.id === classId);
      toast({ title: `${selectedStudents.length} student${selectedStudents.length > 1 ? "s" : ""} added to ${cls?.name ?? "class"}.` });
      setIsAssignClassOpen(false);
      setAssignClassId("");
    } catch {
      toast({ title: "Some assignments failed", variant: "destructive" });
    } finally {
      setIsAssigning(false);
    }
  };

  // ── Delete handlers ──
  const studentsToDelete =
    confirmDelete === "all" ? students :
    confirmDelete === "selected" ? students.filter(s => selected.has(s.id)) : [];

  const handleConfirmDelete = async () => {
    if (studentsToDelete.length === 0) return;
    setIsDeleting(true);
    try {
      for (const s of studentsToDelete) {
        await deleteStudent({ studentId: s.id });
      }
      setSelected(new Set());
      setConfirmDelete(null);
      toast({ title: `${studentsToDelete.length} student${studentsToDelete.length > 1 ? "s" : ""} deleted.` });
    } catch {
      toast({ title: "Some deletions failed", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddClass = async (studentId: number, classId: string) => {
    if (!classId) return;
    await fetch(`${API}/students/${studentId}/classes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId: Number(classId) }),
    });
    await refetchStudents();
  };

  const handleRemoveClass = async (studentId: number, classId: number) => {
    await fetch(`${API}/students/${studentId}/classes/${classId}`, { method: "DELETE" });
    await refetchStudents();
  };

  if (isLoading) return <TeacherLayout><div className="p-8 text-center text-xl">Loading...</div></TeacherLayout>;

  const allSelected = filteredStudents.length > 0 && filteredStudents.every(s => selected.has(s.id));
  const someSelected = selected.size > 0;
  const selectedStudentsList = students.filter(s => selected.has(s.id));

  return (
    <TeacherLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Students & Classes</h1>
          <p className="text-muted-foreground mt-1">Manage students, classes, and teachers.</p>
        </div>
        {tab === "students" && (
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="outline" onClick={openAddDialog} className="font-bold">
              <Plus className="mr-2 h-4 w-4" /> Add Student
            </Button>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 border-b mb-6">
        {([
          { id: "students", label: "Students", icon: <Users className="w-4 h-4" /> },
          { id: "classes", label: "Classes", icon: <BookOpen className="w-4 h-4" /> },
          { id: "teachers", label: "Teachers", icon: <GraduationCap className="w-4 h-4" /> },
        ] as { id: MainTab; label: string; icon: React.ReactNode }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 text-sm font-bold border-b-2 -mb-px transition-colors",
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Classes tab ── */}
      {tab === "classes" && (
        <ClassesTabContent onDataChange={refetchClasses} />
      )}

      {/* ── Teachers tab ── */}
      {tab === "teachers" && (
        <TeachersTabContent classes={classes} onRefresh={refetchClasses} />
      )}

      {/* ── Students tab ── */}
      {tab === "students" && (<div>

      {/* ── Filter bar ── */}
      {(classes.length > 0 || uniqueTeachers.length > 0) && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground shrink-0">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </div>

          {classes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {classes.map(cls => {
                const active = filterClassIds.has(cls.id);
                const col = cls.color || "#6366f1";
                return (
                  <button
                    key={cls.id}
                    onClick={() => toggleClassFilter(cls.id)}
                    className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border transition-all",
                      active
                        ? "text-white shadow-sm"
                        : "bg-background text-muted-foreground hover:text-foreground"
                    )}
                    style={active
                      ? { backgroundColor: col, borderColor: col }
                      : { borderColor: `${col}60` }
                    }
                  >
                    {cls.name}
                    {active && <X className="w-3 h-3 ml-0.5" />}
                  </button>
                );
              })}
            </div>
          )}

          {uniqueTeachers.length > 0 && (
            <>
              <div className="h-4 w-px bg-border hidden sm:block" />
              <div className="flex flex-wrap gap-1.5">
                {uniqueTeachers.map(teacher => {
                  const active = filterTeachers.has(teacher);
                  return (
                    <button
                      key={teacher}
                      onClick={() => toggleTeacherFilter(teacher)}
                      className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border transition-all",
                        active
                          ? "bg-slate-700 border-slate-700 text-white shadow-sm"
                          : "bg-background border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {teacher}
                      {active && <X className="w-3 h-3 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 shrink-0"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Selection toolbar — shown when students exist */}
      {students.length > 0 && (
        <div className="flex items-center gap-3 mb-4 px-1">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            {allSelected
              ? <CheckSquare className="w-4 h-4 text-primary" />
              : someSelected
              ? <CheckSquare className="w-4 h-4 text-muted-foreground" />
              : <Square className="w-4 h-4" />}
            {allSelected ? "Deselect all" : "Select all"}
          </button>

          {someSelected && (
            <span className="text-sm text-muted-foreground">
              {selected.size} of {students.length} selected
            </span>
          )}

          <div className="ml-auto flex gap-2">
            {someSelected && classes.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setAssignClassId(""); setIsAssignClassOpen(true); }}
                className="font-bold gap-1.5 text-primary border-primary/30 hover:bg-primary/5"
              >
                <Users className="w-3.5 h-3.5" />
                Assign to Class
              </Button>
            )}
            {someSelected && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmDelete("selected")}
                className="font-bold gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete {selected.size === students.length ? "All" : `${selected.size}`} Selected
              </Button>
            )}
            {!someSelected && students.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete("all")}
                className="font-bold gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete All
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Student grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredStudents.map(student => {
          const isSelected = selected.has(student.id);
          const assignedClasses = (student.classIds ?? [])
            .map(id => classes.find(c => c.id === id))
            .filter(Boolean) as ClassItem[];
          const unassignedClasses = classes.filter(c => !student.classIds?.includes(c.id));

          return (
            <Card
              key={student.id}
              className={cn(
                "p-5 hover:shadow-md transition-all flex flex-col gap-4 relative",
                isSelected && "ring-2 ring-primary bg-primary/5 shadow-md"
              )}
            >
              {/* Checkbox + delete row */}
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleSelect(student.id)}
                    className={cn(
                      "mt-1 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                      isSelected
                        ? "bg-primary border-primary text-white"
                        : "border-muted-foreground/40 hover:border-primary"
                    )}
                    aria-label={isSelected ? "Deselect" : "Select"}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                  </button>
                  <div>
                    <h3 className="text-xl font-bold font-display text-primary">{student.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <p className="text-sm text-muted-foreground font-mono bg-muted inline-block px-2 py-0.5 rounded">
                        PIN: {student.pin}
                      </p>
                      <button
                        onClick={() => handleRegeneratePin(student.id)}
                        disabled={regeneratingPins.has(student.id)}
                        title="Generate a new PIN"
                        className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-40 p-0.5 rounded"
                      >
                        <RefreshCw className={cn("w-3.5 h-3.5", regeneratingPins.has(student.id) && "animate-spin")} />
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelected(new Set([student.id]));
                    setConfirmDelete("selected");
                  }}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                  title="Delete student"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Multi-class assignment */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-semibold text-muted-foreground">Classes</span>
                </div>
                <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                  {assignedClasses.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">No class assigned</span>
                  )}
                  {assignedClasses.map(cls => (
                    <span key={cls.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border"
                      style={cls.color
                        ? { backgroundColor: cls.color + "22", borderColor: cls.color, color: cls.color }
                        : { backgroundColor: "hsl(var(--primary)/0.1)", borderColor: "hsl(var(--primary)/0.2)", color: "hsl(var(--primary))" }
                      }
                    >
                      {cls.name}
                      <button
                        onClick={() => handleRemoveClass(student.id, cls.id)}
                        style={cls.color ? { color: cls.color + "99" } : undefined}
                        className="ml-0.5 transition-colors hover:opacity-100 opacity-60"
                        aria-label={`Remove from ${cls.name}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                {unassignedClasses.length > 0 && (
                  <Select value="" onValueChange={val => handleAddClass(student.id, val)}>
                    <SelectTrigger className="h-7 text-xs border-dashed">
                      <SelectValue placeholder="+ Add to class…" />
                    </SelectTrigger>
                    <SelectContent>
                      {unassignedClasses.map(cls => (
                        <SelectItem key={cls.id} value={cls.id.toString()}>{cls.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Inventory */}
              <div className="pt-2 border-t">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Inventory</p>
                <PackBankWidget studentId={student.id} />
              </div>

              {/* Actions */}
              <div className="pt-2 border-t mt-auto flex flex-col gap-2">
                <Link href={`/collection/${student.id}?from=teacher`}>
                  <Button variant="secondary" className="w-full font-bold" size="sm">
                    <Eye className="mr-2 h-3.5 w-3.5" /> View Collection
                  </Button>
                </Link>
                <Link href={`/teacher/student/${student.id}`}>
                  <Button variant="outline" className="w-full font-bold" size="sm">
                    <Edit className="mr-2 h-3.5 w-3.5" /> Edit Collection
                  </Button>
                </Link>
              </div>
            </Card>
          );
        })}

        {filteredStudents.length === 0 && (
          <div className="col-span-full py-12 text-center bg-card rounded-xl border border-dashed">
            {hasFilters ? (
              <div className="space-y-2">
                <p className="text-muted-foreground">No students match the active filters.</p>
                <button onClick={clearFilters} className="text-sm text-primary hover:underline font-semibold">
                  Clear filters
                </button>
              </div>
            ) : (
              <p className="text-muted-foreground">No students yet. Add one to get started!</p>
            )}
          </div>
        )}
      </div>

      {/* ── Confirmation dialog ── */}
      <Dialog open={confirmDelete !== null} onOpenChange={open => { if (!open && !isDeleting) setConfirmDelete(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Delete {studentsToDelete.length === 1 ? "1 student" : `${studentsToDelete.length} students`}?
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              This will permanently delete {studentsToDelete.length === 1 ? "this student" : "these students"} and all of their card collection data. This cannot be undone.
            </p>

            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 space-y-1.5 max-h-48 overflow-y-auto">
              {studentsToDelete.map(s => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <span className="font-semibold">{s.name}</span>
                  <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    PIN: {s.pin}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting} className="font-bold gap-2">
              {isDeleting ? <>Deleting…</> : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete {studentsToDelete.length === 1 ? "Student" : `${studentsToDelete.length} Students`}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Class Dialog ── */}
      <Dialog open={isAddClassOpen} onOpenChange={open => { if (!isAddingClass) { setIsAddClassOpen(open); if (!open) { setNewClassName(""); setNewClassTeacher(""); } } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add New Class</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddClassSubmit} className="space-y-4 mt-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Class Name <span className="text-destructive">*</span></label>
              <Input
                required
                autoFocus
                value={newClassName}
                onChange={e => setNewClassName(e.target.value)}
                placeholder="e.g. Period 1, Room 4B…"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Teacher Name</label>
              <Input
                value={newClassTeacher}
                onChange={e => setNewClassTeacher(e.target.value)}
                placeholder="e.g. Ms. Smith"
              />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsAddClassOpen(false)} disabled={isAddingClass}>
                Cancel
              </Button>
              <Button type="submit" disabled={isAddingClass || !newClassName.trim()} className="font-bold">
                {isAddingClass ? "Creating…" : "Create Class"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Assign to Class Dialog ── */}
      <Dialog open={isAssignClassOpen} onOpenChange={open => { if (!isAssigning) { setIsAssignClassOpen(open); if (!open) setAssignClassId(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Assign to Class
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Assigning <span className="font-semibold text-foreground">{selected.size} student{selected.size !== 1 ? "s" : ""}</span> to a class.
              Students already in the selected class won't be affected.
            </p>

            {/* Preview of selected students */}
            <div className="bg-muted/50 rounded-lg p-3 max-h-36 overflow-y-auto space-y-1">
              {selectedStudentsList.map(s => (
                <div key={s.id} className="text-sm font-medium">{s.name}</div>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Choose Class</label>
              <Select value={assignClassId} onValueChange={setAssignClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a class…" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsAssignClassOpen(false)} disabled={isAssigning}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkAssignClass}
              disabled={isAssigning || !assignClassId}
              className="font-bold gap-2"
            >
              {isAssigning ? "Assigning…" : (
                <>
                  <Users className="w-4 h-4" />
                  Assign {selected.size} Student{selected.size !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Student Dialog ── */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddStudent} className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Student Name</label>
              <Input required value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Alex" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">4-Digit PIN</label>
              <div className="flex gap-2">
                <Input
                  required
                  type="text"
                  pattern="\d{4}"
                  maxLength={4}
                  value={newPin}
                  onChange={e => { setNewPin(e.target.value.replace(/\D/g, "")); setPinError(""); }}
                  placeholder="e.g. 1234"
                  className={pinError ? "border-destructive" : ""}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Generate a new random PIN"
                  onClick={() => { setNewPin(generateUniquePin()); setPinError(""); }}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              {pinError && <p className="text-xs text-destructive">{pinError}</p>}
              <p className="text-xs text-muted-foreground">Auto-generated and unique. You can change it or click the refresh icon to get a new one.</p>
            </div>
            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isCreating || newPin.length !== 4}>Save Student</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      </div>)}
    </TeacherLayout>
  );
}
