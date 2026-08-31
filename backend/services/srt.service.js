"use strict";

// ============================================================
// SRT -> PLAIN TEXT
// ============================================================
//
// Strips index numbers and timestamp lines from an SRT file,
// leaving just the spoken text, joined into a single string.
// Used to populate `project.subtitle.searchText` so project
// search can match inside subtitle content, not just the
// project name/id.
// ============================================================

const MAX_SEARCH_TEXT_LENGTH = 20000;

const TIMESTAMP_LINE =
  /\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{3}/;

const INDEX_LINE = /^\d+$/;

function extractPlainTextFromSrt(srtContent) {
  if (!srtContent || typeof srtContent !== "string") {
    return "";
  }

  const words = srtContent
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !TIMESTAMP_LINE.test(line))
    .filter((line) => !INDEX_LINE.test(line))
    .join(" ");

  return words.slice(0, MAX_SEARCH_TEXT_LENGTH);
}

module.exports = {
  extractPlainTextFromSrt,
};
