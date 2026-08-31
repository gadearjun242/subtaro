const crypto = require("crypto");

const Project = require("../models/Project");

const {
  startSubtitleProject,
  getSubtitleStatus,
  getSubtitleLogs,
  resumeSubtitleProject,
} = require("./subtitle.service");

const { emitProjectEvent } = require("./socket.service");

const SUBTITLE_SERVICE_URL = process.env.SUBTITLE_SERVICE_URL.replace(
  /\/+$/,
  "",
);

const PUBLIC_API_URL = (
  process.env.PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

// ============================================================
// PIPELINE DEFINITIONS
// ============================================================

const PIPELINE_STEPS = [
  {
    stepNumber: 1,
    name: "audio_separation",
  },
  {
    stepNumber: 2,
    name: "speaker_diarization",
  },
  {
    stepNumber: 3,
    name: "speaker_segment_preparation",
  },
  {
    stepNumber: 4,
    name: "speaker_aware_transcription",
  },
  {
    stepNumber: 5,
    name: "original_subtitle_generation",
  },
];

// ============================================================
// HELPERS
// ============================================================

const WEBHOOK_MASTER_SECRET = process.env.WEBHOOK_MASTER_SECRET;

if (!WEBHOOK_MASTER_SECRET) {
  throw new Error("WEBHOOK_MASTER_SECRET is required");
}

function generateWebhookToken(projectId) {
  return crypto
    .createHmac("sha256", WEBHOOK_MASTER_SECRET)
    .update(String(projectId))
    .digest("hex");
}

function buildWebhookUrl(projectId) {
  const token = generateWebhookToken(projectId);

  return (
    `${PUBLIC_API_URL}` +
    `/api/webhooks/subtitle/${encodeURIComponent(projectId)}` +
    `?token=${encodeURIComponent(token)}`
  );
}

function getStepDefinition(stepNumber) {
  return (
    PIPELINE_STEPS.find((step) => step.stepNumber === Number(stepNumber)) ||
    null
  );
}

function normalizeStatus(status) {
  switch (String(status || "").toLowerCase()) {
    case "queued":
      return "queued";

    case "running":
      return "processing";

    case "processing":
      return "processing";

    case "completed":
      return "completed";

    case "failed":
      return "failed";

    default:
      return "processing";
  }
}

function calculateDuration(startedAt, completedAt) {
  if (!startedAt || !completedAt) {
    return null;
  }

  const started = new Date(startedAt).getTime();

  const completed = new Date(completedAt).getTime();

  if (!Number.isFinite(started) || !Number.isFinite(completed)) {
    return null;
  }

  return Math.max(0, (completed - started) / 1000);
}

function findLocalStep(project, stepNumber) {
  return project.steps.find(
    (step) => Number(step.stepNumber) === Number(stepNumber),
  );
}

function ensureProjectSteps(project) {
  if (
    Array.isArray(project.steps) &&
    project.steps.length === PIPELINE_STEPS.length
  ) {
    return;
  }

  project.steps = PIPELINE_STEPS.map((step) => ({
    stepNumber: step.stepNumber,

    name: step.name,

    status: "pending",

    startedAt: null,

    completedAt: null,

    durationSeconds: null,

    error: null,
  }));
}

function extractPipelineStatistics(serviceState) {
  const step4 = serviceState?.steps?.["4"]?.result || {};

  const step5 = serviceState?.steps?.["5"]?.result || {};

  return {
    language: step4.language || step5.language || null,

    wordCount: Number.isFinite(Number(step4.total_words))
      ? Number(step4.total_words)
      : null,

    subtitleCount: Number.isFinite(Number(step5.subtitle_count))
      ? Number(step5.subtitle_count)
      : null,

    speakerCount: Number.isFinite(Number(step5.speaker_count))
      ? Number(step5.speaker_count)
      : null,
  };
}

// ============================================================
// CREATE PROJECT
// ============================================================

async function createProject({ userId, projectId }) {
  if (!userId) {
    throw new Error("userId is required");
  }

  if (!projectId) {
    throw new Error("projectId is required");
  }

  const project = await Project.findOne({
    projectId,
    userId,
  });

  if (!project) {
    throw new Error("Project not found");
  }

  if (!project.input?.url) {
    throw new Error("Project source file URL is missing");
  }

  if (
    project.status === "processing" ||
    project.status === "queued" ||
    project.subtitleService?.status === "processing"
  ) {
    throw new Error("Project is already processing");
  }

  if (project.status === "completed") {
    return {
      project,
      alreadyCompleted: true,
    };
  }

  const serviceProjectId =
    project.subtitleService?.projectId || project.projectId;

  const webhookUrl = buildWebhookUrl(serviceProjectId);

  ensureProjectSteps(project);

  project.subtitleService = {
    ...(project.subtitleService?.toObject?.() || project.subtitleService || {}),

    projectId: serviceProjectId,

    status: "submitted",

    submittedAt: new Date(),

    startedAt: null,

    completedAt: null,
  };

  project.status = "queued";

  project.currentStep = null;

  project.currentStepName = null;

  project.error = null;

  project.failure = null;

  project.processing = {
    ...(project.processing || {}),

    startedAt: project.processing?.startedAt || new Date(),

    completedAt: null,
  };

  await project.save();

  let serviceResponse;

  try {
    serviceResponse = await startSubtitleProject({
      projectId: serviceProjectId,

      fileUrl: project.input.url,

      webhookUrl,
    });
  } catch (error) {
    project.status = "failed";

    project.subtitleService.status = "failed";

    project.error = error.message;

    project.failure = {
      step: null,
      message: error.message,
      occurredAt: new Date(),
    };

    await project.save();

    await emitProjectEvent({
      projectId,
      userId,
      type: "pipeline_submission_failed",
      status: "failed",
      stepNumber: null,
      message: error.message,
      data: {
        error: error.message,
      },
    });

    throw error;
  }

  project.subtitleService.status = "processing";

  project.subtitleService.projectId =
    serviceResponse.project_id || serviceProjectId;

  await project.save();

  await emitProjectEvent({
    projectId,
    userId,
    type: "pipeline_submitted",
    status: "processing",
    stepNumber: null,
    message: "Project submitted to subtitle processing service.",
    data: {
      serviceProjectId: project.subtitleService.projectId,

      serviceStatus: serviceResponse.status,
    },
  });

  return {
    project,
    serviceResponse,
    alreadyCompleted: false,
  };
}

// ============================================================
// APPLY FASTAPI STATUS TO MONGODB
// ============================================================

async function syncProjectStatus({ projectId, serviceState }) {
  const project = await Project.findOne({
    projectId,
  });

  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  const userId = project.userId.toString();

  ensureProjectSteps(project);

  let shouldEmit = false;

  // ----------------------------------------------------------
  // Overall service state
  // ----------------------------------------------------------

  const normalizedStatus = normalizeStatus(serviceState.status);

  if (project.status !== normalizedStatus) {
    project.status = normalizedStatus;

    shouldEmit = true;
  }

  project.currentStep = serviceState.current_step ?? null;

  project.currentStepName = serviceState.current_step_name ?? null;

  project.lastCompletedStep = Number(serviceState.last_completed_step || 0);

  project.error = serviceState.error || null;

  // ----------------------------------------------------------
  // Sync five pipeline steps
  // ----------------------------------------------------------

  for (const definition of PIPELINE_STEPS) {
    const remoteStep = serviceState.steps?.[String(definition.stepNumber)];

    if (!remoteStep) {
      continue;
    }

    const localStep = findLocalStep(project, definition.stepNumber);

    if (!localStep) {
      continue;
    }

    const oldStatus = localStep.status;

    const newStatus = remoteStep.status || "pending";

    localStep.status = newStatus;

    localStep.startedAt = remoteStep.started_at
      ? new Date(remoteStep.started_at)
      : localStep.startedAt;

    localStep.completedAt = remoteStep.completed_at
      ? new Date(remoteStep.completed_at)
      : localStep.completedAt;

    localStep.durationSeconds = calculateDuration(
      remoteStep.started_at,
      remoteStep.completed_at,
    );

    localStep.error = remoteStep.error || null;

    // --------------------------------------------------------
    // Emit only on actual state transitions.
    // --------------------------------------------------------

    if (oldStatus !== newStatus) {
      shouldEmit = true;

      await emitProjectEvent({
        projectId,
        userId,
        type: "step_status_updated",
        status: newStatus,
        stepNumber: definition.stepNumber,
        message: `Step ${definition.stepNumber}: ${definition.name} → ${newStatus}`,
        data: {
          step: localStep.toObject ? localStep.toObject() : localStep,
        },
      });
    }
  }

  // ----------------------------------------------------------
  // Extract statistics
  // ----------------------------------------------------------

  const statistics = extractPipelineStatistics(serviceState);

  if (statistics.language) {
    project.subtitleService = project.subtitleService || {};

    project.subtitleService.language = statistics.language;
  }

  // ----------------------------------------------------------
  // Store useful pipeline metadata
  // ----------------------------------------------------------

  project.pipeline = project.pipeline || {};

  if (statistics.language) {
    project.pipeline.language = statistics.language;
  }

  if (statistics.wordCount !== null) {
    project.pipeline.wordCount = statistics.wordCount;
  }

  if (statistics.subtitleCount !== null) {
    project.pipeline.subtitleCount = statistics.subtitleCount;
  }

  if (statistics.speakerCount !== null) {
    project.pipeline.speakerCount = statistics.speakerCount;
  }

  // ----------------------------------------------------------
  // Pipeline completed
  // ----------------------------------------------------------

  if (serviceState.status === "completed") {
    const completedAt = serviceState.completed_at
      ? new Date(serviceState.completed_at)
      : new Date();

    project.processing = project.processing || {};

    project.processing.completedAt = completedAt;

    if (project.processing.startedAt) {
      project.processing.durationSeconds = calculateDuration(
        project.processing.startedAt,
        completedAt,
      );
    }

    project.subtitleService.status = "completed";

    project.subtitleService.completedAt = completedAt;

    shouldEmit = true;
  }

  // ----------------------------------------------------------
  // Pipeline failed
  // ----------------------------------------------------------

  if (serviceState.status === "failed") {
    project.subtitleService = project.subtitleService || {};

    project.subtitleService.status = "failed";

    project.failure = {
      step: serviceState.current_step ?? null,

      message: serviceState.error || "Subtitle service failed.",

      occurredAt: new Date(),
    };

    shouldEmit = true;
  }

  await project.save();

  if (shouldEmit) {
    await emitProjectEvent({
      projectId,
      userId,
      type: "project_status_updated",
      status: project.status,
      stepNumber: project.currentStep,
      message:
        serviceState.status === "completed"
          ? "Subtitle pipeline completed."
          : serviceState.status === "failed"
            ? "Subtitle pipeline failed."
            : "Project status updated.",
      data: {
        currentStep: project.currentStep,

        currentStepName: project.currentStepName,

        lastCompletedStep: project.lastCompletedStep,

        language: project.pipeline?.language,

        wordCount: project.pipeline?.wordCount,

        subtitleCount: project.pipeline?.subtitleCount,

        speakerCount: project.pipeline?.speakerCount,
      },
    });
  }

  return project;
}

// ============================================================
// WEBHOOK EVENT HANDLER
// ============================================================

async function handleWebhook({ projectId, payload }) {
  console.log(JSON.stringify(payload, null, 2));
  if (!payload) {
    throw new Error("Webhook payload is required");
  }

  const project = await Project.findOne({
    projectId,
  });

  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  const userId = project.userId.toString();

  // ----------------------------------------------------------
  // Convert the FastAPI webhook payload
  // into a service state-like object.
  // ----------------------------------------------------------

  const serviceState = {
    project_id: payload.project_id || projectId,

    status: payload.status,

    current_step: payload.current_step,

    current_step_name: payload.current_step_name,

    last_completed_step: payload.last_completed_step,

    error: payload.error,

    steps: {},
  };

  // ----------------------------------------------------------
  // Important:
  //
  // FastAPI webhook sends one "step" object rather than the
  // complete steps dictionary.
  //
  // Therefore only update the specified step here.
  // ----------------------------------------------------------

  if (payload.step) {
    serviceState.steps[String(payload.step.number)] = {
      status: payload.step.status,

      started_at: payload.step.started_at,

      completed_at: payload.step.completed_at,

      error: payload.step.error,

      result: payload.step.result,
    };
  }

  // ----------------------------------------------------------
  // Sync normal project state
  // ----------------------------------------------------------

  const updatedProject = await syncProjectStatus({
    projectId,
    serviceState,
  });

  // ----------------------------------------------------------
  // Save webhook-specific log information
  //
  // Don't put all raw webhook logs into the Project document
  // forever if traffic becomes large. For the MVP this is okay.
  // Later move events to ProjectEvent collection.
  // ----------------------------------------------------------

  const logMessage = payload.event
    ? `Subtitle service webhook: ${payload.event}`
    : "Subtitle service webhook received.";

  updatedProject.logs.push({
    timestamp: new Date(),

    level: "info",

    message: logMessage,

    stepNumber: payload.step?.number || null,

    stepName: payload.step?.name || null,

    metadata: {
      event: payload.event,

      serviceStatus: payload.status,

      currentStep: payload.current_step,
    },
  });

  // Keep the embedded log collection bounded.
  if (updatedProject.logs.length > 1000) {
    updatedProject.logs = updatedProject.logs.slice(-1000);
  }

  await updatedProject.save();

  // ----------------------------------------------------------
  // Broadcast the raw service event.
  // This gives your frontend enough detail to render logs
  // without making another request.
  // ----------------------------------------------------------

  await emitProjectEvent({
    projectId,
    userId,
    type: "subtitle_service_webhook",
    status: payload.status || null,
    stepNumber: payload.step?.number || null,
    message: logMessage,
    data: {
      event: payload.event,

      currentStep: payload.current_step,

      currentStepName: payload.current_step_name,

      lastCompletedStep: payload.last_completed_step,

      step: payload.step || null,

      stepLogs: payload.step_logs || [],

      logs: payload.logs_so_far || [],
    },
  });

  return updatedProject;
}

// ============================================================
// GET CURRENT SERVICE STATUS
// ============================================================

async function refreshProjectStatus(projectId) {
  const project = await Project.findOne({
    projectId,
  });

  if (!project) {
    throw new Error("Project not found");
  }

  const serviceProjectId =
    project.subtitleService?.projectId || project.projectId;

  const serviceState = await getSubtitleStatus(serviceProjectId);

  return syncProjectStatus({
    projectId,
    serviceState,
  });
}

// ============================================================
// GET SERVICE LOGS
// ============================================================

async function refreshProjectLogs(projectId, limit = 200) {
  const project = await Project.findOne({
    projectId,
  });

  if (!project) {
    throw new Error("Project not found");
  }

  const serviceProjectId =
    project.subtitleService?.projectId || project.projectId;

  return getSubtitleLogs(serviceProjectId, limit);
}

// ============================================================
// RESUME PROJECT
// ============================================================

async function resumeProject(projectId) {
  const project = await Project.findOne({
    projectId,
  });

  if (!project) {
    throw new Error("Project not found");
  }

  if (project.status !== "failed") {
    throw new Error("Only failed projects can be resumed");
  }

  const serviceProjectId =
    project.subtitleService?.projectId || project.projectId;

  const result = await resumeSubtitleProject(serviceProjectId);

  project.status = "queued";

  project.error = null;

  if (project.failure) {
    project.failure = null;
  }

  project.processing = project.processing || {};

  project.processing.retryCount = (project.processing.retryCount || 0) + 1;

  await project.save();

  await emitProjectEvent({
    projectId,
    userId: project.userId.toString(),
    type: "pipeline_resumed",
    status: "queued",
    stepNumber: result.resumed_from_step || null,
    message: result.message || "Pipeline resume requested.",
    data: result,
  });

  return {
    project,
    serviceResponse: result,
  };
}

module.exports = {
  createProject,
  syncProjectStatus,
  refreshProjectStatus,
  refreshProjectLogs,
  resumeProject,
};
