import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  profilesTable,
  otpVerificationsTable,
  notificationsTable,
  referralsTable,
} from "@workspace/db";
import {
  generateToken,
  hashPassword,
  comparePassword,
  generateReferralCode,
  generateUUID,
  requireAuth,
  type AuthenticatedRequest,
} from "../lib/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function formatUser(user: typeof profilesTable.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    balance: parseFloat(user.balance),
    total_earnings: parseFloat(user.total_earnings),
    total_deposits: parseFloat(user.total_deposits),
    total_withdrawals: parseFloat(user.total_withdrawals),
    referral_earnings: parseFloat(user.referral_earnings),
    referral_code: user.referral_code,
    role: user.role,
    is_active: user.is_active,
    email_verified: user.email_verified,
    avatar_url: user.avatar_url,
    created_at: user.created_at.toISOString(),
  };
}

// Register — direct account creation, no email OTP. Requires 2 security questions.
router.post("/auth/register", async (req: Request, res: Response): Promise<void> => {
  const {
    full_name, email, password, referral_code,
    security_question_1, security_answer_1,
    security_question_2, security_answer_2,
  } = req.body;

  if (!full_name || !email || !password || !security_question_1 || !security_answer_1 || !security_question_2 || !security_answer_2) {
    res.status(400).json({ error: "All fields including security questions and answers are required" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }
  if (security_question_1 === security_question_2) {
    res.status(400).json({ error: "Please choose two different security questions" });
    return;
  }

  const existing = await db.select().from(profilesTable).where(eq(profilesTable.email, email.toLowerCase())).limit(1);
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const answerHash1 = await hashPassword(security_answer_1.toLowerCase().trim());
  const answerHash2 = await hashPassword(security_answer_2.toLowerCase().trim());
  const referralCode = generateReferralCode();
  const userId = generateUUID();

  let referredBy: string | null = null;
  if (referral_code) {
    const [referrer] = await db.select().from(profilesTable).where(eq(profilesTable.referral_code, referral_code)).limit(1);
    if (referrer) referredBy = referrer.id;
  }

  await db.insert(profilesTable).values({
    id: userId,
    email: email.toLowerCase(),
    password_hash: passwordHash,
    full_name,
    referral_code: referralCode,
    referred_by: referredBy,
    role: "user",
    balance: "0",
    total_earnings: "0",
    total_deposits: "0",
    total_withdrawals: "0",
    referral_earnings: "0",
    is_active: true,
    email_verified: true,
    verified_at: new Date(),
    otp_resend_count: 0,
    security_question_1,
    security_answer_hash_1: answerHash1,
    security_question_2,
    security_answer_hash_2: answerHash2,
    reset_attempts: 0,
  });

  if (referredBy) {
    await db.insert(referralsTable).values({ id: generateUUID(), referrer_id: referredBy, referred_id: userId, level: 1, commission_rate: "5.00", total_earned: "0" });
    const [l1Referrer] = await db.select().from(profilesTable).where(eq(profilesTable.id, referredBy)).limit(1);
    if (l1Referrer?.referred_by) {
      await db.insert(referralsTable).values({ id: generateUUID(), referrer_id: l1Referrer.referred_by, referred_id: userId, level: 2, commission_rate: "2.00", total_earned: "0" });
      const [l2Referrer] = await db.select().from(profilesTable).where(eq(profilesTable.id, l1Referrer.referred_by)).limit(1);
      if (l2Referrer?.referred_by) {
        await db.insert(referralsTable).values({ id: generateUUID(), referrer_id: l2Referrer.referred_by, referred_id: userId, level: 3, commission_rate: "1.00", total_earned: "0" });
      }
    }
  }

  await db.insert(notificationsTable).values({ id: generateUUID(), user_id: userId, type: "welcome", title: "Welcome to Tesla Invest!", message: "Your account has been created successfully. Start investing today.", is_read: false });

  const [user] = await db.select().from(profilesTable).where(eq(profilesTable.id, userId)).limit(1);
  const token = generateToken({ userId, email: email.toLowerCase(), role: "user" });
  req.log.info({ userId }, "User registered");
  res.json({ token, user: formatUser(user) });
});

// Login
router.post("/auth/login", async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) { res.status(400).json({ error: "Email and password required" }); return; }
  const [user] = await db.select().from(profilesTable).where(eq(profilesTable.email, email.toLowerCase())).limit(1);
  if (!user) { res.status(401).json({ error: "Invalid email or password" }); return; }
  if (!user.is_active) { res.status(401).json({ error: "Account suspended. Contact support." }); return; }
  const valid = await comparePassword(password, user.password_hash);
  if (!valid) { res.status(401).json({ error: "Invalid email or password" }); return; }
  const token = generateToken({ userId: user.id, email: user.email, role: user.role });
  req.log.info({ userId: user.id }, "User logged in");
  res.json({ token, user: formatUser(user) });
});

