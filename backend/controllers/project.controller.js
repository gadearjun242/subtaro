"use strict";

const mongoose = require("mongoose");
const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const os = require("os");

const Project = require("../models/Project");

const {
  createProject,
  refreshProjectStatus,
  refreshProjectLogs,
  resumeProject,
} = require("../services/project.service");

const {
  uploadFile: uploadToCloudinary,
  deleteFile: deleteFromCloudinary,
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
  SUBTITLE_STYLE_PRESETS,
  DEFAULT_SUBTITLE_STYLE,
  isValidSubtitleStyle,
  getForceStyle,
} = require("../services/subtitleStyle.presets");

const {
  emitProjectEvent,
} = require("../services/socket.service");


// ============================================================
// CONFIG
// ============================================================

const PROJECT_ID_PREFIX =
  process.env.PROJECT_ID_PREFIX ||
  "proj";

const MAX_SOURCE_BYTES = Number(
  process.env.MAX_SOURCE_DOWNLOAD_BYTES ||
  4 * 1024 * 1024 * 1024
);


// ============================================================
// HELPERS
// ============================================================

/**
 * Generate the internal project ID.
 *
 * IMPORTANT:
 * The client never supplies this value.
 */
const generateProjectId = () => {
  return `${PROJECT_ID_PREFIX}_${crypto
    .randomUUID()
    .replace(/-/g, "")}`;
};


/**
 * Check MongoDB ObjectId.
 */
const isValidObjectId = (
  value
) => {
  return mongoose.Types.ObjectId.isValid(
    value
  );
};


/**
 * Convert Mongoose document to safe API response.
 *
 * Do not expose webhook secrets.
 */
const serializeProject = (
  project
) => {
  if (!project) {
    return null;
  }

  const data =
    project.toObject
      ? project.toObject()
      : project;

  // Never expose webhook secret to client.
  if (
    data.webhook
  ) {
    delete data.webhook.secret;
  }

  // Never expose internal failure/debug data unnecessarily.
  return data;
};


// ============================================================
// CREATE PROJECT
// ============================================================

/**
 * POST /api/projects
 *
 * Client does NOT send projectId.
 *
 * Example body:
 *
 * {
 *   "name": "My Interview",
 *   "inputType": "video",
 *
 *   "input": {
 *     "url": "https://res.cloudinary.com/...",
 *     "publicId": "subtitle-app/...",
 *     "resourceType": "video",
 *     "format": "mp4",
 *     "originalName": "interview.mp4",
 *     "sizeBytes": 12345678,
 *     "mimeType": "video/mp4",
 *     "durationSeconds": 120
 *   }
 * }
 */
