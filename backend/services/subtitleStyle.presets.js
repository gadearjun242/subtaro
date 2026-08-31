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

module.exports = {
  SUBTITLE_STYLE_PRESETS,
  DEFAULT_SUBTITLE_STYLE,
  isValidSubtitleStyle,
  getForceStyle,
};