router.post("/auth/logout", async (_req: Request, res: Response): Promise<void> => {
  res.json({ message: "Logged out successfully" });
});

// Forgot password — returns security questions for this email
router.post("/auth/forgot-password", async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) { res.status(400).json({ error: "Email required" }); return; }
  const [user] = await db.select().from(profilesTable).where(eq(profilesTable.email, email.toLowerCase())).limit(1);
  if (!user || !user.security_question_1 || !user.security_question_2) {
    // Don't reveal whether email exists, but give a helpful message
    res.status(404).json({ error: "No account found with that email, or account has no security questions set" });
    return;
  }
  // Check if locked
  if (user.reset_locked_until && user.reset_locked_until > new Date()) {
    const minutes = Math.ceil((user.reset_locked_until.getTime() - Date.now()) / 60000);
    res.status(429).json({ error: `Too many failed attempts. Try again in ${minutes} minute(s).` });
    return;
  }
  res.json({
    question_1: user.security_question_1,
    question_2: user.security_question_2,
  });
});

// Verify security question answers — returns a short-lived reset token
router.post("/auth/verify-security-questions", async (req: Request, res: Response): Promise<void> => {
  const { email, answer_1, answer_2 } = req.body;
  if (!email || !answer_1 || !answer_2) {
    res.status(400).json({ error: "Email and both answers are required" });
    return;
  }

  const [user] = await db.select().from(profilesTable).where(eq(profilesTable.email, email.toLowerCase())).limit(1);
  if (!user || !user.security_answer_hash_1 || !user.security_answer_hash_2) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  // Check lockout
  if (user.reset_locked_until && user.reset_locked_until > new Date()) {
    const minutes = Math.ceil((user.reset_locked_until.getTime() - Date.now()) / 60000);
    res.status(429).json({ error: `Too many failed attempts. Try again in ${minutes} minute(s).` });
    return;
  }

  const [ok1, ok2] = await Promise.all([
    comparePassword(answer_1.toLowerCase().trim(), user.security_answer_hash_1),
    comparePassword(answer_2.toLowerCase().trim(), user.security_answer_hash_2),
  ]);

  if (!ok1 || !ok2) {
    const attempts = (user.reset_attempts || 0) + 1;
    const lockedUntil = attempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : null;
    await db.update(profilesTable).set({
      reset_attempts: attempts,
      reset_locked_until: lockedUntil,
      updated_at: new Date(),
    }).where(eq(profilesTable.id, user.id));
    const remaining = 5 - attempts;
    if (remaining <= 0) {
      res.status(429).json({ error: "Too many failed attempts. Account locked for 30 minutes." });
    } else {
      res.status(400).json({ error: `Incorrect answers. ${remaining} attempt(s) remaining.` });
    }
    return;
  }

  // Answers correct — generate reset token valid for 15 min
  const resetToken = generateUUID();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await db.delete(otpVerificationsTable).where(
    and(eq(otpVerificationsTable.email, email.toLowerCase()), eq(otpVerificationsTable.type, "reset"))
  );
  await db.insert(otpVerificationsTable).values({
    id: generateUUID(),
    email: email.toLowerCase(),
    otp: resetToken,
    type: "reset",
    expires_at: expiresAt,
    is_used: false,
    attempts: 0,
  });
  // Reset attempt counter on success
  await db.update(profilesTable).set({ reset_attempts: 0, reset_locked_until: null, updated_at: new Date() }).where(eq(profilesTable.id, user.id));

  res.json({ reset_token: resetToken });
});

// Reset password using token from security question verification
router.post("/auth/reset-password", async (req: Request, res: Response): Promise<void> => {
  const { reset_token, new_password } = req.body;
  if (!reset_token || !new_password) { res.status(400).json({ error: "Reset token and new password are required" }); return; }
  if (new_password.length < 8) { res.status(400).json({ error: "Password must be at least 8 characters" }); return; }

  const [tokenRecord] = await db.select().from(otpVerificationsTable).where(
    and(
      eq(otpVerificationsTable.otp, reset_token),
      eq(otpVerificationsTable.type, "reset"),
      eq(otpVerificationsTable.is_used, false),
      gt(otpVerificationsTable.expires_at, new Date())
    )
  ).limit(1);

  if (!tokenRecord) { res.status(400).json({ error: "Invalid or expired reset token" }); return; }

  const passwordHash = await hashPassword(new_password);
  await db.update(profilesTable).set({ password_hash: passwordHash, updated_at: new Date() }).where(eq(profilesTable.email, tokenRecord.email));
  await db.update(otpVerificationsTable).set({ is_used: true }).where(eq(otpVerificationsTable.id, tokenRecord.id));
  res.json({ message: "Password reset successfully" });
});

router.get("/auth/me", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const [user] = await db.select().from(profilesTable).where(eq(profilesTable.id, authReq.user!.userId)).limit(1);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }
  res.json(formatUser(user));
});

export { formatUser };
export default router;
