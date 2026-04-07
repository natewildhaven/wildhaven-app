import { Router } from "express";
import {
  db,
  eq,
  sql,
  and,
  studentsTable,
  studentClassesTable,
  collectionEntriesTable,
  packBankTable,
  packsTable,
  cardsTable,
  studentFigurinesTable,
  rarityValues,
  type Rarity,
} from "@workspace/db";
import { getCardRarityCoinValues } from "./card-rarities.js";
import {
  CreateStudentBody,
  UpdateStudentBody,
  GetStudentParams,
  UpdateStudentParams,
  DeleteStudentParams,
  VerifyStudentPinBody,
} from "@workspace/api-zod";

const router = Router();

async function getClassIdsMap(studentIds: number[]): Promise<Map<number, number[]>> {
  if (studentIds.length === 0) return new Map();
  const rows = await db.select().from(studentClassesTable);
  const map = new Map<number, number[]>();
  for (const r of rows) {
    if (!map.has(r.studentId)) map.set(r.studentId, []);
    map.get(r.studentId)!.push(r.classId);
  }
  return map;
}

router.get("/students", async (_req: any, res: any) => {
  const [students, entryCounts] = await Promise.all([
    db.select().from(studentsTable).orderBy(studentsTable.name),
    db
      .select({
  studentId: collectionEntriesTable.studentId,
  count: sql<number>`count(*)::int` as unknown as any,
})
      .from(collectionEntriesTable)
      .groupBy(collectionEntriesTable.studentId),
  ]);
  const classMap = await getClassIdsMap(students.map(s => s.id));
  const countMap = new Map(entryCounts.map(e => [e.studentId, e.count]));
  const result = students.map(s => ({
    ...s,
    classIds: classMap.get(s.id) ?? [],
    collectionCount: countMap.get(s.id) ?? 0,
  }));
  res.json(result);
});

router.post("/students/verify-pin", async (req: any, res: any): Promise<void> => {
  const parsed = VerifyStudentPinBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [student] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.pin, parsed.data.pin));

  if (!student) {
    res.status(401).json({ error: "Invalid PIN" });
    return;
  }

  res.json(student);
});

router.post("/students", async (req: any, res: any): Promise<void> => {
  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const [student] = await db.insert(studentsTable).values(parsed.data).returning();
    res.status(201).json({ ...student, classIds: [] });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "23505") {
      res.status(409).json({ error: "PIN already in use. Please choose a different one." });
      return;
    }
    throw err;
  }
});

router.get("/students/:studentId", async (req: any, res: any): Promise<void> => {
  const params = GetStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [student] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.id, params.data.studentId));

  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const classMap = await getClassIdsMap([student.id]);
  res.json({ ...student, classIds: classMap.get(student.id) ?? [] });
});

router.patch("/students/:studentId", async (req: any, res: any): Promise<void> => {
  const params = UpdateStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const [student] = await db
      .update(studentsTable)
      .set(parsed.data)
      .where(eq(studentsTable.id, params.data.studentId))
      .returning();

    if (!student) {
      res.status(404).json({ error: "Student not found" });
      return;
    }

    const classMap = await getClassIdsMap([student.id]);
    res.json({ ...student, classIds: classMap.get(student.id) ?? [] });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "23505") {
      res.status(409).json({ error: "PIN already in use. Please choose a different one." });
      return;
    }
    throw err;
  }
});

router.delete("/students/:studentId", async (req: any, res: any): Promise<void> => {
  const params = DeleteStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [student] = await db
    .delete(studentsTable)
    .where(eq(studentsTable.id, params.data.studentId))
    .returning();

  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  res.sendStatus(204);
});

/* ── Pack Bank ── */

