// Mirrors backend/services/subtitleStyle.presets.js. The backend
// re-validates every field, so this file only drives the UI and the
// live preview - it can never make the server render something
// unsafe.

export const FONTS = [
  'Arial',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Noto Sans',
  'Noto Serif',
  'DejaVu Sans',
  'DejaVu Serif',
  'Georgia',
]

export const BASE_STYLE = {
  fontName: 'Arial',
  fontSize: 24,
  bold: false,
  italic: false,
  uppercase: false,
  primaryColor: '#ffffff',
  textOpacity: 100,
  outlineColor: '#000000',
  outlineWidth: 2,
  shadow: 1,
  shadowColor: '#000000',
  background: false,
  backgroundColor: '#000000',
  backgroundOpacity: 50,
  letterSpacing: 0,
  rotation: 0,
  alignment: 'bottom',
  marginV: 30,
  offsetX: 0,
}

export const PRESET_STYLES = {
  classic: { label: 'Classic', style: { ...BASE_STYLE } },
  bold_yellow: {
    label: 'Bold Yellow',
    style: { ...BASE_STYLE, bold: true, fontSize: 28, primaryColor: '#ffff00', outlineWidth: 3, shadow: 0, marginV: 40 },
  },
  minimal_top: {
    label: 'Minimal Top',
    style: { ...BASE_STYLE, fontSize: 18, outlineWidth: 1, shadow: 0, alignment: 'top', marginV: 20 },
  },
  cinematic: {
    label: 'Cinematic',
    style: { ...BASE_STYLE, fontName: 'Noto Serif', fontSize: 26, outlineWidth: 0, shadow: 0, background: true, marginV: 50 },
  },
  impact: {
    label: 'Impact',
    style: { ...BASE_STYLE, fontName: 'Montserrat', bold: true, uppercase: true, fontSize: 32, outlineWidth: 4, shadow: 0, marginV: 60 },
  },
  neon: {
    label: 'Neon',
    style: { ...BASE_STYLE, fontName: 'Montserrat', bold: true, fontSize: 28, primaryColor: '#00ffd5', outlineColor: '#003d33', outlineWidth: 3, shadow: 2, shadowColor: '#00ffd5', marginV: 50 },
  },
}

// The starting style of a caption when the project has no per-caption
// styles yet: its legacy custom style, else its preset.
export const styleFromProject = (project) =>
  project?.subtitleCustom
    ? { ...BASE_STYLE, ...project.subtitleCustom }
    : { ...(PRESET_STYLES[project?.subtitleStyle]?.style || BASE_STYLE) }

export const sameStyle = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// libass lays captions out on a 384x288 canvas and scales it to the
// video, so every size below is a fraction of the frame.
const ASS_W = 384
const ASS_H = 288

const hexToRgba = (hex, alpha) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

/** Max wrap width (as % of the frame) - mirrors the server's side margins. */
export const captionMaxWidth = (style) => {
  const dx = Math.abs(((style.offsetX || 0) / 100) * ASS_W)
  return ((ASS_W - 2 * Math.max(10, dx)) / ASS_W) * 100
}

/** CSS for the live caption preview inside a frame of `frameHeight` px. */
export function captionCss(style, frameHeight) {
  const k = (frameHeight || ASS_H) / ASS_H
  const opacity = (style.textOpacity ?? 100) / 100
  const css = {
    fontFamily: `'${style.fontName}', sans-serif`,
    fontSize: style.fontSize * k,
    fontWeight: style.bold ? 700 : 400,
    fontStyle: style.italic ? 'italic' : 'normal',
    textTransform: style.uppercase ? 'uppercase' : 'none',
    letterSpacing: (style.letterSpacing || 0) * k,
    color: hexToRgba(style.primaryColor, opacity),
    lineHeight: 1.25,
    textAlign: 'center',
    whiteSpace: 'pre-wrap',
  }

  if (style.background) {
    css.background = hexToRgba(style.backgroundColor, style.backgroundOpacity / 100)
    css.padding = `${0.15 * style.fontSize * k}px ${0.4 * style.fontSize * k}px`
    css.borderRadius = 2 * k
  } else {
    if (style.outlineWidth > 0) {
      css.WebkitTextStroke = `${style.outlineWidth * k * 2}px ${style.outlineColor}`
      css.paintOrder = 'stroke fill'
    }
    if (style.shadow > 0) {
      const o = style.shadow * k
      css.textShadow = `${o}px ${o}px ${o}px ${hexToRgba(style.shadowColor || '#000000', 0.7)}`
    }
  }

  return css
}

/** Wrapper style that places the caption (anchor + sideways shift + rotation). */
export const frameAlignment = (style, frameHeight) => {
  const k = (frameHeight || ASS_H) / ASS_H
  const m = style.marginV * k
  const base = {
    transform: `translateX(${style.offsetX || 0}%)`,
  }
  if (style.alignment === 'top') return { ...base, justifyContent: 'flex-start', paddingTop: m }
  if (style.alignment === 'middle') return { ...base, justifyContent: 'center' }
  return { ...base, justifyContent: 'flex-end', paddingBottom: m }
}
