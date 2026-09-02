"use strict";

const { Worker } = require("bullmq");
const { connection } = require("../config/redis");
const { RENDER_QUEUE_NAME } = require("../queues/render.queue");
const { Sentry, SENTRY_ENABLED } = require("../config/sentry");

let worker = null;

// ============================================================
// JOB PROCESSOR
// ============================================================
//
// Required lazily so requiring this module doesn't eagerly pull
// in the full controller dependency graph unless a worker is
// actually started.
// ============================================================

async function processRenderJob(job) {
  const { finalizeProject } = require("../controllers/webhook.controller");
  const { regenerateOutputVideo } = require("../controllers/project.controller");

  switch (job.name) {
    case "finalize-project":
      // Original pipeline: SRT download/upload, then (for video
      // projects) source download + FFmpeg render/mux + upload.
      // Unchanged from before this refactor - only the trigger
      // moved from `setImmediate()` to this queue.
      //
      // `job.attemptsMade` increments only when a previous attempt
      // of THIS job actually failed (not before the first try), so
      // > 0 here means "this is a retry" - passed through so
      // claimFinalization() can distinguish our own legitimate
      // retry (after e.g. a worker crash mid-render) from a
      // genuinely concurrent duplicate trigger, which must still
      // be rejected. See the comment on claimFinalization() itself.
      return finalizeProject({
        ...job.data,
        isRetry: job.attemptsMade > 0,
      });

    case "regenerate-output":
      // Subtitle-edit-triggered re-render (mode/style change or
      // just an edited subtitle on an already-completed video).
      return regenerateOutputVideo(job.data);

    default:
      throw new Error(`Unknown render job type: "${job.name}"`);
  }
}

// ============================================================
// LIFECYCLE
// ============================================================

function startRenderWorker() {
  if (worker) {
    return worker;
  }

  const concurrency = Number(process.env.RENDER_WORKER_CONCURRENCY || 2);

  worker = new Worker(RENDER_QUEUE_NAME, processRenderJob, {
    connection,
    concurrency,
  });

  worker.on("completed", (job) => {
    console.log(`[RENDER WORKER] "${job.name}" (${job.id}) completed`);
  });

  worker.on("failed", (job, error) => {
    console.error(
      `[RENDER WORKER] "${job?.name}" (${job?.id}) failed ` +
        `(attempt ${job?.attemptsMade}/${job?.opts?.attempts}):`,
      error.message
    );

    // Render job failures are arguably the single highest-value
    // thing to know about in this app — a failed job means a
    // user's project is stuck. Only report once retries are
    // exhausted, so a transient failure that BullMQ successfully
    // retries doesn't create noise.
    if (SENTRY_ENABLED && job?.attemptsMade >= job?.opts?.attempts) {
      Sentry.captureException(error, {
        tags: { jobName: job?.name, jobId: job?.id },
        extra: { data: job?.data },
      });
    }
  });

  worker.on("error", (error) => {
    // Connection-level errors (e.g. Redis briefly unreachable) -
    // BullMQ itself will keep retrying the connection.
    console.error("[RENDER WORKER] Worker error:", error.message);
  });

  console.log(`[RENDER WORKER] Started (concurrency: ${concurrency})`);

  return worker;
}

async function stopRenderWorker() {
  if (!worker) {
    return;
  }

  await worker.close();
  worker = null;

  console.log("[RENDER WORKER] Stopped");
}

module.exports = {
  startRenderWorker,
  stopRenderWorker,
};
