import {
  pgTable,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { profilesTable } from "./profiles";

export const adminActivityLogsTable = pgTable("admin_activity_logs", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  admin_id: text("admin_id").notNull().references(() => profilesTable.id),
  action: text("action").notNull(),
  target_type: text("target_type").notNull(),
  target_id: text("target_id"),
  details: text("details"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const loginHistoryTable = pgTable("login_history", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  user_id: text("user_id").notNull().references(() => profilesTable.id),
  ip_address: text("ip_address"),
  user_agent: text("user_agent"),
  is_new_device: boolean("is_new_device").default(false),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const insertAdminLogSchema = createInsertSchema(adminActivityLogsTable).omit({
  id: true,
  created_at: true,
});
export type InsertAdminLog = z.infer<typeof insertAdminLogSchema>;
export type AdminLog = typeof adminActivityLogsTable.$inferSelect;
