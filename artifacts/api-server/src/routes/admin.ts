import { Router } from "express";
import {
  db,
  eq,
  and,
  inArray,
  sql,
  studentsTable,
  cardsTable,
  collectionEntriesTable,
  packsTable,
  studentClassesTable,
  settingsTable,
  figurinesTable,
  mysteryBoxesTable,
  studentFigurinesTable,
  figurineRaritiesTable,
} from "@workspace/db";
import { getCardRarityCoinValues } from "./card-rarities.js";

const router = Router();

router.get("/admin/overview", async (_req: any, res: any): Promise<void> => {
  const [students, allCards, allPacks, allEntries, allStudentClasses] = await Promise.all([
    db.select().from(studentsTable).orderBy(studentsTable.name),
    db.select().from(cardsTable).orderBy(
      sql`CASE WHEN ${cardsTable.cardNumber} ~ '^[0-9]+$' THEN 0 ELSE 1 END`,
      sql`CASE WHEN ${cardsTable.cardNumber} ~ '^[0-9]+$' THEN LPAD(${cardsTable.cardNumber}, 20, '0') ELSE ${cardsTable.cardNumber} END`,
    ),
    db.select().from(packsTable),
    db.select().from(collectionEntriesTable),
    db.select().from(studentClassesTable),
  ]);

  const packMap = new Map(allPacks.map(p => [p.id, p.name]));

  const cardsWithPack = allCards.map(c => ({
    id: c.id,
    cardNumber: c.cardNumber,
    name: c.name,
    packId: c.packId,
    packName: packMap.get(c.packId) ?? "Unknown",
  }));

  // Build classIds map per student
  const classIdsMap = new Map<number, number[]>();
  for (const sc of allStudentClasses) {
    if (!classIdsMap.has(sc.studentId)) classIdsMap.set(sc.studentId, []);
    classIdsMap.get(sc.studentId)!.push(sc.classId);
  }

  const matrix: Record<number, Record<number, number>> = {};
  for (const s of students) {
    matrix[s.id] = {};
    for (const c of allCards) {
      matrix[s.id][c.id] = 0;
    }
  }
  for (const e of allEntries) {
    if (matrix[e.studentId] !== undefined && matrix[e.studentId][e.cardId] !== undefined) {
      matrix[e.studentId][e.cardId]++;
    }
  }

  const studentsWithClasses = students.map(s => ({ ...s, classIds: classIdsMap.get(s.id) ?? [] }));

  res.json({ students: studentsWithClasses, cards: cardsWithPack, matrix });
});

router.put("/admin/cell", async (req: any, res: any): Promise<void> => {
  const { studentId, cardId, count } = req.body as { studentId: number; cardId: number; count: number };
  if (!studentId || !cardId || typeof count !== "number" || count < 0) {
    res.status(400).json({ error: "Invalid body: studentId, cardId, count required" });
    return;
  }

  await db
    .delete(collectionEntriesTable)
    .where(
      and(
        eq(collectionEntriesTable.studentId, studentId),
        eq(collectionEntriesTable.cardId, cardId),
      )
    );

  if (count > 0) {
    const inserts = Array.from({ length: count }, () => ({
      studentId,
      cardId,
    }));
    await db.insert(collectionEntriesTable).values(inserts);
  }

  res.json({ studentId, cardId, count });
});

router.post("/admin/batch-update", async (req: any, res: any): Promise<void> => {
  const { updates } = req.body as { updates: { studentId: number; cardId: number; count: number }[] };
  if (!Array.isArray(updates)) {
    res.status(400).json({ error: "updates must be an array" });
    return;
  }

  for (const u of updates) {
    if (!u.studentId || !u.cardId || typeof u.count !== "number" || u.count < 0) continue;
    await db
      .delete(collectionEntriesTable)
      .where(
        and(
          eq(collectionEntriesTable.studentId, u.studentId),
          eq(collectionEntriesTable.cardId, u.cardId),
        )
      );
    if (u.count > 0) {
      const inserts = Array.from({ length: u.count }, () => ({
        studentId: u.studentId,
        cardId: u.cardId,
      }));
      await db.insert(collectionEntriesTable).values(inserts);
    }
  }

  res.json({ updated: updates.length });
});

