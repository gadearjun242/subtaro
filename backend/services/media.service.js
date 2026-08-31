"use strict";

const fs = require("fs");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");
const axios = require("axios");
const { spawn } = require("child_process");

// ============================================================
// CONFIGURATION
// ============================================================

const FFMPEG_BIN = process.env.FFMPEG_BIN || "ffmpeg";

const DOWNLOAD_TIMEOUT = Number(
  process.env.WEBHOOK_DOWNLOAD_TIMEOUT_MS || 120000
);

const MAX_FFMPEG_STDERR = 20000;

// ============================================================
// HELPERS
// ============================================================

function safeNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

// ============================================================
// TEMP DIRECTORY
// ============================================================

async function createTempDirectory(prefix) {
  return fsp.mkdtemp(path.join(os.tmpdir(), `${prefix}-`));
}

// ============================================================
// STREAM DOWNLOAD
// ============================================================

async function downloadToFile({ url, destination, maxBytes }) {
  const response = await axios.get(url, {
    responseType: "stream",
    timeout: DOWNLOAD_TIMEOUT,
    maxRedirects: 5,

    validateStatus: (statusCode) => statusCode >= 200 && statusCode < 300,

    headers: {
      "User-Agent": "subtitle-backend/1.0",
    },
  });

  const contentLength = safeNumber(response.headers["content-length"]);

  if (contentLength !== null && contentLength > maxBytes) {
    response.data.destroy();
    throw new Error("Remote file is larger than the allowed size.");
  }

  await fsp.mkdir(path.dirname(destination), { recursive: true });

  const writer = fs.createWriteStream(destination);

  let totalBytes = 0;
  let settled = false;

  await new Promise((resolve, reject) => {
    const fail = (error) => {
      if (settled) return;
      settled = true;

      response.data.destroy();
      writer.destroy();

      reject(error);
    };

    response.data.on("data", (chunk) => {
      if (settled) return;

      totalBytes += chunk.length;

      if (totalBytes > maxBytes) {
        fail(new Error("Remote file exceeded the maximum allowed size."));
        return;
      }

      if (!writer.write(chunk)) {
        response.data.pause();
        writer.once("drain", () => response.data.resume());
      }
    });

    response.data.on("error", fail);
    writer.on("error", fail);

    response.data.on("end", () => {
      if (settled) return;

      writer.end(() => {
        if (settled) return;
        settled = true;
        resolve();
      });
    });
  });

  const stats = await fsp.stat(destination);

  if (stats.size <= 0) {
    throw new Error("Downloaded file is empty.");
  }

  return {
    path: destination,
    sizeBytes: stats.size,
    contentType: response.headers["content-type"] || null,
  };
}

// ============================================================
// FFMPEG
// ============================================================

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(FFMPEG_BIN, args, {
      stdio: ["ignore", "ignore", "pipe"],
    });

    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();

      if (stderr.length > MAX_FFMPEG_STDERR) {
        stderr = stderr.slice(-MAX_FFMPEG_STDERR);
      }
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`FFmpeg failed with exit code ${code}: ${stderr}`));
    });
  });
}

// ============================================================
// SUBTITLE FILTER PATH ESCAPING
// ============================================================

function escapeSubtitlePath(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'");
}

// ============================================================
// RENDER VIDEO WITH BURNED-IN SUBTITLES
// ============================================================

async function renderVideoWithSubtitles({
  inputVideoPath,
  subtitlePath,
  outputVideoPath,
  forceStyle,
}) {
  const escapedSubtitlePath = escapeSubtitlePath(subtitlePath);

  // force_style is appended after the path with a colon, per
  // FFmpeg's `subtitles` filter syntax:
  //   subtitles=file.srt:force_style='FontName=Arial,FontSize=24,...'
  const subtitlesFilter = forceStyle
    ? `subtitles=${escapedSubtitlePath}:force_style='${forceStyle}'`
    : `subtitles=${escapedSubtitlePath}`;

  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",

    "-i",
    inputVideoPath,

    "-vf",
    subtitlesFilter,

    "-map",
    "0:v:0",

    "-map",
    "0:a?",

    "-c:v",
    "libx264",

    "-preset",
    process.env.FFMPEG_PRESET || "veryfast",

    "-crf",
    process.env.FFMPEG_CRF || "20",

    "-c:a",
    "copy",

    "-movflags",
    "+faststart",

    outputVideoPath,
  ];

  await runFfmpeg(args);

  const stats = await fsp.stat(outputVideoPath);

  if (stats.size <= 0) {
    throw new Error("FFmpeg created an empty video.");
  }

  return {
    path: outputVideoPath,
    sizeBytes: stats.size,
  };
}

// ============================================================
// MUX A SELECTABLE (SOFT) SUBTITLE TRACK INTO AN MKV
// ============================================================
//
// Unlike renderVideoWithSubtitles() (which re-encodes the video
// to permanently burn the subtitle into every frame), this just
// repackages the existing video/audio streams as-is (`-c copy`)
// and adds the subtitle as its own toggleable track in an .mkv
// container - the same technique tools like mkvmerge use. No
// re-encoding means it's fast and lossless, but the trade-off is
// that .mkv isn't natively playable in any browser's <video>
// element (Chrome, Firefox and Safari all lack container support
// for Matroska, regardless of the codecs inside it) - callers
// should offer it as a download for external players (VLC, mpv,
// smart TVs, etc.), not as an in-page preview source.
// ============================================================

async function muxSelectableSubtitles({
  inputVideoPath,
  subtitlePath,
  outputVideoPath,
}) {
  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",

    "-i",
    inputVideoPath,

    "-i",
    subtitlePath,

    "-map",
    "0:v",

    "-map",
    "0:a?",

    "-map",
    "1:s",

    "-c:v",
    "copy",

    "-c:a",
    "copy",

    "-c:s",
    "srt",

    "-metadata:s:s:0",
    "language=eng",

    "-metadata:s:s:0",
    "title=Subtitles",

    "-disposition:s:0",
    "default",

    outputVideoPath,
  ];

  await runFfmpeg(args);

  const stats = await fsp.stat(outputVideoPath);

  if (stats.size <= 0) {
    throw new Error("FFmpeg created an empty video.");
  }

  return {
    path: outputVideoPath,
    sizeBytes: stats.size,
  };
}

module.exports = {
  safeNumber,
  createTempDirectory,
  downloadToFile,
  runFfmpeg,
  escapeSubtitlePath,
  renderVideoWithSubtitles,
  muxSelectableSubtitles,
};
