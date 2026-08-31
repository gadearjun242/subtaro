"use strict";

const mongoose = require("mongoose");

// ============================================================
// PIPELINE STEP SCHEMA
// ============================================================
//
// IMPORTANT:
//
// Do NOT store `result` from the Python subtitle service.
//
// The Python service returns internal paths such as:
//
// /app/src/output/project-id/...
//
// Those paths are useless to Node and should never be persisted.
//
// Only compact state required by the application is stored.
// ============================================================

const projectStepSchema = new mongoose.Schema(
  {
    stepNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    status: {
      type: String,
      enum: ["pending", "running", "success", "failed", "skipped"],
      default: "pending",
      required: true,
    },

    startedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    durationSeconds: {
      type: Number,
      default: null,
      min: 0,
    },

    error: {
      type: String,
      default: null,
      maxlength: 5000,
    },
  },
  {
    _id: false,
  },
);

// ============================================================
// CLOUDINARY / FILE SCHEMA
// ============================================================

const fileSchema = new mongoose.Schema(
  {
    // Public delivery URL
    url: {
      type: String,
      default: null,
      trim: true,
    },

    // Cloudinary public ID
    publicId: {
      type: String,
      default: null,
      trim: true,
    },

    // Cloudinary resource type
    resourceType: {
      type: String,
      enum: ["video", "image", "raw"],
      default: "raw",
    },

    // File extension / Cloudinary format
    format: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
    },

    // Original file name from user's upload.
    //
    // This is useful for the original input only.
    originalName: {
      type: String,
      default: null,
      trim: true,
      maxlength: 500,
    },

    // File size in bytes
    sizeBytes: {
      type: Number,
      default: null,
      min: 0,
    },

    // Browser-provided / detected MIME type
    mimeType: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
    },

    // Media duration.
    //
    // Relevant to video/audio.
    durationSeconds: {
      type: Number,
      default: null,
      min: 0,
    },

    // Optional video/image dimensions.
    width: {
      type: Number,
      default: null,
      min: 1,
    },

    height: {
      type: Number,
      default: null,
      min: 1,
    },
  },
  {
    _id: false,
  },
);

// ============================================================
// PROJECT LOG SCHEMA
// ============================================================
//
// These are APPLICATION logs, not raw Python logs.
//
// Never store:
// - logs_so_far
// - step_logs
// - webhook URLs
// - webhook tokens
// - /app/... internal paths
// - full FastAPI result objects
//
// Keep logs compact.
// ============================================================

const projectLogSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },

    level: {
      type: String,
      enum: ["info", "warning", "error", "debug"],
      default: "info",
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    stepNumber: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },

    stepName: {
      type: String,
      default: null,
      trim: true,
      maxlength: 100,
    },

    // Small structured metadata only.
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    _id: true,
  },
);

// ============================================================
// SUBTITLE FILE SCHEMA
// ============================================================
//
// We intentionally don't use the generic fileSchema directly
// for subtitles because SRT-specific data is easier to keep
// explicit.
// ============================================================

const subtitleFileSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      default: null,
      trim: true,
    },

    publicId: {
      type: String,
      default: null,
      trim: true,
    },

    resourceType: {
      type: String,
      enum: ["raw"],
      default: "raw",
    },

    format: {
      type: String,
      enum: ["srt", "vtt", "ass", "ssa", "txt"],
      default: "srt",
    },

    sizeBytes: {
      type: Number,
      default: null,
      min: 0,
    },
  },
  {
    _id: false,
  },
);

// ============================================================
// FINAL OUTPUT FILE
// ============================================================
//
// This represents the FINAL video with subtitles burned in.
//
// For audio projects this remains null and:
// output.status = "not_required"
// ============================================================

const outputFileSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      default: null,
      trim: true,
    },

    publicId: {
      type: String,
      default: null,
      trim: true,
    },

    resourceType: {
      type: String,
      enum: ["video"],
      default: "video",
    },

    format: {
      type: String,
      default: "mp4",
      trim: true,
      lowercase: true,
    },

    sizeBytes: {
      type: Number,
      default: null,
      min: 0,
    },

    width: {
      type: Number,
      default: null,
      min: 1,
    },

    height: {
      type: Number,
      default: null,
      min: 1,
    },

    durationSeconds: {
      type: Number,
      default: null,
      min: 0,
    },
  },
  {
    _id: false,
  },
);

// ============================================================
// PROJECT SCHEMA
// ============================================================

