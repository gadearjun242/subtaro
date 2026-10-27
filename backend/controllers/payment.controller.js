"use strict";

const User = require("../models/User");
const Payment = require("../models/Payment");
const { getPlanByKey, computeSubscriptionWindow } = require("../services/plan.service");
const {
  isPaymentConfigured,
  getPublicConfig,
  createOrder,
  verifySignature,
} = require("../services/payment.service");

const DAY_MS = 24 * 60 * 60 * 1000;

// GET /api/payments/config - public. Tells the UI whether to show
// checkout or the portfolio/contact fallback.
const getConfig = (req, res) =>
  res.status(200).json({ success: true, data: getPublicConfig() });

// POST /api/payments/order  { planKey }
const createCheckoutOrder = async (req, res) => {
  try {
    if (!isPaymentConfigured()) {
      return res.status(503).json({
        success: false,
        code: "PAYMENTS_NOT_CONFIGURED",
        message: "Online payment is not available right now.",
        data: getPublicConfig(),
      });
    }

    const plan = await getPlanByKey(String(req.body?.planKey || ""));

    if (!plan || !plan.isActive || plan.price <= 0) {
      return res.status(404).json({ success: false, message: "Plan not found" });
    }

    const order = await createOrder({
      amount: plan.price,
      currency: plan.currency || "USD",
      receipt: `u${String(req.user._id).slice(-8)}_${Date.now()}`,
      notes: { userId: String(req.user._id), planKey: plan.key },
    });

    await Payment.create({
      userId: req.user._id,
      planKey: plan.key,
      providerOrderId: order.id,
      amount: plan.price,
      currency: order.currency,
    });

    return res.status(201).json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: getPublicConfig().keyId,
        plan: { key: plan.key, name: plan.name },
      },
    });
  } catch (error) {
    console.error("createCheckoutOrder error:", error);
    return res.status(502).json({ success: false, message: "Unable to start checkout" });
  }
};

// POST /api/payments/verify  { orderId, paymentId, signature }
// The plan is activated ONLY after the HMAC signature checks out and
// the order belongs to the caller. Idempotent per payment.
const verifyPayment = async (req, res) => {
  try {
    if (!isPaymentConfigured()) {
      return res.status(503).json({
        success: false,
        code: "PAYMENTS_NOT_CONFIGURED",
        message: "Payments are not configured",
      });
    }

    const { orderId, paymentId, signature } = req.body || {};

    if (!verifySignature({ orderId, paymentId, signature })) {
      return res.status(400).json({ success: false, message: "Payment verification failed" });
    }

    const payment = await Payment.findOne({ providerOrderId: orderId, userId: req.user._id });

    if (!payment) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (payment.status !== "paid") {
      // Atomic claim so two concurrent verify calls cannot both extend the plan.
      const claimed = await Payment.findOneAndUpdate(
        { _id: payment._id, status: { $ne: "paid" } },
        { $set: { status: "paid", providerPaymentId: String(paymentId), paidAt: new Date() } },
        { new: true }
      );

      if (claimed) {
        const plan = await getPlanByKey(payment.planKey);
        const user = await User.findById(req.user._id);
        const { startedAt, isLifetime } = computeSubscriptionWindow(plan);

        // Renewing before expiry extends from the current expiry.
        const current = user.subscription?.expiresAt;
        const base =
          current && new Date(current) > startedAt && !user.subscription?.isLifetime
            ? new Date(current)
            : startedAt;

        user.subscription = {
          planKey: plan.key,
          status: "active",
          startedAt,
          expiresAt: isLifetime ? null : new Date(base.getTime() + plan.durationDays * DAY_MS),
          isLifetime,
          lastPayment: {
            amount: payment.amount,
            currency: payment.currency,
            provider: "razorpay",
            reference: String(paymentId),
            paidAt: new Date(),
          },
        };

        await user.save();
      }
    }

    const user = await User.findById(req.user._id).select("subscription");

    return res.status(200).json({
      success: true,
      message: "Payment verified",
      data: { subscription: user.subscription },
    });
  } catch (error) {
    console.error("verifyPayment error:", error);
    return res.status(500).json({ success: false, message: "Unable to verify payment" });
  }
};

module.exports = { getConfig, createCheckoutOrder, verifyPayment };
