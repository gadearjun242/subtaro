"use strict";

// Standalone render-worker entrypoint (used by `npm run worker` and
// the optional "scaled" Compose profile). Run it with
// ENABLE_RENDER_WORKER=false on the API process so jobs are not
// consumed twice.

require("dotenv").config();

const { connectDB } = require("./config/db");
const { startRenderWorker, stopRenderWorker } = require("./workers/render.worker");

(async () => {
  await connectDB();
  startRenderWorker();
  console.log("[WORKER] Render worker started");
})().catch((error) => {
  console.error("[WORKER] Failed to start:", error);
  process.exit(1);
});

const shutdown = async () => {
  try {
    await stopRenderWorker();
  } finally {
    process.exit(0);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
