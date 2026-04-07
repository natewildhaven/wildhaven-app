import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import {
  db,
  mysteryBoxesTable,
  figurinesTable,
  figurineRaritiesTable,
  mysteryBoxRarityProbsTable,
  studentFigurinesTable,
  studentBoxInventoryTable,
  studentsTable,
} from "@workspace/db";

const router: IRouter = Router();

// ── Mystery Boxes ───────────────────────────────────────────────────────────

router.get("/mystery-boxes", async (_req, res): Promise<void> => {
  const boxes = await db.select().from(mysteryBoxesTable).orderBy(mysteryBoxesTable.id);
  res.json(boxes);
});

router.get("/mystery-boxes/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [box] = await db.select().from(mysteryBoxesTable).where(eq(mysteryBoxesTable.id, id));
  if (!box) { res.status(404).json({ error: "Mystery box not found" }); return; }
  res.json(box);
});

router.post("/mystery-boxes", async (req, res): Promise<void> => {
  const { name, description, coverImageUrl, availableInShop, coinPrice } = req.body as {
    name?: string; description?: string; coverImageUrl?: string; availableInShop?: boolean; coinPrice?: number;
  };
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
  const [box] = await db.insert(mysteryBoxesTable).values({
    name, description: description ?? null, coverImageUrl: coverImageUrl ?? null,
    availableInShop: availableInShop ?? false, coinPrice: coinPrice ?? 50,
  }).returning();
  res.status(201).json(box);
});

router.patch("/mystery-boxes/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { name, description, coverImageUrl, availableInShop, coinPrice } = req.body as {
    name?: string; description?: string; coverImageUrl?: string; availableInShop?: boolean; coinPrice?: number;
  };
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (coverImageUrl !== undefined) updates.coverImageUrl = coverImageUrl;
  if (availableInShop !== undefined) updates.availableInShop = availableInShop;
  if (coinPrice !== undefined) updates.coinPrice = coinPrice;
  const [box] = await db.update(mysteryBoxesTable).set(updates).where(eq(mysteryBoxesTable.id, id)).returning();
  if (!box) { res.status(404).json({ error: "Mystery box not found" }); return; }
  res.json(box);
});

router.delete("/mystery-boxes/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [box] = await db.delete(mysteryBoxesTable).where(eq(mysteryBoxesTable.id, id)).returning();
  if (!box) { res.status(404).json({ error: "Mystery box not found" }); return; }
  res.sendStatus(204);
});

// ── Rarity Probabilities per Box ────────────────────────────────────────────

router.get("/mystery-boxes/:id/rarity-probs", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const probs = await db
    .select({
      id: mysteryBoxRarityProbsTable.id,
      rarityId: mysteryBoxRarityProbsTable.rarityId,
      probability: mysteryBoxRarityProbsTable.probability,
      rarityName: figurineRaritiesTable.name,
      rarityColor: figurineRaritiesTable.color,
    })
    .from(mysteryBoxRarityProbsTable)
    .leftJoin(figurineRaritiesTable, eq(mysteryBoxRarityProbsTable.rarityId, figurineRaritiesTable.id))
    .where(eq(mysteryBoxRarityProbsTable.boxId, id));
  res.json(probs);
});

router.put("/mystery-boxes/:id/rarity-probs", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const probs = req.body as Array<{ rarityId: number; probability: number }>;
  if (!Array.isArray(probs)) { res.status(400).json({ error: "Body must be an array" }); return; }
  await db.delete(mysteryBoxRarityProbsTable).where(eq(mysteryBoxRarityProbsTable.boxId, id));
  if (probs.length > 0) {
    await db.insert(mysteryBoxRarityProbsTable).values(probs.map(p => ({ boxId: id, rarityId: p.rarityId, probability: p.probability })));
  }
  res.json({ ok: true });
});

// ── Figurines within a box ──────────────────────────────────────────────────

router.get("/mystery-boxes/:id/figurines", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const figurines = await db
    .select({
      id: figurinesTable.id,
      boxId: figurinesTable.boxId,
      rarityId: figurinesTable.rarityId,
      name: figurinesTable.name,
      imageUrl: figurinesTable.imageUrl,
      glowColor: figurinesTable.glowColor,
      figurineNumber: figurinesTable.figurineNumber,
      rarityName: figurineRaritiesTable.name,
      rarityColor: figurineRaritiesTable.color,
      rarityCoinValue: figurineRaritiesTable.coinValue,
    })
    .from(figurinesTable)
    .leftJoin(figurineRaritiesTable, eq(figurinesTable.rarityId, figurineRaritiesTable.id))
    .where(eq(figurinesTable.boxId, id))
    .orderBy(figurinesTable.figurineNumber);
  res.json(figurines);
});