const createProjectController =
  async (
    req,
    res
  ) => {
    try {
      // --------------------------------------------------------
      // Authentication comes from middleware.
      // --------------------------------------------------------

      const userId =
        req.user._id;

      // --------------------------------------------------------
      // Client may send project metadata,
      // but NEVER projectId.
      // --------------------------------------------------------

      const {
        name,
        inputType,
        input,
        subtitleMode,
        subtitleStyle,
      } = req.body;

      // --------------------------------------------------------
      // Validate name
      // --------------------------------------------------------

      if (
        typeof name !==
        "string"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Project name is required",
        });
      }

      const trimmedName =
        name.trim();

      if (
        trimmedName.length <
        1
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Project name cannot be empty",
        });
      }

      if (
        trimmedName.length >
        200
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Project name cannot exceed 200 characters",
        });
      }

      // --------------------------------------------------------
      // Validate media type
      // --------------------------------------------------------

      if (
        ![
          "video",
          "audio",
        ].includes(
          inputType
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "inputType must be either video or audio",
        });
      }

      // --------------------------------------------------------
      // Validate subtitle delivery mode (video only - ignored,
      // but still validated, for audio projects)
      // --------------------------------------------------------

      if (
        subtitleMode !== undefined &&
        !["embedded", "selectable"].includes(subtitleMode)
      ) {
        return res.status(400).json({
          success: false,
          message:
            'subtitleMode must be "embedded" or "selectable"',
        });
      }

      // --------------------------------------------------------
      // Validate subtitle style preset (only meaningful for
      // "embedded" mode - still validated regardless so a typo
      // never silently falls back)
      // --------------------------------------------------------

      if (
        subtitleStyle !== undefined &&
        !isValidSubtitleStyle(subtitleStyle)
      ) {
        return res.status(400).json({
          success: false,
          message: `subtitleStyle must be one of: ${Object.keys(SUBTITLE_STYLE_PRESETS).join(", ")}`,
        });
      }

      // --------------------------------------------------------
      // Validate uploaded Cloudinary asset
      // --------------------------------------------------------

      if (
        !input ||
        typeof input !==
          "object"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Uploaded input file information is required",
        });
      }

      if (
        !input.url ||
        typeof input.url !==
          "string"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "input.url is required",
        });
      }

      if (
        !input.publicId ||
        typeof input.publicId !==
          "string"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "input.publicId is required",
        });
      }

      // --------------------------------------------------------
      // IMPORTANT:
      //
      // Generate BOTH identifiers on the server.
      //
      // MongoDB _id is generated automatically by Mongoose.
      // projectId is our application/service ID.
      // --------------------------------------------------------

      const generatedProjectId =
        generateProjectId();

      // --------------------------------------------------------
      // Create project
      // --------------------------------------------------------

      const project =
        new Project({
          userId,

          projectId:
            generatedProjectId,

          name:
            trimmedName,

          inputType,

          subtitleMode:
            subtitleMode || "embedded",

          subtitleStyle:
            subtitleStyle || DEFAULT_SUBTITLE_STYLE,

          input: {
            url:
              input.url,

            publicId:
              input.publicId,

            resourceType:
              input.resourceType ||
              (
                inputType ===
                "audio"
                  ? "video"
                  : "video"
              ),

            format:
              input.format ||
              null,

            originalName:
              input.originalName ||
              null,

            sizeBytes:
              Number.isFinite(
                Number(
                  input.sizeBytes
                )
              )
                ? Number(
                    input.sizeBytes
                  )
                : null,

            mimeType:
              input.mimeType ||
              null,

            durationSeconds:
              Number.isFinite(
                Number(
                  input.durationSeconds
                )
              )
                ? Number(
                    input.durationSeconds
                  )
                : null,
          },

          status:
            "created",

          currentStep:
            null,

          currentStepName:
            null,

          lastCompletedStep:
            0,

          processing: {
            startedAt:
              null,

            completedAt:
              null,

            durationSeconds:
              null,

            retryCount:
              0,
          },

          subtitleService: {
            projectId:
              null,

            videoUrl:
              null,

            submittedAt:
              null,

            startedAt:
              null,

            completedAt:
              null,

            status:
              "not_started",
          },
        });

      await project.save();

      // --------------------------------------------------------
      // Start subtitle service.
      //
      // createProject() will:
      //
      // 1. use generated projectId
      // 2. generate webhook secret
      // 3. build webhook URL
      // 4. submit Cloudinary source URL to FastAPI
      // --------------------------------------------------------

      let serviceResult;

      try {
        serviceResult =
          await createProject({
            userId,

            projectId:
              generatedProjectId,
          });
      } catch (error) {
        // ------------------------------------------------------
        // External service submission failed.
        //
        // Keep the Project record because it is useful for
        // retry/resume/debugging.
        // ------------------------------------------------------

        project.status =
          "failed";

        project.error =
          error.message;

        project.failure = {
          step: null,

          message:
            error.message,

          occurredAt:
            new Date(),
        };

        if (
          project.subtitleService
        ) {
          project.subtitleService
            .status =
            "failed";
        }

        await project.save();

        return res.status(502).json({
          success: false,

          message:
            "Project was created, but subtitle processing service could not be started.",

          data: {
            projectId:
              project.projectId,

            projectResourceId:
              project._id,

            status:
              project.status,
          },
        });
      }

      // --------------------------------------------------------
      // Reload project because project.service may have updated
      // external-service information.
      // --------------------------------------------------------

      const updatedProject =
        await Project.findById(
          project._id
        );

      return res.status(202).json({
        success: true,

        message:
          "Project created and submitted for subtitle processing",

        data: {
          // MongoDB resource ID.
          id:
            updatedProject._id,

          // Server-generated application project ID.
          projectId:
            updatedProject.projectId,

          name:
            updatedProject.name,

          inputType:
            updatedProject.inputType,

          status:
            updatedProject.status,

          currentStep:
            updatedProject.currentStep,

          currentStepName:
            updatedProject.currentStepName,

          lastCompletedStep:
            updatedProject.lastCompletedStep,

          serviceProjectId:
            updatedProject
              .subtitleService
              ?.projectId ||
            null,

          createdAt:
            updatedProject.createdAt,

          updatedAt:
            updatedProject.updatedAt,

          serviceResponse:
            serviceResult?.serviceResponse ||
            null,
        },
      });
    } catch (error) {
      console.error(
        "createProjectController error:",
        error
      );

      // Handle duplicate generated projectId extremely
      // defensively. UUID collision is practically impossible,
      // but the DB unique index is still the final protection.
      if (
        error.code ===
        11000
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Project ID conflict. Please try again.",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Unable to create project",
      });
    }
  };


