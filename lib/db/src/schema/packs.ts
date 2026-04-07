import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const packsTable = pgTable("packs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  coverImageUrl: text("cover_image_url"),
  cardBackImageUrl: text("card_back_image_url"),
  openVideoUrl: text("open_video_url"),
  commonChance: integer("common_chance").notNull().default(50),
  rareChance: integer("rare_chance").notNull().default(30),
  epicChance: integer("epic_chance").notNull().default(15),
  mythicChance: integer("mythic_chance").notNull().default(4),
  legendaryChance: integer("legendary_chance").notNull().default(1),
  cardsPerPack: integer("cards_per_pack").notNull().default(3),
  color: text("color").default("#10b981"),
  available: boolean("available").notNull().default(true),
  availableInShop: boolean("available_in_shop").notNull().default(false),
  hideMasteryUntilOwned: boolean("hide_mastery_until_owned").notNull().default(false),
  customRarityChances: jsonb("custom_rarity_chances").$type<Record<string, number>>().default({}),
  coinPrice: integer("coin_price").notNull().default(20),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPackSchema = createInsertSchema(packsTable).omit({ id: true, createdAt: true });
export type InsertPack = z.infer<typeof insertPackSchema>;
export type Pack = typeof packsTable.$inferSelect;
