import { pgTable, serial, integer } from "drizzle-orm/pg-core";
import { mysteryBoxesTable } from "./mystery-boxes.js";
import { figurineRaritiesTable } from "./figurine-rarities.js";

export const mysteryBoxRarityProbsTable = pgTable("mystery_box_rarity_probs", {
  id: serial("id").primaryKey(),
  boxId: integer("box_id").notNull().references(() => mysteryBoxesTable.id, { onDelete: "cascade" }),
  rarityId: integer("rarity_id").notNull().references(() => figurineRaritiesTable.id, { onDelete: "cascade" }),
  probability: integer("probability").notNull().default(0),
});

export type MysteryBoxRarityProb = typeof mysteryBoxRarityProbsTable.$inferSelect;