// Returns distinct card counts per pack per student.
// Query: ?studentIds=1,2,3
// Response: { "1": { "2": 15, "3": 8 }, ... }  (studentId → packId → unique card count)
router.get("/admin/student-pack-counts", async (req: any, res: any): Promise<void> => {
  const raw = (req.query.studentIds as string) || "";
  const studentIds = raw.split(",").map(Number).filter(Boolean);
  if (studentIds.length === 0) {
    res.json({});
    return;
  }

  const rows = await db
    .select({
      studentId: collectionEntriesTable.studentId,
      packId: cardsTable.packId,
      count: sql<number>`count(distinct ${collectionEntriesTable.cardId})::int`,
    })
    .from(collectionEntriesTable)
    .innerJoin(cardsTable, eq(collectionEntriesTable.cardId, cardsTable.id))
    .where(inArray(collectionEntriesTable.studentId, studentIds))
    .groupBy(collectionEntriesTable.studentId, cardsTable.packId);

  const result: Record<number, Record<number, number>> = {};
  for (const r of rows) {
    if (!result[r.studentId]) result[r.studentId] = {};
    result[r.studentId][r.packId] = r.count;
  }
  res.json(result);
});

router.get("/admin/dedup-status", async (_req: any, res: any): Promise<void> => {
  const [cleanedRow] = await db.select().from(settingsTable).where(eq(settingsTable.key, "duplicates_cleaned_at"));

  const counts = await db
    .select({
      studentId: collectionEntriesTable.studentId,
      cardId: collectionEntriesTable.cardId,
      count: sql<number>`count(*)::int`,
    })
    .from(collectionEntriesTable)
    .groupBy(collectionEntriesTable.studentId, collectionEntriesTable.cardId);

  const duplicateCount = counts.reduce((sum, row) => sum + Math.max(0, row.count - 1), 0);

  res.json({
    cleanedAt: cleanedRow?.value ?? null,
    pendingDuplicates: duplicateCount,
  });
});

