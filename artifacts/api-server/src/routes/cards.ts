import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db, cardsTable, type Rarity } from "@workspace/db";
import {
  CreateCardBody,
  UpdateCardBody,
  GetCardParams,
  UpdateCardParams,
  DeleteCardParams,
  ListCardsQueryParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/cards", async (req, res): Promise<void> => {
  const query = ListCardsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const cardNumSort = sql`CASE WHEN ${cardsTable.cardNumber} ~ '^[0-9]+$' THEN 0 ELSE 1 END`,
    cardNumVal = sql`CASE WHEN ${cardsTable.cardNumber} ~ '^[0-9]+$' THEN LPAD(${cardsTable.cardNumber}, 20, '0') ELSE ${cardsTable.cardNumber} END`;
  let cards;
  if (query.data.packId) {
    cards = await db
      .select()
      .from(cardsTable)
      .where(eq(cardsTable.packId, query.data.packId))
      .orderBy(cardNumSort, cardNumVal);
  } else {
    cards = await db.select().from(cardsTable).orderBy(cardsTable.packId, cardNumSort, cardNumVal);
  }

  res.json(cards);
});

router.post("/cards", async (req, res): Promise<void> => {
  const parsed = CreateCardBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [card] = await db.insert(cardsTable).values({
    ...parsed.data,
    rarity: parsed.data.rarity as Rarity,
  }).returning();
  res.status(201).json(card);
});

router.get("/cards/:cardId", async (req, res): Promise<void> => {
  const params = GetCardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [card] = await db
    .select()
    .from(cardsTable)
    .where(eq(cardsTable.id, params.data.cardId));

  if (!card) {
    res.status(404).json({ error: "Card not found" });
    return;
  }

  res.json(card);
});

router.patch("/cards/:cardId", async (req, res): Promise<void> => {
  const params = UpdateCardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCardBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { rarity: rawRarity, ...restData } = parsed.data;
  const [card] = await db
    .update(cardsTable)
    .set({
      ...restData,
      ...(rawRarity !== undefined && { rarity: rawRarity as Rarity }),
    })
    .where(eq(cardsTable.id, params.data.cardId))
    .returning();

  if (!card) {
    res.status(404).json({ error: "Card not found" });
    return;
  }

  res.json(card);
});

router.delete("/cards/:cardId", async (req, res): Promise<void> => {
  const params = DeleteCardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [card] = await db
    .delete(cardsTable)
    .where(eq(cardsTable.id, params.data.cardId))
    .returning();

  if (!card) {
    res.status(404).json({ error: "Card not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
