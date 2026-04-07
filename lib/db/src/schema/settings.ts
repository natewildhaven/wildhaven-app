import { pgTable, text, serial } from "drizzle-orm/pg-core";

export const settingsTable = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value"),
});
