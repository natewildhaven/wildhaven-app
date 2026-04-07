import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, BookOpen, ArrowLeft, Package, Loader2, ChevronRight, User, Coins, ShoppingCart } from "lucide-react";
import { useListPacks } from "@workspace/api-client-react";
import { useSettings } from "@/hooks/use-settings";
import { type Card as CardType } from "@workspace/api-client-react";
import { PackOpener } from "@/components/PackOpener";
import { PackBankWidget } from "@/components/PackBankWidget";
import { SpendCoinsShop } from "@/components/SpendCoinsShop";
import { BoxOpener } from "@/components/BoxOpener";
import { TeacherLayout } from "./Layout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const API = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

interface ClassItem { id: number; name: string; teacher: string | null; color?: string | null; }
interface Student {
  id: number;
  name: string;
  classIds: number[];
  collectionCount: number;
}

// studentId → packId → distinct card count
type PackCounts = Record<number, Record<number, number>>;

type Phase = "teacher" | "class" | "student" | "pack" | "opening";

export default function AwardPacks() {
  const { data: packs } = useListPacks();
  const { toast } = useToast();
  const settings = useSettings();

  const [phase, setPhase] = useState<Phase>("teacher");
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [packCounts, setPackCounts] = useState<PackCounts>({});

  const [selectedTeacher, setSelectedTeacher] = useState<string | "unassigned" | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | "unassigned" | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [openedCards, setOpenedCards] = useState<CardType[] | null>(null);
  const [openedDuplicateIds, setOpenedDuplicateIds] = useState<number[]>([]);
  const [openedPackInfo, setOpenedPackInfo] = useState<{ coverUrl?: string | null; backUrl?: string | null; color?: string | null } | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [showCoinShop, setShowCoinShop] = useState(false);
  const [studentCoins, setStudentCoins] = useState(0);

  // Mystery box opening animation state
  const [mysteryBoxes, setMysteryBoxes] = useState<{ id: number; name: string; coverImageUrl?: string | null }[]>([]);
  const [openingBox, setOpeningBox] = useState<{ id: number; name: string; coverImageUrl?: string | null } | null>(null);
  const [boxOpenerResult, setBoxOpenerResult] = useState<{
    figurine: { id: number; name: string; imageUrl?: string | null; glowColor?: string | null; figurineNumber?: number; rarityName?: string | null; rarityColor?: string | null };
    isDuplicate: boolean;
    coinsAwarded: number;
  } | null>(null);

  const totalCards = (packs ?? []).reduce((sum, p) => sum + (p.cardCount ?? 0), 0);

  const fetchStudents = useCallback(async () => {
    const stu: Student[] = await fetch(`${API}/students`).then(r => r.json());
    setStudents(stu);
    return stu;
  }, []);

  const [teacherOrder, setTeacherOrder] = useState<string[]>([]);

  const fetchClasses = useCallback(async () => {
    const [cls, order] = await Promise.all([
      fetch(`${API}/classes`).then(r => r.json()),
      fetch(`${API}/teacher-order`).then(r => r.json()).catch(() => []),
    ]);
    setClasses(cls);
    setTeacherOrder(Array.isArray(order) ? order : []);
  }, []);

  const fetchPackCounts = useCallback(async (studentIds: number[]) => {
    if (studentIds.length === 0) return;
    const qs = studentIds.join(",");
    const data: PackCounts = await fetch(`${API}/admin/student-pack-counts?studentIds=${qs}`).then(r => r.json());
    setPackCounts(prev => ({ ...prev, ...data }));
  }, []);

  useEffect(() => {
    fetchStudents();
    fetchClasses();
    fetch(`${API}/mystery-boxes`).then(r => r.json()).then(setMysteryBoxes).catch(() => {});
  }, [fetchStudents, fetchClasses]);

  // ── Computed: unique teachers (respects saved order) ──
  const uniqueTeachers = useMemo(() => {
    const all = [...new Set(classes.filter(c => c.teacher?.trim()).map(c => c.teacher as string))];
    const inOrder = teacherOrder.filter(t => t !== "__unassigned__" && all.includes(t));
    const remaining = all.filter(t => !inOrder.includes(t)).sort();
    return [...inOrder, ...remaining];
  }, [classes, teacherOrder]);
  const hasUnassignedTeacherClasses = classes.some(c => !c.teacher?.trim());

  // ── Computed: classes filtered by selected teacher ──
  const filteredClasses = selectedTeacher === "unassigned"
    ? classes.filter(c => !c.teacher?.trim())
    : classes.filter(c => c.teacher === selectedTeacher);

  const studentsInClass = students.filter(s =>
    selectedClassId === "unassigned"
      ? (s.classIds ?? []).length === 0
      : (s.classIds ?? []).includes(selectedClassId as number)
  );

  const selectedClassName =
    selectedClassId === "unassigned"
      ? "Unassigned"
      : classes.find(c => c.id === selectedClassId)?.name ?? "";

  const selectedTeacherLabel =
    selectedTeacher === "unassigned" ? "No Teacher" : selectedTeacher ?? "";

  // ── Handlers ──
  const handleSelectTeacher = (teacher: string | "unassigned") => {
    setSelectedTeacher(teacher);
    setPhase("class");
  };

  const handleSelectClass = useCallback(async (id: number | "unassigned") => {
    setSelectedClassId(id);
    setPhase("student");
    const inClass = students.filter(s =>
      id === "unassigned"
        ? (s.classIds ?? []).length === 0
        : (s.classIds ?? []).includes(id as number)
    );
    fetchPackCounts(inClass.map(s => s.id));
  }, [students, fetchPackCounts]);

  const handleSelectStudent = async (student: Student) => {
    setSelectedStudent(student);
    setPhase("pack");
    try {
      const inv = await fetch(`${API}/students/${student.id}/inventory`).then(r => r.json());
      setStudentCoins(inv.coins ?? 0);
    } catch { setStudentCoins(0); }
  };

  const handleOpenPack = async (packId: number) => {
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

  const refreshAndGo = useCallback(async (nextPhase: Phase) => {
    setOpenedCards(null);
    setOpenedPackInfo(null);
    const freshStudents = await fetchStudents();
    const inClass = freshStudents.filter(s =>
      selectedClassId === "unassigned"
        ? (s.classIds ?? []).length === 0
        : (s.classIds ?? []).includes(selectedClassId as number)
    );
    await fetchPackCounts(inClass.map(s => s.id));
    if (nextPhase === "student") setSelectedStudent(null);
    setPhase(nextPhase);
  }, [fetchStudents, fetchPackCounts, selectedClassId]);

  const handleBack = () => {
    if (phase === "class") { setSelectedTeacher(null); setPhase("teacher"); }
    else if (phase === "student") { setSelectedClassId(null); setPhase("class"); }
    else if (phase === "pack") { setPhase("student"); }
  };

  const resetAll = () => {
    setSelectedTeacher(null);
    setSelectedClassId(null);
    setSelectedStudent(null);
    setPhase("teacher");
    setShowCoinShop(false);
  };

  const handleCoinPurchaseComplete = async (result: {
    type: "pack" | "box";
    savedToInventory: boolean;
    remainingCoins: number;
    packId?: number;
    packName?: string;
    boxId?: number;
    figurine?: { id: number; name: string; imageUrl?: string | null; rarityName?: string | null; rarityColor?: string | null };
    isDuplicate?: boolean;
    coinsAwarded?: number;
  }) => {
    setStudentCoins(result.remainingCoins);

    if (result.type === "pack" && !result.savedToInventory && result.packId && result.cards) {
      // Cards already drawn atomically by the shop endpoint — no need to open from bank
      const pack = packs?.find(p => p.id === result.packId);
      setOpenedPackInfo({ coverUrl: pack?.coverImageUrl, backUrl: pack?.cardBackImageUrl, color: pack?.color });
      setOpenedCards(result.cards as CardType[]);
      setOpenedDuplicateIds(result.duplicateCardIds ?? []);
      setPhase("opening");
    } else if (result.type === "pack" && result.savedToInventory) {
      toast({ title: `${result.packName ?? "Pack"} saved to inventory!`, description: `${result.remainingCoins} coins remaining.` });
    } else if (result.type === "box") {
      if (!result.savedToInventory && result.figurine) {
        const box = mysteryBoxes.find(b => b.id === result.boxId);
        setOpeningBox(box ?? { id: result.boxId ?? 0, name: "Mystery Box" });
        setBoxOpenerResult({
          figurine: result.figurine,
          isDuplicate: result.isDuplicate ?? false,
          coinsAwarded: result.coinsAwarded ?? 0,
        });
      } else {
        toast({ title: "Mystery box saved to inventory!", description: `${result.remainingCoins} coins remaining.` });
      }
    }
  };

  // ── Pack opener phase (full-page takeover) ──
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
        onComplete={resetAll}
        onBack={() => refreshAndGo("pack")}
        onOpenAnother={() => refreshAndGo("pack")}
        extraAction={
          <button
            onClick={() => refreshAndGo("student")}
            className="px-5 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white font-semibold transition-all text-sm"
          >
            Select Another Student
          </button>
        }
      />
    );
  }

  // ── Fullscreen pack-picker overlay ──
  if (phase === "pack" && selectedStudent) {
    const availablePacks = (packs ?? []).filter(p => (p as typeof p & { available?: boolean }).available !== false);
    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-black/85 backdrop-blur-md">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 flex-wrap">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm font-semibold text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Students
          </button>
          <span className="text-white/20">·</span>
          <span className="text-white font-bold text-lg font-display">{selectedStudent.name}</span>
          <span className="flex-1" />
          <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-400/30 rounded-xl px-3 py-1.5">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-amber-200 font-bold text-sm">{studentCoins} coins</span>
          </div>
          <button
            onClick={() => setShowCoinShop(true)}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors"
          >
            <ShoppingCart className="w-4 h-4" /> Spend Coins
          </button>
        </div>

        {/* Pack grid */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <h2 className="text-center text-white/60 text-sm font-semibold uppercase tracking-widest mb-8">
            Choose a pack to open
          </h2>
          {isOpening && (
            <div className="flex items-center justify-center gap-2 py-16 text-white/60">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="font-display text-lg">Opening pack…</span>
            </div>
          )}
          {!isOpening && availablePacks.length === 0 && (
            <div className="py-16 text-center">
              <Package className="w-16 h-16 mx-auto mb-3 text-white/20" />
              <p className="text-white/40">No available packs. Create packs in Packs &amp; Cards.</p>
            </div>
          )}
          {!isOpening && availablePacks.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-w-5xl mx-auto">
              {availablePacks.map(pack => (
                <button
                  key={pack.id}
                  onClick={() => handleOpenPack(pack.id)}
                  className="group flex flex-col items-center gap-3 text-center focus:outline-none"
                >
                  <div className="relative w-full rounded-2xl overflow-hidden shadow-lg group-hover:shadow-2xl group-focus-visible:ring-2 group-focus-visible:ring-primary transition-all duration-200 group-hover:-translate-y-1">
                    {pack.coverImageUrl ? (
                      <>
                        <img src={pack.coverImageUrl} aria-hidden className="w-full block invisible" />
                        <img
                          src={pack.coverImageUrl}
                          alt={pack.name}
                          className="absolute inset-0 w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        />
                      </>
                    ) : (
                      <div className="w-full aspect-[3/4] flex flex-col items-center justify-center gap-2 bg-white/10">
                        <Package className="w-16 h-16 text-white/20" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-base font-display text-white">{pack.name}</p>
                    <p className="text-xs text-white/50 mt-0.5">{pack.cardCount ?? "?"} cards</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Coin Shop overlay */}
        <AnimatePresence>
          {showCoinShop && (
            <SpendCoinsShop
              studentId={selectedStudent.id}
              coins={studentCoins}
              onClose={() => setShowCoinShop(false)}
              onPurchaseComplete={handleCoinPurchaseComplete}
            />
          )}
        </AnimatePresence>

        {/* Box opening overlay */}
        <AnimatePresence>
          {openingBox && boxOpenerResult && (
            <BoxOpener
              box={openingBox}
              figurine={boxOpenerResult.figurine}
              isDuplicate={boxOpenerResult.isDuplicate}
              coinsAwarded={boxOpenerResult.coinsAwarded}
              onComplete={() => { setOpeningBox(null); setBoxOpenerResult(null); }}
              boxOpenSoundUrl={settings.boxOpenSoundUrl}
              figurineRevealSoundUrl={settings.figurineRevealSoundUrl}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── Breadcrumb trail ──
  const crumbs: { label: string; phase: Phase }[] = [
    { label: "Teachers", phase: "teacher" },
    ...(selectedTeacher !== null ? [{ label: selectedTeacherLabel, phase: "class" as Phase }] : []),
    ...(selectedClassId !== null ? [{ label: selectedClassName, phase: "student" as Phase }] : []),
    ...(selectedStudent ? [{ label: selectedStudent.name, phase: "pack" as Phase }] : []),
  ];

  return (
    <TeacherLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold">Open Packs</h1>
        <p className="text-muted-foreground mt-1">
          {phase === "teacher" && "Select a teacher to see their classes."}
          {phase === "class" && `Classes taught by ${selectedTeacherLabel}.`}
          {phase === "student" && `Students in ${selectedClassName}.`}
          {phase === "pack" && `Choosing a pack for ${selectedStudent?.name}.`}
        </p>
      </div>

      {/* Breadcrumb */}
      {crumbs.length > 1 && (
        <div className="flex items-center gap-1.5 mb-5 text-sm flex-wrap">
          {crumbs.map((crumb, i) => (
            <span key={crumb.phase} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />}
              <button
                onClick={() => {
                  if (i >= crumbs.length - 1) return;
                  if (crumb.phase === "teacher") resetAll();
                  else setPhase(crumb.phase);
                }}
                className={cn(
                  "font-semibold transition-colors",
                  i === crumbs.length - 1
                    ? "text-foreground cursor-default"
                    : "text-primary hover:underline"
                )}
              >
                {crumb.label}
              </button>
            </span>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">

        {/* ── Phase: Teacher ── */}
        {phase === "teacher" && (
          <motion.div key="teacher" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
            {uniqueTeachers.length === 0 && !hasUnassignedTeacherClasses ? (
              <EmptyState icon={<User />} message="No classes with teachers yet. Add teachers to classes in the Classes tab." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {uniqueTeachers.map(teacher => {
                  const teacherClasses = classes.filter(c => c.teacher === teacher);
                  return (
                    <TeacherCard
                      key={teacher}
                      name={teacher}
                      classCount={teacherClasses.length}
                      onClick={() => handleSelectTeacher(teacher)}
                    />
                  );
                })}
                {hasUnassignedTeacherClasses && (
                  <TeacherCard
                    name="No Teacher"
                    classCount={classes.filter(c => !c.teacher?.trim()).length}
                    onClick={() => handleSelectTeacher("unassigned")}
                    muted
                  />
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Phase: Class ── */}
        {phase === "class" && (
          <motion.div key="class" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
            <div className="flex items-center gap-3 mb-5">
              <button onClick={handleBack} className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Teachers
              </button>
            </div>

            {filteredClasses.length === 0 && !students.some(s => (s.classIds ?? []).length === 0) ? (
              <EmptyState icon={<BookOpen />} message="No classes for this teacher." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {selectedTeacher === "unassigned" && students.some(s => (s.classIds ?? []).length === 0) && (
                  <ClassCard
                    name="Unassigned Students"
                    count={students.filter(s => (s.classIds ?? []).length === 0).length}
                    onClick={() => handleSelectClass("unassigned")}
                    hexColor="#64748b"
                  />
                )}
                {filteredClasses.map(cls => {
                  const count = students.filter(s => (s.classIds ?? []).includes(cls.id)).length;
                  return (
                    <ClassCard
                      key={cls.id}
                      name={cls.name}
                      count={count}
                      onClick={() => handleSelectClass(cls.id)}
                      hexColor={cls.color || "#6366f1"}
                    />
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Phase: Student ── */}
        {phase === "student" && (
          <motion.div key="student" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
            <div className="flex items-center gap-3 mb-5">
              <button onClick={handleBack} className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Classes
              </button>
            </div>

            {studentsInClass.length === 0 ? (
              <EmptyState icon={<Users />} message="No students in this class." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {studentsInClass.map(student => (
                  <StudentCard
                    key={student.id}
                    student={student}
                    packs={packs ?? []}
                    studentPackCounts={packCounts[student.id] ?? {}}
                    totalCards={totalCards}
                    onClick={() => handleSelectStudent(student)}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

      </AnimatePresence>
    </TeacherLayout>
  );
}

// ── Sub-components ──

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="py-16 text-center bg-card rounded-2xl border border-dashed">
      <div className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30 [&>svg]:w-full [&>svg]:h-full">{icon}</div>
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}

function TeacherCard({ name, classCount, onClick, muted = false }: {
  name: string; classCount: number; onClick: () => void; muted?: boolean;
}) {
  return (
    <button onClick={onClick} className="group flex flex-col gap-4 p-6 rounded-2xl border bg-card hover:shadow-lg hover:border-primary/30 transition-all text-left">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", muted ? "bg-slate-100" : "bg-primary/10")}>
        <User className={cn("w-6 h-6", muted ? "text-slate-400" : "text-primary")} />
      </div>
      <div>
        <p className={cn("font-bold text-xl font-display", muted && "text-muted-foreground")}>{name}</p>
        <p className="text-sm text-muted-foreground mt-1">{classCount} class{classCount !== 1 ? "es" : ""}</p>
      </div>
      <div className="mt-auto flex items-center gap-1 text-primary text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
        Select <ChevronRight className="w-4 h-4" />
      </div>
    </button>
  );
}

function ClassCard({ name, count, onClick, hexColor }: {
  name: string; count: number; onClick: () => void; hexColor?: string;
}) {
  const col = hexColor || "#6366f1";
  return (
    <button
      onClick={onClick}
      className="group flex flex-col gap-4 p-6 rounded-2xl border bg-card hover:shadow-lg transition-all text-left"
      style={{ borderTopColor: col, borderTopWidth: 3 }}
    >
      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: col + "22" }}>
        <BookOpen className="w-6 h-6" style={{ color: col }} />
      </div>
      <div>
        <p className="font-bold text-xl font-display">{name}</p>
        <p className="text-sm text-muted-foreground mt-1">{count} student{count !== 1 ? "s" : ""}</p>
      </div>
      <div className="mt-auto flex items-center gap-1 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: col }}>
        Select <ChevronRight className="w-4 h-4" />
      </div>
    </button>
  );
}

const DEFAULT_PACK_COLOUR = "#10b981";

function StudentCard({ student, packs, studentPackCounts, totalCards, onClick }: {
  student: Student;
  packs: { id: number; name: string; cardCount?: number | null; color?: string | null; coverImageUrl?: string | null }[];
  studentPackCounts: Record<number, number>;
  totalCards: number;
  onClick: () => void;
}) {
  const totalOwned = Object.values(studentPackCounts).reduce((a, b) => a + b, 0);
  const overallPct = totalCards > 0 ? Math.min(100, Math.round((totalOwned / totalCards) * 100)) : 0;

  return (
    <div className="flex flex-col gap-3 p-5 rounded-2xl border bg-card hover:shadow-lg transition-all text-left w-full">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xl font-display shrink-0">
          {student.name[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-lg font-display leading-tight truncate">{student.name}</p>
          <p className="text-xs text-muted-foreground">{totalOwned} / {totalCards} cards</p>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>Overall</span>
          <span>{overallPct}%</span>
        </div>
        <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${overallPct}%` }}
          />
        </div>
      </div>

      {packs.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-border/60">
          {packs.map((pack) => {
            const owned = studentPackCounts[pack.id] ?? 0;
            const packTotal = pack.cardCount ?? 0;
            const pct = packTotal > 0 ? Math.min(100, Math.round((owned / packTotal) * 100)) : 0;
            const barColour = pack.color ?? DEFAULT_PACK_COLOUR;
            return (
              <div key={pack.id} className="space-y-0.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="truncate max-w-[70%] font-medium">{pack.name}</span>
                  <span className="shrink-0 ml-1">{owned}/{packTotal}</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: barColour }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inventory */}
      <div className="pt-2 border-t border-border/60">
        <p className="text-xs font-semibold text-muted-foreground mb-1.5">Inventory</p>
        <PackBankWidget studentId={student.id} />
      </div>

      {/* Open Pack Now button */}
      <button
        onClick={onClick}
        className="mt-1 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-sm font-bold transition-colors"
      >
        Open Pack Now <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
