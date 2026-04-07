import { pgTable, text, serial, timestamp, integer, primaryKey } from "drizzle-orm/pg-core";
import { studentsTable } from "./students";

export const classesTable = pgTable("classes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  teacher: text("teacher"),
  color: text("color").default("#6366f1"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const studentClassesTable = pgTable("student_classes", {
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  classId: integer("class_id").notNull().references(() => classesTable.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.studentId, t.classId] })]);

export type Class = typeof classesTable.$inferSelect;
export type StudentClass = typeof studentClassesTable.$inferSelect;
