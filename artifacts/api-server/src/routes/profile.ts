import { Router, type IRouter, type Request, type Response } from "express";
import { eq, count, sum } from "drizzle-orm";
import { db, profilesTable, userInvestmentsTable, notificationsTable } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../lib/auth";
import { formatUser } from "./auth";

const router: IRouter = Router();

router.patch("/profile", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const { full_name, avatar_url } = req.body;
  const updates: Partial<typeof profilesTable.$inferInsert> = { updated_at: new Date() };
  if (full_name) updates.full_name = full_name;
  if (avatar_url !== undefined) updates.avatar_url = avatar_url;
  const [user] = await db.update(profilesTable).set(updates).where(eq(profilesTable.id, authReq.user!.userId)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(formatUser(user));
});

router.get("/profile/dashboard", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user!.userId;
  const [user] = await db.select().from(profilesTable).where(eq(profilesTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const [investmentStats] = await db
    .select({ count: count(), total: sum(userInvestmentsTable.amount) })
    .from(userInvestmentsTable)
    .where(eq(userInvestmentsTable.user_id, userId));
  const [unreadCount] = await db
    .select({ count: count() })
    .from(notificationsTable)
    .where(eq(notificationsTable.user_id, userId));
  res.json({
    balance: parseFloat(user.balance),
    total_earnings: parseFloat(user.total_earnings),
    total_deposits: parseFloat(user.total_deposits),
    total_withdrawals: parseFloat(user.total_withdrawals),
    referral_earnings: parseFloat(user.referral_earnings),
    active_investments_count: investmentStats?.count || 0,
    active_investments_value: parseFloat(investmentStats?.total || "0"),
    unread_notifications: unreadCount?.count || 0,
  });
});

export default router;
