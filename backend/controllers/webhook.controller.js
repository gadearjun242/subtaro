"use strict";

const crypto = require("crypto");
const fs = require("fs");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");

const Project = require("../models/Project");

const {
  emitProjectEvent,
} = require("../services/socket.service");

const {
  uploadFile,
} = require("../services/cloudinary.service");

const {
  createTempDirectory,
  downloadToFile,
  renderVideoWithSubtitles,
  muxSelectableSubtitles,
} = require("../services/media.service");

const {
  extractPlainTextFromSrt,
} = require("../services/srt.service");

const {
  getForceStyle,
} = require("../services/subtitleStyle.presets");

const {
  notifyProjectOutcome,
} = require("../services/notification.service");

const {
  renderQueue,
} = require("../queues/render.queue");

// ============================================================
// CONFIGURATION
// ============================================================

const SUBTITLE_SERVICE_URL = (
  process.env.SUBTITLE_SERVICE_URL
)?.replace(/\/+$/, "");

const WEBHOOK_MASTER_SECRET =
  process.env.WEBHOOK_MASTER_SECRET;

const MAX_SRT_BYTES = Number(
  process.env.MAX_SUBTITLE_DOWNLOAD_BYTES ||
  10 * 1024 * 1024
);

const MAX_SOURCE_BYTES = Number(
  process.env.MAX_SOURCE_DOWNLOAD_BYTES ||
  4 * 1024 * 1024 * 1024
);

const MAX_PROJECT_LOGS = 500;

// ============================================================
// VALIDATION
// ============================================================

if (!WEBHOOK_MASTER_SECRET) {
  throw new Error(
    "WEBHOOK_MASTER_SECRET is required"
  );
}

// ============================================================
// PIPELINE DEFINITIONS
// ============================================================

const PIPELINE_STEPS = {
  1: "audio_separation",
  2: "speaker_diarization",
  3: "speaker_segment_preparation",
  4: "speaker_aware_transcription",
  5: "original_subtitle_generation",
};

// ============================================================
// WEBHOOK TOKEN
// ============================================================

function generateWebhookToken(projectId) {
  return crypto
    .createHmac(
      "sha256",
      WEBHOOK_MASTER_SECRET
    )
    .update(String(projectId))
    .digest("hex");
}

function verifyWebhookToken(
  projectId,
  receivedToken
) {
  if (!receivedToken) {
    return false;
  }

  const expectedToken =
    generateWebhookToken(projectId);

  const expectedBuffer = Buffer.from(
    expectedToken,
    "utf8"
  );

  const receivedBuffer = Buffer.from(
    String(receivedToken),
    "utf8"
  );

  if (
    expectedBuffer.length !==
    receivedBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    expectedBuffer,
    receivedBuffer
  );
}

// ============================================================
// BASIC HELPERS
// ============================================================

function safeNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

function safeStepNumber(value) {
  const number = safeNumber(value);

  if (number === null) {
    return null;
  }

  if (
    number < 1 ||
    number > 5
  ) {
    return null;
  }

  return Math.trunc(number);
}

function safeDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function calculateDuration(
  startedAt,
  completedAt
) {
  const start = safeDate(startedAt);
  const end = safeDate(completedAt);

  if (!start || !end) {
    return null;
  }

  return Math.max(
    0,
    (end.getTime() - start.getTime()) / 1000
  );
}

function normalizeServiceStatus(status) {
  switch (
  String(status || "").toLowerCase()
  ) {
    case "queued":
      return "queued";

    case "running":
      return "processing";

    case "completed":
      return "completed";

    case "failed":
      return "failed";

    default:
      return "processing";
  }
}

function getStepName(stepNumber) {
  return (
    PIPELINE_STEPS[
    String(stepNumber)
    ] || null
  );
}

// ============================================================
// PROJECT LOG
// ============================================================

function addProjectLog(
  project,
  {
    level = "info",
    message,
    stepNumber = null,
    stepName = null,
    metadata = null,
  }
) {
  if (!Array.isArray(project.logs)) {
    project.logs = [];
  }

  project.logs.push({
    timestamp: new Date(),
    level,
    message,
    stepNumber,
    stepName,
    metadata,
  });

  if (
    project.logs.length >
    MAX_PROJECT_LOGS
  ) {
    project.logs =
      project.logs.slice(
        -MAX_PROJECT_LOGS
      );
  }
}

