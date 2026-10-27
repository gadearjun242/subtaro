"use strict";

// ============================================================
// SUBTITLE STYLE PRESETS
// ============================================================
//
// Only meaningful for the "embedded" (burned-in) subtitle mode -
// "selectable" mode's soft subtitle track is styled by whatever
// player the viewer opens it in, not by us.
//
// Each preset is a libass `force_style` string, passed straight
// through to FFmpeg's `subtitles` filter
// (`subtitles=file.srt:force_style='...'`). Colors are in ASS's
// &HAABBGGRR hex format (alpha, blue, green, red - note the
// reversed channel order vs. CSS). Alignment uses the numpad
// convention: 2 = bottom-center, 8 = top-center.
//
// Font names are best-effort: libass/fontconfig substitutes the
// closest match if the named font isn't installed on the
// rendering server rather than failing, so these are safe
// defaults even on a minimal server image - see BACKEND.md.
// ============================================================

const SUBTITLE_STYLE_PRESETS = {
  classic: {
    label: "Classic",
    description: "White text, black outline, bottom center.",
    forceStyle:
      "FontName=Arial,FontSize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=1,Alignment=2,MarginV=30",
  },

  bold_yellow: {
    label: "Bold Yellow",
    description: "High-contrast bold yellow, bottom center.",
    forceStyle:
      "FontName=Arial,Bold=1,FontSize=28,PrimaryColour=&H0000FFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=3,Shadow=0,Alignment=2,MarginV=40",
  },

  minimal_top: {
    label: "Minimal Top",
    description: "Small, unobtrusive text along the top edge.",
    forceStyle:
      "FontName=Arial,FontSize=18,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=1,Shadow=0,Alignment=8,MarginV=20",
  },

  cinematic: {
    label: "Cinematic",
    description: "Elegant text on a soft translucent bar.",
    forceStyle:
      "FontName=Georgia,FontSize=26,PrimaryColour=&H00FFFFFF,BackColour=&H80000000,BorderStyle=3,Outline=0,Shadow=0,Alignment=2,MarginV=50",
  },
};

const DEFAULT_SUBTITLE_STYLE = "classic";

const isValidSubtitleStyle = (key) =>
  Object.prototype.hasOwnProperty.call(SUBTITLE_STYLE_PRESETS, key);

const getForceStyle = (key) =>
  SUBTITLE_STYLE_PRESETS[key]?.forceStyle ||
  SUBTITLE_STYLE_PRESETS[DEFAULT_SUBTITLE_STYLE].forceStyle;

// ============================================================
// CUSTOM STYLE
// ============================================================
//
// Users can fine-tune a style beyond the presets. Every field is
// validated against a whitelist/range and the libass force_style
// string is BUILT by us - raw user text never reaches FFmpeg, so
// there is no way to inject filter options.
// ============================================================

const CUSTOM_FONTS = [
  "Arial",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Noto Sans",
  "Noto Serif",
  "DejaVu Sans",
  "DejaVu Serif",
  "Georgia",
];

const HEX = /^#[0-9a-fA-F]{6}$/;

const clamp = (value, min, max, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
};

// CSS #RRGGBB -> ASS &HAABBGGRR (alpha 00 = opaque, FF = transparent)
const toAss = (hex, alpha = 0) => {
  const r = hex.slice(1, 3);
  const g = hex.slice(3, 5);
  const b = hex.slice(5, 7);
  const a = Math.min(255, Math.max(0, alpha)).toString(16).padStart(2, "0");
  return `&H${a}${b}${g}${r}`.toUpperCase();
};

