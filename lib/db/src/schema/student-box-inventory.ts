import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { studentsTable } from "./students";
import { mysteryBoxesTable } from "./mystery-boxes";

export const studentBoxInventoryTable = pgTable("student_box_inventory", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  boxId: integer("box_id").notNull().references(() => mysteryBoxesTable.id, { onDelete: "cascade" }),
  count: integer("count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type StudentBoxInventory = typeof studentBoxInventoryTable.$inferSelect;
