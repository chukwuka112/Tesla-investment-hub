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

export const investmentPlansTable = pgTable("investment_plans", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  name: text("name").notNull(),
  model_name: text("model_name"),
  image_url: text("image_url").notNull(),
  min_amount: numeric("min_amount", { precision: 18, scale: 2 }).notNull(),
  max_amount: numeric("max_amount", { precision: 18, scale: 2 }).notNull(),
  roi_percentage: numeric("roi_percentage", { precision: 8, scale: 4 }).notNull(),
  duration_days: integer("duration_days").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"),
  display_order: integer("display_order").notNull().default(0),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const insertInvestmentPlanSchema = createInsertSchema(investmentPlansTable).omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type InsertInvestmentPlan = z.infer<typeof insertInvestmentPlanSchema>;
export type InvestmentPlan = typeof investmentPlansTable.$inferSelect;
