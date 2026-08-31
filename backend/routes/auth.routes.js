const express = require("express");

const {
  register,
  login,
  refresh,
  logout,
  getMe,
  logoutAll,
  verifyEmail,
  resendVerificationEmail,
} = require("../controllers/auth.controller");

const {
  protect,
} = require("../middleware/auth.middleware");

const {
  loginRateLimiter,
  registerRateLimiter,
  resendVerificationRateLimiter,
} = require("../middleware/rateLimit.middleware");

const router = express.Router();


// ============================================================
// PUBLIC AUTH ROUTES
// ============================================================

// Register new account
router.post(
  "/register",
  registerRateLimiter,
  register
);


// Login
router.post(
  "/login",
  loginRateLimiter,
  login
);


// Refresh access token
router.post(
  "/refresh",
  refresh
);


// Verify email (token itself is the auth - public)
router.get(
  "/verify-email/:token",
  verifyEmail
);


// ============================================================
// PROTECTED AUTH ROUTES
// ============================================================

// Get currently authenticated user
router.get(
  "/me",
  protect,
  getMe
);


// Logout current session
router.post(
  "/logout",
  protect,
  logout
);


// Logout from all devices
router.post(
  "/logout-all",
  protect,
  logoutAll
);


// Resend verification email
router.post(
  "/resend-verification",
  protect,
  resendVerificationRateLimiter,
  resendVerificationEmail
);


module.exports = router;
