import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc, count, sum, and, gte } from "drizzle-orm";
import {
  db,
  profilesTable,
  investmentPlansTable,
  depositsTable,
  withdrawalsTable,
  giftCodesTable,
  giftRedemptionsTable,
  announcementsTable,
  adminActivityLogsTable,
  notificationsTable,
  userInvestmentsTable,
  referralsTable,
} from "@workspace/db";
import { requireAdmin, generateUUID, generateGiftCode, type AuthenticatedRequest } from "../lib/auth";
import { sendEmail, withdrawalStatusEmailHtml } from "../lib/email";
import { formatUser } from "./auth";
import { formatPlan } from "./plans";
import { formatDeposit } from "./deposits";
import { formatWithdrawal } from "./withdrawals";
import { formatAnnouncement } from "./announcements";

const router: IRouter = Router();

async function logAction(adminId: string, action: string, targetType: string, targetId?: string, details?: string) {
  await db.insert(adminActivityLogsTable).values({
    id: generateUUID(),
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId || null,
    details: details || null,
  });
}

function adminId(req: Request): string {
  return (req as AuthenticatedRequest).user!.userId;
}

// Users
router.get("/admin/users", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { search, status, page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
  const offset = (pageNum - 1) * limitNum;
  const users = await db.select().from(profilesTable)
    .orderBy(desc(profilesTable.created_at))
    .limit(limitNum)
    .offset(offset);
  const [totalRow] = await db.select({ count: count() }).from(profilesTable);
  const filteredUsers = users.filter(u => {
    if (search && !u.email.includes(search) && !u.full_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (status === "active" && !u.is_active) return false;
    if (status === "suspended" && u.is_active) return false;
    return true;
  });
  res.json({ users: filteredUsers.map(formatUser), total: totalRow?.count || 0, page: pageNum, limit: limitNum });
});

router.get("/admin/users/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [user] = await db.select().from(profilesTable).where(eq(profilesTable.id, id)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const investments = await db.select().from(userInvestmentsTable).where(eq(userInvestmentsTable.user_id, id)).orderBy(desc(userInvestmentsTable.created_at));
  const deposits = await db.select().from(depositsTable).where(eq(depositsTable.user_id, id)).orderBy(desc(depositsTable.created_at));
  const withdrawals = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.user_id, id)).orderBy(desc(withdrawalsTable.created_at));
  const notifications = await db.select().from(notificationsTable).where(eq(notificationsTable.user_id, id)).orderBy(desc(notificationsTable.created_at)).limit(20);
  res.json({
    user: formatUser(user),
    investments: investments.map(i => ({
      id: i.id, user_id: i.user_id, plan_id: i.plan_id,
      amount: parseFloat(i.amount), daily_earnings: parseFloat(i.daily_earnings),
      total_earned: parseFloat(i.total_earned), status: i.status,
      start_date: i.start_date.toISOString(), end_date: i.end_date.toISOString(),
      progress_percentage: 0, created_at: i.created_at.toISOString(),
    })),
    deposits: deposits.map(formatDeposit),
    withdrawals: withdrawals.map(formatWithdrawal),
    notifications: notifications.map(n => ({ id: n.id, user_id: n.user_id, type: n.type, title: n.title, message: n.message, is_read: n.is_read, created_at: n.created_at.toISOString() })),
  });
});

router.patch("/admin/users/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { full_name, balance, is_active, role } = req.body;
  const updates: Partial<typeof profilesTable.$inferInsert> = { updated_at: new Date() };
  if (full_name !== undefined) updates.full_name = full_name;
  if (balance !== undefined) updates.balance = balance.toString();
  if (is_active !== undefined) updates.is_active = is_active;
  if (role !== undefined) updates.role = role;
  const [user] = await db.update(profilesTable).set(updates).where(eq(profilesTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  await logAction(adminId(req), "UPDATE_USER", "user", id, JSON.stringify(req.body));
  res.json(formatUser(user));
});

// Deposits
router.get("/admin/deposits", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { status, page = "1" } = req.query as Record<string, string>;
  const pageNum = parseInt(page, 10) || 1;
  const limit = 20;
  const offset = (pageNum - 1) * limit;
  let deposits;
  if (status) {
    deposits = await db.select().from(depositsTable).where(eq(depositsTable.status, status)).orderBy(desc(depositsTable.created_at)).limit(limit).offset(offset);
  } else {
    deposits = await db.select().from(depositsTable).orderBy(desc(depositsTable.created_at)).limit(limit).offset(offset);
  }
  res.json(deposits.map(formatDeposit));
});

