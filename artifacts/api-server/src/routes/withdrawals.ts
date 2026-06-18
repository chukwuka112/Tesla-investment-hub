import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db, withdrawalsTable, profilesTable, notificationsTable } from "@workspace/db";
import { requireAuth, generateUUID, type AuthenticatedRequest } from "../lib/auth";

const router: IRouter = Router();

const FEE_RATE = 0.04; // 4%

function formatWithdrawal(w: typeof withdrawalsTable.$inferSelect) {
  return {
    id: w.id,
    user_id: w.user_id,
    amount: parseFloat(w.amount),
    fee_amount: parseFloat(w.fee_amount),
    net_amount: parseFloat(w.net_amount),
    wallet_address: w.wallet_address,
    network: w.network,
    status: w.status,
    admin_note: w.admin_note,
    created_at: w.created_at.toISOString(),
  };
}

router.get("/withdrawals", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const withdrawals = await db.select().from(withdrawalsTable)
    .where(eq(withdrawalsTable.user_id, authReq.user!.userId))
    .orderBy(desc(withdrawalsTable.created_at));
  res.json(withdrawals.map(formatWithdrawal));
});

router.post("/withdrawals", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user!.userId;
  const { amount, wallet_address, network } = req.body;
  if (!amount || amount <= 0 || !wallet_address) {
    res.status(400).json({ error: "Amount and wallet address required" });
    return;
  }

  const gross = parseFloat(amount);
  const fee = parseFloat((gross * FEE_RATE).toFixed(2));
  const net = parseFloat((gross - fee).toFixed(2));

  const [user] = await db.select().from(profilesTable).where(eq(profilesTable.id, userId)).limit(1);
  if (!user || parseFloat(user.balance) < gross) {
    res.status(400).json({ error: "Insufficient balance" });
    return;
  }

  await db.update(profilesTable).set({
    balance: (parseFloat(user.balance) - gross).toFixed(2),
    total_withdrawals: (parseFloat(user.total_withdrawals) + gross).toFixed(2),
    updated_at: new Date(),
  }).where(eq(profilesTable.id, userId));

  const wdId = generateUUID();
  await db.insert(withdrawalsTable).values({
    id: wdId,
    user_id: userId,
    amount: gross.toFixed(2),
    fee_amount: fee.toFixed(2),
    net_amount: net.toFixed(2),
    wallet_address,
    network: network || null,
    status: "pending",
  });

  await db.insert(notificationsTable).values({
    id: generateUUID(),
    user_id: userId,
    type: "withdrawal",
    title: "Withdrawal Requested",
    message: `Withdrawal of $${gross.toFixed(2)} is pending admin approval. You will receive $${net.toFixed(2)} after the 4% processing fee.`,
    is_read: false,
  });

  const [withdrawal] = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.id, wdId)).limit(1);
  res.status(201).json(formatWithdrawal(withdrawal));
});

export { formatWithdrawal };
export default router;