router.post("/admin/dedup-collections", async (_req: any, res: any): Promise<void> => {
  const coinValues = await getCardRarityCoinValues();

  const [allEntries, allCardRows] = await Promise.all([
    db
      .select({
        id: collectionEntriesTable.id,
        studentId: collectionEntriesTable.studentId,
        cardId: collectionEntriesTable.cardId,
        awardedAt: collectionEntriesTable.awardedAt,
      })
      .from(collectionEntriesTable)
      .orderBy(collectionEntriesTable.awardedAt),
    db.select({ id: cardsTable.id, rarity: cardsTable.rarity }).from(cardsTable),
  ]);

  const cardRarityMap = new Map(allCardRows.map(c => [c.id, c.rarity as string]));

  const groups = new Map<string, typeof allEntries>();
  for (const entry of allEntries) {
    const key = `${entry.studentId}:${entry.cardId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  }

  const duplicateIds: number[] = [];
  const coinsByStudent = new Map<number, number>();
  const studentsAffected = new Set<number>();

  for (const [, entries] of groups) {
    if (entries.length <= 1) continue;
    const [, ...dupes] = entries;
    for (const dup of dupes) {
      duplicateIds.push(dup.id);
      const rarity = cardRarityMap.get(dup.cardId) ?? "common";
      const coins = coinValues[rarity] ?? 0;
      coinsByStudent.set(dup.studentId, (coinsByStudent.get(dup.studentId) ?? 0) + coins);
      studentsAffected.add(dup.studentId);
    }
  }

  if (duplicateIds.length > 0) {
    await db.delete(collectionEntriesTable).where(inArray(collectionEntriesTable.id, duplicateIds));
    for (const [studentId, coins] of coinsByStudent) {
      if (coins > 0) {
        await db
          .update(studentsTable)
          .set({ coinsCount: sql`${studentsTable.coinsCount} + ${coins}` })
          .where(eq(studentsTable.id, studentId));
      }
    }
  }

  const cleanedAt = new Date().toISOString();
  const [existingCleanedRow] = await db.select().from(settingsTable).where(eq(settingsTable.key, "duplicates_cleaned_at"));
  if (existingCleanedRow) {
    await db.update(settingsTable).set({ value: cleanedAt }).where(eq(settingsTable.key, "duplicates_cleaned_at"));
  } else {
    await db.insert(settingsTable).values({ key: "duplicates_cleaned_at", value: cleanedAt });
  }

  const totalCoinsAwarded = Array.from(coinsByStudent.values()).reduce((a, b) => a + b, 0);

  res.json({
    studentsAffected: studentsAffected.size,
    duplicatesRemoved: duplicateIds.length,
    coinsAwarded: totalCoinsAwarded,
    cleanedAt,
  });
});

// ── Collectibles (figurines) overview ──────────────────────────────────────

router.get("/admin/figurines-overview", async (_req: any, res: any): Promise<void> => {
  const [students, allStudentClasses, allFigurines, allBoxes, allOwned] = await Promise.all([
    db.select().from(studentsTable).orderBy(studentsTable.name),
    db.select().from(studentClassesTable),
    db.select({
      id: figurinesTable.id,
      boxId: figurinesTable.boxId,
      figurineNumber: figurinesTable.figurineNumber,
      name: figurinesTable.name,
      imageUrl: figurinesTable.imageUrl,
      rarityName: figurineRaritiesTable.name,
      rarityColor: figurineRaritiesTable.color,
    })
      .from(figurinesTable)
      .leftJoin(figurineRaritiesTable, eq(figurinesTable.rarityId, figurineRaritiesTable.id))
      .orderBy(figurinesTable.boxId, figurinesTable.figurineNumber),
    db.select({ id: mysteryBoxesTable.id, name: mysteryBoxesTable.name }).from(mysteryBoxesTable).orderBy(mysteryBoxesTable.id),
    db.select({ studentId: studentFigurinesTable.studentId, figurineId: studentFigurinesTable.figurineId }).from(studentFigurinesTable),
  ]);

  const classIdsMap = new Map<number, number[]>();
  for (const sc of allStudentClasses) {
    if (!classIdsMap.has(sc.studentId)) classIdsMap.set(sc.studentId, []);
    classIdsMap.get(sc.studentId)!.push(sc.classId);
  }

  const boxMap = new Map(allBoxes.map(b => [b.id, b.name]));
  const figurinesWithBox = allFigurines.map(f => ({ ...f, boxName: boxMap.get(f.boxId) ?? "Unknown" }));

  const owned: Record<number, number[]> = {};
  for (const s of students) owned[s.id] = [];
  for (const row of allOwned) {
    if (owned[row.studentId]) owned[row.studentId].push(row.figurineId);
  }

  res.json({
    students: students.map(s => ({ ...s, classIds: classIdsMap.get(s.id) ?? [] })),
    figurines: figurinesWithBox,
    owned,
  });
});

router.put("/admin/figurine-cell", async (req: any, res: any): Promise<void> => {
  const { studentId, figurineId, owned } = req.body as { studentId: number; figurineId: number; owned: boolean };
  if (!studentId || !figurineId || typeof owned !== "boolean") {
    res.status(400).json({ error: "studentId, figurineId, owned required" });
    return;
  }
  await db.delete(studentFigurinesTable).where(
    and(eq(studentFigurinesTable.studentId, studentId), eq(studentFigurinesTable.figurineId, figurineId))
  );
  if (owned) {
    await db.insert(studentFigurinesTable).values({ studentId, figurineId });
  }
  res.json({ studentId, figurineId, owned });
});

export default router;
