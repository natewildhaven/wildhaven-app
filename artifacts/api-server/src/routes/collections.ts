import { Router } from "express";
import {
  db,
  eq,
  and,
  studentsTable,
  cardsTable,
  collectionEntriesTable,
  packsTable,
  type Rarity,
} from "@workspace/db";
import {
  GetStudentCollectionParams,
  GetStudentCollectionQueryParams,
  AddCollectionEntryParams,
  AddCollectionEntryBody,
  RemoveCollectionEntryParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/collections/:studentId", async (req: any, res: any): Promise<void> => {
  const params = GetStudentCollectionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const query = GetStudentCollectionQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
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

  const conditions = [eq(collectionEntriesTable.studentId, params.data.studentId)];
  if (query.data.packId) {
    conditions.push(eq(cardsTable.packId, query.data.packId));
  }
  if (query.data.rarity) {
    conditions.push(eq(cardsTable.rarity, query.data.rarity as Rarity));
  }

  const entries = await db
    .select({
      id: collectionEntriesTable.id,
      studentId: collectionEntriesTable.studentId,
      cardId: collectionEntriesTable.cardId,
      awardedAt: collectionEntriesTable.awardedAt,
      card: {
        id: cardsTable.id,
        packId: cardsTable.packId,
        cardNumber: cardsTable.cardNumber,
        name: cardsTable.name,
        imageUrl: cardsTable.imageUrl,
        rarity: cardsTable.rarity,
        createdAt: cardsTable.createdAt,
      },
    })
    .from(collectionEntriesTable)
    .innerJoin(cardsTable, eq(collectionEntriesTable.cardId, cardsTable.id))
    .where(and(...conditions))
    .orderBy(collectionEntriesTable.awardedAt);

  const allEntries = await db
    .select({
      cardId: collectionEntriesTable.cardId,
      rarity: cardsTable.rarity,
      packId: cardsTable.packId,
    })
    .from(collectionEntriesTable)
    .innerJoin(cardsTable, eq(collectionEntriesTable.cardId, cardsTable.id))
    .where(eq(collectionEntriesTable.studentId, params.data.studentId));

  const uniqueCardIds = new Set(allEntries.map(e => e.cardId));
  const epicCount = allEntries.filter(e => e.rarity === "Epic").length;
  const mythicCount = allEntries.filter(e => e.rarity === "Mythic").length;
  const legendaryCount = allEntries.filter(e => e.rarity === "Legendary").length;

  const allPacks = await db.select().from(packsTable);
  const allCards = await db.select().from(cardsTable);

  function alphaCardNum(n: string): string {
    return /^\d+$/.test(n) ? n.padStart(20, "0") : "zzz" + n;
  }

  const packsSorted = [...allPacks].sort((a, b) => {
    const numsA = allCards.filter(c => c.packId === a.id).map(c => alphaCardNum(c.cardNumber));
    const numsB = allCards.filter(c => c.packId === b.id).map(c => alphaCardNum(c.cardNumber));
    const minA = numsA.length ? numsA.sort()[0] : "zzzzz";
    const minB = numsB.length ? numsB.sort()[0] : "zzzzz";
    return minA < minB ? -1 : minA > minB ? 1 : 0;
  });

  const packProgress = packsSorted
    .map(pack => {
      const packCards = allCards.filter(c => c.packId === pack.id);
      const ownedUnique = new Set(
        allEntries.filter(e => e.packId === pack.id).map(e => e.cardId)
      );
      return {
        packId: pack.id,
        packName: pack.name,
        packColor: pack.color ?? "#10b981",
        totalCards: packCards.length,
        uniqueOwned: ownedUnique.size,
      };
    })
    .filter(p => {
      const packDef = allPacks.find(pk => pk.id === p.packId);
      if (packDef?.hideMasteryUntilOwned && p.uniqueOwned === 0) return false;
      return true;
    });

  res.json({
    student,
    entries,
    totalCards: allCards.length,
    uniqueCards: uniqueCardIds.size,
    epicCount,
    mythicCount,
    legendaryCount,
    packProgress,
  });
});

router.post("/collections/:studentId/entries", async (req: any, res: any): Promise<void> => {
  const params = AddCollectionEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = AddCollectionEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [card] = await db
    .select()
    .from(cardsTable)
    .where(eq(cardsTable.id, parsed.data.cardId));

  if (!card) {
    res.status(400).json({ error: "Card not found" });
    return;
  }

  const [entry] = await db
    .insert(collectionEntriesTable)
    .values({ studentId: params.data.studentId, cardId: parsed.data.cardId })
    .returning();

  res.status(201).json({ ...entry, card });
});

router.delete("/collections/:studentId/entries/:entryId", async (req: any, res: any): Promise<void> => {
  const params = RemoveCollectionEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [entry] = await db
    .delete(collectionEntriesTable)
    .where(
      and(
        eq(collectionEntriesTable.id, params.data.entryId),
        eq(collectionEntriesTable.studentId, params.data.studentId)
      )
    )
    .returning();

  if (!entry) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
