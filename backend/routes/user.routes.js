const express = require("express");

const {
  getMe,
  updateProfile,
  changePassword,
  getMyProjects,
  getMyProject,
  getMyStats,
  getMyStorage,
  deactivateAccount,
  deleteAccount,
  getMySubscription,
  activateSubscription,
} = require("../controllers/user.controller");

const {
  protect,
} = require("../middleware/auth.middleware");

const router = express.Router();

// ============================================================
// ALL USER ROUTES REQUIRE AUTHENTICATION
// ============================================================

router.use(protect);

// ============================================================
// CURRENT USER PROFILE
// ============================================================

// Get current user profile
// GET /api/users/me
router.get(
  "/me",
  getMe
);

// Update current user profile
//
// Currently supported by controller:
// - name
// - avatar
router.patch(
  "/me",
  updateProfile
);

// ============================================================
// PASSWORD
// ============================================================

// Change current user's password
router.patch(
  "/me/password",
  changePassword
);

// ============================================================
// PROJECTS
// ============================================================

// Get authenticated user's project history
//
// Supports:
// ?page=1
// ?limit=20
// ?status=completed
// ?search=interview
router.get(
  "/me/projects",
  getMyProjects
);

// Get one project belonging to authenticated user
router.get(
  "/me/projects/:projectId",
  getMyProject
);

// ============================================================
// USER ANALYTICS
// ============================================================

// User dashboard statistics
router.get(
  "/me/stats",
  getMyStats
);

// User storage usage
router.get(
  "/me/storage",
  getMyStorage
);

// ============================================================
// SUBSCRIPTION / PLAN
// ============================================================

// Current plan + computed status (days remaining, active/expired)
router.get(
  "/me/subscription",
  getMySubscription
);

// Placeholder "upgrade" endpoint - no payment gateway wired in
// yet, see BACKEND.md
router.post(
  "/me/subscription/activate",
  activateSubscription
);

// ============================================================
// ACCOUNT
// ============================================================

// Soft deactivate account
router.patch(
  "/me/deactivate",
  deactivateAccount
);

// Permanently delete account
router.delete(
  "/me",
  deleteAccount
);

module.exports = router;