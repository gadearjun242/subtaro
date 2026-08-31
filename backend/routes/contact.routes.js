const express = require("express");

const { submitContact } = require("../controllers/contact.controller");
const { optionalAuth } = require("../middleware/auth.middleware");
const { contactRateLimiter } = require("../middleware/rateLimit.middleware");

const router = express.Router();

// POST /api/contact - public, attaches req.user if logged in
router.post("/", contactRateLimiter, optionalAuth, submitContact);

module.exports = router;
