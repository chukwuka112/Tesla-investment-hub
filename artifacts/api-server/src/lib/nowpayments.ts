import crypto from "crypto";
import { logger } from "./logger";

const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY;
const NOWPAYMENTS_IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET;
const API_BASE = "https://api.nowpayments.io/v1";

export interface NowPaymentCreate {
  price_amount: number;
  price_currency: string;
  pay_currency: string;
  order_id: string;
  order_description: string;
  ipn_callback_url: string;
}

export interface NowPaymentResponse {
  payment_id: string;
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  pay_currency: string;
  order_id: string;
  payment_status: string;
}

export async function createPayment(data: NowPaymentCreate): Promise<NowPaymentResponse | null> {
  if (!NOWPAYMENTS_API_KEY) {
    logger.warn("NOWPAYMENTS_API_KEY not set");
    return null;
  }
  try {
    const response = await fetch(`${API_BASE}/payment`, {
      method: "POST",
      headers: {
        "x-api-key": NOWPAYMENTS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const body = await response.text();
      logger.error({ status: response.status, body }, "NowPayments create error");
      return null;
    }
    return response.json() as Promise<NowPaymentResponse>;
  } catch (err) {
    logger.error({ err }, "NowPayments request failed");
    return null;
  }
}

export function verifyIpnSignature(body: string, signature: string): boolean {
  if (!NOWPAYMENTS_IPN_SECRET) return false;
  try {
    const expected = crypto
      .createHmac("sha512", NOWPAYMENTS_IPN_SECRET)
      .update(body)
      .digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex")
    );
  } catch {
    return false;
  }
}

export function isPaymentCompleted(status: string): boolean {
  return ["finished", "confirmed", "partially_paid"].includes(status);
}
