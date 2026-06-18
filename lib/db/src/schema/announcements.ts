import {
  pgTable,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const announcementsTable = pgTable("announcements", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  is_pinned: boolean("is_pinned").notNull().default(false),
  is_active: boolean("is_active").notNull().default(true),
  created_by: text("created_by"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAnnouncementSchema = createInsertSchema(announcementsTable).omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Announcement = typeof announcementsTable.$inferSelect;
