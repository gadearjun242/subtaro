"use strict";

const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");

// ============================================================
// SHARED JSON RESPONSE HANDLER
// ============================================================
//
// express-rate-limit's default response isn't JSON - every
// limiter below uses this so a rate-limited request gets the
// same clean shape as every other API error.
// ============================================================

const jsonRateLimitHandler = (req, res) => {
  res.status(429).json({
    success: false,
    message: "Too many requests. Please try again later.",
  });
};

// ============================================================
// AUTH: LOGIN
// ============================================================
//
// Deliberately stricter than register - this is the classic
// brute-force target. Keyed by IP + the email being attempted,
// so one attacker can't lock out a specific victim account by
// spamming failed logins from many IPs, while still limiting
// any single IP's overall attempt rate.
// ============================================================

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: Number(process.env.LOGIN_RATE_LIMIT || 10),
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${String(req.body?.email || "").toLowerCase()}`,
});

// ============================================================
// AUTH: REGISTER
// ============================================================

const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: Number(process.env.REGISTER_RATE_LIMIT || 8),
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

// ============================================================
// AUTH: RESEND VERIFICATION
// ============================================================
//
// The controller itself already enforces a 60s cooldown per
// user; this is a coarser per-IP backstop against abuse.
// ============================================================

const resendVerificationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: Number(process.env.RESEND_VERIFICATION_RATE_LIMIT || 10),
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

// ============================================================
// CONTACT FORM
// ============================================================

const contactRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: Number(process.env.CONTACT_RATE_LIMIT || 5),
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

// ============================================================
// UPLOADS
// ============================================================
//
// Runs after `protect`, so req.user is available - keyed by
// user id rather than IP, since authenticated users behind a
// shared/corporate IP shouldn't rate-limit each other.
// ============================================================

const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: Number(process.env.UPLOAD_RATE_LIMIT || 30),
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
  keyGenerator: (req) => (req.user?._id ? String(req.user._id) : ipKeyGenerator(req.ip)),
});

module.exports = {
  loginRateLimiter,
  registerRateLimiter,
  resendVerificationRateLimiter,
  contactRateLimiter,
  uploadRateLimiter,
};