// ============================================================
// ENSURE STEP STRUCTURE
// ============================================================

function ensureProjectSteps(project) {
  const valid =
    Array.isArray(project.steps) &&
    project.steps.length === 5 &&
    project.steps.every(
      (step) =>
        step &&
        Number(step.stepNumber) >= 1 &&
        Number(step.stepNumber) <= 5
    );

  if (valid) {
    return;
  }

  project.steps = Object.entries(
    PIPELINE_STEPS
  ).map(
    ([stepNumber, name]) => ({
      stepNumber: Number(stepNumber),
      name,
      status: "pending",
      startedAt: null,
      completedAt: null,
      durationSeconds: null,
      error: null,
    })
  );
}

// ============================================================
// FIND LOCAL STEP
// ============================================================

function findLocalStep(
  project,
  stepNumber
) {
  return project.steps.find(
    (step) =>
      Number(step.stepNumber) ===
      Number(stepNumber)
  );
}

// ============================================================
// UPDATE STEP
// ============================================================

function updateStepFromWebhook(
  project,
  payload
) {
  const remoteStep =
    payload?.step;

  if (!remoteStep) {
    return null;
  }

  const stepNumber =
    safeStepNumber(
      remoteStep.number
    );

  if (stepNumber === null) {
    return null;
  }

  ensureProjectSteps(project);

  let localStep =
    findLocalStep(
      project,
      stepNumber
    );

  if (!localStep) {
    return null;
  }

  localStep.name =
    remoteStep.name ||
    getStepName(stepNumber) ||
    localStep.name;

  if (remoteStep.status) {
    localStep.status =
      String(
        remoteStep.status
      ).toLowerCase();
  }

  const startedAt =
    safeDate(
      remoteStep.started_at
    );

  const completedAt =
    safeDate(
      remoteStep.completed_at
    );

  if (startedAt) {
    localStep.startedAt =
      startedAt;
  }

  if (completedAt) {
    localStep.completedAt =
      completedAt;
  }

  if (startedAt && completedAt) {
    localStep.durationSeconds =
      calculateDuration(
        startedAt,
        completedAt
      );
  }

  localStep.error =
    remoteStep.error ||
    null;

  return localStep;
}

// ============================================================
// EXTRACT ONLY USEFUL STEP METADATA
// ============================================================

function extractStepMetadata(
  project,
  payload
) {
  const stepNumber =
    safeStepNumber(
      payload?.step?.number
    );

  if (stepNumber === null) {
    return;
  }

  const result =
    payload?.step?.result;

  if (
    !result ||
    typeof result !== "object"
  ) {
    return;
  }

  // ----------------------------------------------------------
  // STEP 4
  //
  // Example:
  // language = en
  // total_words = 36
  // ----------------------------------------------------------

  if (stepNumber === 4) {
    const language =
      result.language;

    if (language) {
      project.subtitleService =
        project.subtitleService || {};

      project.subtitleService.language =
        String(language);
    }

    const wordCount =
      safeNumber(
        result.total_words
      );

    if (wordCount !== null) {
      project.subtitle.wordCount =
        wordCount;
    }
  }

  // ----------------------------------------------------------
  // STEP 5
  //
  // Example:
  // language = en
  // language_name = English
  // subtitle_count = 5
  // word_count = 36
  //
  // IMPORTANT:
  // We extract these values but NEVER store the entire result.
  // ----------------------------------------------------------

  if (stepNumber === 5) {
    const language =
      result.language;

    if (language) {
      project.subtitleService =
        project.subtitleService || {};

      project.subtitleService.language =
        String(language);

      project.subtitle.language =
        String(language);
    }

    if (result.language_name) {
      project.subtitle.languageName =
        String(
          result.language_name
        );
    }

    const subtitleCount =
      safeNumber(
        result.subtitle_count
      );

    if (
      subtitleCount !== null
    ) {
      project.subtitle.subtitleCount =
        subtitleCount;
    }

    const wordCount =
      safeNumber(
        result.word_count
      );

    if (
      wordCount !== null
    ) {
      project.subtitle.wordCount =
        wordCount;
    }

    // Step 5 is the end of the external pipeline.
    const completedAt =
      safeDate(
        payload.step.completed_at
      );

    if (completedAt) {
      project.subtitle.generatedAt =
        completedAt;
    }
  }
}

