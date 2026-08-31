const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const User = require("../models/User");

const { sendVerificationEmail } = require("../services/email.service");

// ============================================================
// CONFIG
// ============================================================

const ACCESS_TOKEN_EXPIRES_IN =
  process.env.JWT_ACCESS_EXPIRES_IN || "15m";

const REFRESH_TOKEN_EXPIRES_IN =
  process.env.JWT_REFRESH_EXPIRES_IN || "30d";

const SALT_ROUNDS = 12;

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute between resends

// ============================================================
// HELPERS
// ============================================================

/**
 * Generates a random verification token, stores only its SHA-256
 * hash on the user (never the raw token - same principle as
 * password hashing, so a DB leak can't be used to verify emails),
 * and returns the raw token to email to the user.
 */
const issueVerificationToken = async (user) => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  user.emailVerification = user.emailVerification || {};
  user.emailVerification.tokenHash = tokenHash;
  user.emailVerification.expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);
  user.emailVerification.lastSentAt = new Date();
  user.emailVerification.sendCount = (user.emailVerification.sendCount || 0) + 1;

  await user.save();

  return rawToken;
};

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      tokenVersion: user.tokenVersion || 0,
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    }
  );
};

const sanitizeUser = (user) => {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    isActive: user.isActive,
    subscription: user.subscription
      ? {
          planKey: user.subscription.planKey,
          status: user.subscription.status,
          startedAt: user.subscription.startedAt,
          expiresAt: user.subscription.expiresAt,
          isLifetime: Boolean(user.subscription.isLifetime),
        }
      : null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite:
      process.env.NODE_ENV === "production"
        ? "none"
        : "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/api/auth",
  });
};

const clearRefreshTokenCookie = (res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite:
      process.env.NODE_ENV === "production"
        ? "none"
        : "lax",
    path: "/api/auth",
  });
};

// ============================================================
// REGISTER
// ============================================================

const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
    } = req.body;

    // --------------------------------------------------------
    // Validation
    // --------------------------------------------------------

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    if (name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Name must contain at least 2 characters",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least 8 characters",
      });
    }

    // --------------------------------------------------------
    // Check existing user
    // --------------------------------------------------------

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "An account with this email already exists",
      });
    }

    // --------------------------------------------------------
    // Hash password
    // --------------------------------------------------------

    const hashedPassword = await bcrypt.hash(
      password.toString(),
      SALT_ROUNDS
    );

    // --------------------------------------------------------
    // Create user
    // --------------------------------------------------------

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      tokenVersion: 0,
    });

    // --------------------------------------------------------
    // Email verification token
    // --------------------------------------------------------
    //
    // Generated and stored the same way for both register() and
    // resendVerificationEmail() - see issueVerificationToken().
    // Sending is fire-and-forget: a slow/broken SMTP server must
    // never fail or delay account creation.
    // --------------------------------------------------------

    const verificationToken = await issueVerificationToken(user);

    sendVerificationEmail({
      to: user.email,
      name: user.name,
      token: verificationToken,
    }).catch((error) => {
      console.error("Failed to send verification email:", error.message);
    });

    // --------------------------------------------------------
    // Tokens
    // --------------------------------------------------------

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    setRefreshTokenCookie(
      res,
      refreshToken
    );

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: {
        user: sanitizeUser(user),
        accessToken,
      },
    });
  } catch (error) {
    console.error(
      "Register error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to create account",
    });
  }
};

// ============================================================
// LOGIN
// ============================================================

const login = async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    // --------------------------------------------------------
    // Validation
    // --------------------------------------------------------

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required",
      });
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    // --------------------------------------------------------
    // Find user
    //
    // password is select:false in User model,
    // therefore explicitly select it.
    // --------------------------------------------------------

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    // --------------------------------------------------------
    // Account status
    // --------------------------------------------------------

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message:
          "Your account has been disabled",
      });
    }

    // --------------------------------------------------------
    // Compare password
    // --------------------------------------------------------

    const passwordMatches =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    // --------------------------------------------------------
    // Update login information
    // --------------------------------------------------------

    user.lastLoginAt = new Date();

    await user.save();

    // --------------------------------------------------------
    // Generate tokens
    // --------------------------------------------------------

    const accessToken =
      generateAccessToken(user);

    const refreshToken =
      generateRefreshToken(user);

    setRefreshTokenCookie(
      res,
      refreshToken
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: sanitizeUser(user),
        accessToken,
      },
    });
  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to login",
    });
  }
};

// ============================================================
// REFRESH ACCESS TOKEN
// ============================================================

