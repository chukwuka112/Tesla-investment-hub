import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db, userInvestmentsTable, investmentPlansTable, profilesTable, notificationsTable, referralsTable } from "@workspace/db";
import { requireAuth, generateUUID, type AuthenticatedRequest } from "../lib/auth";
import { formatPlan } from "./plans";

const router: IRouter = Router();

function formatInvestment(inv: typeof userInvestmentsTable.$inferSelect, plan?: typeof investmentPlansTable.$inferSelect) {
  const now = Date.now();
  const start = inv.start_date.getTime();
  const end = inv.end_date.getTime();
  const totalDuration = end - start;
  const elapsed = now - start;
  const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  return {
    id: inv.id,
    user_id: inv.user_id,
    plan_id: inv.plan_id,
    plan: plan ? formatPlan(plan) : undefined,
    amount: parseFloat(inv.amount),
    daily_earnings: parseFloat(inv.daily_earnings),
    total_earned: parseFloat(inv.total_earned),
    status: inv.status,
    start_date: inv.start_date.toISOString(),
    end_date: inv.end_date.toISOString(),
    progress_percentage: parseFloat(progress.toFixed(2)),
    created_at: inv.created_at.toISOString(),
  };
}

router.get("/investments", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const investments = await db.select().from(userInvestmentsTable)
    .where(eq(userInvestmentsTable.user_id, authReq.user!.userId))
    .orderBy(desc(userInvestmentsTable.created_at));
  const planIds = [...new Set(investments.map(i => i.plan_id))];
  const allPlans = planIds.length > 0
    ? await db.select().from(investmentPlansTable)
    : [];
  const planMap = new Map(allPlans.map(p => [p.id, p]));
  res.json(investments.map(i => formatInvestment(i, planMap.get(i.plan_id))));
});

router.post("/investments", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user!.userId;
  const { plan_id, amount } = req.body;
  if (!plan_id || !amount || amount <= 0) { res.status(400).json({ error: "Plan ID and valid amount required" }); return; }
  const [plan] = await db.select().from(investmentPlansTable).where(eq(investmentPlansTable.id, plan_id)).limit(1);
  if (!plan || plan.status !== "active") { res.status(400).json({ error: "Investment plan not found or inactive" }); return; }
  if (amount < parseFloat(plan.min_amount)) { res.status(400).json({ error: `Minimum investment is $${plan.min_amount}` }); return; }
  if (amount > parseFloat(plan.max_amount)) { res.status(400).json({ error: `Maximum investment is $${plan.max_amount}` }); return; }
  const [user] = await db.select().from(profilesTable).where(eq(profilesTable.id, userId)).limit(1);
  if (!user || parseFloat(user.balance) < amount) { res.status(400).json({ error: "Insufficient balance" }); return; }
  const dailyEarnings = (amount * parseFloat(plan.roi_percentage)) / 100;
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + plan.duration_days * 24 * 60 * 60 * 1000);
  const invId = generateUUID();
  await db.insert(userInvestmentsTable).values({
    id: invId,
    user_id: userId,
    plan_id,
    amount: amount.toString(),
    daily_earnings: dailyEarnings.toString(),
    total_earned: "0",
    status: "active",
    start_date: startDate,
    end_date: endDate,
  });
  await db.update(profilesTable).set({
    balance: (parseFloat(user.balance) - amount).toString(),
    updated_at: new Date(),
  }).where(eq(profilesTable.id, userId));
  await db.insert(notificationsTable).values({
    id: generateUUID(),
    user_id: userId,
    type: "investment",
    title: "Investment Created",
    message: `You invested $${amount.toFixed(2)} in ${plan.name}. Daily earnings: $${dailyEarnings.toFixed(2)}`,
    is_read: false,
  });
  const userReferrals = await db.select().from(referralsTable).where(eq(referralsTable.referred_id, userId));
  for (const ref of userReferrals) {
    const commission = (amount * parseFloat(ref.commission_rate)) / 100;
    const [referrer] = await db.select().from(profilesTable).where(eq(profilesTable.id, ref.referrer_id)).limit(1);
    if (referrer) {
      const newBalance = parseFloat(referrer.balance) + commission;
      const newRefEarnings = parseFloat(referrer.referral_earnings) + commission;
      await db.update(profilesTable).set({
        balance: newBalance.toString(),
        referral_earnings: newRefEarnings.toString(),
        updated_at: new Date(),
      }).where(eq(profilesTable.id, ref.referrer_id));
      await db.update(referralsTable).set({
        total_earned: (parseFloat(ref.total_earned) + commission).toString(),
      }).where(eq(referralsTable.id, ref.id));
      await db.insert(notificationsTable).values({
        id: generateUUID(),
        user_id: ref.referrer_id,
        type: "referral",
        title: "Referral Commission Earned",
        message: `You earned $${commission.toFixed(2)} referral commission (Level ${ref.level})`,
        is_read: false,
      });
    }
  }
  const [investment] = await db.select().from(userInvestmentsTable).where(eq(userInvestmentsTable.id, invId)).limit(1);
  res.status(201).json(formatInvestment(investment, plan));
});

export { formatInvestment };
export default router;
