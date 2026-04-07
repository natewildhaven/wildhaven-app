import { pgTable, serial, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const backupsTable = pgTable("backups", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  snapshot: jsonb("snapshot").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Backup = typeof backupsTable.$inferSelect;
