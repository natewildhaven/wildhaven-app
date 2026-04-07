import { Router } from "express";
import {
  db,
  eq,
  and,
  studentsTable,
  packsTable,
  cardsTable,
  collectionEntriesTable,
  mysteryBoxesTable,
  packBankTable,
  studentBoxInventoryTable,
  figurinesTable,
  figurineRaritiesTable,
  mysteryBoxRarityProbsTable,
  studentFigurinesTable,
  rarityValues,
  type Rarity,
} from "@workspace/db";
import { getCardRarityCoinValues } from "./card-rarities.js";

const router = Router();

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

// ── Buy a specific pack with coins ──────────────────────────────────────────

router.post("/students/:studentId/shop/buy-pack", async (req: any, res: any): Promise<void> => {
  const studentId = parseInt(req.params.studentId, 10);
  if (isNaN(studentId)) { res.status(400).json({ error: "Invalid studentId" }); return; }

  const { packId, saveToInventory } = req.body as { packId?: number; saveToInventory?: boolean };
  if (typeof packId !== "number") { res.status(400).json({ error: "packId required" }); return; }

  const [pack] = await db.select().from(packsTable).where(eq(packsTable.id, packId));
  if (!pack) { res.status(404).json({ error: "Pack not found" }); return; }
  if (!pack.availableInShop) { res.status(400).json({ error: "Pack not available in shop" }); return; }

  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, studentId));
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }

  if ((student.coinsCount ?? 0) < pack.coinPrice) {
    res.status(400).json({ error: "Insufficient coins", required: pack.coinPrice, available: student.coinsCount ?? 0 });
    return;
  }

  const purchasedCoins = (student.coinsCount ?? 0) - pack.coinPrice;

  if (saveToInventory === false) {
    // Open immediately — never touch pack-bank
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

    const finalCoins = purchasedCoins + coinsAwarded;
    await Promise.all([
      db.update(studentsTable).set({ coinsCount: finalCoins }).where(eq(studentsTable.id, studentId)),
      entryInserts.length > 0 ? db.insert(collectionEntriesTable).values(entryInserts) : Promise.resolve(),
    ]);

    res.json({ ok: true, savedToInventory: false, remainingCoins: finalCoins, cards: drawnCards, duplicateCardIds, coinsAwarded });
  } else {
    // Save to pack-bank
    await db.update(studentsTable).set({ coinsCount: purchasedCoins }).where(eq(studentsTable.id, studentId));
    const [existing] = await db.select().from(packBankTable)
      .where(and(eq(packBankTable.studentId, studentId), eq(packBankTable.packId, packId)));
    if (existing) {
      await db.update(packBankTable).set({ count: existing.count + 1, updatedAt: new Date() })
        .where(and(eq(packBankTable.studentId, studentId), eq(packBankTable.packId, packId)));
    } else {
      await db.insert(packBankTable).values({ studentId, packId, count: 1 });
    }
    res.json({ ok: true, savedToInventory: true, remainingCoins: purchasedCoins });
  }
});

// ── Buy a mystery box with coins ────────────────────────────────────────────