// ============================================================
// RENAME PROJECT
// ============================================================

/**
 * PATCH /api/projects/:id
 *
 * :id = MongoDB Project _id
 *
 * Body: { "name": "New name" }
 *
 * Only the name can be changed here - everything else about a
 * project (input file, subtitle mode, etc.) is either fixed at
 * creation or changed through its own dedicated endpoint
 * (subtitleMode via PATCH .../subtitle).
 */
const renameProjectController = async (req, res) => {
  try {
    const { projectId: id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const { name } = req.body;

    if (typeof name !== "string" || name.trim().length < 1) {
      return res.status(400).json({
        success: false,
        message: "Project name cannot be empty",
      });
    }

    const trimmedName = name.trim();

    if (trimmedName.length > 200) {
      return res.status(400).json({
        success: false,
        message: "Project name cannot exceed 200 characters",
      });
    }

    const project = await Project.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { $set: { name: trimmedName } },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Project renamed",
      data: {
        id: project._id,
        projectId: project.projectId,
        name: project.name,
      },
    });
  } catch (error) {
    console.error("renameProjectController error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to rename project",
    });
  }
};


// ============================================================
// DUPLICATE PROJECT
// ============================================================

/**
 * POST /api/projects/:id/duplicate
 *
 * :id = MongoDB Project _id
 *
 * Body (all optional): { "name": "Copy name", "subtitleMode": "embedded" | "selectable" }
 *
 * Creates a brand-new project pointing at the SAME source media
 * (no re-upload needed) and resubmits it to the subtitle service
 * from scratch - handy for retrying with a different subtitle
 * delivery mode, or just re-running the pipeline. The two
 * projects safely share the same Cloudinary input file: deletion
 * checks for other projects referencing a publicId before ever
 * removing it from Cloudinary (see deleteProjectController).
 */
const duplicateProjectController = async (req, res) => {
  try {
    const { projectId: id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const source = await Project.findOne({ _id: id, userId: req.user._id });

    if (!source) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const { name, subtitleMode, subtitleStyle } = req.body || {};

    if (
      subtitleMode !== undefined &&
      !["embedded", "selectable"].includes(subtitleMode)
    ) {
      return res.status(400).json({
        success: false,
        message: 'subtitleMode must be "embedded" or "selectable"',
      });
    }

    if (subtitleStyle !== undefined && !isValidSubtitleStyle(subtitleStyle)) {
      return res.status(400).json({
        success: false,
        message: `subtitleStyle must be one of: ${Object.keys(SUBTITLE_STYLE_PRESETS).join(", ")}`,
      });
    }

    const trimmedName =
      typeof name === "string" && name.trim().length > 0
        ? name.trim().slice(0, 200)
        : `${source.name} (copy)`.slice(0, 200);

    const generatedProjectId = generateProjectId();
    const userId = req.user._id;

    const project = new Project({
      userId,
      projectId: generatedProjectId,
      name: trimmedName,
      inputType: source.inputType,
      subtitleMode: subtitleMode || source.subtitleMode || "embedded",
      subtitleStyle: subtitleStyle || source.subtitleStyle || DEFAULT_SUBTITLE_STYLE,

      // Same underlying Cloudinary asset - no re-upload needed.
      input: {
        url: source.input.url,
        publicId: source.input.publicId,
        resourceType: source.input.resourceType,
        format: source.input.format,
        originalName: source.input.originalName,
        sizeBytes: source.input.sizeBytes,
        mimeType: source.input.mimeType,
        durationSeconds: source.input.durationSeconds,
      },

      status: "created",
      currentStep: null,
      currentStepName: null,
      lastCompletedStep: 0,

      processing: {
        startedAt: null,
        completedAt: null,
        durationSeconds: null,
        retryCount: 0,
      },

      subtitleService: {
        projectId: null,
        videoUrl: null,
        submittedAt: null,
        startedAt: null,
        completedAt: null,
        status: "not_started",
      },
    });

    await project.save();

    try {
      await createProject({ userId, projectId: generatedProjectId });
    } catch (error) {
      project.status = "failed";
      project.error = error.message;
      project.failure = {
        step: null,
        message: error.message,
        occurredAt: new Date(),
      };
      if (project.subtitleService) {
        project.subtitleService.status = "failed";
      }
      await project.save();

      return res.status(502).json({
        success: false,
        message: "Project was duplicated, but subtitle processing service could not be started.",
        data: {
          projectId: project.projectId,
          projectResourceId: project._id,
          status: project.status,
        },
      });
    }

    const updatedProject = await Project.findById(project._id);

    return res.status(201).json({
      success: true,
      message: "Project duplicated and submitted for subtitle processing",
      data: {
        id: updatedProject._id,
        projectId: updatedProject.projectId,
        name: updatedProject.name,
        inputType: updatedProject.inputType,
        subtitleMode: updatedProject.subtitleMode,
        status: updatedProject.status,
      },
    });
  } catch (error) {
    console.error("duplicateProjectController error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Project ID conflict. Please try again.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to duplicate project",
    });
  }
};


