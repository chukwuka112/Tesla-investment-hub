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

export const profilesTable = pgTable("profiles", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  email: text("email").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  full_name: text("full_name").notNull(),
  role: text("role").notNull().default("user"),
  balance: numeric("balance", { precision: 18, scale: 2 }).notNull().default("0"),
  total_earnings: numeric("total_earnings", { precision: 18, scale: 2 }).notNull().default("0"),
  total_deposits: numeric("total_deposits", { precision: 18, scale: 2 }).notNull().default("0"),
  total_withdrawals: numeric("total_withdrawals", { precision: 18, scale: 2 }).notNull().default("0"),
  referral_earnings: numeric("referral_earnings", { precision: 18, scale: 2 }).notNull().default("0"),
  referral_code: text("referral_code").notNull().unique(),
  referred_by: text("referred_by"),
  is_active: boolean("is_active").notNull().default(true),
  email_verified: boolean("email_verified").notNull().default(false),
  verified_at: timestamp("verified_at"),
  avatar_url: text("avatar_url"),
  otp_resend_count: integer("otp_resend_count").notNull().default(0),
  last_otp_resend: timestamp("last_otp_resend"),
  security_question_1: text("security_question_1"),
  security_answer_hash_1: text("security_answer_hash_1"),
  security_question_2: text("security_question_2"),
  security_answer_hash_2: text("security_answer_hash_2"),
  reset_attempts: integer("reset_attempts").notNull().default(0),
  reset_locked_until: timestamp("reset_locked_until"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProfileSchema = createInsertSchema(profilesTable).omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profilesTable.$inferSelect;