router.post("/students/:studentId/shop/buy-box", async (req: any, res: any): Promise<void> => {
  const studentId = parseInt(req.params.studentId, 10);
  if (isNaN(studentId)) { res.status(400).json({ error: "Invalid studentId" }); return; }

  const { boxId, saveToInventory } = req.body as { boxId?: number; saveToInventory?: boolean };
  if (typeof boxId !== "number") { res.status(400).json({ error: "boxId required" }); return; }

  const [box] = await db.select().from(mysteryBoxesTable).where(eq(mysteryBoxesTable.id, boxId));
  if (!box) { res.status(404).json({ error: "Box not found" }); return; }
  if (!box.availableInShop) { res.status(400).json({ error: "Box not available in shop" }); return; }

  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, studentId));
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }

  if ((student.coinsCount ?? 0) < box.coinPrice) {
    res.status(400).json({ error: "Insufficient coins", required: box.coinPrice, available: student.coinsCount ?? 0 });
    return;
  }

  const purchasedCoins = (student.coinsCount ?? 0) - box.coinPrice;

  if (saveToInventory === false) {
    // Open immediately — never touch box-inventory
    const allFigurines = await db
      .select({
        id: figurinesTable.id,
        name: figurinesTable.name,
        imageUrl: figurinesTable.imageUrl,
        glowColor: figurinesTable.glowColor,
        figurineNumber: figurinesTable.figurineNumber,
        rarityId: figurinesTable.rarityId,
        rarityName: figurineRaritiesTable.name,
        rarityColor: figurineRaritiesTable.color,
        rarityCoinValue: figurineRaritiesTable.coinValue,
      })
      .from(figurinesTable)
      .leftJoin(figurineRaritiesTable, eq(figurinesTable.rarityId, figurineRaritiesTable.id))
      .where(eq(figurinesTable.boxId, boxId));

    if (allFigurines.length === 0) { res.status(400).json({ error: "Box has no figurines" }); return; }

    const rarityProbs = await db
      .select({ rarityId: mysteryBoxRarityProbsTable.rarityId, probability: mysteryBoxRarityProbsTable.probability })
      .from(mysteryBoxRarityProbsTable)
      .where(eq(mysteryBoxRarityProbsTable.boxId, boxId));

    let chosen;
    if (rarityProbs.length > 0) {
      const total = rarityProbs.reduce((s, r) => s + r.probability, 0);
      let roll = Math.random() * total;
      let chosenRarityId: number | null = null;
      for (const rp of rarityProbs) {
        roll -= rp.probability;
        if (roll <= 0) { chosenRarityId = rp.rarityId; break; }
      }
      if (!chosenRarityId) chosenRarityId = rarityProbs[rarityProbs.length - 1].rarityId;
      const pool = allFigurines.filter(f => f.rarityId === chosenRarityId);
      chosen = (pool.length > 0 ? pool : allFigurines)[Math.floor(Math.random() * (pool.length > 0 ? pool.length : allFigurines.length))];
    } else {
      chosen = allFigurines[Math.floor(Math.random() * allFigurines.length)];
    }

    const [existingOwned] = await db.select({ figurineId: studentFigurinesTable.figurineId })
      .from(studentFigurinesTable)
      .where(and(eq(studentFigurinesTable.studentId, studentId), eq(studentFigurinesTable.figurineId, chosen.id)));

    const isDuplicate = !!existingOwned;
    const coinValue = chosen.rarityCoinValue ?? 5;
    const coinsAwarded = isDuplicate ? coinValue : 0;
    const finalCoins = purchasedCoins + coinsAwarded;

    await Promise.all([
      db.update(studentsTable).set({ coinsCount: finalCoins }).where(eq(studentsTable.id, studentId)),
      !isDuplicate
        ? db.insert(studentFigurinesTable).values({ studentId, figurineId: chosen.id })
        : Promise.resolve(),
    ]);

    res.json({ ok: true, savedToInventory: false, remainingCoins: finalCoins, figurine: chosen, isDuplicate, coinsAwarded });
  } else {
    // Save to box-inventory
    await db.update(studentsTable).set({ coinsCount: purchasedCoins }).where(eq(studentsTable.id, studentId));
    const [existing] = await db.select().from(studentBoxInventoryTable)
      .where(and(eq(studentBoxInventoryTable.studentId, studentId), eq(studentBoxInventoryTable.boxId, boxId)));
    if (existing) {
      await db.update(studentBoxInventoryTable).set({ count: existing.count + 1, updatedAt: new Date() })
        .where(and(eq(studentBoxInventoryTable.studentId, studentId), eq(studentBoxInventoryTable.boxId, boxId)));
    } else {
      await db.insert(studentBoxInventoryTable).values({ studentId, boxId, count: 1 });
    }
    res.json({ ok: true, savedToInventory: true, remainingCoins: purchasedCoins });
  }
});

export default router;