// ============================================================
// GET PROJECT
// ============================================================

/**
 * GET /api/projects/:id
 *
 * :id = MongoDB Project _id
 *
 * The client does NOT provide userId.
 *
 * Ownership is enforced with:
 *
 * {
 *   _id: id,
 *   userId: req.user._id
 * }
 */
const getProjectController =
  async (
    req,
    res
  ) => {
    try {
      const {
        projectId:id,
      } = req.params;

      if (
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid project ID",
        });
      }

      const project =
        await Project.findOne({
          _id: id,

          userId:
            req.user._id,
        }).lean();

      if (!project) {
        return res.status(404).json({
          success: false,
          message:
            "Project not found",
        });
      }

      return res.status(200).json({
        success: true,

        data: {
          project:
            serializeProject(
              project
            ),
        },
      });
    } catch (error) {
      console.error(
        "getProjectController error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to retrieve project",
      });
    }
  };


// ============================================================
// REFRESH PROJECT STATUS
// ============================================================

/**
 * GET /api/projects/:id/refresh
 *
 * Uses MongoDB _id to identify the project.
 */
const refreshProjectController =
  async (
    req,
    res
  ) => {
    try {
      const {
        projectId:id,
      } = req.params;

      if (
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid project ID",
        });
      }

      const project =
        await Project.findOne({
          _id: id,

          userId:
            req.user._id,
        });

      if (!project) {
        return res.status(404).json({
          success: false,
          message:
            "Project not found",
        });
      }

      const updated =
        await refreshProjectStatus(
          project.projectId
        );

      return res.status(200).json({
        success: true,

        data: {
          project:
            serializeProject(
              updated
            ),
        },
      });
    } catch (error) {
      console.error(
        "refreshProjectController error:",
        error
      );

      return res.status(502).json({
        success: false,

        message:
          error.message ||
          "Unable to refresh subtitle service status",
      });
    }
  };


// ============================================================
// GET PROJECT LOGS
// ============================================================

/**
 * GET /api/projects/:id/logs
 */
const getProjectLogsController =
  async (
    req,
    res
  ) => {
    try {
      const {
        projectId:id,
      } = req.params;

      if (
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid project ID",
        });
      }

      const project =
        await Project.findOne({
          _id: id,

          userId:
            req.user._id,
        }).lean();

      if (!project) {
        return res.status(404).json({
          success: false,
          message:
            "Project not found",
        });
      }

      // --------------------------------------------------------
      // Validate limit
      // --------------------------------------------------------

      let limit =
        Number.parseInt(
          req.query.limit,
          10
        );

      if (
        !Number.isFinite(limit)
      ) {
        limit = 200;
      }

      limit = Math.max(
        1,
        Math.min(
          limit,
          5000
        )
      );

      const logs =
        await refreshProjectLogs(
          project.projectId,
          limit
        );

      return res.status(200).json({
        success: true,

        data: {
          projectId:
            project.projectId,

          projectResourceId:
            project._id,

          logs:
            logs.lines || [],
        },
      });
    } catch (error) {
      console.error(
        "getProjectLogsController error:",
        error
      );

      return res.status(502).json({
        success: false,

        message:
          error.message ||
          "Unable to retrieve subtitle service logs",
      });
    }
  };


// ============================================================
// RESUME PROJECT
// ============================================================

/**
 * POST /api/projects/:id/resume
 */
