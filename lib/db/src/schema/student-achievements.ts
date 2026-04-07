import { pgTable, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { studentsTable } from "./students.js";
import { achievementsTable } from "./achievements.js";

export const studentAchievementsTable = pgTable("student_achievements", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  achievementId: integer("achievement_id").notNull().references(() => achievementsTable.id, { onDelete: "cascade" }),
  earnedAt: timestamp("earned_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.studentId, t.achievementId)]);

export type StudentAchievement = typeof studentAchievementsTable.$inferSelect;
