"use strict";

const mongoose = require("mongoose");

// One row per checkout attempt. `providerPaymentId` is unique, so
// a verified payment can only ever activate a plan once, even if
// the client retries the verify call.
const paymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    planKey: { type: String, required: true },
    provider: { type: String, default: "razorpay" },
    providerOrderId: { type: String, required: true, unique: true },
    providerPaymentId: { type: String, default: null, unique: true, sparse: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    status: { type: String, enum: ["created", "paid", "failed"], default: "created" },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Payment", paymentSchema);