// ============================================================
// GET SUBTITLE DOWNLOAD URL
// ============================================================

function getSubtitleUrl(
  projectId,
  payload
) {
  const remoteUrl =
    payload?.subtitle_download_url;

  if (remoteUrl) {
    if (
      /^https?:\/\//i.test(
        remoteUrl
      )
    ) {
      return remoteUrl;
    }

    return (
      `${SUBTITLE_SERVICE_URL}` +
      (
        remoteUrl.startsWith("/")
          ? ""
          : "/"
      ) +
      remoteUrl
    );
  }

  return (
    `${SUBTITLE_SERVICE_URL}` +
    `/projects/${encodeURIComponent(
      projectId
    )}/subtitle`
  );
}

// ============================================================
// VALIDATE SRT
// ============================================================

async function validateSrt(
  filePath
) {
  const stats =
    await fsp.stat(filePath);

  if (stats.size <= 0) {
    throw new Error(
      "Subtitle file is empty."
    );
  }

  if (
    stats.size >
    MAX_SRT_BYTES
  ) {
    throw new Error(
      "Subtitle file exceeds the maximum allowed size."
    );
  }

  const content =
    await fsp.readFile(
      filePath,
      "utf8"
    );

  const hasTimestamp =
    /\d{2}:\d{2}:\d{2}[,.]\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}[,.]\d{3}/.test(
      content
    );

  if (!hasTimestamp) {
    throw new Error(
      "Downloaded file does not appear to be a valid SRT file."
    );
  }

  return true;
}

// ============================================================
// EMIT PROJECT EVENT
// ============================================================

async function emitSafeProjectEvent({
  project,
  type,
  message,
  stepNumber = null,
  data = {},
}) {
  try {
    await emitProjectEvent({
      projectId:
        project.projectId,

      userId:
        project.userId.toString(),

      type,

      status:
        project.status,

      stepNumber,

      message,

      data,
    });
  } catch (error) {
    // Socket failure must NEVER cause the webhook itself
    // to become a failure.
    console.error(
      `[SOCKET] Failed to emit project event for ${project.projectId}:`,
      error.message
    );
  }
}

// ============================================================
// ATOMIC FINALIZATION CLAIM
// ============================================================

async function claimFinalization(
  projectId,
  { isRetry = false } = {}
) {
  /*
   * We use output.status as a durable finalization lock.

   * pending/failed
   *       ↓
   *    processing
   *       ↓
   * completed / not_required

   * Because this is an atomic MongoDB operation, duplicate
   * pipeline_completed webhooks cannot safely start two
   * finalization jobs.
   *
   * IMPORTANT: this lock predates the BullMQ render queue. Once
   * jobs can be *retried* (e.g. after the worker process crashes
   * mid-render), a plain "processing" exclusion would permanently
   * block the retry too - the crashed attempt leaves output.status
   * stuck at "processing" forever, and BullMQ's retry would find
   * it "already claimed" and silently no-op, exactly defeating the
   * reason retries exist. `isRetry` (true when this is attempt 2+
   * of the SAME BullMQ job, not a fresh trigger) relaxes the guard
   * to also allow reclaiming from "processing" - a genuine retry
   * of our own prior attempt should always be allowed to proceed,
   * whereas a brand-new trigger (isRetry: false) still can't steal
   * a project that's actively "processing" from a concurrent
   * duplicate delivery.
   */

  const excludedStatuses = isRetry
    ? ["completed", "not_required"]
    : ["processing", "completed", "not_required"];

  return Project.findOneAndUpdate(
    {
      projectId,

      "output.status": {
        $nin: excludedStatuses,
      },
    },
    {
      $set: {
        "output.status":
          "processing",
      },
    },
    {
      new: true,
    }
  );
}

// ============================================================
// FINALIZE PROJECT
// ============================================================

