import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { packsTable } from "./packs";

export const rarityValues = ["Common", "Rare", "Epic", "Mythic", "Legendary"] as const;
export type Rarity = typeof rarityValues[number];

export const cardsTable = pgTable("cards", {
  id: serial("id").primaryKey(),
  packId: integer("pack_id").notNull().references(() => packsTable.id, { onDelete: "cascade" }),
  cardNumber: text("card_number").notNull(),
  name: text("name").notNull(),
  imageUrl: text("image_url"),
  rarity: text("rarity").notNull().$type<Rarity>(),
  tags: jsonb("tags").$type<string[]>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCardSchema = createInsertSchema(cardsTable).omit({ id: true, createdAt: true });
export type InsertCard = z.infer<typeof insertCardSchema>;
export type Card = typeof cardsTable.$inferSelect;