router.get("/students/:studentId/pack-bank", async (req: any, res: any): Promise<void> => {
  const studentId = parseInt(req.params.studentId, 10);
  if (isNaN(studentId)) { res.status(400).json({ error: "Invalid studentId" }); return; }
  const rows = await db
    .select({
      packId: packBankTable.packId,
      count: packBankTable.count,
      packName: packsTable.name,
      packColor: packsTable.color,
      coverImageUrl: packsTable.coverImageUrl,
    })
    .from(packBankTable)
    .leftJoin(packsTable, eq(packBankTable.packId, packsTable.id))
    .where(eq(packBankTable.studentId, studentId));
  res.json(rows);
});

router.post("/students/:studentId/pack-bank/adjust", async (req: any, res: any): Promise<void> => {
  const studentId = parseInt(req.params.studentId, 10);
  if (isNaN(studentId)) { res.status(400).json({ error: "Invalid studentId" }); return; }
  const { packId, delta } = req.body as { packId?: number; delta?: number };
  if (typeof packId !== "number" || typeof delta !== "number" || !Number.isInteger(delta)) {
    res.status(400).json({ error: "packId (number) and delta (integer) required" }); return;
  }
  const existing = await db.select().from(packBankTable)
    .where(and(eq(packBankTable.studentId, studentId), eq(packBankTable.packId, packId)));
  const currentCount = existing[0]?.count ?? 0;
  const newCount = Math.max(0, currentCount + delta);
  if (existing.length > 0) {
    await db.update(packBankTable).set({ count: newCount, updatedAt: new Date() })
      .where(and(eq(packBankTable.studentId, studentId), eq(packBankTable.packId, packId)));
  } else {
    if (newCount > 0) {
      await db.insert(packBankTable).values({ studentId, packId, count: newCount });
    }
  }
  res.json({ ok: true, count: newCount });
});

function drawRarityForPack(pack: { commonChance: number; rareChance: number; epicChance: number; mythicChance: number; legendaryChance: number }): Rarity {
  const weights: Record<Rarity, number> = {
    Common: pack.commonChance,
    Rare: pack.rareChance,
    Epic: pack.epicChance,
    Mythic: pack.mythicChance,
    Legendary: pack.legendaryChance,
  };
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (const rarity of rarityValues) {
    roll -= weights[rarity];
    if (roll <= 0) return rarity;
  }
  return "Common";
}

router.post("/students/:studentId/pack-bank/open", async (req: any, res: any): Promise<void> => {
  const studentId = parseInt(req.params.studentId, 10);
  if (isNaN(studentId)) { res.status(400).json({ error: "Invalid studentId" }); return; }
  const { packId } = req.body as { packId?: number };
  if (typeof packId !== "number") { res.status(400).json({ error: "packId required" }); return; }

  const [pack] = await db.select().from(packsTable).where(eq(packsTable.id, packId));
  if (!pack) { res.status(404).json({ error: "Pack not found" }); return; }
  if (!pack.available) { res.status(400).json({ error: "Pack is not available" }); return; }

  const bankRows = await db.select().from(packBankTable)
    .where(and(eq(packBankTable.studentId, studentId), eq(packBankTable.packId, packId)));
  const banked = bankRows[0]?.count ?? 0;
  if (banked < 1) { res.status(400).json({ error: "No packs in bank for this pack" }); return; }

  const allCards = await db.select().from(cardsTable).where(eq(cardsTable.packId, packId));
  if (allCards.length === 0) { res.status(400).json({ error: "Pack has no cards" }); return; }

  const [ownedEntriesPB, coinValuesPB] = await Promise.all([
    db.select({ cardId: collectionEntriesTable.cardId }).from(collectionEntriesTable).where(eq(collectionEntriesTable.studentId, studentId)),
    getCardRarityCoinValues(),
  ]);
  const ownedCardIdsPB = new Set(ownedEntriesPB.map(e => e.cardId));
  const seenInThisOpeningPB = new Set<number>();

  const [studentFull] = await db.select({ coinsCount: studentsTable.coinsCount }).from(studentsTable).where(eq(studentsTable.id, studentId));

  const drawCount = pack.cardsPerPack > 0 ? pack.cardsPerPack : 3;
  const drawnCardsPB: typeof allCards = [];
  const entryInsertsPB: { studentId: number; cardId: number }[] = [];
  const duplicateCardIdsPB: number[] = [];
  let coinsAwardedPB = 0;

  for (let i = 0; i < drawCount; i++) {
    const rarity = drawRarityForPack(pack);
    const pool = allCards.filter(c => c.rarity === rarity);
    const card = (pool.length > 0 ? pool : allCards)[Math.floor(Math.random() * (pool.length > 0 ? pool.length : allCards.length))];
    drawnCardsPB.push(card);
    const isDuplicate = ownedCardIdsPB.has(card.id) || seenInThisOpeningPB.has(card.id);
    if (isDuplicate) {
      duplicateCardIdsPB.push(card.id);
      coinsAwardedPB += coinValuesPB[card.rarity as Rarity] ?? 1;
    } else {
      entryInsertsPB.push({ studentId, cardId: card.id });
      ownedCardIdsPB.add(card.id);
      seenInThisOpeningPB.add(card.id);
    }
  }

  const newCoinsPB = (studentFull?.coinsCount ?? 0) + coinsAwardedPB;

  await Promise.all([
    entryInsertsPB.length > 0 ? db.insert(collectionEntriesTable).values(entryInsertsPB) : Promise.resolve(),
    db.update(packBankTable).set({ count: banked - 1, updatedAt: new Date() })
      .where(and(eq(packBankTable.studentId, studentId), eq(packBankTable.packId, packId))),
    db.update(studentsTable).set({ coinsCount: newCoinsPB }).where(eq(studentsTable.id, studentId)),
  ]);

  res.json({
    cards: drawnCardsPB,
    duplicateCardIds: duplicateCardIdsPB,
    coinsAwarded: coinsAwardedPB,
    remainingCoins: newCoinsPB,
  });
});


