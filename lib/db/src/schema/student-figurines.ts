import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { studentsTable } from "./students";
import { figurinesTable } from "./figurines";

export const studentFigurinesTable = pgTable("student_figurines", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  figurineId: integer("figurine_id").notNull().references(() => figurinesTable.id, { onDelete: "cascade" }),
  awardedAt: timestamp("awarded_at", { withTimezone: true }).notNull().defaultNow(),
});

export type StudentFigurine = typeof studentFigurinesTable.$inferSelect;
