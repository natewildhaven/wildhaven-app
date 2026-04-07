import { Router } from "express";
import {
  db,
  eq,
  asc,
  desc,
  inArray,
  backupsTable,
  studentsTable,
  collectionEntriesTable,
  studentFigurinesTable,
  packBankTable,
  studentBoxInventoryTable,
  studentAchievementsTable,
} from "@workspace/db";

const router = Router();

const MAX_BACKUPS = 60;

export async function createBackup(label?: string): Promise<number> {
  const backupLabel = label ?? new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const [students, collectionEntries, figurines, packBank, boxInventory, achievements] =
    await Promise.all([
      db.select().from(studentsTable),
      db.select().from(collectionEntriesTable),
      db.select().from(studentFigurinesTable),
      db.select().from(packBankTable),
      db.select().from(studentBoxInventoryTable),
      db.select().from(studentAchievementsTable),
    ]);

  const snapshot = { students, collectionEntries, figurines, packBank, boxInventory, achievements };

  const [inserted] = await db
    .insert(backupsTable)
    .values({ label: backupLabel, snapshot })
    .returning({ id: backupsTable.id });

  const allBackups = await db
    .select({ id: backupsTable.id })
    .from(backupsTable)
    .orderBy(asc(backupsTable.createdAt));

  if (allBackups.length > MAX_BACKUPS) {
    const toDelete = allBackups.slice(0, allBackups.length - MAX_BACKUPS).map(b => b.id);
    await db.delete(backupsTable).where(inArray(backupsTable.id, toDelete));
  }

  return inserted!.id;
}

router.get("/backups", async (_req, res): Promise<void> => {
  const backups = await db
    .select({
      id: backupsTable.id,
      label: backupsTable.label,
      createdAt: backupsTable.createdAt,
    })
    .from(backupsTable)
    .orderBy(desc(backupsTable.createdAt));

  res.json(backups);
});

router.post("/backups", async (req, res): Promise<void> => {
  const label = typeof req.body?.label === "string" ? req.body.label : undefined;
  const id = await createBackup(label);
  res.status(201).json({ id });
});

router.post("/backups/:id/restore", async (req, res): Promise<void> => {
  const backupId = parseInt(req.params.id ?? "", 10);
  if (isNaN(backupId)) {
    res.status(400).json({ error: "Invalid backup ID" });
    return;
  }

  const [backup] = await db
    .select()
    .from(backupsTable)
    .where(eq(backupsTable.id, backupId));

  if (!backup) {
    res.status(404).json({ error: "Backup not found" });
    return;
  }

  const snapshot = backup.snapshot as {
    students: Array<{ id: number; name: string; pin: string; classId: number | null; inventoryCount: number; coinsCount: number }>;
    collectionEntries: Array<{ studentId: number; cardId: number; awardedAt: string }>;
    figurines: Array<{ studentId: number; figurineId: number; awardedAt: string }>;
    packBank: Array<{ studentId: number; packId: number; count: number }>;
    boxInventory: Array<{ studentId: number; boxId: number; count: number }>;
    achievements: Array<{ studentId: number; achievementId: number; earnedAt: string }>;
  };

  await db.transaction(async (tx) => {
    for (const s of snapshot.students) {
      const [existing] = await tx
        .select({ id: studentsTable.id })
        .from(studentsTable)
        .where(eq(studentsTable.id, s.id));

      if (existing) {
        await tx
          .update(studentsTable)
          .set({ name: s.name, pin: s.pin, classId: s.classId, inventoryCount: s.inventoryCount, coinsCount: s.coinsCount })
          .where(eq(studentsTable.id, s.id));
      } else {
        await tx.insert(studentsTable).values({
          id: s.id,
          name: s.name,
          pin: s.pin,
          classId: s.classId,
          inventoryCount: s.inventoryCount,
          coinsCount: s.coinsCount,
        });
      }
    }

    const studentIds = snapshot.students.map(s => s.id);
    if (studentIds.length === 0) return;

    await tx.delete(collectionEntriesTable).where(inArray(collectionEntriesTable.studentId, studentIds));
    await tx.delete(studentFigurinesTable).where(inArray(studentFigurinesTable.studentId, studentIds));
    await tx.delete(packBankTable).where(inArray(packBankTable.studentId, studentIds));
    await tx.delete(studentBoxInventoryTable).where(inArray(studentBoxInventoryTable.studentId, studentIds));
    await tx.delete(studentAchievementsTable).where(inArray(studentAchievementsTable.studentId, studentIds));

    if (snapshot.collectionEntries.length > 0) {
      await tx.insert(collectionEntriesTable).values(
        snapshot.collectionEntries.map(e => ({ studentId: e.studentId, cardId: e.cardId, awardedAt: new Date(e.awardedAt) }))
      );
    }
    if (snapshot.figurines.length > 0) {
      await tx.insert(studentFigurinesTable).values(
        snapshot.figurines.map(e => ({ studentId: e.studentId, figurineId: e.figurineId, awardedAt: new Date(e.awardedAt) }))
      );
    }
    if (snapshot.packBank.length > 0) {
      await tx.insert(packBankTable).values(
        snapshot.packBank.map(e => ({ studentId: e.studentId, packId: e.packId, count: e.count }))
      );
    }
    if (snapshot.boxInventory.length > 0) {
      await tx.insert(studentBoxInventoryTable).values(
        snapshot.boxInventory.map(e => ({ studentId: e.studentId, boxId: e.boxId, count: e.count }))
      );
    }
    if (snapshot.achievements.length > 0) {
      await tx.insert(studentAchievementsTable).values(
        snapshot.achievements.map(e => ({ studentId: e.studentId, achievementId: e.achievementId, earnedAt: new Date(e.earnedAt) }))
      );
    }
  });

  res.json({ ok: true, restoredStudents: snapshot.students.length });
});

router.delete("/backups/:id", async (req, res): Promise<void> => {
  const backupId = parseInt(req.params.id ?? "", 10);
  if (isNaN(backupId)) {
    res.status(400).json({ error: "Invalid backup ID" });
    return;
  }

  const [deleted] = await db
    .delete(backupsTable)
    .where(eq(backupsTable.id, backupId))
    .returning({ id: backupsTable.id });

  if (!deleted) {
    res.status(404).json({ error: "Backup not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