router.post("/admin/deposits/:id/approve", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [deposit] = await db.select().from(depositsTable).where(eq(depositsTable.id, id)).limit(1);
  if (!deposit) { res.status(404).json({ error: "Deposit not found" }); return; }
  if (deposit.status !== "pending") { res.status(400).json({ error: "Deposit is not pending" }); return; }
  await db.update(depositsTable).set({ status: "success", updated_at: new Date() }).where(eq(depositsTable.id, id));
  const amount = parseFloat(deposit.amount);
  const [user] = await db.select().from(profilesTable).where(eq(profilesTable.id, deposit.user_id)).limit(1);
  if (user) {
    await db.update(profilesTable).set({
      balance: (parseFloat(user.balance) + amount).toFixed(2),
      total_deposits: (parseFloat(user.total_deposits) + amount).toFixed(2),
      updated_at: new Date(),
    }).where(eq(profilesTable.id, deposit.user_id));
    await db.insert(notificationsTable).values({ id: generateUUID(), user_id: deposit.user_id, type: "deposit", title: "Deposit Approved", message: `Your deposit of $${amount.toFixed(2)} has been approved`, is_read: false });
    await sendEmail({ to: user.email, subject: "Deposit Approved - Tesla Invest", html: `<p>Your deposit of $${amount.toFixed(2)} has been approved and credited.</p>` });
  }
  await logAction(adminId(req), "APPROVE_DEPOSIT", "deposit", id, `Amount: $${amount}`);
  const [updated] = await db.select().from(depositsTable).where(eq(depositsTable.id, id)).limit(1);
  res.json(formatDeposit(updated));
});

router.post("/admin/deposits/:id/reject", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [deposit] = await db.select().from(depositsTable).where(eq(depositsTable.id, id)).limit(1);
  if (!deposit) { res.status(404).json({ error: "Deposit not found" }); return; }
  await db.update(depositsTable).set({ status: "failed", updated_at: new Date() }).where(eq(depositsTable.id, id));
  await logAction(adminId(req), "REJECT_DEPOSIT", "deposit", id);
  const [updated] = await db.select().from(depositsTable).where(eq(depositsTable.id, id)).limit(1);
  res.json(formatDeposit(updated));
});

// Withdrawals — enriched with username
router.get("/admin/withdrawals", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { status, page = "1" } = req.query as Record<string, string>;
  const pageNum = parseInt(page, 10) || 1;
  const limit = 20;
  const offset = (pageNum - 1) * limit;
  let withdrawals;
  if (status) {
    withdrawals = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.status, status)).orderBy(desc(withdrawalsTable.created_at)).limit(limit).offset(offset);
  } else {
    withdrawals = await db.select().from(withdrawalsTable).orderBy(desc(withdrawalsTable.created_at)).limit(limit).offset(offset);
  }
  const enriched = await Promise.all(withdrawals.map(async (w) => {
    const [user] = await db.select({ full_name: profilesTable.full_name, email: profilesTable.email })
      .from(profilesTable).where(eq(profilesTable.id, w.user_id)).limit(1);
    return {
      ...formatWithdrawal(w),
      username: user?.full_name || "Unknown",
      user_email: user?.email || "",
    };
  }));
  res.json(enriched);
});

