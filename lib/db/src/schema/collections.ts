import { pgTable, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students.js";
import { cardsTable } from "./cards.js";

export const collectionEntriesTable = pgTable("collection_entries", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  cardId: integer("card_id").notNull().references(() => cardsTable.id, { onDelete: "cascade" }),
  awardedAt: timestamp("awarded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCollectionEntrySchema = createInsertSchema(collectionEntriesTable).omit({ id: true, awardedAt: true });
export type InsertCollectionEntry = z.infer<typeof insertCollectionEntrySchema>;
export type CollectionEntry = typeof collectionEntriesTable.$inferSelect;