const projectSchema = new mongoose.Schema(
  {
    // ========================================================
    // OWNERSHIP
    // ========================================================

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ========================================================
    // PROJECT IDENTIFIERS
    // ========================================================

    projectId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
      immutable: true,
      maxlength: 100,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    // ========================================================
    // PROJECT STATUS
    // ========================================================

    status: {
      type: String,
      enum: [
        "created",
        "uploading",
        "queued",
        "processing",
        "completed",
        "failed",
        "cancelled",
      ],
      default: "created",
      required: true,
      index: true,
    },

    currentStep: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },

    currentStepName: {
      type: String,
      default: null,
      trim: true,
      maxlength: 100,
    },

    lastCompletedStep: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },

    error: {
      type: String,
      default: null,
      maxlength: 5000,
    },

    // ========================================================
    // ORIGINAL USER INPUT
    // ========================================================
    //
    // This points to the Cloudinary asset originally uploaded
    // by the user.
    // ========================================================

    input: {
      type: fileSchema,
      default: null,
    },

    inputType: {
      type: String,
      enum: ["video", "audio"],
      required: true,
      index: true,
    },

    // ========================================================
    // SUBTITLE DELIVERY MODE (video projects only)
    // ========================================================
    //
    // How the subtitle should be attached to the final output
    // video:
    //
    //   "embedded"   - burned into the video pixels with FFmpeg's
    //                  `subtitles=` filter (always visible,
    //                  re-encodes the video, works everywhere).
    //
    //   "selectable" - muxed as a soft/toggleable subtitle track
    //                  into an .mkv container (like a DVD/MKV
    //                  subtitle track - viewers can turn it on or
    //                  off in a capable player). No re-encoding,
    //                  so it's fast, but browsers can't preview
    //                  .mkv natively - see BACKEND.md.
    //
    // Chosen at project creation, can be changed on a later
    // subtitle edit (PATCH .../subtitle), which then re-renders
    // the output using the new mode. Ignored for audio projects.
    // ========================================================

    subtitleMode: {
      type: String,
      enum: ["embedded", "selectable"],
      default: "embedded",
    },

    // Only meaningful when subtitleMode === "embedded" - which
    // font/size/color/position preset to burn into the video.
    // Ignored (but harmless to store) for "selectable" mode and
    // for audio projects. See services/subtitleStyle.presets.js.
    subtitleStyle: {
      type: String,
      enum: ["classic", "bold_yellow", "minimal_top", "cinematic"],
      default: "classic",
    },

    // ========================================================
    // SUBTITLE SERVICE
    // ========================================================
    //
    // Only store information necessary for communication with
    // the external subtitle service.
    //
    // NO webhook URL.
    // NO webhook secret.
    // NO service filesystem paths.
    // ========================================================

    subtitleService: {
      projectId: {
        type: String,
        default: null,
        trim: true,
      },

      status: {
        type: String,
        enum: ["not_started", "submitted", "processing", "completed", "failed"],
        default: "not_started",
      },

      submittedAt: {
        type: Date,
        default: null,
      },

      startedAt: {
        type: Date,
        default: null,
      },

      completedAt: {
        type: Date,
        default: null,
      },

      // Optional external service language information.
      language: {
        type: String,
        default: null,
        trim: true,
      },
    },

    // ========================================================
    // PIPELINE STEPS
    // ========================================================
    //
    // Only compact state.
    // No raw service results.
    // ========================================================

    steps: {
      type: [projectStepSchema],

      default: () => [
        {
          stepNumber: 1,
          name: "audio_separation",
          status: "pending",
        },

        {
          stepNumber: 2,
          name: "speaker_diarization",
          status: "pending",
        },

        {
          stepNumber: 3,
          name: "speaker_segment_preparation",
          status: "pending",
        },

        {
          stepNumber: 4,
          name: "speaker_aware_transcription",
          status: "pending",
        },

        {
          stepNumber: 5,
          name: "original_subtitle_generation",
          status: "pending",
        },
      ],
    },

    // ========================================================
    // SUBTITLE OUTPUT
    // ========================================================
    //
    // This is the generated original-language subtitle.
    // ========================================================

    subtitle: {
      status: {
        type: String,
        enum: ["pending", "processing", "completed", "failed", "not_required"],
        default: "pending",
      },

      language: {
        type: String,
        default: null,
        trim: true,
      },

      languageName: {
        type: String,
        default: null,
        trim: true,
      },

      wordCount: {
        type: Number,
        default: 0,
        min: 0,
      },

      subtitleCount: {
        type: Number,
        default: 0,
        min: 0,
      },

      file: {
        type: subtitleFileSchema,
        default: null,
      },

      // Plain-text copy of the subtitle content (index numbers
      // and timestamps stripped), used only so project search
      // can match inside subtitle content. `select: false` keeps
      // it out of normal API responses - it's still filterable
      // in queries (Mongoose projection doesn't affect $regex
      // matching), see getMyProjects()'s search handling.
      searchText: {
        type: String,
        default: null,
        select: false,
      },

      generatedAt: {
        type: Date,
        default: null,
      },
    },

    // ========================================================
    // FINAL OUTPUT VIDEO
    // ========================================================
    //
    // VIDEO:
    //   pending → processing → completed
    //
    // AUDIO:
    //   not_required
    //
    // This is the final FFmpeg-rendered video.
    // ========================================================

    output: {
      status: {
        type: String,
        enum: ["pending", "processing", "completed", "failed", "not_required"],
        default: "pending",
      },

      // Mirrors `subtitleMode` at the moment THIS file was
      // generated (kept even if `subtitleMode` changes later,
      // so the UI can show what the current file actually is).
      mode: {
        type: String,
        enum: ["embedded", "selectable"],
        default: "embedded",
      },

      file: {
        type: outputFileSchema,
        default: null,
      },

      generatedAt: {
        type: Date,
        default: null,
      },
    },

    // ========================================================
    // NOTIFICATIONS
    // ========================================================
    //
    // Tracks whether the completion/failure email for this
    // project has been sent, so it's never sent twice and so
    // support can see exactly what happened if a user reports
    // "I never got an email" (see BACKEND.md).
    // ========================================================

    notifications: {
      completionEmail: {
        enabled: {
          type: Boolean,
          default: true,
        },

        status: {
          type: String,
          enum: ["pending", "sent", "failed", "not_required"],
          default: "pending",
        },

        sentAt: {
          type: Date,
          default: null,
        },

        attempts: {
          type: Number,
          default: 0,
          min: 0,
        },

        lastError: {
          type: String,
          default: null,
        },

        messageId: {
          type: String,
          default: null,
        },
      },
    },

    // ========================================================
    // PROCESSING INFORMATION
    // ========================================================

    processing: {
      startedAt: {
        type: Date,
        default: null,
      },

      completedAt: {
        type: Date,
        default: null,
      },

      durationSeconds: {
        type: Number,
        default: null,
        min: 0,
      },

      retryCount: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    // ========================================================
    // APPLICATION LOGS
    // ========================================================

    logs: {
      type: [projectLogSchema],
      default: [],
    },

    // ========================================================
    // FINAL FAILURE INFORMATION
    // ========================================================

    failure: {
      step: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },

      message: {
        type: String,
        default: null,
        maxlength: 5000,
      },

      occurredAt: {
        type: Date,
        default: null,
      },
    },

    // ========================================================
    // ANALYTICS / SOURCE METADATA
    // ========================================================
    //
    // This is intentionally kept separate from `input`.
    //
    // It contains useful analytics attributes without storing
    // unnecessary duplicate Cloudinary information.
    // ========================================================

    metadata: {
      originalFilename: {
        type: String,
        default: null,
        trim: true,
        maxlength: 500,
      },

      source: {
        type: String,
        enum: ["upload", "api", "other"],
        default: "upload",
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
    minimize: true,
  },
);

