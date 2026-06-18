import {
  pgTable,
  text,
  boolean,
  timestamp,
  numeric,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { profilesTable } from "./profiles";

export const giftCodesTable = pgTable("gift_codes", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  code: text("code").notNull().unique(),
  reward_amount: numeric("reward_amount", { precision: 18, scale: 2 }).notNull(),
  max_uses: integer("max_uses").notNull().default(1),
  uses_count: integer("uses_count").notNull().default(0),
  expires_at: timestamp("expires_at").notNull(),
  is_active: boolean("is_active").notNull().default(true),
  created_by: text("created_by").references(() => profilesTable.id),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const giftRedemptionsTable = pgTable("gift_redemptions", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  code_id: text("code_id").notNull().references(() => giftCodesTable.id),
  user_id: text("user_id").notNull().references(() => profilesTable.id),
  reward_amount: numeric("reward_amount", { precision: 18, scale: 2 }).notNull(),
  redeemed_at: timestamp("redeemed_at").notNull().defaultNow(),
});

export const insertGiftCodeSchema = createInsertSchema(giftCodesTable).omit({
  id: true,
  created_at: true,
});
export type InsertGiftCode = z.infer<typeof insertGiftCodeSchema>;
export type GiftCode = typeof giftCodesTable.$inferSelect;
export type GiftRedemption = typeof giftRedemptionsTable.$inferSelect;