router.post("/admin/withdrawals/:id/approve", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { admin_note } = req.body;
  const [withdrawal] = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.id, id)).limit(1);
  if (!withdrawal) { res.status(404).json({ error: "Withdrawal not found" }); return; }
  if (withdrawal.status !== "pending") { res.status(400).json({ error: "Withdrawal is not pending" }); return; }
  await db.update(withdrawalsTable).set({ status: "approved", processed_by: adminId(req), admin_note: admin_note || null, updated_at: new Date() }).where(eq(withdrawalsTable.id, id));
  const [user] = await db.select().from(profilesTable).where(eq(profilesTable.id, withdrawal.user_id)).limit(1);
  if (user) {
    const amount = parseFloat(withdrawal.amount);
    const net = parseFloat(withdrawal.net_amount);
    await db.insert(notificationsTable).values({ id: generateUUID(), user_id: withdrawal.user_id, type: "withdrawal", title: "Withdrawal Approved", message: `Your withdrawal of $${amount.toFixed(2)} has been approved. You will receive $${net.toFixed(2)}.`, is_read: false });
    await sendEmail({ to: user.email, subject: "Withdrawal Approved - Tesla Invest", html: withdrawalStatusEmailHtml(user.full_name, amount, "approved", admin_note) });
  }
  await logAction(adminId(req), "APPROVE_WITHDRAWAL", "withdrawal", id, `Amount: $${withdrawal.amount}`);
  const [updated] = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.id, id)).limit(1);
  const [usr] = await db.select({ full_name: profilesTable.full_name, email: profilesTable.email }).from(profilesTable).where(eq(profilesTable.id, updated.user_id)).limit(1);
  res.json({ ...formatWithdrawal(updated), username: usr?.full_name || "Unknown", user_email: usr?.email || "" });
});

router.post("/admin/withdrawals/:id/reject", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { admin_note } = req.body;
  const [withdrawal] = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.id, id)).limit(1);
  if (!withdrawal) { res.status(404).json({ error: "Withdrawal not found" }); return; }
  if (withdrawal.status !== "pending") { res.status(400).json({ error: "Withdrawal is not pending" }); return; }
  const amount = parseFloat(withdrawal.amount);
  const [user] = await db.select().from(profilesTable).where(eq(profilesTable.id, withdrawal.user_id)).limit(1);
  if (user) {
    await db.update(profilesTable).set({
      balance: (parseFloat(user.balance) + amount).toFixed(2),
      total_withdrawals: (parseFloat(user.total_withdrawals) - amount).toFixed(2),
      updated_at: new Date(),
    }).where(eq(profilesTable.id, withdrawal.user_id));
    await db.insert(notificationsTable).values({ id: generateUUID(), user_id: withdrawal.user_id, type: "withdrawal", title: "Withdrawal Rejected", message: `Your withdrawal of $${amount.toFixed(2)} was rejected. Funds have been returned to your balance.`, is_read: false });
    await sendEmail({ to: user.email, subject: "Withdrawal Rejected - Tesla Invest", html: withdrawalStatusEmailHtml(user.full_name, amount, "rejected", admin_note) });
  }
  await db.update(withdrawalsTable).set({ status: "rejected", processed_by: adminId(req), admin_note: admin_note || null, updated_at: new Date() }).where(eq(withdrawalsTable.id, id));
  await logAction(adminId(req), "REJECT_WITHDRAWAL", "withdrawal", id);
  const [updated] = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.id, id)).limit(1);
  const [usr] = await db.select({ full_name: profilesTable.full_name, email: profilesTable.email }).from(profilesTable).where(eq(profilesTable.id, updated.user_id)).limit(1);
  res.json({ ...formatWithdrawal(updated), username: usr?.full_name || "Unknown", user_email: usr?.email || "" });
});

// Mark withdrawal as completed (funds actually sent)
router.post("/admin/withdrawals/:id/complete", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { admin_note } = req.body;
  const [withdrawal] = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.id, id)).limit(1);
  if (!withdrawal) { res.status(404).json({ error: "Withdrawal not found" }); return; }
  if (withdrawal.status !== "approved") { res.status(400).json({ error: "Only approved withdrawals can be marked as completed" }); return; }
  await db.update(withdrawalsTable).set({ status: "completed", processed_by: adminId(req), admin_note: admin_note || withdrawal.admin_note, updated_at: new Date() }).where(eq(withdrawalsTable.id, id));
  const [user] = await db.select().from(profilesTable).where(eq(profilesTable.id, withdrawal.user_id)).limit(1);
  if (user) {
    const net = parseFloat(withdrawal.net_amount);
    await db.insert(notificationsTable).values({ id: generateUUID(), user_id: withdrawal.user_id, type: "withdrawal", title: "Withdrawal Completed", message: `Your withdrawal of $${net.toFixed(2)} has been sent to your wallet.`, is_read: false });
    await sendEmail({ to: user.email, subject: "Withdrawal Completed - Tesla Invest", html: withdrawalStatusEmailHtml(user.full_name, parseFloat(withdrawal.amount), "completed", admin_note) });
  }
  await logAction(adminId(req), "COMPLETE_WITHDRAWAL", "withdrawal", id, `Net: $${withdrawal.net_amount}`);
  const [updated] = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.id, id)).limit(1);
  const [usr] = await db.select({ full_name: profilesTable.full_name, email: profilesTable.email }).from(profilesTable).where(eq(profilesTable.id, updated.user_id)).limit(1);
  res.json({ ...formatWithdrawal(updated), username: usr?.full_name || "Unknown", user_email: usr?.email || "" });
});

