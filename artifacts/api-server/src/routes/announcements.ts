import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db, announcementsTable } from "@workspace/db";

const router: IRouter = Router();

function formatAnnouncement(a: typeof announcementsTable.$inferSelect) {
  return {
    id: a.id,
    title: a.title,
    content: a.content,
    is_pinned: a.is_pinned,
    is_active: a.is_active,
    created_at: a.created_at.toISOString(),
  };
}

router.get("/announcements", async (_req: Request, res: Response): Promise<void> => {
  const announcements = await db.select().from(announcementsTable)
    .where(eq(announcementsTable.is_active, true))
    .orderBy(desc(announcementsTable.is_pinned), desc(announcementsTable.created_at))
    .limit(10);
  res.json(announcements.map(formatAnnouncement));
});

export { formatAnnouncement };
export default router;
