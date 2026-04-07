import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { mysteryBoxesTable } from "./mystery-boxes";
import { figurineRaritiesTable } from "./figurine-rarities.js";

export const figurinesTable = pgTable("figurines", {
  id: serial("id").primaryKey(),
  boxId: integer("box_id").notNull().references(() => mysteryBoxesTable.id, { onDelete: "cascade" }),
  rarityId: integer("rarity_id").notNull().references(() => figurineRaritiesTable.id),
  name: text("name").notNull(),
  imageUrl: text("image_url"),
  glowColor: text("glow_color"),
  figurineNumber: integer("figurine_number").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFigurineSchema = createInsertSchema(figurinesTable).omit({ id: true, createdAt: true });
export type InsertFigurine = z.infer<typeof insertFigurineSchema>;
export type Figurine = typeof figurinesTable.$inferSelect;
