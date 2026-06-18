import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, gt } from "drizzle-orm";
import { db, giftCodesTable, giftRedemptionsTable, profilesTable, notificationsTable } from "@workspace/db";
import { requireAuth, generateUUID, type AuthenticatedRequest } from "../lib/auth";

const router: IRouter = Router();

router.post("/gift-codes/redeem", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user!.userId;
  const { code } = req.body;
  if (!code) { res.status(400).json({ error: "Gift code required" }); return; }
  const [giftCode] = await db.select().from(giftCodesTable).where(
    and(eq(giftCodesTable.code, code.toUpperCase().trim()), eq(giftCodesTable.is_active, true), gt(giftCodesTable.expires_at, new Date()))
  ).limit(1);
  if (!giftCode) { res.status(400).json({ error: "Invalid or expired gift code" }); return; }
  if (giftCode.uses_count >= giftCode.max_uses) { res.status(400).json({ error: "Gift code has reached maximum uses" }); return; }
  const [alreadyRedeemed] = await db.select().from(giftRedemptionsTable).where(
    and(eq(giftRedemptionsTable.code_id, giftCode.id), eq(giftRedemptionsTable.user_id, userId))
  ).limit(1);
  if (alreadyRedeemed) { res.status(400).json({ error: "You have already redeemed this gift code" }); return; }
  const rewardAmount = parseFloat(giftCode.reward_amount);
  await db.insert(giftRedemptionsTable).values({ id: generateUUID(), code_id: giftCode.id, user_id: userId, reward_amount: rewardAmount.toString() });
  await db.update(giftCodesTable).set({ uses_count: giftCode.uses_count + 1 }).where(eq(giftCodesTable.id, giftCode.id));
  const [user] = await db.select().from(profilesTable).where(eq(profilesTable.id, userId)).limit(1);
  const newBalance = parseFloat(user?.balance || "0") + rewardAmount;
  await db.update(profilesTable).set({ balance: newBalance.toString(), updated_at: new Date() }).where(eq(profilesTable.id, userId));
  await db.insert(notificationsTable).values({
    id: generateUUID(),
    user_id: userId,
    type: "gift",
    title: "Gift Code Redeemed",
    message: `You redeemed gift code ${code} and received $${rewardAmount.toFixed(2)}`,
    is_read: false,
  });
  res.json({ message: "Gift code redeemed successfully", reward_amount: rewardAmount, new_balance: newBalance });
});

export default router;
