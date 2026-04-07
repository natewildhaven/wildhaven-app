import { pgTable, text, serial, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export interface CardRarityEffects {
  surface: string[];
  border: string[];
  glow: string[];
}

export const DEFAULT_CARD_RARITIES: { name: string; color: string; icon: string; coinValue: number; sortOrder: number; effects: CardRarityEffects }[] = [
  { name: "Common",    color: "#22c55e", icon: "⚪", coinValue: 1,  sortOrder: 0, effects: { surface: [],             border: [],           glow: []                          } },
  { name: "Rare",      color: "#3b82f6", icon: "🔵", coinValue: 2,  sortOrder: 1, effects: { surface: [],             border: [],           glow: []                          } },
  { name: "Epic",      color: "#a855f7", icon: "💜", coinValue: 4,  sortOrder: 2, effects: { surface: ["sparkle"],    border: [],           glow: ["bright-shadow"]           } },
  { name: "Mythic",    color: "#64748b", icon: "🌟", coinValue: 5,  sortOrder: 3, effects: { surface: ["ember"],      border: [],           glow: ["ember-glow"]              } },
  { name: "Legendary", color: "#eab308", icon: "👑", coinValue: 10, sortOrder: 4, effects: { surface: [],             border: ["rainbow"],  glow: []                          } },
];

export const cardRaritiesTable = pgTable("card_rarities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("#6b7280"),
  icon: text("icon").notNull().default("⭐"),
  iconUrl: text("icon_url"),
  soundUrl: text("sound_url"),
  coinValue: integer("coin_value").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
  effects: jsonb("effects").$type<CardRarityEffects>().notNull().default({ surface: [], border: [], glow: [] }),
});

export const insertCardRaritySchema = createInsertSchema(cardRaritiesTable).omit({ id: true });
export type InsertCardRarity = z.infer<typeof insertCardRaritySchema>;
export type CardRarity = typeof cardRaritiesTable.$inferSelect;