// Plans
router.get("/admin/plans", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const plans = await db.select().from(investmentPlansTable).orderBy(investmentPlansTable.display_order);
  res.json(plans.map(formatPlan));
});

// Bulk reorder — must come before /:id routes
router.post("/admin/plans/reorder", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { orders } = req.body as { orders: Array<{ id: string; display_order: number }> };
  if (!Array.isArray(orders)) { res.status(400).json({ error: "orders array required" }); return; }
  await Promise.all(orders.map(({ id, display_order }) =>
    db.update(investmentPlansTable).set({ display_order, updated_at: new Date() }).where(eq(investmentPlansTable.id, id))
  ));
  await logAction(adminId(req), "REORDER_PLANS", "plan", undefined, `Reordered ${orders.length} plans`);
  const plans = await db.select().from(investmentPlansTable).orderBy(investmentPlansTable.display_order);
  res.json(plans.map(formatPlan));
});

// Seed example plans (only if no plans exist)
router.post("/admin/plans/seed", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const existing = await db.select().from(investmentPlansTable).limit(1);
  if (existing.length > 0) { res.status(400).json({ error: "Plans already exist. Delete all plans first to reseed." }); return; }
  const examples = [
    { name: "Starter Plan", model_name: "Model 3", image_url: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800&q=80", min_amount: "10", max_amount: "50", roi_percentage: "20", duration_days: 7, description: "Entry-level plan designed for new investors. Low risk, steady returns to get you started.", status: "active", display_order: 0 },
    { name: "Growth Plan", model_name: "Model Y", image_url: "https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800&q=80", min_amount: "51", max_amount: "150", roi_percentage: "35", duration_days: 7, description: "Accelerate your portfolio growth with our mid-tier investment plan.", status: "active", display_order: 1 },
    { name: "Premium Plan", model_name: "Model S", image_url: "https://images.unsplash.com/photo-1536700503339-1e4b06520771?w=800&q=80", min_amount: "151", max_amount: "400", roi_percentage: "50", duration_days: 7, description: "Premium returns for serious investors ready to scale their investments.", status: "active", display_order: 2 },
    { name: "VIP Plan", model_name: "Model X", image_url: "https://images.unsplash.com/photo-1571127236794-81c0bbfe1ce3?w=800&q=80", min_amount: "401", max_amount: "1000", roi_percentage: "70", duration_days: 7, description: "VIP access with exclusive high-yield returns for elite investors.", status: "active", display_order: 3 },
    { name: "Elite Plan", model_name: "Cybertruck", image_url: "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800&q=80", min_amount: "1001", max_amount: "9999999", roi_percentage: "100", duration_days: 7, description: "The ultimate investment tier. Maximum returns for our most valued investors.", status: "active", display_order: 4 },
  ];
  const created = [];
  for (const plan of examples) {
    const id = generateUUID();
    await db.insert(investmentPlansTable).values({ id, ...plan });
    created.push(id);
  }
  await logAction(adminId(req), "SEED_PLANS", "plan", undefined, "Seeded 5 example plans");
  const plans = await db.select().from(investmentPlansTable).orderBy(investmentPlansTable.display_order);
  res.status(201).json(plans.map(formatPlan));
});