const resumeProjectController =
  async (
    req,
    res
  ) => {
    try {
      const {
        projectId:id,
      } = req.params;

      if (
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid project ID",
        });
      }

      const project =
        await Project.findOne({
          _id: id,

          userId:
            req.user._id,
        });

      if (!project) {
        return res.status(404).json({
          success: false,
          message:
            "Project not found",
        });
      }

      // --------------------------------------------------------
      // Only failed projects can be resumed.
      // --------------------------------------------------------

      if (
        project.status !==
        "failed"
      ) {
        return res.status(409).json({
          success: false,

          message:
            "Only failed projects can be resumed",
        });
      }

      const result =
        await resumeProject(
          project.projectId
        );

      const updatedProject =
        await Project.findById(
          project._id
        );

      return res.status(202).json({
        success: true,

        message:
          "Project resume requested",

        data: {
          id:
            updatedProject._id,

          projectId:
            updatedProject.projectId,

          status:
            updatedProject.status,

          currentStep:
            updatedProject.currentStep,

          currentStepName:
            updatedProject.currentStepName,

          lastCompletedStep:
            updatedProject.lastCompletedStep,

          serviceResponse:
            result.serviceResponse,
        },
      });
    } catch (error) {
      console.error(
        "resumeProjectController error:",
        error
      );

      return res.status(409).json({
        success: false,

        message:
          error.message ||
          "Unable to resume project",
      });
    }
  };


// ============================================================
// REGENERATE OUTPUT VIDEO (after a manual subtitle edit)
// ============================================================
//
// Mirrors the VIDEO PROJECT branch of finalizeProject() in
// webhook.controller.js: download source video -> burn in the
// (edited) subtitle with FFmpeg -> upload -> only then delete
// the previous output file. Runs fire-and-forget after the
// subtitle PATCH response has already been sent, and reports
// progress/completion/failure over the same project socket
// events the rest of the pipeline uses.
// ============================================================

const regenerateOutputVideo = async ({ projectMongoId, subtitleContent }) => {
  const project = await Project.findById(projectMongoId);

  if (!project) {
    return;
  }

  const projectId = project.projectId;
  const userId = String(project.userId);
  const previousOutputFile = project.output?.file || null;

  const subtitleMode = project.subtitleMode === "selectable" ? "selectable" : "embedded";
  const outputExtension = subtitleMode === "selectable" ? "mkv" : "mp4";

  const tempDir = await createTempDirectory(`subtitle-edit-${projectId}`);
  const subtitlePath = path.join(tempDir, "edited.srt");
  const sourceMediaPath = path.join(tempDir, "source-media");
  const finalVideoPath = path.join(tempDir, `final-subtitled.${outputExtension}`);

  try {
    await fs.writeFile(subtitlePath, subtitleContent, "utf8");

    if (!project.input?.url) {
      throw new Error("Original video URL is missing.");
    }

    await downloadToFile({
      url: project.input.url,
      destination: sourceMediaPath,
      maxBytes: MAX_SOURCE_BYTES,
    });

    if (subtitleMode === "selectable") {
      await muxSelectableSubtitles({
        inputVideoPath: sourceMediaPath,
        subtitlePath,
        outputVideoPath: finalVideoPath,
      });
    } else {
      await renderVideoWithSubtitles({
        inputVideoPath: sourceMediaPath,
        subtitlePath,
        outputVideoPath: finalVideoPath,
        forceStyle: getForceStyle(project.subtitleStyle),
      });
    }

    // --------------------------------------------------------
    // Upload the NEW output video first.
    // --------------------------------------------------------

    const uploaded = await uploadToCloudinary(finalVideoPath, {
      folder: `subtitle-app/users/${userId}/projects/${projectId}/output`,
      resourceType: "video",
    });

    // --------------------------------------------------------
    // Only delete the PREVIOUS output video once the new one
    // is safely uploaded.
    // --------------------------------------------------------

    if (previousOutputFile?.publicId) {
      try {
        await deleteFromCloudinary(previousOutputFile.publicId, "video");
      } catch (cleanupError) {
        console.error(
          `Failed to delete previous output video for ${projectId}:`,
          cleanupError.message
        );
      }
    }

    const fresh = await Project.findById(projectMongoId);
    if (!fresh) return;

    fresh.output = {
      status: "completed",
      mode: subtitleMode,
      file: {
        url: uploaded.url,
        publicId: uploaded.publicId,
        resourceType: uploaded.resourceType || "video",
        format: uploaded.format || outputExtension,
        sizeBytes: uploaded.bytes || null,
        width: uploaded.width || null,
        height: uploaded.height || null,
        durationSeconds:
          uploaded.duration ?? fresh.input?.durationSeconds ?? null,
      },
      generatedAt: new Date(),
    };

    fresh.logs.push({
      level: "info",
      message:
        subtitleMode === "selectable"
          ? "Video re-muxed with a selectable subtitle track for the edited subtitle"
          : "Final video re-rendered with the edited subtitle",
      stepNumber: 5,
      stepName: "original_subtitle_generation",
      metadata: {
        event: "output_regenerated",
        previousPublicId: previousOutputFile?.publicId || null,
      },
    });

    await fresh.save();

    await emitProjectEvent({
      projectId,
      userId,
      type: "output:updated",
      status: fresh.status,
      stepNumber: 5,
      message: "Video updated with your edited subtitles",
      data: { output: fresh.output },
    });
  } catch (error) {
    console.error(`Output regeneration failed for ${projectId}:`, error.message);

    try {
      const fresh = await Project.findById(projectMongoId);

      if (fresh) {
        fresh.output = fresh.output || {};
        fresh.output.status = "failed";

        fresh.logs.push({
          level: "error",
          message: `Failed to re-render video with edited subtitles: ${error.message}`,
          stepNumber: 5,
          stepName: "original_subtitle_generation",
          metadata: { event: "output_regeneration_failed" },
        });

        await fresh.save();

        await emitProjectEvent({
          projectId,
          userId,
          type: "output:failed",
          status: fresh.status,
          stepNumber: 5,
          message: `Video re-render failed: ${error.message}`,
        });
      }
    } catch (persistError) {
      console.error(
        `Failed to persist output regeneration failure for ${projectId}:`,
        persistError.message
      );
    }
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
};


// ============================================================
// SUBTITLE CONTENT HELPERS
// ============================================================

/**
 * Very small SRT-aware counter. Falls back gracefully for
 * VTT/other text formats - it just counts non-empty "cue"
 * blocks separated by blank lines and total words.
 */
const analyzeSubtitleContent = (content) => {
  const blocks = content
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  const wordCount = content
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean).length;

  return {
    subtitleCount: blocks.length,
    wordCount,
  };
};