const refresh = async (req, res) => {
  try {
    const refreshToken =
      req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message:
          "Refresh token is missing",
      });
    }

    // --------------------------------------------------------
    // Verify refresh token
    // --------------------------------------------------------

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );

    // --------------------------------------------------------
    // Find user
    // --------------------------------------------------------

    const user = await User.findById(
      decoded.userId
    );

    if (!user) {
      clearRefreshTokenCookie(res);

      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    // --------------------------------------------------------
    // Account status
    // --------------------------------------------------------

    if (!user.isActive) {
      clearRefreshTokenCookie(res);

      return res.status(403).json({
        success: false,
        message:
          "Your account has been disabled",
      });
    }

    // --------------------------------------------------------
    // Check token version
    // --------------------------------------------------------

    if (
      decoded.tokenVersion !==
      (user.tokenVersion || 0)
    ) {
      clearRefreshTokenCookie(res);

      return res.status(401).json({
        success: false,
        message:
          "Refresh token is no longer valid",
      });
    }

    // --------------------------------------------------------
    // Token rotation
    // --------------------------------------------------------

    const newRefreshToken =
      generateRefreshToken(user);

    const newAccessToken =
      generateAccessToken(user);

    setRefreshTokenCookie(
      res,
      newRefreshToken
    );

    return res.status(200).json({
      success: true,
      message: "Token refreshed",
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    clearRefreshTokenCookie(res);

    if (
      error.name ===
      "TokenExpiredError"
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Refresh token has expired",
      });
    }

    if (
      error.name ===
      "JsonWebTokenError"
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid refresh token",
      });
    }

    console.error(
      "Refresh token error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to refresh authentication",
    });
  }
};

// ============================================================
// LOGOUT
// ============================================================

const logout = async (req, res) => {
  try {
    // --------------------------------------------------------
    // If protect middleware is used before logout,
    // req.user is available.
    //
    // Incrementing tokenVersion invalidates existing
    // refresh tokens for this user.
    // --------------------------------------------------------

    if (req.user) {
      await User.findByIdAndUpdate(
        req.user._id,
        {
          $inc: {
            tokenVersion: 1,
          },
        }
      );
    }

    clearRefreshTokenCookie(res);

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error(
      "Logout error:",
      error
    );

    clearRefreshTokenCookie(res);

    return res.status(500).json({
      success: false,
      message: "Unable to logout",
    });
  }
};

// ============================================================
// CURRENT USER
// ============================================================

const getMe = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        user: sanitizeUser(req.user),
      },
    });
  } catch (error) {
    console.error(
      "Get current user error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve user",
    });
  }
};

// ============================================================
// LOGOUT FROM ALL DEVICES
// ============================================================

const logoutAll = async (req, res) => {
  try {
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $inc: {
          tokenVersion: 1,
        },
      }
    );

    clearRefreshTokenCookie(res);

    return res.status(200).json({
      success: true,
      message:
        "Logged out from all devices",
    });
  } catch (error) {
    console.error(
      "Logout all error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to logout from all devices",
    });
  }
};

// ============================================================
// VERIFY EMAIL
// ============================================================

/**
 * GET /api/auth/verify-email/:token
 *
 * Public - the token itself is the auth. Looks up the user by
 * the token's hash (never stores/queries the raw token), checks
 * expiry, and marks the account verified.
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Verification token is required",
      });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      "emailVerification.tokenHash": tokenHash,
    }).select("+emailVerification.tokenHash +emailVerification.expiresAt");

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "This verification link is invalid or has already been used",
      });
    }

    if (user.isEmailVerified) {
      return res.status(200).json({
        success: true,
        message: "Email already verified",
      });
    }

    if (
      !user.emailVerification?.expiresAt ||
      new Date(user.emailVerification.expiresAt).getTime() < Date.now()
    ) {
      return res.status(400).json({
        success: false,
        message: "This verification link has expired — request a new one",
      });
    }

    user.isEmailVerified = true;
    user.emailVerification.verified = true;
    user.emailVerification.verifiedAt = new Date();
    user.emailVerification.tokenHash = null;
    user.emailVerification.expiresAt = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    console.error("verifyEmail error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify email",
    });
  }
};

// ============================================================
// RESEND VERIFICATION EMAIL
// ============================================================

/**
 * POST /api/auth/resend-verification
 *
 * Requires auth (uses req.user, set by the `protect` middleware).
 * Rate-limited to one send per VERIFICATION_RESEND_COOLDOWN_MS.
 */
const resendVerificationEmail = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "+emailVerification.tokenHash +emailVerification.expiresAt"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isEmailVerified) {
      return res.status(200).json({
        success: true,
        message: "Email already verified",
      });
    }

    const lastSentAt = user.emailVerification?.lastSentAt;
    if (lastSentAt && Date.now() - new Date(lastSentAt).getTime() < VERIFICATION_RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil(
        (VERIFICATION_RESEND_COOLDOWN_MS - (Date.now() - new Date(lastSentAt).getTime())) / 1000
      );

      return res.status(429).json({
        success: false,
        message: `Please wait ${waitSeconds}s before requesting another verification email`,
      });
    }

    const verificationToken = await issueVerificationToken(user);

    const result = await sendVerificationEmail({
      to: user.email,
      name: user.name,
      token: verificationToken,
    });

    return res.status(200).json({
      success: true,
      message: result.skipped
        ? "Email sending isn't configured on this server yet — check server logs for the link"
        : "Verification email sent",
    });
  } catch (error) {
    console.error("resendVerificationEmail error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to resend verification email",
    });
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  getMe,
  logoutAll,
  verifyEmail,
  resendVerificationEmail,
};