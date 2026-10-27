"use strict";

const crypto = require("crypto");

// ============================================================
// PAYMENTS (Razorpay)
// ============================================================
//
// Payments are optional. When RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET
// are not set, `isPaymentConfigured()` is false and the UI shows the
// owner's portfolio/contact link (PORTFOLIO_URL) instead of a
// checkout button. No SDK dependency: the REST API is called
// directly and signatures are verified with HMAC-SHA256.
// ============================================================

const API = "https://api.razorpay.com/v1";

const keyId = () => process.env.RAZORPAY_KEY_ID || "";
const keySecret = () => process.env.RAZORPAY_KEY_SECRET || "";

const isPaymentConfigured = () => Boolean(keyId() && keySecret());

const getPublicConfig = () => ({
  enabled: isPaymentConfigured(),
  provider: "razorpay",
  keyId: isPaymentConfigured() ? keyId() : null,
  portfolioUrl: process.env.PORTFOLIO_URL || null,
  contactEmail: process.env.CONTACT_EMAIL || null,
});

async function createOrder({ amount, currency, receipt, notes }) {
  const response = await fetch(`${API}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${keyId()}:${keySecret()}`).toString("base64")}`,
    },
    body: JSON.stringify({
      // Smallest currency unit (paise / cents).
      amount: Math.round(amount * 100),
      currency,
      receipt,
      notes,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error?.description || `Order creation failed (${response.status})`);
  }

  return data;
}

function verifySignature({ orderId, paymentId, signature }) {
  if (!orderId || !paymentId || !signature) return false;

  const expected = crypto
    .createHmac("sha256", keySecret())
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));

  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { isPaymentConfigured, getPublicConfig, createOrder, verifySignature };
