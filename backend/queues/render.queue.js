"use strict";

const { Queue } = require("bullmq");
const { connection } = require("../config/redis");

// ============================================================
// RENDER QUEUE
// ============================================================
//
// Two job types are pushed here (see workers/render.worker.js
// for the consumer side):
//
//   "finalize-project"  - the original pipeline's post-transcription
//                          step: download the SRT, upload it, then
//                          (for video projects) download the source
//                          video, burn in/mux subtitles with FFmpeg,
//                          and upload the final output.
//                          Enqueued from controllers/webhook.controller.js
//                          when the external subtitle service reports
//                          "pipeline_completed".
//
//   "regenerate-output" - re-render the output video after a manual
//                          subtitle edit (or a subtitle-mode/style
//                          change). Enqueued from
//                          controllers/project.controller.js's
//                          updateSubtitleController.
//
// Both are exactly the same functions that used to be called via
// `setImmediate(() => fn().catch(...))` - only the *trigger*
// changed. The functions themselves (finalizeProject,
// regenerateOutputVideo) are unchanged, so this refactor adds
// persistence/retry without touching the actual rendering logic.
// ============================================================

const RENDER_QUEUE_NAME = "video-render";

const renderQueue = new Queue(RENDER_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: Number(process.env.RENDER_JOB_MAX_ATTEMPTS || 3),
    backoff: {
      type: "exponential",
      delay: Number(process.env.RENDER_JOB_BACKOFF_MS || 15000),
    },
    // Completed jobs are kept briefly for debugging/observability,
    // then pruned automatically so Redis doesn't grow unbounded.
    removeOnComplete: {
      age: 24 * 60 * 60, // 24 hours
      count: 500,
    },
    removeOnFail: {
      age: 7 * 24 * 60 * 60, // 7 days - failures worth keeping longer to investigate
    },
  },
});

renderQueue.on("error", (error) => {
  console.error("[RENDER QUEUE] Error:", error.message);
});

module.exports = {
  renderQueue,
  RENDER_QUEUE_NAME,
};