const MAX_SUBTITLE_CONTENT_LENGTH = 2 * 1024 * 1024; // 2 MB of text is already huge for an SRT


// ============================================================
// UPDATE SUBTITLE (manual edit)
// ============================================================

/**
 * PATCH /api/projects/:id/subtitle
 *
 * :id = MongoDB Project _id
 *
 * Body:
 * {
 *   "content": "1\n00:00:00,000 --> 00:00:02,000\nHello world\n"
 * }
 *
 * Flow:
 * 1. Validate ownership + that a subtitle file already exists.
 * 2. Upload the EDITED content to Cloudinary as a NEW raw file.
 * 3. Only once the upload succeeds, delete the PREVIOUS
 *    Cloudinary file using its publicId (upload-then-delete,
 *    so a failed upload never destroys the existing subtitle).
 * 4. Persist the new file info + recomputed counts on the
 *    project and log + broadcast the change over the socket.
 */
const updateSubtitleController = async (req, res) => {
  let temporaryFilePath = null;

  try {
    const { projectId: id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const { content, subtitleMode, subtitleStyle } = req.body;

    if (typeof content !== "string" || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Subtitle content is required",
      });
    }

    if (content.length > MAX_SUBTITLE_CONTENT_LENGTH) {
      return res.status(413).json({
        success: false,
        message: "Subtitle content is too large",
      });
    }

    if (
      subtitleMode !== undefined &&
      !["embedded", "selectable"].includes(subtitleMode)
    ) {
      return res.status(400).json({
        success: false,
        message: 'subtitleMode must be "embedded" or "selectable"',
      });
    }

    if (subtitleStyle !== undefined && !isValidSubtitleStyle(subtitleStyle)) {
      return res.status(400).json({
        success: false,
        message: `subtitleStyle must be one of: ${Object.keys(SUBTITLE_STYLE_PRESETS).join(", ")}`,
      });
    }

    const project = await Project.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    if (!project.subtitle || project.subtitle.status !== "completed" || !project.subtitle.file) {
      return res.status(409).json({
        success: false,
        message: "This project does not have a completed subtitle to edit yet",
      });
    }

    // Don't let a manual edit race with an in-progress video render
    // (either the original pipeline's, or a previous edit's).
    if (project.inputType === "video" && project.output?.status === "processing") {
      return res.status(409).json({
        success: false,
        message: "The final video is currently being generated. Please wait for it to finish before editing subtitles.",
      });
    }

    const previousFile = project.subtitle.file;
    const format = previousFile.format || "srt";

    // ----------------------------------------------------------
    // 1. Write the edited content to a temp file on disk.
    //    Cloudinary's upload() helper takes a file path, so we
    //    reuse the same pattern as the main upload flow.
    // ----------------------------------------------------------

    const tempFileName = `${Date.now()}-${crypto.randomUUID()}.${format}`;
    temporaryFilePath = path.join(os.tmpdir(), tempFileName);
    await fs.writeFile(temporaryFilePath, content, "utf8");

    // ----------------------------------------------------------
    // 2. Upload the NEW file first.
    // ----------------------------------------------------------

    const userFolder = `subtitle-app/users/${req.user._id}/projects/${project.projectId}/subtitles`;

    const uploaded = await uploadToCloudinary(temporaryFilePath, {
      folder: userFolder,
      resourceType: "raw",
    });

    // ----------------------------------------------------------
    // 3. Only delete the PREVIOUS file once the new one is safely
    //    stored. A delete failure here is logged but must not
    //    fail the request - the project already points at the
    //    new, valid file.
    // ----------------------------------------------------------

    if (previousFile.publicId) {
      try {
        await deleteFromCloudinary(previousFile.publicId, "raw");
      } catch (cleanupError) {
        console.error(
          "Failed to delete previous subtitle file from Cloudinary:",
          cleanupError.message
        );
      }
    }

    // ----------------------------------------------------------
    // 4. Persist the new subtitle file + recomputed metadata.
    // ----------------------------------------------------------

    const { subtitleCount, wordCount } = analyzeSubtitleContent(content);

    project.subtitle.file = {
      url: uploaded.url,
      publicId: uploaded.publicId,
      resourceType: "raw",
      format,
      sizeBytes: uploaded.bytes || Buffer.byteLength(content, "utf8"),
    };

    project.subtitle.subtitleCount = subtitleCount;
    project.subtitle.wordCount = wordCount;
    project.subtitle.searchText = extractPlainTextFromSrt(content);
    project.subtitle.generatedAt = new Date();

    project.logs.push({
      level: "info",
      message: "Subtitle was manually edited and updated by the user",
      stepNumber: 5,
      stepName: "original_subtitle_generation",
      metadata: {
        subtitleCount,
        wordCount,
        previousPublicId: previousFile.publicId || null,
      },
    });

    // ----------------------------------------------------------
    // 5. Apply a subtitle delivery mode change, if the user sent
    //    one (e.g. switching from burned-in captions to a
    //    selectable/MKV subtitle track, or back).
    // ----------------------------------------------------------

    const previousSubtitleMode = project.subtitleMode || "embedded";
    const modeChanged =
      subtitleMode !== undefined && subtitleMode !== previousSubtitleMode;

    if (modeChanged) {
      project.subtitleMode = subtitleMode;

      project.logs.push({
        level: "info",
        message: `Subtitle delivery mode changed to "${subtitleMode}"`,
        stepNumber: 5,
        stepName: "original_subtitle_generation",
        metadata: { event: "subtitle_mode_changed", from: previousSubtitleMode, to: subtitleMode },
      });
    }

    // Style preset only matters for "embedded" mode, but we still
    // accept/track it regardless of the resulting mode.
    const previousSubtitleStyle = project.subtitleStyle || DEFAULT_SUBTITLE_STYLE;
    const styleChanged =
      subtitleStyle !== undefined && subtitleStyle !== previousSubtitleStyle;

    if (styleChanged) {
      project.subtitleStyle = subtitleStyle;

      project.logs.push({
        level: "info",
        message: `Subtitle style changed to "${SUBTITLE_STYLE_PRESETS[subtitleStyle]?.label || subtitleStyle}"`,
        stepNumber: 5,
        stepName: "original_subtitle_generation",
        metadata: { event: "subtitle_style_changed", from: previousSubtitleStyle, to: subtitleStyle },
      });
    }

    // ----------------------------------------------------------
    // 6. If this is a VIDEO project with an existing (or
    //    previously failed) rendered output - or the delivery
    //    mode/style just changed - re-render the output video
    //    too. This runs after the response is sent - see
    //    regenerateOutputVideo() above, which follows the same
    //    upload-then-delete pattern as the subtitle file itself.
    // ----------------------------------------------------------

    const shouldRegenerateOutput =
      project.inputType === "video" &&
      (["completed", "failed"].includes(project.output?.status) ||
        modeChanged ||
        (styleChanged && project.subtitleMode === "embedded"));

    if (shouldRegenerateOutput) {
      project.output.status = "processing";

      project.logs.push({
        level: "info",
        message:
          project.subtitleMode === "selectable"
            ? "Re-muxing the video with a selectable subtitle track"
            : "Re-rendering the final video with the updated subtitle",
        stepNumber: 5,
        stepName: "original_subtitle_generation",
        metadata: { event: "output_regeneration_started", subtitleMode: project.subtitleMode },
      });
    }

    await project.save();

    // ----------------------------------------------------------
    // Broadcast the change over the socket, same as pipeline
    // events, so an open project detail page updates live.
    // ----------------------------------------------------------

    await emitProjectEvent({
      projectId: project.projectId,
      userId: String(req.user._id),
      type: "subtitle:updated",
      status: project.status,
      stepNumber: 5,
      message: "Subtitle updated",
      data: {
        subtitleCount,
        wordCount,
        outputRegenerating: shouldRegenerateOutput,
      },
    });

    if (shouldRegenerateOutput) {
      const projectMongoId = project._id;

      setImmediate(() => {
        regenerateOutputVideo({
          projectMongoId,
          subtitleContent: content,
        }).catch((error) => {
          console.error(
            `[OUTPUT REGENERATION] Project ${project.projectId} failed:`,
            error.message
          );
        });
      });
    }

    return res.status(200).json({
      success: true,
      message: "Subtitle updated successfully",
      data: {
        subtitle: project.subtitle,
        output: project.output,
        subtitleMode: project.subtitleMode,
        subtitleStyle: project.subtitleStyle,
        outputRegenerating: shouldRegenerateOutput,
      },
    });
  } catch (error) {
    console.error("updateSubtitleController error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to update subtitle",
    });
  } finally {
    if (temporaryFilePath) {
      try {
        await fs.unlink(temporaryFilePath);
      } catch (cleanupError) {
        // File may already have been removed.
      }
    }
  }
};


