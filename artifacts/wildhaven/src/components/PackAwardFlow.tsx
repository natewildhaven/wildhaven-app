import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowLeft, Users, BookOpen, Plus, Trash2, Loader2 } from "lucide-react";
import { useListPacks } from "@workspace/api-client-react";
import { Card as CardType } from "@workspace/api-client-react";
import { PackOpener } from "./PackOpener";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";

const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

interface Class { id: number; name: string; }
interface Student { id: number; name: string; classIds: number[]; }

type Phase = "class" | "student" | "pack" | "opening";

interface PackAwardFlowProps {
  onClose: () => void;
}

export function PackAwardFlow({ onClose }: PackAwardFlowProps) {
  const { data: packs } = useListPacks();
  const { toast } = useToast();
  const settings = useSettings();

  const [phase, setPhase] = useState<Phase>("class");
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | "unassigned" | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [openedCards, setOpenedCards] = useState<CardType[] | null>(null);
  const [openedDuplicateIds, setOpenedDuplicateIds] = useState<number[]>([]);
  const [openedPackInfo, setOpenedPackInfo] = useState<{ coverUrl?: string | null; backUrl?: string | null; color?: string | null } | null>(null);
  const [isOpening, setIsOpening] = useState(false);

  const [newClassName, setNewClassName] = useState("");
  const [isAddingClass, setIsAddingClass] = useState(false);

  const fetchData = useCallback(async () => {
    const [cls, stu] = await Promise.all([
      fetch(`${API}/classes`).then(r => r.json()),
      fetch(`${API}/students`).then(r => r.json()),
    ]);
    setClasses(cls);
    setStudents(stu);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const studentsInClass = students.filter(s =>
    selectedClassId === "unassigned"
      ? (s.classIds ?? []).length === 0
      : (s.classIds ?? []).includes(selectedClassId as number)
  );

  const handleSelectClass = (id: number | "unassigned") => {
    setSelectedClassId(id);
    setPhase("student");
  };

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setPhase("pack");
  };

  const handleSelectPack = async (packId: number) => {
    if (!selectedStudent) return;
    const pack = packs?.find(p => p.id === packId);
    setIsOpening(true);
    try {
      const res = await fetch(`${API}/packs/${packId}/open`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: selectedStudent.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: err.error || "Failed to open pack", variant: "destructive" });
        return;
      }
      const data = await res.json();
      setOpenedPackInfo({ coverUrl: pack?.coverImageUrl, backUrl: pack?.cardBackImageUrl, color: pack?.color });
      setOpenedCards(data.cards);
      setOpenedDuplicateIds(data.duplicateCardIds ?? []);
      setPhase("opening");
    } catch {
      toast({ title: "Failed to open pack", variant: "destructive" });
    } finally {
      setIsOpening(false);
    }
  };

  const handleOpenerComplete = () => {
    onClose();
  };

  const handleOpenAnother = () => {
    setOpenedCards(null);
    setOpenedPackInfo(null);
    setPhase("pack");
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    try {
      const res = await fetch(`${API}/classes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newClassName.trim() }),
      });
      if (!res.ok) throw new Error();
      await fetchData();
      setNewClassName("");
      setIsAddingClass(false);
    } catch {
      toast({ title: "Failed to create class", variant: "destructive" });
    }
  };

  const handleDeleteClass = async (id: number) => {
    if (!confirm("Delete this class? Students will remain, just unassigned from it.")) return;
    await fetch(`${API}/classes/${id}`, { method: "DELETE" });
    await fetchData();
  };

  if (phase === "opening" && openedCards && selectedStudent) {
    return (
      <PackOpener
        cards={openedCards}
        packCoverUrl={openedPackInfo?.coverUrl}
        cardBackUrl={openedPackInfo?.backUrl}
        packColor={openedPackInfo?.color}
        backgroundImageUrl={settings.backgroundImageUrl}
        packOpenSoundUrl={settings.packOpenSoundUrl}
        cardFlipSoundUrl={settings.cardFlipSoundUrl}
        duplicateCardIds={openedDuplicateIds}
        rarityCoins={{
          Common: settings.coinValueCommon,
          Rare: settings.coinValueRare,
          Epic: settings.coinValueEpic,
          Mythic: settings.coinValueMythic,
          Legendary: settings.coinValueLegendary,
        }}
        onComplete={handleOpenerComplete}
        onOpenAnother={handleOpenAnother}
      />
    );
  }

  const selectedClassName = selectedClassId === "unassigned"
    ? "Unassigned"
    : classes.find(c => c.id === selectedClassId)?.name ?? "";

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          {phase !== "class" && (
            <button
              onClick={() => {
                if (phase === "student") setPhase("class");
                else if (phase === "pack") setPhase("student");
              }}
              className="text-white/70 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="text-white">
            <h2 className="text-xl font-display font-bold">
              {phase === "class" && "Award Packs — Select Class"}
              {phase === "student" && `${selectedClassName} — Select Student`}
              {phase === "pack" && `${selectedStudent?.name} — Select Pack`}
            </h2>
            {phase !== "class" && (
              <p className="text-white/60 text-sm">
                {phase === "student" && `${studentsInClass.length} student${studentsInClass.length !== 1 ? "s" : ""}`}
                {phase === "pack" && `${packs?.length ?? 0} available packs`}
              </p>
            )}
          </div>
        </div>
        <button onClick={onClose} className="text-white/60 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 p-5 md:p-8 max-w-3xl mx-auto w-full">
        <AnimatePresence mode="wait">

          {/* Phase: Class */}
          {phase === "class" && (
            <motion.div key="class" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="grid gap-3 mb-6">
                {/* Unassigned bucket */}
                {students.some(s => (s.classIds ?? []).length === 0) && (
                  <button
                    onClick={() => handleSelectClass("unassigned")}
                    className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all text-left"
                  >
                    <div className="p-3 rounded-full bg-slate-500/30">
                      <Users className="w-5 h-5 text-slate-300" />
                    </div>
                    <div>
                      <p className="font-semibold">Unassigned</p>
                      <p className="text-sm text-white/60">
                        {students.filter(s => (s.classIds ?? []).length === 0).length} students
                      </p>
                    </div>
                  </button>
                )}

                {classes.map(cls => {
                  const count = students.filter(s => (s.classIds ?? []).includes(cls.id)).length;
                  return (
                    <div key={cls.id} className="flex items-center gap-2">
                      <button
                        onClick={() => handleSelectClass(cls.id)}
                        className="flex-1 flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all text-left"
                      >
                        <div className="p-3 rounded-full bg-primary/20">
                          <BookOpen className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">{cls.name}</p>
                          <p className="text-sm text-white/60">{count} student{count !== 1 ? "s" : ""}</p>
                        </div>
                      </button>
                      <button
                        onClick={() => handleDeleteClass(cls.id)}
                        className="p-3 text-white/30 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}

                {classes.length === 0 && students.every(s => (s.classIds ?? []).length > 0) && (
                  <p className="text-white/50 text-center py-4">No classes yet. Add one below.</p>
                )}
              </div>

              {/* Add class */}
              {isAddingClass ? (
                <form onSubmit={handleAddClass} className="flex gap-2">
                  <Input
                    autoFocus
                    value={newClassName}
                    onChange={e => setNewClassName(e.target.value)}
                    placeholder="Class name…"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  />
                  <Button type="submit" size="sm">Add</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setIsAddingClass(false)} className="text-white/60">Cancel</Button>
                </form>
              ) : (
                <button
                  onClick={() => setIsAddingClass(true)}
                  className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" /> Add a class
                </button>
              )}
            </motion.div>
          )}

          {/* Phase: Student */}
          {phase === "student" && (
            <motion.div key="student" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {studentsInClass.length === 0 ? (
                <div className="text-center text-white/50 py-12">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No students in this class yet.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {studentsInClass.map(student => (
                    <button
                      key={student.id}
                      onClick={() => handleSelectStudent(student)}
                      className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-lg">
                        {student.name[0]}
                      </div>
                      <span className="font-semibold text-lg">{student.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Phase: Pack */}
          {phase === "pack" && (
            <motion.div key="pack" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {isOpening ? (
                <div className="flex items-center justify-center py-24 gap-3 text-white/80">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="text-xl font-display">Opening pack…</span>
                </div>
              ) : (packs ?? []).length === 0 ? (
                <div className="text-center text-white/50 py-12">
                  <p>No packs available. Create one in Packs &amp; Cards first.</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {(packs ?? []).map(pack => (
                    <button
                      key={pack.id}
                      onClick={() => handleSelectPack(pack.id)}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all text-left",
                      )}
                    >
                      {pack.coverImageUrl ? (
                        <img src={pack.coverImageUrl} alt={pack.name} className="w-14 h-14 object-cover rounded-lg shadow" />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-primary/20 flex items-center justify-center">
                          <BookOpen className="w-7 h-7 text-primary" />
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-lg">{pack.name}</p>
                        <p className="text-sm text-white/60">{pack.cardCount ?? "?"} cards</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