async function finalizeProject({
  projectId,
  payload,
  isRetry = false,
}) {
  const project =
    await claimFinalization(
      projectId,
      { isRetry }
    );

  if (!project) {
    /*
     * Another request is already finalizing
     * this project or the project is already complete.
     */
    return;
  }

  const tempDir =
    await createTempDirectory(
      `subtitle-${projectId}`
    );

  const subtitlePath =
    path.join(
      tempDir,
      "original.srt"
    );

  const sourceMediaPath =
    path.join(
      tempDir,
      "source-media"
    );

  const finalVideoPath =
    path.join(
      tempDir,
      "final-subtitled.mp4"
    );

  try {
    // ========================================================
    // 1. DOWNLOAD SRT
    // ========================================================

    const subtitleUrl =
      getSubtitleUrl(
        projectId,
        payload
      );

    addProjectLog(
      project,
      {
        message:
          "Downloading generated subtitle file.",
        metadata: {
          event:
            "subtitle_download_started",
        },
      }
    );

    await project.save();

    await downloadToFile({
      url: subtitleUrl,
      destination:
        subtitlePath,
      maxBytes:
        MAX_SRT_BYTES,
    });

    await validateSrt(
      subtitlePath
    );

    const subtitleSearchText =
      await fsp
        .readFile(subtitlePath, "utf8")
        .then(extractPlainTextFromSrt)
        .catch(() => "");

    // ========================================================
    // 2. UPLOAD SRT
    // ========================================================

    const subtitleUpload =
      await uploadFile(
        subtitlePath,
        {
          folder:
            `subtitle-app/users/${project.userId}/projects/${projectId}/subtitles`,

          resourceType:
            "raw",

          publicId:
            "original_subtitle.srt",

          overwrite: true,
        }
      );

    project.subtitle = {
      ...(project.subtitle || {}),
      status: "completed",

      language:
        project.subtitle
          ?.language ||
        project.subtitleService
          ?.language ||
        payload.language ||
        null,

      languageName:
        project.subtitle
          ?.languageName ||
        payload.language_name ||
        null,

      wordCount:
        project.subtitle
          ?.wordCount ||
        safeNumber(
          payload.word_count
        ) ||
        0,

      subtitleCount:
        project.subtitle
          ?.subtitleCount ||
        safeNumber(
          payload.subtitle_count
        ) ||
        0,

      file: {
        url:
          subtitleUpload.url,

        publicId:
          subtitleUpload.publicId,

        resourceType:
          subtitleUpload.resourceType ||
          "raw",

        format:
          subtitleUpload.format ||
          "srt",

        sizeBytes:
          subtitleUpload.bytes ||
          null,
      },

      searchText:
        subtitleSearchText,

      generatedAt:
        project.subtitle
          ?.generatedAt ||
        safeDate(
          payload.completed_at
        ) ||
        new Date(),
    };

    addProjectLog(
      project,
      {
        message:
          "Subtitle file uploaded successfully.",
        metadata: {
          event:
            "subtitle_uploaded",
        },
      }
    );

    await project.save();

    await emitSafeProjectEvent({
      project,
      type:
        "subtitle_ready",
      message:
        "Subtitle file is ready.",
      data: {
        projectId,
        subtitle: {
          status:
            project.subtitle
              .status,

          language:
            project.subtitle
              .language,

          languageName:
            project.subtitle
              .languageName,

          wordCount:
            project.subtitle
              .wordCount,

          subtitleCount:
            project.subtitle
              .subtitleCount,

          file:
            project.subtitle
              .file,
        },
      },
    });

    // ========================================================
    // 3. AUDIO PROJECT
    // ========================================================

    if (
      project.inputType ===
      "audio"
    ) {
      const completedAt =
        new Date();

      project.status =
        "completed";

      project.currentStep =
        null;

      project.currentStepName =
        null;

      project.lastCompletedStep =
        5;

      project.subtitleService =
        project.subtitleService ||
        {};

      project.subtitleService.status =
        "completed";

      project.subtitleService.completedAt =
        safeDate(
          payload.completed_at
        ) ||
        completedAt;

      project.output = {
        status:
          "not_required",

        file: null,

        generatedAt: null,
      };

      project.processing =
        project.processing ||
        {};

      project.processing.completedAt =
        completedAt;

      if (
        project.processing.startedAt
      ) {
        project.processing
          .durationSeconds =
          calculateDuration(
            project.processing
              .startedAt,
            completedAt
          );
      }

      project.error = null;
      project.failure = null;

      addProjectLog(
        project,
        {
          message:
            "Audio project completed. Subtitle file is available; video rendering was not required.",
          metadata: {
            event:
              "project_completed",
            inputType:
              "audio",
          },
        }
      );

      await project.save();

      await emitSafeProjectEvent({
        project,
        type:
          "project_completed",
        message:
          "Project completed successfully.",
        data: {
          projectId,
          status:
            "completed",
          subtitle:
            project.subtitle,
          output: {
            status:
              "not_required",
          },
        },
      });

      notifyProjectOutcome(project, "completed").catch((error) => {
        console.error(
          `[NOTIFY] Completion email failed for ${projectId}:`,
          error.message
        );
      });

      return;
    }

    // ========================================================
    // 4. VIDEO PROJECT
    // ========================================================

    if (
      project.inputType !==
      "video"
    ) {
      throw new Error(
        `Unsupported project inputType: ${project.inputType}`
      );
    }

    if (
      !project.input?.url
    ) {
      throw new Error(
        "Original video URL is missing."
      );
    }

    addProjectLog(
      project,
      {
        message:
          "Downloading original video for subtitle rendering.",
        metadata: {
          event:
            "source_video_download_started",
        },
      }
    );

    await project.save();

    await downloadToFile({
      url:
        project.input.url,

      destination:
        sourceMediaPath,

      maxBytes:
        MAX_SOURCE_BYTES,
    });

    // ========================================================
    // 5. FFMPEG
    // ========================================================

    const subtitleMode =
      project.subtitleMode === "selectable"
        ? "selectable"
        : "embedded";

    // Both modes output .mp4 now - "embedded" burns captions into
    // the pixels, "selectable" adds them as a toggleable mov_text
    // track - see muxSelectableSubtitles() in media.service.js for
    // why this no longer needs a separate .mkv file.
    const outputExtension = "mp4";
    const renderedVideoPath = finalVideoPath;

    addProjectLog(
      project,
      {
        message:
          subtitleMode === "selectable"
            ? "Muxing a selectable subtitle track into the video with FFmpeg."
            : "Rendering subtitles into video with FFmpeg.",
        metadata: {
          event:
            "ffmpeg_started",
          subtitleMode,
        },
      }
    );

    await project.save();

    if (subtitleMode === "selectable") {
      const muxResult = await muxSelectableSubtitles({
        inputVideoPath:
          sourceMediaPath,

        subtitlePath,

        outputVideoPath:
          renderedVideoPath,
      });

      addProjectLog(
        project,
        {
          message: muxResult.transcoded
            ? `Source video codec (${muxResult.sourceVideoCodec || "unknown"}) needed a re-encode for MP4/browser compatibility`
            : "Source video was already browser-compatible - streams copied without re-encoding",
          metadata: {
            event: "selectable_mux_completed",
            transcoded: muxResult.transcoded,
            sourceVideoCodec: muxResult.sourceVideoCodec,
            sourceAudioCodec: muxResult.sourceAudioCodec,
          },
        }
      );

      await project.save();
    } else {
      await renderVideoWithSubtitles({
        inputVideoPath:
          sourceMediaPath,

        subtitlePath,

        outputVideoPath:
          renderedVideoPath,

        forceStyle:
          getForceStyle(project.subtitleStyle),
      });
    }

    // ========================================================
    // 6. UPLOAD FINAL VIDEO
    // ========================================================

    addProjectLog(
      project,
      {
        message:
          "Uploading final subtitled video to Cloudinary.",
        metadata: {
          event:
            "final_video_upload_started",
        },
      }
    );

    await project.save();

    const finalVideoUpload =
      await uploadFile(
        renderedVideoPath,
        {
          folder:
            `subtitle-app/users/${project.userId}/projects/${projectId}/output`,

          resourceType:
            "video",

          publicId:
            "final_subtitled_video",

          overwrite: true,
        }
      );

    // ========================================================
    // 7. FINAL DATABASE STATE
    // ========================================================

    const completedAt =
      new Date();

    project.output = {
      status:
        "completed",

      mode:
        subtitleMode,

      file: {
        url:
          finalVideoUpload.url,

        publicId:
          finalVideoUpload.publicId,

        resourceType:
          finalVideoUpload.resourceType ||
          "video",

        format:
          finalVideoUpload.format ||
          outputExtension,

        sizeBytes:
          finalVideoUpload.bytes ||
          null,

        width:
          finalVideoUpload.width ||
          null,

        height:
          finalVideoUpload.height ||
          null,

        durationSeconds:
          finalVideoUpload.duration ??
          project.input
            ?.durationSeconds ??
          null,
      },

      generatedAt:
        completedAt,
    };

    project.subtitle.status =
      "completed";

    project.subtitleService =
      project.subtitleService ||
      {};

    project.subtitleService.status =
      "completed";

    project.subtitleService.completedAt =
      safeDate(
        payload.completed_at
      ) ||
      project.subtitleService
        .completedAt ||
      completedAt;

    project.status =
      "completed";

    project.currentStep =
      null;

    project.currentStepName =
      null;

    project.lastCompletedStep =
      5;

    project.error = null;
    project.failure = null;

    project.processing =
      project.processing ||
      {};

    project.processing.completedAt =
      completedAt;

    if (
      project.processing.startedAt
    ) {
      project.processing
        .durationSeconds =
        calculateDuration(
          project.processing
            .startedAt,
          completedAt
        );
    }

    addProjectLog(
      project,
      {
        message:
          "Project completed successfully.",
        metadata: {
          event:
            "project_completed",
          subtitle:
            true,
          finalVideo:
            true,
        },
      }
    );

    await project.save();

    // ========================================================
    // 8. SOCKET
    // ========================================================

    await emitSafeProjectEvent({
      project,
      type:
        "project_completed",

      message:
        "Project completed successfully.",

      data: {
        projectId,

        status:
          project.status,

        subtitle: {
          status:
            project.subtitle
              .status,

          language:
            project.subtitle
              .language,

          languageName:
            project.subtitle
              .languageName,

          wordCount:
            project.subtitle
              .wordCount,

          subtitleCount:
            project.subtitle
              .subtitleCount,

          file:
            project.subtitle
              .file,
        },

        output:
          project.output,
      },
    });

    notifyProjectOutcome(project, "completed").catch((error) => {
      console.error(
        `[NOTIFY] Completion email failed for ${projectId}:`,
        error.message
      );
    });
  } catch (error) {
    // ========================================================
    // FINALIZATION FAILURE
    // ========================================================

    const failedAt =
      new Date();

    project.status =
      "failed";

    project.error =
      error.message;

    project.failure = {
      step: 5,
      message:
        error.message,
      occurredAt:
        failedAt,
    };

    project.subtitle =
      project.subtitle || {};

    project.subtitle.status =
      "failed";

    project.output =
      project.output || {};

    project.output.status =
      "failed";

    project.processing =
      project.processing || {};

    project.processing.completedAt =
      failedAt;

    if (
      project.processing.startedAt
    ) {
      project.processing
        .durationSeconds =
        calculateDuration(
          project.processing
            .startedAt,
          failedAt
        );
    }

    addProjectLog(
      project,
      {
        level:
          "error",

        message:
          `Final output generation failed: ${error.message}`,

        stepNumber: 5,

        stepName:
          "original_subtitle_generation",

        metadata: {
          event:
            "finalization_failed",
        },
      }
    );

    await project.save();

    await emitSafeProjectEvent({
      project,
      type:
        "project_failed",

      message:
        `Project finalization failed: ${error.message}`,

      stepNumber: 5,

      data: {
        projectId,
        status:
          "failed",
        error:
          error.message,
      },
    });

    notifyProjectOutcome(project, "failed").catch((notifyError) => {
      console.error(
        `[NOTIFY] Failure email failed for ${projectId}:`,
        notifyError.message
      );
    });

    throw error;
  } finally {
    await fsp.rm(
      tempDir,
      {
        recursive: true,
        force: true,
      }
    );
  }
}

