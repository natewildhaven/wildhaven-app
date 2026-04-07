import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, cardRaritiesTable, DEFAULT_CARD_RARITIES } from "@workspace/db";

const router = Router();

/** Convert any old-format effects object to the new { surface, border, glow, confetti } format */
function migrateEffects(raw: unknown): { surface: string[]; border: string[]; glow: string[]; confetti: string[] } {
  if (!raw || typeof raw !== "object") return { surface: [], border: [], glow: [], confetti: [] };
  const eff = raw as Record<string, unknown>;
  // Already new format
  if (Array.isArray(eff.surface)) {
    return {
      surface: (eff.surface as string[]) ?? [],
      border: (eff.border as string[]) ?? [],
      glow: (eff.glow as string[]) ?? [],
      confetti: (eff.confetti as string[]) ?? [],
    };
  }
  // Old format → convert
  const surface: string[] = [];
  const border: string[] = [];
  const glow: string[] = [];
  const confetti: string[] = [];
  if (eff.particles === "sparkle") surface.push("sparkle");
  if (eff.particles === "ember") surface.push("ember");
  if (eff.prismaticBorder === true) border.push("rainbow");
  if (eff.emberGlow === true) glow.push("ember-glow");
  if (eff.brightShadow === true) glow.push("bright-shadow");
  if (eff.confetti === "gold") confetti.push("gold");
  if (eff.confetti === "purple") confetti.push("purple");
  return { surface, border, glow, confetti };
}

export async function ensureCardRarityDefaults() {
  const existing = await db.select({ id: cardRaritiesTable.id }).from(cardRaritiesTable).limit(1);
  if (existing.length === 0) {
    await db.insert(cardRaritiesTable).values(DEFAULT_CARD_RARITIES);
    return;
  }
  // Migrate any old-format effects + fix Common colour
  const rows = await db.select({ id: cardRaritiesTable.id, name: cardRaritiesTable.name, color: cardRaritiesTable.color, effects: cardRaritiesTable.effects }).from(cardRaritiesTable);
  for (const row of rows) {
    const updates: Record<string, unknown> = {};
    const migrated = migrateEffects(row.effects);
    const wasOldFormat = !Array.isArray((row.effects as unknown as Record<string, unknown>)?.surface);
    if (wasOldFormat) updates.effects = migrated;
    // Fix Common colour from gray to green
    if (row.name === "Common" && (row.color === "#6b7280" || row.color === "#4b5563")) {
      updates.color = "#22c55e";
    }
    if (Object.keys(updates).length > 0) {
      await db.update(cardRaritiesTable).set(updates).where(eq(cardRaritiesTable.id, row.id));
    }
  }
}

/** Read coin values from the card_rarities table (used by packs/shop/admin routes) */
export async function getCardRarityCoinValues(): Promise<Record<string, number>> {
  await ensureCardRarityDefaults();
  const rows = await db.select({ name: cardRaritiesTable.name, coinValue: cardRaritiesTable.coinValue }).from(cardRaritiesTable);
  const map = Object.fromEntries(rows.map(r => [r.name, r.coinValue]));
  return {
    Common:    map["Common"]    ?? 1,
    Rare:      map["Rare"]      ?? 2,
    Epic:      map["Epic"]      ?? 4,
    Mythic:    map["Mythic"]    ?? 5,
    Legendary: map["Legendary"] ?? 10,
  };
}

router.get("/card-rarities", async (_req, res): Promise<void> => {
  await ensureCardRarityDefaults();
  const rarities = await db.select().from(cardRaritiesTable).orderBy(cardRaritiesTable.sortOrder);
  res.json(rarities);
});

router.post("/card-rarities", async (req, res): Promise<void> => {
  const { name, color, icon, iconUrl, coinValue, sortOrder, effects } = req.body as {
    name?: string; color?: string; icon?: string; iconUrl?: string; coinValue?: number; sortOrder?: number; effects?: object;
  };
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
  try {
    const [rarity] = await db.insert(cardRaritiesTable).values({
      name,
      color: color ?? "#6b7280",
      icon: icon ?? "⭐",
      iconUrl: iconUrl ?? null,
      coinValue: coinValue ?? 1,
      sortOrder: sortOrder ?? 0,
      effects: migrateEffects(effects ?? {}),
    }).returning();
    res.status(201).json(rarity);
  } catch {
    res.status(400).json({ error: "A rarity with that name already exists" });
  }
});

router.patch("/card-rarities/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { name, color, icon, iconUrl, soundUrl, coinValue, sortOrder, effects } = req.body as {
    name?: string; color?: string; icon?: string; iconUrl?: string | null; soundUrl?: string | null; coinValue?: number; sortOrder?: number; effects?: object;
  };
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (color !== undefined) updates.color = color;
  if (icon !== undefined) updates.icon = icon;
  if (iconUrl !== undefined) updates.iconUrl = iconUrl;
  if (soundUrl !== undefined) updates.soundUrl = soundUrl;
  if (coinValue !== undefined) updates.coinValue = coinValue;
  if (sortOrder !== undefined) updates.sortOrder = sortOrder;
  if (effects !== undefined) updates.effects = migrateEffects(effects);
  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "No fields to update" }); return; }
  try {
    const [rarity] = await db.update(cardRaritiesTable).set(updates).where(eq(cardRaritiesTable.id, id)).returning();
    if (!rarity) { res.status(404).json({ error: "Not found" }); return; }
    res.json(rarity);
  } catch {
    res.status(400).json({ error: "A rarity with that name already exists" });
  }
});

router.delete("/card-rarities/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [rarity] = await db.delete(cardRaritiesTable).where(eq(cardRaritiesTable.id, id)).returning();
  if (!rarity) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

router.post("/card-rarities/restore-defaults", async (_req, res): Promise<void> => {
  await db.delete(cardRaritiesTable);
  await db.insert(cardRaritiesTable).values(DEFAULT_CARD_RARITIES);
  const rarities = await db.select().from(cardRaritiesTable).orderBy(cardRaritiesTable.sortOrder);
  res.json(rarities);
});

export default router;
