export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Subtaro'
export const APP_TAGLINE =
  import.meta.env.VITE_APP_TAGLINE || 'Subtitles, generated in minutes.'
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

// Shown in the footer, and pricing plans link here (see src/pages/public/Pricing.jsx).
export const PORTFOLIO_URL =
  import.meta.env.VITE_PORTFOLIO_URL || 'https://arjun-gade-portfolio.vercel.app'

// Keep in sync with the backend's MAX_UPLOAD_SIZE_BYTES (middleware/upload.middleware.js).
// Checked client-side before an upload even starts, so a huge file fails
// immediately instead of after wasting bandwidth on a doomed upload.
export const MAX_UPLOAD_SIZE_MB = Number(import.meta.env.VITE_MAX_UPLOAD_SIZE_MB) || 10
export const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024
