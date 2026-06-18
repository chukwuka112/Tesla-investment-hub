import { execSync } from "child_process";
import crypto from "crypto";

// Use psql to seed directly via SQL
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL not set");

function sql(query: string) {
  execSync(`psql "${DATABASE_URL}" -c "${query.replace(/"/g, '\\"')}"`, {
    stdio: "pipe",
  });
}

function sqlFile(content: string) {
  const { writeFileSync, unlinkSync } = require("fs");
  const tmpFile = "/tmp/seed_query.sql";
  writeFileSync(tmpFile, content);
  try {
    const result = execSync(`psql "${DATABASE_URL}" -f ${tmpFile}`, {
      encoding: "utf8",
    });
    return result;
  } finally {
    unlinkSync(tmpFile);
  }
}

const adminId = crypto.randomUUID();
// bcrypt hash of Admin@12345 with 12 rounds (pre-computed)
const passwordHash =
  "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J9Y9bK.Fy";

const seedSql = `
-- Admin user
INSERT INTO profiles (id, email, password_hash, full_name, role, balance, total_earnings, total_deposits, total_withdrawals, referral_earnings, referral_code, is_active, email_verified, verified_at, otp_resend_count, created_at, updated_at)
VALUES ('${adminId}', 'admin@teslainvest.io', '${passwordHash}', 'Admin User', 'super_admin', 0, 0, 0, 0, 0, 'TIADMIN01', true, true, NOW(), 0, NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET role = 'super_admin', email_verified = true, is_active = true, password_hash = '${passwordHash}', updated_at = NOW();

-- Investment plans
INSERT INTO investment_plans (id, name, model_name, image_url, min_amount, max_amount, roi_percentage, duration_days, description, status, display_order, created_at, updated_at)
VALUES
  ('${crypto.randomUUID()}','Model 3 Starter','Model 3','https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=600&q=80',100,999,1.5,30,'Entry-level investment plan. Perfect for beginners starting their Tesla Invest journey.','active',1,NOW(),NOW()),
  ('${crypto.randomUUID()}','Model Y Growth','Model Y','https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=600&q=80',1000,4999,2.2,45,'Mid-tier plan with accelerated returns. Popular choice for growing investors.','active',2,NOW(),NOW()),
  ('${crypto.randomUUID()}','Model S Premium','Model S','https://images.unsplash.com/photo-1536700503339-1e4b06520771?w=600&q=80',5000,19999,3.1,60,'Premium investment tier with high daily yield and priority support.','active',3,NOW(),NOW()),
  ('${crypto.randomUUID()}','Cybertruck Elite','Cybertruck','https://images.unsplash.com/photo-1562184552-997c461abbe6?w=600&q=80',20000,99999,4.5,90,'Elite tier for serious investors. Exceptional returns over 90 days.','active',4,NOW(),NOW()),
  ('${crypto.randomUUID()}','Roadster VIP','Roadster','https://images.unsplash.com/photo-1571987502227-9231b837d92a?w=600&q=80',100000,999999,6.0,120,'VIP exclusive plan. Highest ROI available for ultra-high-net-worth investors.','active',5,NOW(),NOW())
ON CONFLICT DO NOTHING;

-- Welcome announcement  
INSERT INTO announcements (id, title, content, is_pinned, is_active, created_by, created_at, updated_at)
VALUES ('${crypto.randomUUID()}', 'Welcome to Tesla Invest!', 'Start your investment journey today. Choose from our exclusive Tesla-themed plans and earn daily returns. Use referral codes to earn extra commissions!', true, true, (SELECT id FROM profiles WHERE email = 'admin@teslainvest.io' LIMIT 1), NOW(), NOW())
ON CONFLICT DO NOTHING;
`;

console.log("Seeding database...");
const result = sqlFile(seedSql);
console.log(result);
console.log("✅ Database seeded successfully!");
console.log("   Admin login: admin@teslainvest.io / Admin@12345");
