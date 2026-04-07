import { Router, type IRouter } from "express";
import { eq, sql, count, and } from "drizzle-orm";
import { db, packsTable, cardsTable, studentsTable, collectionEntriesTable } from "@workspace/db";
import { rarityValues, type Rarity } from "@workspace/db";
import { getCardRarityCoinValues } from "./card-rarities.js";
import {
  CreatePackBody,
  UpdatePackBody,
  GetPackParams,
  UpdatePackParams,
  DeletePackParams,
  OpenPackParams,
  OpenPackBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

function drawRarityForPack(pack: { commonChance: number; rareChance: number; epicChance: number; mythicChance: number; legendaryChance: number; customRarityChances?: Record<string, number> | null }, availableRarities?: string[]): string {
  const weights: Record<string, number> = {
    Common: pack.commonChance,
    Rare: pack.rareChance,
    Epic: pack.epicChance,
    Mythic: pack.mythicChance,
    Legendary: pack.legendaryChance,
    ...(pack.customRarityChances ?? {}),
  };
  // Only include rarities that are actually available in the pack
  const candidates = availableRarities
    ? Object.entries(weights).filter(([r]) => availableRarities.includes(r) && weights[r] > 0)
    : Object.entries(weights).filter(([, w]) => w > 0);
  const total = candidates.reduce((a, [, w]) => a + w, 0);
  if (total === 0) {
    // No configured weights: pick from available rarities uniformly
    const pool = availableRarities ?? rarityValues;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  let roll = Math.random() * total;
  for (const [rarity, weight] of candidates) {
    roll -= weight;
    if (roll <= 0) return rarity;
  }
  return candidates[candidates.length - 1][0];
}


router.get("/packs", async (_req, res): Promise<void> => {
  // Order packs by the minimum card number they contain so Origins (1-30) comes
  // first, Twilight (31-60) second, etc. Packs with no cards sort to the end.
  // Also include cardCount and distinct card rarities present in each pack.
  const packs = await db
    .select({
      id: packsTable.id,
      name: packsTable.name,
      description: packsTable.description,
      coverImageUrl: packsTable.coverImageUrl,
      cardBackImageUrl: packsTable.cardBackImageUrl,
      openVideoUrl: packsTable.openVideoUrl,
      commonChance: packsTable.commonChance,
      rareChance: packsTable.rareChance,
      epicChance: packsTable.epicChance,
      mythicChance: packsTable.mythicChance,
      legendaryChance: packsTable.legendaryChance,
      customRarityChances: packsTable.customRarityChances,
      color: packsTable.color,
      available: packsTable.available,
      availableInShop: packsTable.availableInShop,
      coinPrice: packsTable.coinPrice,
      cardsPerPack: packsTable.cardsPerPack,
      createdAt: packsTable.createdAt,
      cardCount: count(cardsTable.id),
      packRarities: sql<string[]>`array_remove(array_agg(DISTINCT ${cardsTable.rarity}), NULL)`,
    })
    .from(packsTable)
    .leftJoin(cardsTable, eq(cardsTable.packId, packsTable.id))
    .groupBy(packsTable.id)
    .orderBy(sql`MIN(CASE WHEN ${cardsTable.cardNumber} ~ '^[0-9]+$' THEN LPAD(${cardsTable.cardNumber}, 20, '0') ELSE 'zzz' || ${cardsTable.cardNumber} END) ASC NULLS LAST`);
  res.json(packs);
});

router.post("/packs", async (req, res): Promise<void> => {
  const parsed = CreatePackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [pack] = await db.insert(packsTable).values(parsed.data).returning();
  res.status(201).json(pack);
});

router.get("/packs/:packId", async (req, res): Promise<void> => {
  const params = GetPackParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [pack] = await db
    .select()
    .from(packsTable)
    .where(eq(packsTable.id, params.data.packId));

  if (!pack) {
    res.status(404).json({ error: "Pack not found" });
    return;
  }

  const cards = await db
    .select()
    .from(cardsTable)
    .where(eq(cardsTable.packId, params.data.packId))
    .orderBy(
      sql`CASE WHEN ${cardsTable.cardNumber} ~ '^[0-9]+$' THEN 0 ELSE 1 END`,
      sql`CASE WHEN ${cardsTable.cardNumber} ~ '^[0-9]+$' THEN LPAD(${cardsTable.cardNumber}, 20, '0') ELSE ${cardsTable.cardNumber} END`,
    );

  res.json({ ...pack, cards });
});

router.patch("/packs/:packId", async (req, res): Promise<void> => {
  const params = UpdatePackParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdatePackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [pack] = await db
    .update(packsTable)
    .set(parsed.data)
    .where(eq(packsTable.id, params.data.packId))
    .returning();

  if (!pack) {
    res.status(404).json({ error: "Pack not found" });
    return;
  }

  res.json(pack);
});

router.patch("/packs/:packId/availability", async (req, res): Promise<void> => {
  const packId = parseInt(req.params.packId, 10);
  if (isNaN(packId)) { res.status(400).json({ error: "Invalid packId" }); return; }
  const { available } = req.body as { available?: boolean };
  if (typeof available !== "boolean") { res.status(400).json({ error: "available must be a boolean" }); return; }
  const [pack] = await db.update(packsTable).set({ available }).where(eq(packsTable.id, packId)).returning();
  if (!pack) { res.status(404).json({ error: "Pack not found" }); return; }
  res.json({ ok: true, available: pack.available });
});

// ── Shop settings for a pack (bypasses OpenAPI-generated schema) ─────────────
router.patch("/packs/:packId/shop", async (req, res): Promise<void> => {
  const packId = parseInt(req.params.packId, 10);
  if (isNaN(packId)) { res.status(400).json({ error: "Invalid packId" }); return; }
  const { availableInShop, coinPrice, hideMasteryUntilOwned } = req.body as { availableInShop?: boolean; coinPrice?: number; hideMasteryUntilOwned?: boolean };
  const updates: Record<string, unknown> = {};
  if (typeof availableInShop === "boolean") updates.availableInShop = availableInShop;
  if (typeof coinPrice === "number" && coinPrice >= 0) updates.coinPrice = coinPrice;
  if (typeof hideMasteryUntilOwned === "boolean") updates.hideMasteryUntilOwned = hideMasteryUntilOwned;
  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "No valid fields to update" }); return; }
  const [pack] = await db.update(packsTable).set(updates).where(eq(packsTable.id, packId)).returning();
  if (!pack) { res.status(404).json({ error: "Pack not found" }); return; }
  res.json({ ok: true, availableInShop: pack.availableInShop, coinPrice: pack.coinPrice, hideMasteryUntilOwned: pack.hideMasteryUntilOwned });
});