router.post("/admin/plans", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { name, model_name, image_url, min_amount, max_amount, roi_percentage, duration_days, description, status, display_order } = req.body;
  if (!name || !image_url || !min_amount || !max_amount || !roi_percentage || !duration_days) {
    res.status(400).json({ error: "Missing required plan fields" }); return;
  }
  const planId = generateUUID();
  await db.insert(investmentPlansTable).values({
    id: planId, name, model_name: model_name || null, image_url,
    min_amount: min_amount.toString(), max_amount: max_amount.toString(),
    roi_percentage: roi_percentage.toString(), duration_days,
    description: description || null, status: status || "active", display_order: display_order || 0,
  });
  await logAction(adminId(req), "CREATE_PLAN", "plan", planId, name);
  const [plan] = await db.select().from(investmentPlansTable).where(eq(investmentPlansTable.id, planId)).limit(1);
  res.status(201).json(formatPlan(plan));
});

router.patch("/admin/plans/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const updates: Partial<typeof investmentPlansTable.$inferInsert> = { updated_at: new Date() };
  const fields = ["name", "model_name", "image_url", "min_amount", "max_amount", "roi_percentage", "duration_days", "description", "status", "display_order"] as const;
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      (updates as Record<string, unknown>)[f] = ["min_amount","max_amount","roi_percentage"].includes(f) ? req.body[f].toString() : req.body[f];
    }
  }
  const [plan] = await db.update(investmentPlansTable).set(updates).where(eq(investmentPlansTable.id, id)).returning();
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }
  await logAction(adminId(req), "UPDATE_PLAN", "plan", id);
  res.json(formatPlan(plan));
});

router.delete("/admin/plans/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [plan] = await db.delete(investmentPlansTable).where(eq(investmentPlansTable.id, id)).returning();
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }
  await logAction(adminId(req), "DELETE_PLAN", "plan", id, plan.name);
  res.json({ message: "Plan deleted" });
});

// Gift Codes
router.get("/admin/gift-codes", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const codes = await db.select().from(giftCodesTable).orderBy(desc(giftCodesTable.created_at));
  res.json(codes.map(g => ({
    id: g.id, code: g.code, reward_amount: parseFloat(g.reward_amount),
    max_uses: g.max_uses, uses_count: g.uses_count,
    expires_at: g.expires_at.toISOString(), is_active: g.is_active, created_at: g.created_at.toISOString(),
  })));
});

router.post("/admin/gift-codes", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { reward_amount, max_uses, expires_at } = req.body;
  if (!reward_amount || !max_uses || !expires_at) { res.status(400).json({ error: "Missing required fields" }); return; }
  const code = generateGiftCode();
  const codeId = generateUUID();
  await db.insert(giftCodesTable).values({ id: codeId, code, reward_amount: reward_amount.toString(), max_uses, uses_count: 0, expires_at: new Date(expires_at), is_active: true, created_by: adminId(req) });
  await logAction(adminId(req), "CREATE_GIFT_CODE", "gift_code", codeId, code);
  const [giftCode] = await db.select().from(giftCodesTable).where(eq(giftCodesTable.id, codeId)).limit(1);
  res.status(201).json({ id: giftCode.id, code: giftCode.code, reward_amount: parseFloat(giftCode.reward_amount), max_uses: giftCode.max_uses, uses_count: giftCode.uses_count, expires_at: giftCode.expires_at.toISOString(), is_active: giftCode.is_active, created_at: giftCode.created_at.toISOString() });
});

router.delete("/admin/gift-codes/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [code] = await db.delete(giftCodesTable).where(eq(giftCodesTable.id, id)).returning();
  if (!code) { res.status(404).json({ error: "Gift code not found" }); return; }
  await logAction(adminId(req), "DELETE_GIFT_CODE", "gift_code", id, code.code);
  res.json({ message: "Gift code deleted" });
});

// Announcements
router.get("/admin/announcements", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const anns = await db.select().from(announcementsTable).orderBy(desc(announcementsTable.created_at));
  res.json(anns.map(formatAnnouncement));
});

