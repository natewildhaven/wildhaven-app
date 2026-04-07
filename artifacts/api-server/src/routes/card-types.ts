import { Router } from "express";
import {
  db,
  eq,
  cardTypesTable,
} from "../../../../lib/db/src/index.js";

const router = Router();

router.get("/card-types", async (_req: any, res: any): Promise<void> => {
  const types = await db.select().from(cardTypesTable).orderBy(cardTypesTable.sortOrder);
  res.json(types);
});

router.post("/card-types", async (req: any, res: any): Promise<void> => {
  const { name, color, sortOrder } = req.body as { name?: string; color?: string; sortOrder?: number };
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
  try {
    const [type] = await db.insert(cardTypesTable).values({
      name,
      color: color ?? "#6b7280",
      sortOrder: sortOrder ?? 0,
    }).returning();
    res.status(201).json(type);
  } catch {
    res.status(400).json({ error: "A card type with that name already exists" });
  }
});

router.patch("/card-types/:id", async (req: any, res: any): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { name, color, sortOrder } = req.body as { name?: string; color?: string; sortOrder?: number };
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (color !== undefined) updates.color = color;
  if (sortOrder !== undefined) updates.sortOrder = sortOrder;
  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "No fields to update" }); return; }
  try {
    const [updated] = await db.update(cardTypesTable).set(updates).where(eq(cardTypesTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json(updated);
  } catch {
    res.status(400).json({ error: "A card type with that name already exists" });
  }
});

router.delete("/card-types/:id", async (req: any, res: any): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(cardTypesTable).where(eq(cardTypesTable.id, id));
  res.status(204).send();
});

export default router;
