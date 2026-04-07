import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { studentsTable } from "./students.js";
import { packsTable } from "./packs.js";

export const packBankTable = pgTable("pack_bank", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  packId: integer("pack_id").notNull().references(() => packsTable.id, { onDelete: "cascade" }),
  count: integer("count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PackBankEntry = typeof packBankTable.$inferSelect;