router.patch("/admin/announcements/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { title, content, is_pinned, is_active } = req.body;
  const updates: Record<string, unknown> = { updated_at: new Date() };
  if (title !== undefined) updates.title = title;
  if (content !== undefined) updates.content = content;
  if (is_pinned !== undefined) updates.is_pinned = is_pinned;
  if (is_active !== undefined) updates.is_active = is_active;
  const [ann] = await db.update(announcementsTable).set(updates).where(eq(announcementsTable.id, id)).returning();
  if (!ann) { res.status(404).json({ error: "Announcement not found" }); return; }
  await logAction(adminId(req), "UPDATE_ANNOUNCEMENT", "announcement", id, JSON.stringify(updates));
  res.json(formatAnnouncement(ann));
});

router.post("/admin/announcements", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { title, content, is_pinned } = req.body;
  if (!title || !content) { res.status(400).json({ error: "Title and content required" }); return; }
  const annId = generateUUID();
  await db.insert(announcementsTable).values({ id: annId, title, content, is_pinned: is_pinned || false, is_active: true, created_by: adminId(req) });
  await logAction(adminId(req), "CREATE_ANNOUNCEMENT", "announcement", annId, title);
  const [ann] = await db.select().from(announcementsTable).where(eq(announcementsTable.id, annId)).limit(1);
  res.status(201).json(formatAnnouncement(ann));
});

router.delete("/admin/announcements/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [ann] = await db.delete(announcementsTable).where(eq(announcementsTable.id, id)).returning();
  if (!ann) { res.status(404).json({ error: "Announcement not found" }); return; }
  await logAction(adminId(req), "DELETE_ANNOUNCEMENT", "announcement", id);
  res.json({ message: "Announcement deleted" });
});

// Analytics
router.get("/admin/analytics", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const today = new Date(); today.setHours(0,0,0,0);
  const [totalUsers] = await db.select({ count: count() }).from(profilesTable);
  const [activeUsers] = await db.select({ count: count() }).from(profilesTable).where(eq(profilesTable.is_active, true));
  const [totalDeposits] = await db.select({ total: sum(depositsTable.amount) }).from(depositsTable).where(eq(depositsTable.status, "success"));
  const [totalWithdrawals] = await db.select({ total: sum(withdrawalsTable.amount) }).from(withdrawalsTable).where(eq(withdrawalsTable.status, "completed"));
  const [totalInvestments] = await db.select({ total: sum(userInvestmentsTable.amount) }).from(userInvestmentsTable);
  const [totalBalance] = await db.select({ total: sum(profilesTable.balance) }).from(profilesTable);
  const [newUsersToday] = await db.select({ count: count() }).from(profilesTable).where(gte(profilesTable.created_at, today));
  const [depositsToday] = await db.select({ total: sum(depositsTable.amount) }).from(depositsTable).where(and(gte(depositsTable.created_at, today), eq(depositsTable.status, "success")));
  const [withdrawalsToday] = await db.select({ total: sum(withdrawalsTable.amount) }).from(withdrawalsTable).where(and(gte(withdrawalsTable.created_at, today), eq(withdrawalsTable.status, "completed")));
  res.json({
    total_users: totalUsers?.count || 0, active_users: activeUsers?.count || 0,
    total_deposits: parseFloat(totalDeposits?.total || "0"),
    total_withdrawals: parseFloat(totalWithdrawals?.total || "0"),
    total_investments: parseFloat(totalInvestments?.total || "0"),
    total_balance: parseFloat(totalBalance?.total || "0"),
    new_users_today: newUsersToday?.count || 0,
    deposits_today: parseFloat(depositsToday?.total || "0"),
    withdrawals_today: parseFloat(withdrawalsToday?.total || "0"),
  });
});

// Audit Logs
router.get("/admin/audit-logs", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
  const offset = (pageNum - 1) * limitNum;
  const logs = await db.select().from(adminActivityLogsTable).orderBy(desc(adminActivityLogsTable.created_at)).limit(limitNum).offset(offset);
  const enriched = await Promise.all(logs.map(async (log) => {
    const [admin] = await db.select().from(profilesTable).where(eq(profilesTable.id, log.admin_id)).limit(1);
    return { id: log.id, admin_id: log.admin_id, admin_name: admin?.full_name || "Unknown", action: log.action, target_type: log.target_type, target_id: log.target_id, details: log.details, created_at: log.created_at.toISOString() };
  }));
  res.json(enriched);
});

export default router;
