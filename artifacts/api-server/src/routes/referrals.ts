import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc, count } from "drizzle-orm";
import { db, referralsTable, profilesTable } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../lib/auth";

const router: IRouter = Router();

router.get("/referrals", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user!.userId;
  const [user] = await db.select().from(profilesTable).where(eq(profilesTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const referrals = await db.select().from(referralsTable).where(eq(referralsTable.referrer_id, userId)).orderBy(desc(referralsTable.created_at));
  const membersWithDetails = await Promise.all(referrals.map(async (ref) => {
    const [member] = await db.select().from(profilesTable).where(eq(profilesTable.id, ref.referred_id)).limit(1);
    return {
      id: ref.referred_id,
      full_name: member?.full_name || "Unknown",
      level: ref.level,
      total_invested: parseFloat(member?.total_deposits || "0"),
      earnings: parseFloat(ref.total_earned),
      joined_at: ref.created_at.toISOString(),
    };
  }));
  const l1 = referrals.filter(r => r.level === 1);
  const l2 = referrals.filter(r => r.level === 2);
  const l3 = referrals.filter(r => r.level === 3);
  const totalEarnings = referrals.reduce((acc, r) => acc + parseFloat(r.total_earned), 0);
  const domains = process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost";
  const referralLink = `https://${domains}/register?ref=${user.referral_code}`;
  res.json({
    referral_code: user.referral_code,
    referral_link: referralLink,
    total_referrals: referrals.length,
    total_earnings: totalEarnings,
    level1_count: l1.length,
    level2_count: l2.length,
    level3_count: l3.length,
    referrals: membersWithDetails,
  });
});

router.get("/referrals/leaderboard", requireAuth, async (_req: Request, res: Response): Promise<void> => {
  const users = await db.select().from(profilesTable).orderBy(desc(profilesTable.referral_earnings)).limit(20);
  const leaderboard = await Promise.all(users.map(async (u, idx) => {
    const [refCount] = await db.select({ count: count() }).from(referralsTable).where(eq(referralsTable.referrer_id, u.id));
    return {
      rank: idx + 1,
      user_id: u.id,
      full_name: u.full_name,
      total_referrals: refCount?.count || 0,
      total_earnings: parseFloat(u.referral_earnings),
    };
  }));
  res.json(leaderboard);
});

export default router;