router.post("/mystery-boxes/:id/figurines", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { name, imageUrl, glowColor, rarityId, figurineNumber } = req.body as {
    name?: string; imageUrl?: string; glowColor?: string; rarityId?: number; figurineNumber?: number;
  };
  if (!name || !rarityId) { res.status(400).json({ error: "name and rarityId are required" }); return; }
  const [box] = await db.select({ id: mysteryBoxesTable.id }).from(mysteryBoxesTable).where(eq(mysteryBoxesTable.id, id));
  if (!box) { res.status(404).json({ error: "Mystery box not found" }); return; }
  const [figurine] = await db.insert(figurinesTable).values({
    boxId: id, name, imageUrl: imageUrl ?? null, glowColor: glowColor ?? null, rarityId, figurineNumber: figurineNumber ?? 1,
  }).returning();
  res.status(201).json(figurine);
});

router.patch("/figurines/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { name, imageUrl, glowColor, rarityId, figurineNumber } = req.body as {
    name?: string; imageUrl?: string; glowColor?: string | null; rarityId?: number; figurineNumber?: number;
  };
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (imageUrl !== undefined) updates.imageUrl = imageUrl;
  if (glowColor !== undefined) updates.glowColor = glowColor;
  if (rarityId !== undefined) updates.rarityId = rarityId;
  if (figurineNumber !== undefined) updates.figurineNumber = figurineNumber;
  const [fig] = await db.update(figurinesTable).set(updates).where(eq(figurinesTable.id, id)).returning();
  if (!fig) { res.status(404).json({ error: "Figurine not found" }); return; }
  res.json(fig);
});

router.delete("/figurines/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [fig] = await db.delete(figurinesTable).where(eq(figurinesTable.id, id)).returning();
  if (!fig) { res.status(404).json({ error: "Figurine not found" }); return; }
  res.sendStatus(204);
});

// ── Student box inventory ───────────────────────────────────────────────────

router.get("/students/:studentId/box-inventory", async (req, res): Promise<void> => {
  const studentId = parseInt(req.params.studentId, 10);
  if (isNaN(studentId)) { res.status(400).json({ error: "Invalid studentId" }); return; }
  const rows = await db
    .select({
      boxId: studentBoxInventoryTable.boxId,
      count: studentBoxInventoryTable.count,
      boxName: mysteryBoxesTable.name,
      boxCoverImageUrl: mysteryBoxesTable.coverImageUrl,
    })
    .from(studentBoxInventoryTable)
    .leftJoin(mysteryBoxesTable, eq(studentBoxInventoryTable.boxId, mysteryBoxesTable.id))
    .where(eq(studentBoxInventoryTable.studentId, studentId));
  res.json(rows);
});

router.post("/students/:studentId/box-inventory/adjust", async (req, res): Promise<void> => {
  const studentId = parseInt(req.params.studentId, 10);
  if (isNaN(studentId)) { res.status(400).json({ error: "Invalid studentId" }); return; }
  const { boxId, delta } = req.body as { boxId?: number; delta?: number };
  if (typeof boxId !== "number" || typeof delta !== "number") { res.status(400).json({ error: "boxId and delta required" }); return; }

  const [existing] = await db
    .select()
    .from(studentBoxInventoryTable)
    .where(and(eq(studentBoxInventoryTable.studentId, studentId), eq(studentBoxInventoryTable.boxId, boxId)));

  const newCount = Math.max(0, (existing?.count ?? 0) + delta);
  if (existing) {
    await db.update(studentBoxInventoryTable).set({ count: newCount, updatedAt: new Date() })
      .where(and(eq(studentBoxInventoryTable.studentId, studentId), eq(studentBoxInventoryTable.boxId, boxId)));
  } else if (newCount > 0) {
    await db.insert(studentBoxInventoryTable).values({ studentId, boxId, count: newCount });
  }
  res.json({ ok: true, count: newCount });
});

// ── Open a mystery box ──────────────────────────────────────────────────────

