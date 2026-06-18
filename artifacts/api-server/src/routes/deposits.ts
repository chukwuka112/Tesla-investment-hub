import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db, depositsTable, profilesTable, notificationsTable } from "@workspace/db";
import { requireAuth, generateUUID, type AuthenticatedRequest } from "../lib/auth";
import { createPayment, verifyIpnSignature, isPaymentCompleted } from "../lib/nowpayments";
import { sendEmail, depositConfirmEmailHtml } from "../lib/email";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function formatDeposit(d: typeof depositsTable.$inferSelect) {
  return {
    id: d.id,
    user_id: d.user_id,
    amount: parseFloat(d.amount),
    currency: d.currency,
    payment_id: d.payment_id,
    payment_address: d.payment_address,
    status: d.status,
    created_at: d.created_at.toISOString(),
  };
}

router.get("/deposits", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const deposits = await db.select().from(depositsTable)
    .where(eq(depositsTable.user_id, authReq.user!.userId))
    .orderBy(desc(depositsTable.created_at));
  res.json(deposits.map(formatDeposit));
});

router.post("/deposits", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user!.userId;
  const { amount, currency } = req.body;
  if (!amount || amount <= 0 || !currency) { res.status(400).json({ error: "Amount and currency required" }); return; }
  const depositId = generateUUID();
  const domains = process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost";
  const ipnUrl = `https://${domains}/api/deposits/webhook`;

  // NowPayments expects lowercase currency tickers e.g. usdttrc20, btc, eth, usdterc20
  const CURRENCY_MAP: Record<string, string> = {
    "USDT_TRC20": "usdttrc20",
    "USDT_ERC20": "usdterc20",
    "USDC_ERC20": "usdcerc20",
    "BTC": "btc",
    "ETH": "eth",
    "LTC": "ltc",
    "TRX": "trx",
    "BNB": "bnbbsc",
  };
  const payCurrency = CURRENCY_MAP[currency] || currency.toLowerCase();

  const payment = await createPayment({
    price_amount: amount,
    price_currency: "usd",
    pay_currency: payCurrency,
    order_id: depositId,
    order_description: `Tesla Invest deposit - ${depositId}`,
    ipn_callback_url: ipnUrl,
  });
  const paymentId = payment?.payment_id || null;
  const paymentAddress = payment?.pay_address || null;
  await db.insert(depositsTable).values({
    id: depositId,
    user_id: userId,
    amount: amount.toString(),
    currency,
    payment_id: paymentId,
    payment_address: paymentAddress,
    status: "pending",
  });
  res.status(201).json({
    deposit_id: depositId,
    payment_id: paymentId || depositId,
    payment_address: paymentAddress || "Check NowPayments dashboard",
    amount,
    currency,
    status: "pending",
  });
});

router.post("/deposits/webhook", async (req: Request, res: Response): Promise<void> => {
  const signature = req.headers["x-nowpayments-sig"] as string;
  const rawBody = JSON.stringify(req.body);
  if (signature && !verifyIpnSignature(rawBody, signature)) {
    logger.warn("Invalid IPN signature");
    res.status(400).json({ error: "Invalid signature" });
    return;
  }
  const { payment_id, payment_status, order_id, price_amount } = req.body;
  logger.info({ payment_id, payment_status, order_id }, "IPN webhook received");
  if (!order_id) { res.json({ message: "ok" }); return; }
  const [deposit] = await db.select().from(depositsTable).where(eq(depositsTable.id, order_id)).limit(1);
  if (!deposit) { res.json({ message: "ok" }); return; }
  if (isPaymentCompleted(payment_status)) {
    await db.update(depositsTable).set({
      status: "success",
      payment_id: payment_id || deposit.payment_id,
      webhook_data: rawBody,
      updated_at: new Date(),
    }).where(eq(depositsTable.id, order_id));
    const depositAmount = price_amount || parseFloat(deposit.amount);
    const [user] = await db.select().from(profilesTable).where(eq(profilesTable.id, deposit.user_id)).limit(1);
    if (user) {
      await db.update(profilesTable).set({
        balance: (parseFloat(user.balance) + depositAmount).toString(),
        total_deposits: (parseFloat(user.total_deposits) + depositAmount).toString(),
        updated_at: new Date(),
      }).where(eq(profilesTable.id, deposit.user_id));
      await db.insert(notificationsTable).values({
        id: generateUUID(),
        user_id: deposit.user_id,
        type: "deposit",
        title: "Deposit Confirmed",
        message: `$${depositAmount.toFixed(2)} ${deposit.currency.toUpperCase()} deposit confirmed`,
        is_read: false,
      });
      await sendEmail({ to: user.email, subject: "Deposit Confirmed - Tesla Invest", html: depositConfirmEmailHtml(user.full_name, depositAmount, deposit.currency) });
    }
  } else if (payment_status === "failed" || payment_status === "expired") {
    await db.update(depositsTable).set({ status: "failed", webhook_data: rawBody, updated_at: new Date() }).where(eq(depositsTable.id, order_id));
  }
  res.json({ message: "ok" });
});

export { formatDeposit };
export default router;