/* ── Inventory (simple generic pack credits) ── */

router.get("/students/:studentId/inventory", async (req: any, res: any): Promise<void> => {
  const studentId = parseInt(req.params.studentId, 10);
  if (isNaN(studentId)) { res.status(400).json({ error: "Invalid studentId" }); return; }
  const [[student], cardCountRow, collectibleCountRow] = await Promise.all([
    db.select({ inventoryCount: studentsTable.inventoryCount, coinsCount: studentsTable.coinsCount }).from(studentsTable).where(eq(studentsTable.id, studentId)),
    db.select({ total: sql<number>`cast(count(distinct ${collectionEntriesTable.cardId}) as int)` as unknown as any }).from(collectionEntriesTable).where(eq(collectionEntriesTable.studentId, studentId)),
    db.select({ total: sql<number>`cast(count(distinct ${studentFigurinesTable.figurineId}) as int)` as unknown as any }).from(studentFigurinesTable).where(eq(studentFigurinesTable.studentId, studentId)),
  ]);
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }
  res.json({ count: student.inventoryCount ?? 0, coins: student.coinsCount ?? 0, cardCount: cardCountRow[0]?.total ?? 0, collectibleCount: collectibleCountRow[0]?.total ?? 0 });
});

router.post("/students/:studentId/inventory/adjust", async (req: any, res: any): Promise<void> => {
  const studentId = parseInt(req.params.studentId, 10);
  if (isNaN(studentId)) { res.status(400).json({ error: "Invalid studentId" }); return; }
  const { delta } = req.body as { delta?: number };
  if (typeof delta !== "number" || !Number.isInteger(delta)) {
    res.status(400).json({ error: "delta (integer) required" }); return;
  }
  const [student] = await db.select({ inventoryCount: studentsTable.inventoryCount }).from(studentsTable).where(eq(studentsTable.id, studentId));
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }
  const newCount = Math.max(0, (student.inventoryCount ?? 0) + delta);
  await db.update(studentsTable).set({ inventoryCount: newCount }).where(eq(studentsTable.id, studentId));
  res.json({ ok: true, count: newCount });
});

