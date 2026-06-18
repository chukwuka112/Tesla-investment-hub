import { logger } from "./logger";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = "noreply@teslainvest.io";
const FROM_NAME = "Tesla Invest";

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    logger.warn({ to: payload.to, subject: payload.subject }, "SENDGRID_API_KEY not set — email not sent (check server logs for OTP codes)");
    // Extract OTP from HTML for dev convenience
    const otpMatch = payload.html.match(/letter-spacing:8px[^>]*>(\d{6})</);
    if (otpMatch) {
      logger.info({ to: payload.to, otp: otpMatch[1] }, "⚡ DEV OTP CODE (no SendGrid key)");
      console.log(`\n========================================\n⚡ OTP for ${payload.to}: ${otpMatch[1]}\n========================================\n`);
    }
    return false;
  }
  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: payload.to }] }],
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject: payload.subject,
        content: [{ type: "text/html", value: payload.html }],
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      logger.error({ status: response.status, body }, "SendGrid error");
      return false;
    }
    logger.info({ to: payload.to, subject: payload.subject }, "Email sent");
    return true;
  } catch (err) {
    logger.error({ err }, "Failed to send email");
    return false;
  }
}

export function otpEmailHtml(name: string, otp: string, expiresMin: number): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="background:#080808;font-family:'Outfit',Arial,sans-serif;color:#fff;max-width:500px;margin:0 auto;padding:32px 16px">
  <div style="text-align:center;margin-bottom:32px">
    <span style="font-family:'Orbitron',Arial,sans-serif;font-size:24px;font-weight:900;letter-spacing:3px;color:#fff">TESLA <span style="color:#CC0000">INVEST</span></span>
  </div>
  <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;text-align:center">
    <h2 style="font-family:'Orbitron',Arial,sans-serif;color:#fff;margin:0 0 8px">Email Verification</h2>
    <p style="color:rgba(255,255,255,0.55);margin:0 0 24px">Hi ${name}, use the code below to verify your email</p>
    <div style="background:#CC0000;border-radius:12px;padding:20px 32px;display:inline-block;margin:0 0 24px">
      <span style="font-family:'Orbitron',Arial,sans-serif;font-size:36px;font-weight:700;letter-spacing:8px;color:#fff">${otp}</span>
    </div>
    <p style="color:rgba(255,255,255,0.4);font-size:13px;margin:0">This code expires in ${expiresMin} minutes. Do not share it.</p>
  </div>
</body>
</html>`;
}

export function passwordResetEmailHtml(name: string, otp: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="background:#080808;font-family:'Outfit',Arial,sans-serif;color:#fff;max-width:500px;margin:0 auto;padding:32px 16px">
  <div style="text-align:center;margin-bottom:32px">
    <span style="font-family:'Orbitron',Arial,sans-serif;font-size:24px;font-weight:900;letter-spacing:3px;color:#fff">TESLA <span style="color:#CC0000">INVEST</span></span>
  </div>
  <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;text-align:center">
    <h2 style="font-family:'Orbitron',Arial,sans-serif;color:#fff;margin:0 0 8px">Password Reset</h2>
    <p style="color:rgba(255,255,255,0.55);margin:0 0 24px">Hi ${name}, use the code below to reset your password</p>
    <div style="background:#CC0000;border-radius:12px;padding:20px 32px;display:inline-block;margin:0 0 24px">
      <span style="font-family:'Orbitron',Arial,sans-serif;font-size:36px;font-weight:700;letter-spacing:8px;color:#fff">${otp}</span>
    </div>
    <p style="color:rgba(255,255,255,0.4);font-size:13px;margin:0">This code expires in 10 minutes. Do not share it.</p>
  </div>
</body>
</html>`;
}

export function depositConfirmEmailHtml(name: string, amount: number, currency: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="background:#080808;font-family:'Outfit',Arial,sans-serif;color:#fff;max-width:500px;margin:0 auto;padding:32px 16px">
  <div style="text-align:center;margin-bottom:32px">
    <span style="font-family:'Orbitron',Arial,sans-serif;font-size:24px;font-weight:900;letter-spacing:3px;color:#fff">TESLA <span style="color:#CC0000">INVEST</span></span>
  </div>
  <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;text-align:center">
    <h2 style="font-family:'Orbitron',Arial,sans-serif;color:#22C55E;margin:0 0 8px">Deposit Confirmed</h2>
    <p style="color:rgba(255,255,255,0.55);margin:0 0 24px">Hi ${name}, your deposit has been confirmed</p>
    <p style="font-family:'Orbitron',Arial,sans-serif;font-size:28px;color:#F5C518;margin:0 0 8px">$${amount.toFixed(2)}</p>
    <p style="color:rgba(255,255,255,0.4);font-size:13px;margin:0">via ${currency.toUpperCase()}</p>
  </div>
</body>
</html>`;
}

export function withdrawalStatusEmailHtml(name: string, amount: number, status: string, note?: string): string {
  const color = status === "approved" || status === "completed" ? "#22C55E" : "#CC0000";
  const title = status === "approved" ? "Withdrawal Approved" : status === "completed" ? "Withdrawal Completed" : "Withdrawal Rejected";
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="background:#080808;font-family:'Outfit',Arial,sans-serif;color:#fff;max-width:500px;margin:0 auto;padding:32px 16px">
  <div style="text-align:center;margin-bottom:32px">
    <span style="font-family:'Orbitron',Arial,sans-serif;font-size:24px;font-weight:900;letter-spacing:3px;color:#fff">TESLA <span style="color:#CC0000">INVEST</span></span>
  </div>
  <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;text-align:center">
    <h2 style="font-family:'Orbitron',Arial,sans-serif;color:${color};margin:0 0 8px">${title}</h2>
    <p style="color:rgba(255,255,255,0.55);margin:0 0 24px">Hi ${name}, your withdrawal of $${amount.toFixed(2)} has been ${status}</p>
    ${note ? `<p style="color:rgba(255,255,255,0.4);font-size:13px;margin:0">Note: ${note}</p>` : ""}
  </div>
</body>
</html>`;
}
