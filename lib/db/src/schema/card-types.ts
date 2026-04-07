import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cardTypesTable = pgTable("card_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("#6b7280"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertCardTypeSchema = createInsertSchema(cardTypesTable).omit({ id: true });
export type InsertCardType = z.infer<typeof insertCardTypeSchema>;
export type CardType = typeof cardTypesTable.$inferSelect;