// ============================================================
// MAIN WEBHOOK CONTROLLER
// ============================================================

const subtitleWebhook =
  async (
    req,
    res
  ) => {
    const projectId =
      String(
        req.params.projectId ||
        ""
      ).trim();

    try {
      // ======================================================
      // 1. PROJECT ID
      // ======================================================

      if (!projectId) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Project ID is required.",
          });
      }

      // ======================================================
      // 2. TOKEN
      // ======================================================

      const token =
        String(
          req.query.token ||
          ""
        ).trim();

      if (!token) {
        return res
          .status(401)
          .json({
            success: false,
            message:
              "Webhook token is required.",
          });
      }

      if (
        !verifyWebhookToken(
          projectId,
          token
        )
      ) {
        return res
          .status(401)
          .json({
            success: false,
            message:
              "Invalid webhook token.",
          });
      }

      // ======================================================
      // 3. BODY
      // ======================================================

      if (
        !req.body ||
        typeof req.body !==
        "object" ||
        Array.isArray(
          req.body
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid webhook payload.",
          });
      }

      const payload =
        req.body;

      // ======================================================
      // IMPORTANT:
      //
      // DO NOT console.log(payload).
      //
      // The payload contains logs_so_far and that may contain
      // the webhook URL + token.
      // ======================================================

      // ======================================================
      // 4. PROJECT ID MATCH
      // ======================================================

      if (
        payload.project_id &&
        String(
          payload.project_id
        ) !== projectId
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Webhook project ID mismatch.",
          });
      }

      // ======================================================
      // 5. LOAD PROJECT
      // ======================================================

      const project =
        await Project.findOne({
          projectId,
        });

      if (!project) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Project not found.",
          });
      }

      const userId =
        project.userId.toString();

      const event =
        String(
          payload.event ||
          "webhook_received"
        );

      // ======================================================
      // 6. ENSURE STRUCTURES
      // ======================================================

      ensureProjectSteps(
        project
      );

      project.subtitle =
        project.subtitle || {};

      project.subtitleService =
        project.subtitleService ||
        {};

      project.output =
        project.output || {};

      project.processing =
        project.processing ||
        {};

      // ======================================================
      // 7. UPDATE SERVICE STATE
      // ======================================================

      const serviceStatus =
        normalizeServiceStatus(
          payload.status
        );

      /*
       * IMPORTANT:
       *
       * FastAPI "completed" means:
       *
       *   Step 1-5 completed.
       *
       * It does NOT mean:
       *
       *   SRT uploaded
       *   FFmpeg completed
       *   final video uploaded
       *
       * Therefore project.status remains "processing"
       * until finalizeProject() successfully completes.
       */

      if (
        event ===
        "pipeline_completed"
      ) {
        project.status =
          "processing";
      } else {
        project.status =
          serviceStatus;
      }

      project.currentStep =
        safeStepNumber(
          payload.current_step
        );

      project.currentStepName =
        payload.current_step_name ||
        (
          project.currentStep
            ? getStepName(
              project.currentStep
            )
            : null
        );

      project.lastCompletedStep =
        safeNumber(
          payload.last_completed_step
        ) ?? 0;

      project.error =
        payload.error ||
        null;

      // ======================================================
      // 8. UPDATE SUBTITLE SERVICE STATE
      // ======================================================

      project.subtitleService
        .projectId =
        project.subtitleService
          .projectId ||
        project.projectId;

      if (
        payload.status
      ) {
        if (
          payload.status ===
          "completed"
        ) {
          project.subtitleService
            .status =
            "completed";
        } else {
          project.subtitleService
            .status =
            serviceStatus ===
              "processing"
              ? "processing"
              : serviceStatus;
        }
      }

      if (
        !project.subtitleService
          .startedAt &&
        payload.step?.started_at
      ) {
        project.subtitleService
          .startedAt =
          safeDate(
            payload.step
              .started_at
          );
      }

      // ======================================================
      // 9. UPDATE STEP
      // ======================================================

      const updatedStep =
        updateStepFromWebhook(
          project,
          payload
        );

      // ======================================================
      // 10. EXTRACT ONLY USEFUL RESULT METADATA
      // ======================================================

      extractStepMetadata(
        project,
        payload
      );

      // ======================================================
      // 11. PIPELINE FAILED
      // ======================================================

      if (
        event ===
        "pipeline_failed" ||
        payload.status ===
        "failed"
      ) {
        project.status =
          "failed";

        project.subtitleService
          .status =
          "failed";

        project.error =
          payload.error ||
          "Subtitle service pipeline failed.";

        project.failure = {
          step:
            safeStepNumber(
              payload.current_step
            ),

          message:
            project.error,

          occurredAt:
            new Date(),
        };
      }

      // ======================================================
      // 12. LOG
      // ======================================================

      let logMessage;

      if (
        event ===
        "step_completed"
      ) {
        const number =
          safeStepNumber(
            payload.step?.number
          );

        logMessage =
          number
            ? `Step ${number} completed.`
            : "Pipeline step completed.";
      } else if (
        event ===
        "pipeline_completed"
      ) {
        logMessage =
          "Subtitle processing pipeline completed.";
      } else if (
        event ===
        "pipeline_failed"
      ) {
        logMessage =
          "Subtitle processing pipeline failed.";
      } else {
        logMessage =
          "Subtitle service webhook received.";
      }

      addProjectLog(
        project,
        {
          level:
            project.error
              ? "error"
              : "info",

          message:
            logMessage,

          stepNumber:
            safeStepNumber(
              payload.step?.number
            ),

          stepName:
            payload.step?.name ||
            null,

          metadata: {
            event,

            serviceStatus:
              payload.status ||
              null,

            currentStep:
              project.currentStep,

            lastCompletedStep:
              project.lastCompletedStep,
          },
        }
      );

      // ======================================================
      // 13. SAVE
      // ======================================================

      await project.save();

      // ======================================================
      // 14. SOCKET UPDATE
      // ======================================================

      await emitSafeProjectEvent({
        project,

        type:
          "subtitle_service_update",

        message:
          logMessage,

        stepNumber:
          project.currentStep,

        data: {
          event,

          status:
            project.status,

          currentStep:
            project.currentStep,

          currentStepName:
            project.currentStepName,

          lastCompletedStep:
            project.lastCompletedStep,

          step: updatedStep
            ? {
              stepNumber:
                updatedStep
                  .stepNumber,

              name:
                updatedStep.name,

              status:
                updatedStep.status,

              startedAt:
                updatedStep
                  .startedAt,

              completedAt:
                updatedStep
                  .completedAt,

              durationSeconds:
                updatedStep
                  .durationSeconds,

              error:
                updatedStep.error,
            }
            : null,

          subtitle: {
            language:
              project.subtitle
                .language,

            languageName:
              project.subtitle
                .languageName,

            wordCount:
              project.subtitle
                .wordCount,

            subtitleCount:
              project.subtitle
                .subtitleCount,
          },
        },
      });

      // ======================================================
      // 15. PIPELINE COMPLETED
      // ======================================================

      if (
        event ===
        "pipeline_completed" ||
        (
          payload.status ===
          "completed" &&
          Number(
            payload.last_completed_step
          ) === 5
        )
      ) {
        /*
         * ACK first.
         *
         * SRT download, Cloudinary upload,
         * source download and FFmpeg must NOT
         * block the FastAPI webhook.
         *
         * Enqueued (not setImmediate'd) so the job is
         * persisted in Redis: a server restart mid-render no
         * longer loses it, and BullMQ retries on failure per
         * the queue's defaultJobOptions.
         */

        renderQueue
          .add(
            "finalize-project",
            { projectId, payload }
          )
          .catch(
            (error) => {
              console.error(
                `[FINALIZATION] Failed to enqueue project ${projectId}:`,
                error.message
              );
            }
          );
      }

      // ======================================================
      // 16. FASTAPI PIPELINE FAILURE
      // ======================================================

      if (
        event ===
        "pipeline_failed"
      ) {
        await emitSafeProjectEvent({
          project,

          type:
            "project_failed",

          message:
            project.error,

          stepNumber:
            project.currentStep,

          data: {
            projectId,
            status:
              "failed",
            error:
              project.error,
          },
        });

        notifyProjectOutcome(project, "failed").catch((error) => {
          console.error(
            `[NOTIFY] Failure email failed for ${projectId}:`,
            error.message
          );
        });
      }

      // ======================================================
      // 17. ACK
      // ======================================================

      return res
        .status(200)
        .json({
          success: true,
          received: true,
          event,
          projectId,

          status:
            project.status,

          currentStep:
            project.currentStep,

          lastCompletedStep:
            project.lastCompletedStep,
        });
    } catch (error) {
      console.error(
        "subtitleWebhook error:",
        error
      );

      return res
        .status(
          Number(
            error.statusCode
          ) || 500
        )
        .json({
          success: false,
          message:
            error.message ||
            "Webhook processing failed.",
        });
    }
  };

module.exports = {
  subtitleWebhook,
  finalizeProject,
};