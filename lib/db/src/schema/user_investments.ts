import {
  pgTable,
  text,
  timestamp,
  numeric,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { profilesTable } from "./profiles";
import { investmentPlansTable } from "./investment_plans";

export const userInvestmentsTable = pgTable("user_investments", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  user_id: text("user_id").notNull().references(() => profilesTable.id),
  plan_id: text("plan_id").notNull().references(() => investmentPlansTable.id),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
  daily_earnings: numeric("daily_earnings", { precision: 18, scale: 2 }).notNull(),
  total_earned: numeric("total_earned", { precision: 18, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("active"),
  start_date: timestamp("start_date").notNull().defaultNow(),
  end_date: timestamp("end_date").notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserInvestmentSchema = createInsertSchema(userInvestmentsTable).omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type InsertUserInvestment = z.infer<typeof insertUserInvestmentSchema>;
export type UserInvestment = typeof userInvestmentsTable.$inferSelect;
