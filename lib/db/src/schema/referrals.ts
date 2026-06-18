import {
  pgTable,
  text,
  timestamp,
  numeric,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { profilesTable } from "./profiles";

export const referralsTable = pgTable("referrals", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  referrer_id: text("referrer_id").notNull().references(() => profilesTable.id),
  referred_id: text("referred_id").notNull().references(() => profilesTable.id),
  level: integer("level").notNull().default(1),
  commission_rate: numeric("commission_rate", { precision: 8, scale: 4 }).notNull(),
  total_earned: numeric("total_earned", { precision: 18, scale: 2 }).notNull().default("0"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const insertReferralSchema = createInsertSchema(referralsTable).omit({
  id: true,
  created_at: true,
});
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referralsTable.$inferSelect;
