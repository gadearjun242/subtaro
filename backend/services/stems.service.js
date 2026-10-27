"use strict";

const fsp = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");

const { downloadToFile, createTempDirectory } = require("./media.service");
const { uploadFile } = require("./cloudinary.service");

// ============================================================
// VOCAL / INSTRUMENTAL STEMS
// ============================================================
//
// The subtitle pipeline's step 1 writes vocal.wav and
// instrument.wav. They are fetched from the service's
//
//   GET /projects/{project_id}/audio/{vocal|instrument}
//
// endpoint (see subtitle-service-patch/stems_endpoint.py), encoded
// to MP3 to keep them small, and stored in Cloudinary under the
// project folder. If the service does not expose the endpoint
// (HTTP 404) the project's stems are marked "unavailable" and
// nothing else is affected.
// ============================================================

const SERVICE_URL = (process.env.SUBTITLE_SERVICE_URL || "").replace(/\/+$/, "");
const MAX_STEM_BYTES = Number(process.env.MAX_STEM_DOWNLOAD_BYTES || 300 * 1024 * 1024);
const STEMS = ["vocal", "instrument"];

function encodeMp3(input, output) {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      process.env.FFMPEG_BIN || "ffmpeg",
      ["-y", "-i", input, "-vn", "-codec:a", "libmp3lame", "-b:a", "192k", output],
      { stdio: ["ignore", "ignore", "pipe"] }
    );

    let stderr = "";
    proc.stderr.on("data", (chunk) => {
      stderr = (stderr + chunk).slice(-2000);
    });
    proc.on("error", reject);
    proc.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${stderr}`))
    );
  });
}

async function fetchStem({ serviceProjectId, stem, tempDir }) {
  const wav = path.join(tempDir, `${stem}.wav`);

  await downloadToFile({
    url: `${SERVICE_URL}/projects/${encodeURIComponent(serviceProjectId)}/audio/${stem}`,
    destination: wav,
    maxBytes: MAX_STEM_BYTES,
  });

  const mp3 = path.join(tempDir, `${stem}.mp3`);
  await encodeMp3(wav, mp3);

  return mp3;
}

/**
 * Best-effort: never throws. Mutates and saves project.stems.
 */
async function syncProjectStems(project) {
  if (!SERVICE_URL || project.stems?.status === "available") return;

  const serviceProjectId = project.subtitleService?.projectId || project.projectId;
  const folder = `subtitle-app/users/${project.userId}/projects/${project.projectId}/stems`;
  const tempDir = await createTempDirectory(`stems-${project.projectId}`);

  const result = { status: "available", vocal: null, instrument: null };

  try {
    for (const stem of STEMS) {
      try {
        const mp3 = await fetchStem({ serviceProjectId, stem, tempDir });
        const uploaded = await uploadFile(mp3, {
          folder,
          resourceType: "video",
          publicId: stem,
          overwrite: true,
        });

        result[stem] = {
          url: uploaded.url,
          publicId: uploaded.publicId,
          resourceType: uploaded.resourceType || "video",
          format: uploaded.format || "mp3",
          sizeBytes: uploaded.bytes || null,
          durationSeconds: uploaded.duration || null,
        };
      } catch (error) {
        const notExposed = error?.response?.status === 404 || /404/.test(error?.message || "");

        if (notExposed) {
          result.status = "unavailable";
        } else if (result.status !== "unavailable") {
          result.status = "failed";
        }

        console.error(`[STEMS] ${stem} failed for ${project.projectId}:`, error.message);
      }
    }

    if (result.vocal || result.instrument) result.status = "available";

    project.stems = {
      status: result.status,
      vocal: result.vocal,
      instrument: result.instrument,
      checkedAt: new Date(),
    };

    await project.save();
  } catch (error) {
    console.error(`[STEMS] sync failed for ${project.projectId}:`, error.message);
  } finally {
    await fsp.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

module.exports = { syncProjectStems };