router.post("/students/:studentId/box-inventory/open", async (req, res): Promise<void> => {
  const studentId = parseInt(req.params.studentId, 10);
  if (isNaN(studentId)) { res.status(400).json({ error: "Invalid studentId" }); return; }
  const { boxId } = req.body as { boxId?: number };
  if (typeof boxId !== "number") { res.status(400).json({ error: "boxId required" }); return; }

  const [inventoryRow] = await db
    .select()
    .from(studentBoxInventoryTable)
    .where(and(eq(studentBoxInventoryTable.studentId, studentId), eq(studentBoxInventoryTable.boxId, boxId)));

  if (!inventoryRow || inventoryRow.count < 1) {
    res.status(400).json({ error: "No boxes in inventory" }); return;
  }

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

  if (allFigurines.length === 0) {
    res.status(400).json({ error: "Box has no figurines" }); return;
  }

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

  const [student] = await db.select({ coinsCount: studentsTable.coinsCount }).from(studentsTable).where(eq(studentsTable.id, studentId));

  const existingOwned = await db.select({ figurineId: studentFigurinesTable.figurineId })
    .from(studentFigurinesTable)
    .where(and(eq(studentFigurinesTable.studentId, studentId), eq(studentFigurinesTable.figurineId, chosen.id)));

  const isDuplicate = existingOwned.length > 0;
  const coinValue = chosen.rarityCoinValue ?? 5;
  const coinsAwarded = isDuplicate ? coinValue : 0;
  const newCoins = (student?.coinsCount ?? 0) + coinsAwarded;

  await Promise.all([
    !isDuplicate
      ? db.insert(studentFigurinesTable).values({ studentId, figurineId: chosen.id })
      : Promise.resolve(),
    coinsAwarded > 0
      ? db.update(studentsTable).set({ coinsCount: newCoins }).where(eq(studentsTable.id, studentId))
      : Promise.resolve(),
    db.update(studentBoxInventoryTable).set({ count: inventoryRow.count - 1, updatedAt: new Date() })
      .where(and(eq(studentBoxInventoryTable.studentId, studentId), eq(studentBoxInventoryTable.boxId, boxId))),
  ]);

  res.json({ figurine: chosen, isDuplicate, coinsAwarded, remainingCoins: newCoins });
});

// ── Student figurine collection ─────────────────────────────────────────────

router.get("/students/:studentId/figurines", async (req, res): Promise<void> => {
  const studentId = parseInt(req.params.studentId, 10);
  if (isNaN(studentId)) { res.status(400).json({ error: "Invalid studentId" }); return; }
  const rows = await db
    .select({
      figurineId: studentFigurinesTable.figurineId,
      awardedAt: studentFigurinesTable.awardedAt,
      name: figurinesTable.name,
      imageUrl: figurinesTable.imageUrl,
      glowColor: figurinesTable.glowColor,
      figurineNumber: figurinesTable.figurineNumber,
      boxId: figurinesTable.boxId,
      rarityId: figurinesTable.rarityId,
      rarityName: figurineRaritiesTable.name,
      rarityColor: figurineRaritiesTable.color,
    })
    .from(studentFigurinesTable)
    .leftJoin(figurinesTable, eq(studentFigurinesTable.figurineId, figurinesTable.id))
    .leftJoin(figurineRaritiesTable, eq(figurinesTable.rarityId, figurineRaritiesTable.id))
    .where(eq(studentFigurinesTable.studentId, studentId));
  const distinctByFigurine = Object.values(
    Object.fromEntries(rows.map(r => [r.figurineId, r]))
  );
  res.json(distinctByFigurine);
});

// ── Student figurine collection count per box ───────────────────────────────

router.get("/students/:studentId/figurines/counts", async (req, res): Promise<void> => {
  const studentId = parseInt(req.params.studentId, 10);
  if (isNaN(studentId)) { res.status(400).json({ error: "Invalid studentId" }); return; }
  const rows = await db
    .select({ figurineId: studentFigurinesTable.figurineId, boxId: figurinesTable.boxId })
    .from(studentFigurinesTable)
    .leftJoin(figurinesTable, eq(studentFigurinesTable.figurineId, figurinesTable.id))
    .where(eq(studentFigurinesTable.studentId, studentId));
  const byBox: Record<number, Set<number>> = {};
  for (const r of rows) {
    if (r.boxId != null) {
      if (!byBox[r.boxId]) byBox[r.boxId] = new Set();
      byBox[r.boxId].add(r.figurineId);
    }
  }
  const result: Record<number, number> = {};
  for (const [boxId, set] of Object.entries(byBox)) result[Number(boxId)] = set.size;
  res.json(result);
});

export default router;
