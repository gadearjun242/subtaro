"use strict";

const nodemailer = require("nodemailer");


// ============================================================
// ENVIRONMENT
// ============================================================

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const MAIL_FROM = process.env.MAIL_FROM;
const MAIL_REPLY_TO = process.env.MAIL_REPLY_TO || undefined;

// Whether mail is configured at all. Kept intentionally soft -
// an app with no SMTP creds configured (e.g. a fresh local
// checkout) should still boot and run normally, just without
// sending email. See BACKEND.md.
const MAIL_ENABLED = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS && MAIL_FROM);

if (!MAIL_ENABLED) {
  console.warn(
    "[MAIL] SMTP_HOST / SMTP_USER / SMTP_PASS / MAIL_FROM are not fully set - " +
      "email sending is disabled. Verification and notification emails will be " +
      "skipped (logged, not sent). See BACKEND.md."
  );
}


// ============================================================
// SMTP TRANSPORT
// ============================================================
//
// One transporter is created and reused - do NOT create a new
// transporter per email. Nodemailer supports connection pooling.
// ============================================================

const transporter = MAIL_ENABLED
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,

      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },

      pool: true,
      maxConnections: Number(process.env.SMTP_MAX_CONNECTIONS || 5),
      maxMessages: Number(process.env.SMTP_MAX_MESSAGES || 100),

      connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 10000),
      greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 10000),
      socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 30000),

      defaults: {
        from: MAIL_FROM,
        ...(MAIL_REPLY_TO ? { replyTo: MAIL_REPLY_TO } : {}),
      },
    })
  : null;


// ============================================================
// VERIFY SMTP
// ============================================================

const verifyMailConnection = async () => {
  if (!MAIL_ENABLED) {
    return false;
  }

  try {
    await transporter.verify();
    console.log("[MAIL] SMTP connection verified successfully");
    return true;
  } catch (error) {
    console.error("[MAIL] SMTP verification failed:", error.message);
    return false;
  }
};


module.exports = {
  transporter,
  verifyMailConnection,
  MAIL_ENABLED,
};
