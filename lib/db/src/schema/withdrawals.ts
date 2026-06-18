import {
  pgTable,
  text,
  timestamp,
  numeric,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { profilesTable } from "./profiles";

export const withdrawalsTable = pgTable("withdrawals", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  user_id: text("user_id").notNull().references(() => profilesTable.id),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
  fee_amount: numeric("fee_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  net_amount: numeric("net_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  wallet_address: text("wallet_address").notNull(),
  network: text("network"),
  status: text("status").notNull().default("pending"),
  admin_note: text("admin_note"),
  processed_by: text("processed_by"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWithdrawalSchema = createInsertSchema(withdrawalsTable).omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type InsertWithdrawal = z.infer<typeof insertWithdrawalSchema>;
export type Withdrawal = typeof withdrawalsTable.$inferSelect;
