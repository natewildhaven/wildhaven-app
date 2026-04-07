import { Router } from "express";
import {
  db,
  eq,
  and,
  inArray,
  asc,
  achievementsTable,
  studentAchievementsTable,
  collectionEntriesTable,
  cardsTable,
} from "@workspace/db";

const router = Router();

// ── Rule types ──────────────────────────────────────────────────────────────

type Condition =
  | { type: "pack_complete"; packId: number }
  | { type: "rarity_count"; rarity: string; count: number }
  | { type: "has_card"; cardId: number }
  | { type: "has_any_cards"; cardIds: number[] }
  | { type: "has_all_cards"; cardIds: number[] }
  | { type: "total_cards"; count: number }
  | { type: "type_complete"; typeName: string }
  | { type: "type_count"; typeName: string; count: number };

interface AchievementRule {
  operator: "AND" | "OR";
  conditions: Condition[];
}

// ── Evaluation ───────────────────────────────────────────────────────────────

async function evaluateCondition(
  condition: Condition,
  studentCardIds: Set<number>,
  allCards: { id: number; packId: number; rarity: string; tags: string[] | null }[]
): Promise<boolean> {
  switch (condition.type) {
    case "pack_complete": {
      const packCards = allCards.filter(c => c.packId === condition.packId);
      if (packCards.length === 0) return false;
      return packCards.every(c => studentCardIds.has(c.id));
    }
    case "rarity_count": {
      const rarityCards = allCards.filter(c => c.rarity === condition.rarity && studentCardIds.has(c.id));
      return rarityCards.length >= condition.count;
    }
    case "has_card":
      return studentCardIds.has(condition.cardId);
    case "has_any_cards":
      return condition.cardIds.some(id => studentCardIds.has(id));
    case "has_all_cards":
      return condition.cardIds.every(id => studentCardIds.has(id));
    case "total_cards":
      return studentCardIds.size >= condition.count;
    case "type_complete": {
      const typeCards = allCards.filter(c => Array.isArray(c.tags) && c.tags.includes(condition.typeName));
      if (typeCards.length === 0) return false;
      return typeCards.every(c => studentCardIds.has(c.id));
    }
    case "type_count": {
      const owned = allCards.filter(c => Array.isArray(c.tags) && c.tags.includes(condition.typeName) && studentCardIds.has(c.id));
      return owned.length >= condition.count;
    }
    default:
      return false;
  }
}

async function evaluateAchievement(
  rule: AchievementRule,
  studentCardIds: Set<number>,
  allCards: { id: number; packId: number; rarity: string; tags: string[] | null }[]
): Promise<boolean> {
  if (!rule.conditions || rule.conditions.length === 0) return false;
  const results = await Promise.all(
    rule.conditions.map(c => evaluateCondition(c, studentCardIds, allCards))
  );
  return rule.operator === "AND" ? results.every(Boolean) : results.some(Boolean);
}

// ── CRUD routes ───────────────────────────────────────────────────────────────

router.get("/achievements", async (_req, res): Promise<void> => {
  const rows = await db.select().from(achievementsTable)
    .orderBy(asc(achievementsTable.displayOrder), asc(achievementsTable.id));
  res.json(rows);
});

router.post("/achievements", async (req, res): Promise<void> => {
  const { name, description, imageUrl, rules } = req.body;
  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const [row] = await db.insert(achievementsTable).values({ name, description: description ?? null, imageUrl: imageUrl ?? null, rules: rules ?? { operator: "AND", conditions: [] } }).returning();
  res.status(201).json(row);
});

router.put("/achievements/:id", async (req, res): Promise<void> => {
  const id = Number(req.params["id"]);
  if (!id) { res.status(400).json({ error: "invalid id" }); return; }
  const { name, description, imageUrl, rules, displayOrder } = req.body;
  const updates: Partial<{ name: string; description: string | null; imageUrl: string | null; rules: unknown; displayOrder: number }> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (imageUrl !== undefined) updates.imageUrl = imageUrl;
  if (rules !== undefined) updates.rules = rules;
  if (displayOrder !== undefined) updates.displayOrder = displayOrder;
  const [row] = await db.update(achievementsTable).set(updates).where(eq(achievementsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "not found" }); return; }
  res.json(row);
});

router.post("/achievements/reorder", async (req, res): Promise<void> => {
  const items: { id: number; displayOrder: number }[] = req.body;
  if (!Array.isArray(items)) { res.status(400).json({ error: "expected array" }); return; }
  await Promise.all(
    items.map(({ id, displayOrder }) =>
      db.update(achievementsTable).set({ displayOrder }).where(eq(achievementsTable.id, id))
    )
  );
  res.json({ ok: true });
});

router.delete("/achievements/:id", async (req, res): Promise<void> => {
  const id = Number(req.params["id"]);
  if (!id) { res.status(400).json({ error: "invalid id" }); return; }
  await db.delete(achievementsTable).where(eq(achievementsTable.id, id));
  res.json({ ok: true });
});

// ── Student achievement routes ────────────────────────────────────────────────

// Get earned achievements for a student
router.get("/students/:studentId/achievements", async (req, res): Promise<void> => {
  const studentId = Number(req.params["studentId"]);
  if (!studentId) { res.status(400).json({ error: "invalid studentId" }); return; }
  const earned = await db
    .select({ achievementId: studentAchievementsTable.achievementId, earnedAt: studentAchievementsTable.earnedAt })
    .from(studentAchievementsTable)
    .where(eq(studentAchievementsTable.studentId, studentId));
  res.json(earned);
});

// Check + auto-award achievements for a student — call this after pack/box open
router.post("/students/:studentId/achievements/check", async (req, res): Promise<void> => {
  const studentId = Number(req.params["studentId"]);
  if (!studentId) { res.status(400).json({ error: "invalid studentId" }); return; }

  const [achievements, entries, allCards, alreadyEarned] = await Promise.all([
    db.select().from(achievementsTable),
    db.select({ cardId: collectionEntriesTable.cardId }).from(collectionEntriesTable).where(eq(collectionEntriesTable.studentId, studentId)),
    db.select({ id: cardsTable.id, packId: cardsTable.packId, rarity: cardsTable.rarity, tags: cardsTable.tags }).from(cardsTable),
    db.select({ achievementId: studentAchievementsTable.achievementId }).from(studentAchievementsTable).where(eq(studentAchievementsTable.studentId, studentId)),
  ]);

  const studentCardIds = new Set(entries.map(e => e.cardId));
  const alreadyEarnedIds = new Set(alreadyEarned.map(e => e.achievementId));

  const newlyEarned: number[] = [];

  for (const achievement of achievements) {
    if (alreadyEarnedIds.has(achievement.id)) continue;
    const rule = achievement.rules as AchievementRule;
    const earned = await evaluateAchievement(rule, studentCardIds, allCards);
    if (earned) {
      await db.insert(studentAchievementsTable).values({ studentId, achievementId: achievement.id }).onConflictDoNothing();
      newlyEarned.push(achievement.id);
    }
  }

  const newAchievements = newlyEarned.length > 0
    ? await db.select().from(achievementsTable).where(inArray(achievementsTable.id, newlyEarned))
    : [];

  res.json({ newlyEarned: newAchievements });
});

export default router;
