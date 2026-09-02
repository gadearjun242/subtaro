"use strict";

const Sentry = require("@sentry/node");

// ============================================================
// SENTRY
// ============================================================
//
// Soft-optional, same principle as config/mail.js: if
// SENTRY_DSN isn't set, the app runs completely normally, it
// just doesn't report errors anywhere external - console.error
// keeps working as it always did.
//
// Must be initialized as early as possible (before other
// requires) to catch errors during startup too - see the very
// top of server.js and worker.js.
// ============================================================

const SENTRY_DSN = process.env.SENTRY_DSN;
const SENTRY_ENABLED = Boolean(SENTRY_DSN);

if (SENTRY_ENABLED) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",

    // Fraction of requests traced for performance monitoring.
    // Kept low by default - this is a cost/volume control, not
    // an error-reporting control (errors are always captured
    // regardless of this value).
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
  });

  console.log("[SENTRY] Error tracking enabled");
} else {
  console.warn(
    "[SENTRY] SENTRY_DSN is not set - error tracking is disabled (errors still go to console.error). See BACKEND.md."
  );
}

module.exports = {
  Sentry,
  SENTRY_ENABLED,
};