// ============================================================
// SHARED-FILE SAFETY CHECK
// ============================================================
//
// Duplicated projects intentionally share their source
// Cloudinary file with the project they were copied from (no
// point re-uploading identical bytes). That means deleting a
// project must NOT blindly delete a Cloudinary file that
// another project still points at.
// ============================================================

const isPublicIdReferencedElsewhere = async (publicId, excludeProjectMongoId) => {
  if (!publicId) return false;

  const count = await Project.countDocuments({
    _id: { $ne: excludeProjectMongoId },
    $or: [
      { "input.publicId": publicId },
      { "subtitle.file.publicId": publicId },
      { "output.file.publicId": publicId },
    ],
  });

  return count > 0;
};


// ============================================================
// DELETE PROJECT
// ============================================================

/**
 * DELETE /api/projects/:id
 *
 * This controller should eventually call a dedicated
 * project deletion service that also removes Cloudinary
 * assets.
 */
const deleteProjectController =
  async (
    req,
    res
  ) => {
    try {
      const {
        projectId:id,
      } = req.params;

      if (
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid project ID",
        });
      }

      const project =
        await Project.findOne({
          _id: id,

          userId:
            req.user._id,
        });

      if (!project) {
        return res.status(404).json({
          success: false,
          message:
            "Project not found",
        });
      }

      // --------------------------------------------------------
      // Do not delete a currently-processing project silently.
      // --------------------------------------------------------

      if (
        [
          "queued",
          "processing",
        ].includes(
          project.status
        )
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Cannot delete a project while it is processing",
        });
      }

      // --------------------------------------------------------
      // Delete every Cloudinary asset tied to this project before
      // removing the MongoDB record. Each deletion is independent
      // and best-effort - a failure on one file must not stop the
      // others, and must not block the project record itself from
      // being deleted (an orphaned Cloudinary file is a far
      // smaller problem than an undeletable project).
      // --------------------------------------------------------

      const filesToDelete = [
        { file: project.input, defaultResourceType: "video" },
        { file: project.subtitle?.file, defaultResourceType: "raw" },
        { file: project.output?.file, defaultResourceType: "video" },
      ].filter((entry) => entry.file?.publicId);

      await Promise.all(
        filesToDelete.map(async ({ file, defaultResourceType }) => {
          try {
            const shared = await isPublicIdReferencedElsewhere(file.publicId, project._id);
            if (shared) return; // another project (e.g. a duplicate) still needs this file
            await deleteFromCloudinary(file.publicId, file.resourceType || defaultResourceType);
          } catch (error) {
            console.error(
              `Failed to delete Cloudinary file ${file.publicId} for project ${project.projectId}:`,
              error.message
            );
          }
        })
      );

      await Project.deleteOne({
        _id: id,

        userId:
          req.user._id,
      });

      return res.status(200).json({
        success: true,

        message:
          "Project deleted successfully",

        data: {
          id,
        },
      });
    } catch (error) {
      console.error(
        "deleteProjectController error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to delete project",
      });
    }
  };


// ============================================================
// EXPORT
// ============================================================

module.exports = {
  createProjectController,
  getProjectController,
  refreshProjectController,
  getProjectLogsController,
  resumeProjectController,
  updateSubtitleController,
  renameProjectController,
  duplicateProjectController,
  deleteProjectController,
};