router.delete("/packs/:packId", async (req, res): Promise<void> => {
  const params = DeletePackParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [pack] = await db
    .delete(packsTable)
    .where(eq(packsTable.id, params.data.packId))
    .returning();

  if (!pack) {
    res.status(404).json({ error: "Pack not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/packs/:packId/open", async (req, res): Promise<void> => {
  const params = OpenPackParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = OpenPackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [pack] = await db
    .select()
    .from(packsTable)
    .where(eq(packsTable.id, params.data.packId));

  if (!pack) {
    res.status(404).json({ error: "Pack not found" });
    return;
  }

  const [student] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.id, parsed.data.studentId));

  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const allCards = await db
    .select()
    .from(cardsTable)
    .where(eq(cardsTable.packId, params.data.packId));

  if (allCards.length === 0) {
    res.status(400).json({ error: "Pack has no cards" });
    return;
  }

  const [ownedEntriesT, coinValuesT] = await Promise.all([
    db.select({ cardId: collectionEntriesTable.cardId }).from(collectionEntriesTable).where(eq(collectionEntriesTable.studentId, parsed.data.studentId)),
    getCardRarityCoinValues(),
  ]);
  const [studentFull] = await db.select({ coinsCount: studentsTable.coinsCount }).from(studentsTable).where(eq(studentsTable.id, parsed.data.studentId));
  const ownedCardIdsT = new Set(ownedEntriesT.map(e => e.cardId));
  const seenInThisOpeningT = new Set<number>();

  const drawCount = pack.cardsPerPack && pack.cardsPerPack > 0 ? pack.cardsPerPack : 3;
  const drawnCardsT: typeof allCards = [];
  const entryInsertsT: { studentId: number; cardId: number }[] = [];
  const duplicateCardIdsT: number[] = [];
  let coinsAwardedT = 0;

  const availableRarities = [...new Set(allCards.map(c => c.rarity))];

  for (let i = 0; i < drawCount; i++) {
    const rarity = drawRarityForPack(pack, availableRarities);
    const cardsOfRarity = allCards.filter(c => c.rarity === rarity);
    const pool = cardsOfRarity.length > 0 ? cardsOfRarity : allCards;
    const card = pool[Math.floor(Math.random() * pool.length)];
    drawnCardsT.push(card);
    const isDuplicate = ownedCardIdsT.has(card.id) || seenInThisOpeningT.has(card.id);
    if (isDuplicate) {
      duplicateCardIdsT.push(card.id);
      coinsAwardedT += coinValuesT[card.rarity as Rarity] ?? 1;
    } else {
      entryInsertsT.push({ studentId: parsed.data.studentId, cardId: card.id });
      ownedCardIdsT.add(card.id);
      seenInThisOpeningT.add(card.id);
    }
  }

  const newCoinsT = (studentFull?.coinsCount ?? 0) + coinsAwardedT;

  await Promise.all([
    entryInsertsT.length > 0 ? db.insert(collectionEntriesTable).values(entryInsertsT) : Promise.resolve(),
    coinsAwardedT > 0 ? db.update(studentsTable).set({ coinsCount: newCoinsT }).where(eq(studentsTable.id, parsed.data.studentId)) : Promise.resolve(),
  ]);

  res.json({
    cards: drawnCardsT,
    duplicateCardIds: duplicateCardIdsT,
    coinsAwarded: coinsAwardedT,
    remainingCoins: newCoinsT,
  });
});

export default router;
