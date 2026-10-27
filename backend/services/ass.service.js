"use strict";

const fs = require("fs/promises");
const path = require("path");

const {
  sanitizeCustomStyle,
  toAss,
  getProjectForceStyle,
} = require("./subtitleStyle.presets");

// ============================================================
// PER-CAPTION RENDERING (SRT + per-cue styles -> ASS)
// ============================================================
//
// FFmpeg's subtitles filter can burn in an .ass file, which lets
// EVERY caption carry its own font, size, colors, outline, shadow,
// background box, rotation and position. The user-facing SRT stays
// clean; the .ass file is a temporary render artifact.
//
// All style values come from sanitizeCustomStyle() (whitelisted /
// clamped) and caption text has braces and backslashes stripped, so
// nothing a user types can inject ASS override tags or filter options.
//
// libass lays SRT/ASS out on a 384x288 canvas (PlayResX/Y) and
// scales it to the video - the studio preview uses the same model.
// ============================================================

const PLAY_W = 384;
const PLAY_H = 288;

const TIMESTAMP =
  /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/;

const toSeconds = (h, m, s, ms) =>
  Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms) / 1000;

function parseSrtCues(srt) {
  const blocks = String(srt || "")
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const cues = [];

  for (const block of blocks) {
    const lines = block.split("\n");
    const at = lines.findIndex((line) => TIMESTAMP.test(line));
    if (at === -1) continue;

    const m = lines[at].match(TIMESTAMP);
    const text = lines.slice(at + 1).join("\n").trim();
    if (!text) continue;

    cues.push({
      start: toSeconds(m[1], m[2], m[3], m[4]),
      end: toSeconds(m[5], m[6], m[7], m[8]),
      text,
    });
  }

  return cues.sort((a, b) => a.start - b.start);
}

const assTime = (seconds) => {
  const cs = Math.max(0, Math.round(seconds * 100));
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs % 100).padStart(2, "0")}`;
};

const safeText = (text, uppercase) => {
  const cleaned = text
    .replace(/\{[^}]*\}/g, "")
    .replace(/[{}\\]/g, "")
    .replace(/\n/g, "\\N");
  return uppercase ? cleaned.toUpperCase() : cleaned;
};

function styleLine(name, c) {
  const alignment = { bottom: 2, middle: 5, top: 8 }[c.alignment];
  // Wrap width is 384 - 2*margin and the line is centred on \pos, so a
  // margin equal to the sideways offset keeps the whole line in frame.
  const dx = Math.abs(Math.round((c.offsetX / 100) * PLAY_W));
  const margin = Math.max(10, dx);
  const textAlpha = Math.round(255 * (1 - c.textOpacity / 100));

  let borderStyle = 1;
  let outline = c.outlineWidth;
  let shadow = c.shadow;
  let outlineColour = toAss(c.outlineColor);
  let backColour = toAss(c.shadowColor);

  if (c.background) {
    const alpha = Math.round(255 * (1 - c.backgroundOpacity / 100));
    borderStyle = 3;
    outline = Math.max(c.outlineWidth, 1);
    shadow = 0;
    outlineColour = toAss(c.backgroundColor, alpha);
    backColour = toAss(c.backgroundColor, alpha);
  }

  return [
    `Style: ${name}`,
    c.fontName,
    c.fontSize,
    toAss(c.primaryColor, textAlpha),
    toAss(c.primaryColor, textAlpha),
    outlineColour,
    backColour,
    c.bold ? -1 : 0,
    c.italic ? -1 : 0,
    0,
    0,
    100,
    100,
    c.letterSpacing,
    -c.rotation, // ASS angle is counter-clockwise; the UI rotates clockwise
    borderStyle,
    outline,
    shadow,
    alignment,
    margin,
    margin,
    c.marginV,
    1,
  ].join(",");
}

const posFor = (c) => {
  const x = Math.round(PLAY_W / 2 + (c.offsetX / 100) * PLAY_W);
  const y =
    c.alignment === "top"
      ? c.marginV
      : c.alignment === "middle"
        ? PLAY_H / 2
        : PLAY_H - c.marginV;
  return { x, y: Math.round(y) };
};

/**
 * @param {string} srt           the user's clean SRT
 * @param {Array}  cueStyles     per-cue styles aligned with SRT order
 * @param {object} fallbackStyle style for cues without an entry
 * @returns {string} ASS file contents
 */
function buildAss(srt, cueStyles, fallbackStyle) {
  const cues = parseSrtCues(srt);
  const fallback = sanitizeCustomStyle(fallbackStyle || {});

  const styleNames = new Map(); // JSON -> name
  const styleLines = [];

  const nameFor = (style) => {
    const key = JSON.stringify(style);
    if (!styleNames.has(key)) {
      const name = `C${styleNames.size}`;
      styleNames.set(key, name);
      styleLines.push(styleLine(name, style));
    }
    return styleNames.get(key);
  };

  const events = cues.map((cue, i) => {
    const style = sanitizeCustomStyle(cueStyles?.[i]) || fallback;
    const { x, y } = posFor(style);
    const tag = `{\\pos(${x},${y})}`;
    return `Dialogue: 0,${assTime(cue.start)},${assTime(cue.end)},${nameFor(style)},,0,0,0,,${tag}${safeText(cue.text, style.uppercase)}`;
  });

  return [
    "[Script Info]",
    "ScriptType: v4.00+",
    `PlayResX: ${PLAY_W}`,
    `PlayResY: ${PLAY_H}`,
    "WrapStyle: 0",
    "ScaledBorderAndShadow: yes",
    "",
    "[V4+ Styles]",
    "Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding",
    ...styleLines,
    "",
    "[Events]",
    "Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text",
    ...events,
    "",
  ].join("\n");
}

/**
 * Picks what FFmpeg should burn in for a project: a generated .ass
 * (when the project has per-caption styles) or the plain SRT with the
 * legacy preset/custom force_style.
 */
async function prepareBurnedSubtitle(project, srtPath) {
  const styles = project.subtitleCueStyles;

  if (!Array.isArray(styles) || styles.length === 0) {
    return { subtitlePath: srtPath, forceStyle: getProjectForceStyle(project) };
  }

  const srt = await fs.readFile(srtPath, "utf8");
  const assPath = path.join(path.dirname(srtPath), "render.ass");
  await fs.writeFile(assPath, buildAss(srt, styles, project.subtitleCustom), "utf8");

  return { subtitlePath: assPath, forceStyle: undefined };
}

module.exports = { parseSrtCues, buildAss, prepareBurnedSubtitle };
