const SUBTITLE_SERVICE_URL = process.env.SUBTITLE_SERVICE_URL.replace(
  /\/+$/,
  "",
);

const REQUEST_TIMEOUT_MS = Number(
  process.env.SUBTITLE_SERVICE_TIMEOUT_MS || 30000,
);

// ============================================================
// HTTP HELPER
// ============================================================

async function request(path, options = {}) {
  const controller = new AbortController();

  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${SUBTITLE_SERVICE_URL}${path}`, {
      ...options,
      signal: controller.signal,

      headers: {
        Accept: "application/json",

        ...(options.body
          ? {
              "Content-Type": "application/json",
            }
          : {}),

        ...(options.headers || {}),
      },
    });

    const text = await response.text();

    let data;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!response.ok) {
      const message =
        typeof data === "object" ? JSON.stringify(data) : String(data);

      const error = new Error(
        `Subtitle service request failed: ${response.status} ${message}`,
      );

      error.statusCode = response.status;

      error.response = data;

      throw error;
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================
// CREATE / START
// ============================================================

async function startSubtitleProject({ projectId, fileUrl, webhookUrl }) {
  if (!projectId) {
    throw new Error("projectId is required");
  }

  if (!fileUrl) {
    throw new Error("fileUrl is required");
  }

  return request("/projects", {
    method: "POST",

    body: JSON.stringify({
      project_id: projectId,

      file_url: fileUrl,

      webhook_url: webhookUrl || null,
    }),
  });
}

// ============================================================
// GET PROJECT STATUS
// ============================================================

async function getSubtitleStatus(projectId) {
  if (!projectId) {
    throw new Error("projectId is required");
  }

  return request(`/projects/${encodeURIComponent(projectId)}`);
}

// ============================================================
// GET LOGS
// ============================================================

async function getSubtitleLogs(projectId, limit = 200) {
  if (!projectId) {
    throw new Error("projectId is required");
  }

  const safeLimit = Math.max(1, Math.min(Number(limit) || 200, 5000));

  return request(
    `/projects/${encodeURIComponent(projectId)}/logs?limit=${safeLimit}`,
  );
}

// ============================================================
// RESUME
// ============================================================

async function resumeSubtitleProject(projectId) {
  if (!projectId) {
    throw new Error("projectId is required");
  }

  return request(`/projects/${encodeURIComponent(projectId)}/resume`, {
    method: "POST",
  });
}

// ============================================================
// DOWNLOAD SUBTITLE
// ============================================================

async function downloadSubtitle(projectId) {
  const response = await fetch(
    `${SUBTITLE_SERVICE_URL}/projects/${encodeURIComponent(
      projectId,
    )}/subtitle`,
  );

  if (!response.ok) {
    const text = await response.text();

    throw new Error(`Subtitle download failed: ${response.status} ${text}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

// ============================================================
// HEALTH
// ============================================================

async function checkSubtitleServiceHealth() {
  return request("/health");
}

module.exports = {
  startSubtitleProject,
  getSubtitleStatus,
  getSubtitleLogs,
  resumeSubtitleProject,
  downloadSubtitle,
  checkSubtitleServiceHealth,
};
