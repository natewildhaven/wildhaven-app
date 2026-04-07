import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const mysteryBoxesTable = pgTable("mystery_boxes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  coverImageUrl: text("cover_image_url"),
  availableInShop: boolean("available_in_shop").notNull().default(false),
  coinPrice: integer("coin_price").notNull().default(50),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMysteryBoxSchema = createInsertSchema(mysteryBoxesTable).omit({ id: true, createdAt: true });
export type InsertMysteryBox = z.infer<typeof insertMysteryBoxSchema>;
export type MysteryBox = typeof mysteryBoxesTable.$inferSelect;
