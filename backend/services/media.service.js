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
const FFPROBE_BIN = process.env.FFPROBE_BIN || "ffprobe";

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
// CODEC DETECTION (ffprobe)
// ============================================================
//
// Used by muxSelectableSubtitles() to decide whether it's safe
// to stream-copy the source video/audio as-is, or whether it
// needs to actually re-encode first. This matters more than it
// might look:
//
//   - MP4 only validly holds a small set of audio/video codecs.
//     `-c:a copy`-ing an arbitrary uploaded file's audio stream
//     into an .mp4 can outright FAIL if that codec isn't valid
//     in an MP4 container at all (unlike MKV, which is far more
//     permissive about what it can hold).
//   - Even when the copy technically succeeds, HEVC (H.265) in
//     particular is a real, well-documented compatibility trap:
//     FFmpeg tags it "hev1" by default, which most browsers and
//     many players (including some Apple devices, ironically)
//     don't recognize - "hvc1" is what's usually needed, and
//     even then Chrome/Firefox largely don't support HEVC
//     playback at all regardless of tagging. Since this app's own
//     in-page preview plays this exact output file, shipping
//     HEVC through unchanged risks a file that looks fine on disk
//     but silently won't play for most visitors.
//
// So: probe first, and only take the fast stream-copy path when
// the source is already in a codec this app can guarantee plays
// back correctly (H.264 video, AAC/MP3 audio). Anything else gets
// transcoded to that safe target instead - slower for that one
// case, but correct every time rather than fast-but-broken some
// of the time.
// ============================================================

const SAFE_VIDEO_CODECS = new Set(["h264"]);
const SAFE_AUDIO_CODECS = new Set(["aac", "mp3"]);

async function probeStreamCodecs(filePath) {
  const args = [
    "-v",
    "error",
    "-show_entries",
    "stream=codec_type,codec_name",
    "-of",
    "json",
    filePath,
  ];

  const stdout = await new Promise((resolve, reject) => {
    const child = spawn(FFPROBE_BIN, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let out = "";
    let err = "";

    child.stdout.on("data", (chunk) => {
      out += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      err += chunk.toString();
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code === 0) {
        resolve(out);
        return;
      }

      reject(new Error(`ffprobe failed with exit code ${code}: ${err}`));
    });
  });

  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new Error("Could not parse ffprobe output.");
  }

  const streams = Array.isArray(parsed.streams) ? parsed.streams : [];

  const videoCodec = streams.find((s) => s.codec_type === "video")?.codec_name || null;
  const audioCodec = streams.find((s) => s.codec_type === "audio")?.codec_name || null;

  return { videoCodec, audioCodec };
}

/**
 * Whether the given codecs can be safely stream-copied straight
 * into an .mp4 with a guarantee this app's own player (and most
 * others) can actually play the result. `audioCodec` may be null
 * (no audio track) - that's fine, only the video codec matters
 * then.
 */
function isMp4StreamCopySafe({ videoCodec, audioCodec }) {
  if (!videoCodec || !SAFE_VIDEO_CODECS.has(videoCodec)) {
    return false;
  }

  if (audioCodec && !SAFE_AUDIO_CODECS.has(audioCodec)) {
    return false;
  }

  return true;
}

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
// MUX A SELECTABLE (SOFT) SUBTITLE TRACK INTO AN MP4
// ============================================================
//
// Unlike renderVideoWithSubtitles() (which always re-encodes the
// video to permanently burn the subtitle into every frame), this
// adds the subtitle as its own toggleable track using MP4's
// native `mov_text` subtitle codec - the same technique widely
// documented for adding soft subtitles to MP4 (e.g.
// ffmpeg -i in.mp4 -i subs.srt -c copy -c:s mov_text out.mp4).
//
// Deliberately MP4, not MKV: MP4 already supports one selectable
// text track natively via mov_text, so there's no need for a
// second container format - output stays a single, directly
// playable .mp4 for both subtitle delivery modes, with no extra
// file to store/serve/clean up. (MKV is only meaningfully better
// than MP4 here if you need MULTIPLE simultaneous subtitle
// tracks/languages in one file - this app only ever produces one
// track per project, so that advantage doesn't apply.)
//
// Video/audio are only stream-copied (`-c copy` - fast, lossless)
// when the source is ALREADY in a codec this guarantees plays
// back correctly (H.264 video, AAC/MP3 audio, or no audio track
// at all) - see probeStreamCodecs()/isMp4StreamCopySafe() above.
// Otherwise this transcodes video/audio to that safe target
// instead of blindly copying. This matters for two real reasons,
// not just theoretical ones:
//   1. MP4 only validly holds a limited set of codecs - blindly
//      `-c:a copy`-ing an arbitrary uploaded file's audio into an
//      .mp4 can outright fail if that codec isn't valid there.
//   2. HEVC (H.265) source video is a specific, well-documented
//      trap: FFmpeg tags it "hev1" by default, which most
//      browsers (and some players that only accept "hvc1") won't
//      play - Chrome/Firefox largely don't support HEVC playback
//      at all regardless of tagging. Since this app's own in-page
//      preview plays this exact file, shipping HEVC through
//      unchanged risks a file that's fine on disk but silently
//      won't play for most visitors.
//
// The trade-off when a transcode IS needed: slower for that one
// render (same cost as the "embedded" burn-in path), but correct
// every time rather than fast-but-possibly-broken.
//
// Separately, regardless of which path was taken: browsers'
// native <video> caption picker doesn't reliably expose in-band
// mov_text tracks (a long-standing, inconsistent-across-browsers
// limitation, not specific to this app) - callers should still
// offer a separate WebVTT <track> for a guaranteed in-page
// toggle, and can point users at the mp4 itself for players that
// do expose it (VLC, mpv, QuickTime, most mobile players).
// ============================================================

async function muxSelectableSubtitles({
  inputVideoPath,
  subtitlePath,
  outputVideoPath,
}) {
  const { videoCodec, audioCodec } = await probeStreamCodecs(inputVideoPath);
  const canStreamCopy = isMp4StreamCopySafe({ videoCodec, audioCodec });

  const videoArgs = canStreamCopy
    ? ["-c:v", "copy"]
    : [
        "-c:v",
        "libx264",
        "-preset",
        process.env.FFMPEG_PRESET || "veryfast",
        "-crf",
        process.env.FFMPEG_CRF || "20",
      ];

  const audioArgs = canStreamCopy || !audioCodec ? ["-c:a", "copy"] : ["-c:a", "aac"];

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

    ...videoArgs,
    ...audioArgs,

    "-c:s",
    "mov_text",

    "-metadata:s:s:0",
    "language=eng",

    "-metadata:s:s:0",
    "title=Subtitles",

    "-disposition:s:0",
    "default",

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
    transcoded: !canStreamCopy,
    sourceVideoCodec: videoCodec,
    sourceAudioCodec: audioCodec,
  };
}

module.exports = {
  safeNumber,
  createTempDirectory,
  downloadToFile,
  runFfmpeg,
  probeStreamCodecs,
  isMp4StreamCopySafe,
  escapeSubtitlePath,
  renderVideoWithSubtitles,
  muxSelectableSubtitles,
};