router.post("/students/:studentId/coins/adjust", async (req: any, res: any): Promise<void> => {
  const studentId = parseInt(req.params.studentId, 10);
  if (isNaN(studentId)) { res.status(400).json({ error: "Invalid studentId" }); return; }
  const { delta } = req.body as { delta?: number };
  if (typeof delta !== "number" || !Number.isInteger(delta)) {
    res.status(400).json({ error: "delta (integer) required" }); return;
  }
  const [student] = await db.select({ coinsCount: studentsTable.coinsCount }).from(studentsTable).where(eq(studentsTable.id, studentId));
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }
  const newCoins = Math.max(0, (student.coinsCount ?? 0) + delta);
  await db.update(studentsTable).set({ coinsCount: newCoins }).where(eq(studentsTable.id, studentId));
  res.json({ ok: true, coins: newCoins });
});

router.post("/students/:studentId/inventory/open", async (req: any, res: any): Promise<void> => {
  const studentId = parseInt(req.params.studentId, 10);
  if (isNaN(studentId)) { res.status(400).json({ error: "Invalid studentId" }); return; }
  const { packId } = req.body as { packId?: number };
  if (typeof packId !== "number") { res.status(400).json({ error: "packId required" }); return; }

  const [student] = await db.select({ inventoryCount: studentsTable.inventoryCount, coinsCount: studentsTable.coinsCount }).from(studentsTable).where(eq(studentsTable.id, studentId));
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }
  if ((student.inventoryCount ?? 0) < 1) { res.status(400).json({ error: "No inventory credits" }); return; }

  const [pack] = await db.select().from(packsTable).where(eq(packsTable.id, packId));
  if (!pack) { res.status(404).json({ error: "Pack not found" }); return; }
  if (!pack.available) { res.status(400).json({ error: "Pack is not available" }); return; }

  const allCards = await db.select().from(cardsTable).where(eq(cardsTable.packId, packId));
  if (allCards.length === 0) { res.status(400).json({ error: "Pack has no cards" }); return; }

  const [ownedEntries, coinValues] = await Promise.all([
    db.select({ cardId: collectionEntriesTable.cardId }).from(collectionEntriesTable).where(eq(collectionEntriesTable.studentId, studentId)),
    getCardRarityCoinValues(),
  ]);
  const ownedCardIds = new Set(ownedEntries.map(e => e.cardId));
  const seenInThisOpening = new Set<number>();

  const drawCount = pack.cardsPerPack > 0 ? pack.cardsPerPack : 3;
  const drawnCards: typeof allCards = [];
  const entryInserts: { studentId: number; cardId: number }[] = [];
  const duplicateCardIds: number[] = [];
  let coinsAwarded = 0;

  for (let i = 0; i < drawCount; i++) {
    const rarity = drawRarityForPack(pack);
    const pool = allCards.filter(c => c.rarity === rarity);
    const card = (pool.length > 0 ? pool : allCards)[Math.floor(Math.random() * (pool.length > 0 ? pool.length : allCards.length))];
    drawnCards.push(card);
    const isDuplicate = ownedCardIds.has(card.id) || seenInThisOpening.has(card.id);
    if (isDuplicate) {
      duplicateCardIds.push(card.id);
      coinsAwarded += coinValues[card.rarity as Rarity] ?? 1;
    } else {
      entryInserts.push({ studentId, cardId: card.id });
      ownedCardIds.add(card.id);
      seenInThisOpening.add(card.id);
    }
  }

  const newInventoryCount = (student.inventoryCount ?? 0) - 1;
  const newCoinsCount = (student.coinsCount ?? 0) + coinsAwarded;

  await Promise.all([
    entryInserts.length > 0 ? db.insert(collectionEntriesTable).values(entryInserts) : Promise.resolve(),
    db.update(studentsTable).set({ inventoryCount: newInventoryCount, coinsCount: newCoinsCount }).where(eq(studentsTable.id, studentId)),
  ]);

  res.json({
    cards: drawnCards,
    remainingCount: newInventoryCount,
    remainingCoins: newCoinsCount,
    duplicateCardIds,
    coinsAwarded,
  });
});

export default router;
