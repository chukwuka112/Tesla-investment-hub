import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../lib/auth";

const router: IRouter = Router();

function formatNotification(n: typeof notificationsTable.$inferSelect) {
  return {
    id: n.id,
    user_id: n.user_id,
    type: n.type,
    title: n.title,
    message: n.message,
    is_read: n.is_read,
    created_at: n.created_at.toISOString(),
  };
}

router.get("/notifications", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const notifications = await db.select().from(notificationsTable)
    .where(eq(notificationsTable.user_id, authReq.user!.userId))
    .orderBy(desc(notificationsTable.created_at))
    .limit(50);
  res.json(notifications.map(formatNotification));
});

router.post("/notifications/read-all", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  await db.update(notificationsTable).set({ is_read: true }).where(eq(notificationsTable.user_id, authReq.user!.userId));
  res.json({ message: "All notifications marked as read" });
});

router.patch("/notifications/:id/read", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [notification] = await db.update(notificationsTable).set({ is_read: true }).where(eq(notificationsTable.id, id)).returning();
  if (!notification) { res.status(404).json({ error: "Notification not found" }); return; }
  res.json(formatNotification(notification));
});

export default router;
