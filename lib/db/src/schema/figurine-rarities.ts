import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const figurineRaritiesTable = pgTable("figurine_rarities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("#6b7280"),
  coinValue: integer("coin_value").notNull().default(5),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertFigurineRaritySchema = createInsertSchema(figurineRaritiesTable).omit({ id: true });
export type InsertFigurineRarity = z.infer<typeof insertFigurineRaritySchema>;
export type FigurineRarity = typeof figurineRaritiesTable.$inferSelect;
