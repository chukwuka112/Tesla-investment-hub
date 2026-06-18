import {
  pgTable,
  text,
  boolean,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const otpVerificationsTable = pgTable("otp_verifications", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  email: text("email").notNull(),
  otp: text("otp").notNull(),
  type: text("type").notNull().default("register"),
  expires_at: timestamp("expires_at").notNull(),
  is_used: boolean("is_used").notNull().default(false),
  attempts: integer("attempts").notNull().default(0),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const insertOtpSchema = createInsertSchema(otpVerificationsTable).omit({
  id: true,
  created_at: true,
});
export type InsertOtp = z.infer<typeof insertOtpSchema>;
export type OtpVerification = typeof otpVerificationsTable.$inferSelect;
