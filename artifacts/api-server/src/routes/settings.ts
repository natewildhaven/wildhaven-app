import { Router } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

const DEFAULT_TEACHER_PASSWORD = "wildhaven123";

async function getTeacherPassword(): Promise<string> {
  const rows = await db.select().from(settingsTable).where(eq(settingsTable.key, "teacher_password"));
  return rows[0]?.value ?? DEFAULT_TEACHER_PASSWORD;
}

const SETTING_KEYS = [
  "background_image_url",
  "title_image_url",
  "pack_open_sound_url",
  "card_flip_sound_url",
  "epic_flip_sound_url",
  "mythic_flip_sound_url",
  "legendary_flip_sound_url",
  "box_open_sound_url",
  "figurine_reveal_sound_url",
  "coin_value_common",
  "coin_value_rare",
  "coin_value_epic",
  "coin_value_mythic",
  "coin_value_legendary",
] as const;
type SettingKey = (typeof SETTING_KEYS)[number];

const COIN_DEFAULTS: Record<string, number> = {
  coin_value_common: 1,
  coin_value_rare: 2,
  coin_value_epic: 4,
  coin_value_mythic: 5,
  coin_value_legendary: 10,
};

router.get("/settings", async (_req, res): Promise<void> => {
  try {
    const rows = await db.select().from(settingsTable);
    const map: Record<string, string | null> = {};
    for (const row of rows) map[row.key] = row.value ?? null;

    res.json({
      backgroundImageUrl: map["background_image_url"] ?? null,
      titleImageUrl: map["title_image_url"] ?? null,
      packOpenSoundUrl: map["pack_open_sound_url"] ?? null,
      cardFlipSoundUrl: map["card_flip_sound_url"] ?? null,
      epicFlipSoundUrl: map["epic_flip_sound_url"] ?? null,
      mythicFlipSoundUrl: map["mythic_flip_sound_url"] ?? null,
      legendaryFlipSoundUrl: map["legendary_flip_sound_url"] ?? null,
      boxOpenSoundUrl: map["box_open_sound_url"] ?? null,
      figurineRevealSoundUrl: map["figurine_reveal_sound_url"] ?? null,
      coinValueCommon: map["coin_value_common"] != null ? Number(map["coin_value_common"]) : COIN_DEFAULTS.coin_value_common,
      coinValueRare: map["coin_value_rare"] != null ? Number(map["coin_value_rare"]) : COIN_DEFAULTS.coin_value_rare,
      coinValueEpic: map["coin_value_epic"] != null ? Number(map["coin_value_epic"]) : COIN_DEFAULTS.coin_value_epic,
      coinValueMythic: map["coin_value_mythic"] != null ? Number(map["coin_value_mythic"]) : COIN_DEFAULTS.coin_value_mythic,
      coinValueLegendary: map["coin_value_legendary"] != null ? Number(map["coin_value_legendary"]) : COIN_DEFAULTS.coin_value_legendary,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

router.put("/settings", async (req, res): Promise<void> => {
  const { key, value } = req.body as { key: SettingKey; value: string | null };
  if (!SETTING_KEYS.includes(key)) {
    res.status(400).json({ error: "Invalid setting key" });
    return;
  }
  try {
    const existing = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
    if (existing.length > 0) {
      await db.update(settingsTable).set({ value: value ?? null }).where(eq(settingsTable.key, key));
    } else {
      await db.insert(settingsTable).values({ key, value: value ?? null });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update setting" });
  }
});

/* ── Teacher order ── */
router.get("/teacher-order", async (_req, res): Promise<void> => {
  try {
    const rows = await db.select().from(settingsTable).where(eq(settingsTable.key, "teacher_order"));
    const order: string[] = rows[0]?.value ? JSON.parse(rows[0].value) : [];
    res.json(order);
  } catch {
    res.json([]);
  }
});

router.post("/teacher-order", async (req, res): Promise<void> => {
  const { order } = req.body as { order?: string[] };
  if (!Array.isArray(order)) { res.status(400).json({ error: "order array required" }); return; }
  try {
    const value = JSON.stringify(order);
    const existing = await db.select().from(settingsTable).where(eq(settingsTable.key, "teacher_order"));
    if (existing.length > 0) {
      await db.update(settingsTable).set({ value }).where(eq(settingsTable.key, "teacher_order"));
    } else {
      await db.insert(settingsTable).values({ key: "teacher_order", value });
    }
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to save teacher order" });
  }
});

/* ── Teacher auth: verify password ── */
router.post("/auth/teacher/verify", async (req, res): Promise<void> => {
  const { password } = req.body as { password?: string };
  if (!password) { res.status(400).json({ ok: false, error: "Password required" }); return; }
  try {
    const stored = await getTeacherPassword();
    res.json({ ok: password === stored });
  } catch {
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

/* ── Teacher auth: change password ── */
router.post("/auth/teacher/change-password", async (req, res): Promise<void> => {
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
  if (!currentPassword || !newPassword) { res.status(400).json({ error: "Both passwords required" }); return; }
  if (newPassword.length < 4) { res.status(400).json({ error: "New password must be at least 4 characters" }); return; }
  try {
    const stored = await getTeacherPassword();
    if (currentPassword !== stored) { res.status(401).json({ error: "Current password is incorrect" }); return; }
    const existing = await db.select().from(settingsTable).where(eq(settingsTable.key, "teacher_password"));
    if (existing.length > 0) {
      await db.update(settingsTable).set({ value: newPassword }).where(eq(settingsTable.key, "teacher_password"));
    } else {
      await db.insert(settingsTable).values({ key: "teacher_password", value: newPassword });
    }
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
