"use strict";

const IORedis = require("ioredis");

// ============================================================
// REDIS CONNECTION
// ============================================================
//
// Used exclusively for the BullMQ render queue - not a general
// cache. MongoDB (Atlas) remains the only datastore for
// application data.
//
// `maxRetriesPerRequest: null` is required by BullMQ itself
// (see https://docs.bullmq.io/guide/going-to-production) so that
// BullMQ's own retry/backoff logic is what governs retries, not
// ioredis's.
// ============================================================

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

connection.on("error", (error) => {
  console.error("[REDIS] Connection error:", error.message);
});

connection.on("connect", () => {
  console.log("[REDIS] Connected");
});

module.exports = {
  connection,
  REDIS_URL,
};