const sanitizeCustomStyle = (input) => {
  if (!input || typeof input !== "object") return null;

  const color = (v, fallback) => (typeof v === "string" && HEX.test(v) ? v.toLowerCase() : fallback);

  return {
    fontName: CUSTOM_FONTS.includes(input.fontName) ? input.fontName : "Arial",
    fontSize: clamp(input.fontSize, 12, 72, 24),
    bold: Boolean(input.bold),
    italic: Boolean(input.italic),
    primaryColor: color(input.primaryColor, "#ffffff"),
    outlineColor: color(input.outlineColor, "#000000"),
    outlineWidth: clamp(input.outlineWidth, 0, 6, 2),
    shadow: clamp(input.shadow, 0, 4, 1),
    background: Boolean(input.background),
    backgroundColor: color(input.backgroundColor, "#000000"),
    backgroundOpacity: clamp(input.backgroundOpacity, 0, 100, 50),
    alignment: ["top", "middle", "bottom"].includes(input.alignment) ? input.alignment : "bottom",
    marginV: clamp(input.marginV, 0, 250, 30),
    // Horizontal shift of the caption's centre, as a percentage of the
    // frame width (-45..45). 0 = centred.
    offsetX: clamp(input.offsetX, -45, 45, 0),
    letterSpacing: clamp(input.letterSpacing, -2, 12, 0),
    rotation: clamp(input.rotation, -45, 45, 0),
    textOpacity: clamp(input.textOpacity, 10, 100, 100),
    shadowColor: color(input.shadowColor, "#000000"),
    uppercase: Boolean(input.uppercase),
  };
};

const buildCustomForceStyle = (c) => {
  const alignment = { bottom: 2, middle: 5, top: 8 }[c.alignment];
  const parts = [
    `FontName=${c.fontName}`,
    `FontSize=${c.fontSize}`,
    `Bold=${c.bold ? 1 : 0}`,
    `Italic=${c.italic ? 1 : 0}`,
    `PrimaryColour=${toAss(c.primaryColor)}`,
    `OutlineColour=${toAss(c.outlineColor)}`,
    `Alignment=${alignment}`,
    `MarginV=${c.marginV}`,
  ];

  // libass lays SRT out on a 384-unit-wide canvas. Text is centred between
  // MarginL and MarginR, so shifting the centre by dx needs L-R = 2*dx.
  const dx = Math.round((c.offsetX / 100) * 384);
  parts.push(`MarginL=${10 + Math.max(0, 2 * dx)}`, `MarginR=${10 + Math.max(0, -2 * dx)}`);

  if (c.background) {
    // BorderStyle 3 draws an opaque box using OutlineColour/BackColour.
    const alpha = Math.round(255 * (1 - c.backgroundOpacity / 100));
    parts.push("BorderStyle=3", `Outline=${Math.max(c.outlineWidth, 1)}`, "Shadow=0");
    parts.push(`OutlineColour=${toAss(c.backgroundColor, alpha)}`, `BackColour=${toAss(c.backgroundColor, alpha)}`);
  } else {
    parts.push("BorderStyle=1", `Outline=${c.outlineWidth}`, `Shadow=${c.shadow}`);
  }

  return parts.join(",");
};

// The style actually used to render a project: custom if set, else preset.
const getProjectForceStyle = (project) =>
  project?.subtitleCustom
    ? buildCustomForceStyle(sanitizeCustomStyle(project.subtitleCustom))
    : getForceStyle(project?.subtitleStyle);

// Per-caption styles: an array aligned with the SRT's cue order. Every
// entry is a complete, independently sanitized style (or null = use the
// project's fallback style). Capped so a hostile client cannot bloat the doc.
const MAX_CUE_STYLES = 5000;

const sanitizeCueStyles = (input) => {
  if (!Array.isArray(input)) return null;

  return input
    .slice(0, MAX_CUE_STYLES)
    .map((entry) => (entry && typeof entry === "object" ? sanitizeCustomStyle(entry) : null));
};

module.exports = {
  sanitizeCueStyles,
  toAss,
  CUSTOM_FONTS,
  sanitizeCustomStyle,
  buildCustomForceStyle,
  getProjectForceStyle,
  SUBTITLE_STYLE_PRESETS,
  DEFAULT_SUBTITLE_STYLE,
  isValidSubtitleStyle,
  getForceStyle,
};
