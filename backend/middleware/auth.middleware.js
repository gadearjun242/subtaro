const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    // ------------------------------------------------------------
    // 1. Get Authorization header
    // ------------------------------------------------------------

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // ------------------------------------------------------------
    // 2. Extract token
    // ------------------------------------------------------------

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is missing",
      });
    }

    // ------------------------------------------------------------
    // 3. Verify JWT
    // ------------------------------------------------------------

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // ------------------------------------------------------------
    // 4. Find user
    // ------------------------------------------------------------

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    // ------------------------------------------------------------
    // 5. Check account status
    // ------------------------------------------------------------

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been disabled",
      });
    }

    // ------------------------------------------------------------
    // 6. Attach authenticated user
    // ------------------------------------------------------------

    req.user = user;

    // ------------------------------------------------------------
    // 7. Continue
    // ------------------------------------------------------------

    next();
  } catch (error) {
    // Invalid / expired JWT
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Authentication token has expired",
      });
    }

    console.error("Auth middleware error:", error);

    return res.status(500).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

/**
 * Like `protect`, but never blocks the request. If a valid
 * Bearer token is present, `req.user` is attached; otherwise
 * the request just continues with `req.user` unset. Used on
 * public routes (e.g. the contact form) that want to know who
 * submitted it, when known, without requiring login.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (user && user.isActive) {
      req.user = user;
    }

    return next();
  } catch (error) {
    // Any auth failure here is silently ignored - this route is public.
    return next();
  }
};

module.exports = {
  protect,
  optionalAuth,
};