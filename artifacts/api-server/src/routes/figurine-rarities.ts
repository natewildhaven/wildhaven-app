import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, figurineRaritiesTable } from "@workspace/db";

const router = Router();

router.get("/figurine-rarities", async (_req, res): Promise<void> => {
  const rarities = await db.select().from(figurineRaritiesTable).orderBy(figurineRaritiesTable.sortOrder, figurineRaritiesTable.id);
  res.json(rarities);
});

router.post("/figurine-rarities", async (req, res): Promise<void> => {
  const { name, color, coinValue, sortOrder } = req.body as {
    name?: string; color?: string; coinValue?: number; sortOrder?: number;
  };
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
  const [rarity] = await db.insert(figurineRaritiesTable).values({
    name, color: color ?? "#6b7280", coinValue: coinValue ?? 5, sortOrder: sortOrder ?? 0,
  }).returning();
  res.status(201).json(rarity);
});

router.patch("/figurine-rarities/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { name, color, coinValue, sortOrder } = req.body as {
    name?: string; color?: string; coinValue?: number; sortOrder?: number;
  };
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (color !== undefined) updates.color = color;
  if (coinValue !== undefined) updates.coinValue = coinValue;
  if (sortOrder !== undefined) updates.sortOrder = sortOrder;
  const [rarity] = await db.update(figurineRaritiesTable).set(updates).where(eq(figurineRaritiesTable.id, id)).returning();
  if (!rarity) { res.status(404).json({ error: "Rarity not found" }); return; }
  res.json(rarity);
});

router.delete("/figurine-rarities/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [rarity] = await db.delete(figurineRaritiesTable).where(eq(figurineRaritiesTable.id, id)).returning();
  if (!rarity) { res.status(404).json({ error: "Rarity not found" }); return; }
  res.sendStatus(204);
});

export default router;
