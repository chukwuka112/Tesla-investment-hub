import {
  pgTable,
  text,
  timestamp,
  numeric,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { profilesTable } from "./profiles";

export const depositsTable = pgTable("deposits", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  user_id: text("user_id").notNull().references(() => profilesTable.id),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  payment_id: text("payment_id"),
  payment_address: text("payment_address"),
  status: text("status").notNull().default("pending"),
  webhook_data: text("webhook_data"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDepositSchema = createInsertSchema(depositsTable).omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type InsertDeposit = z.infer<typeof insertDepositSchema>;
export type Deposit = typeof depositsTable.$inferSelect;