// ============================================================
// INDEXES
// ============================================================

// User dashboard.
//
// Most common query:
//
// Project.find({
//   userId
// }).sort({
//   createdAt: -1
// })

projectSchema.index({
  userId: 1,
  createdAt: -1,
});

// User dashboard filtering by status.

projectSchema.index({
  userId: 1,
  status: 1,
  createdAt: -1,
});

// User + input type filtering.

projectSchema.index({
  userId: 1,
  inputType: 1,
  createdAt: -1,
});

// External subtitle service callback lookup.

projectSchema.index({
  "subtitleService.projectId": 1,
});

// Processing queue / operational queries.

projectSchema.index({
  status: 1,
  createdAt: -1,
});

// ============================================================
// VALIDATION
// ============================================================

// Prevent malformed project step arrays.
//
// The application always expects exactly five pipeline steps.

projectSchema.path("steps").validate(function validateSteps(steps) {
  if (!Array.isArray(steps)) {
    return false;
  }

  const numbers = steps
    .map((step) => Number(step.stepNumber))
    .sort((a, b) => a - b);

  return (
    numbers.length === 5 &&
    numbers[0] === 1 &&
    numbers[1] === 2 &&
    numbers[2] === 3 &&
    numbers[3] === 4 &&
    numbers[4] === 5
  );
}, "Project must contain exactly five pipeline steps.");

// ============================================================
// INSTANCE HELPERS
// ============================================================

projectSchema.methods.isCompleted = function isCompleted() {
  return this.status === "completed";
};

projectSchema.methods.isProcessing = function isProcessing() {
  return this.status === "processing" || this.status === "queued";
};

projectSchema.methods.hasFailed = function hasFailed() {
  return this.status === "failed";
};

// ============================================================
// EXPORT
// ============================================================

module.exports = mongoose.model("Project", projectSchema);
