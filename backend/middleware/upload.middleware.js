"use strict";

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const TEMP_UPLOAD_DIR =
  process.env.TEMP_UPLOAD_DIR ||
  path.join(
    process.cwd(),
    "tmp",
    "uploads"
  );

fs.mkdirSync(
  TEMP_UPLOAD_DIR,
  {
    recursive: true,
  }
);

const MAX_FILE_SIZE =
  Number(
    process.env.MAX_UPLOAD_SIZE_BYTES ||
      10 * 1024 * 1024 // 10 MB
  );

// ------------------------------------------------------------
// Allowed MIME types
// ------------------------------------------------------------

const ALLOWED_MIME_TYPES = new Set([
  // Video
  "video/mp4",
  "video/quicktime",
  "video/x-matroska",
  "video/webm",
  "video/mpeg",

  // Audio
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/flac",
  "audio/x-flac",
  "audio/mp4",
  "audio/aac",
  "audio/ogg",
  "audio/opus",

  // Images
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

// ------------------------------------------------------------
// Temporary disk storage
// ------------------------------------------------------------

const storage =
  multer.diskStorage({
    destination(
      req,
      file,
      cb
    ) {
      cb(
        null,
        TEMP_UPLOAD_DIR
      );
    },

    filename(
      req,
      file,
      cb
    ) {
      const extension =
        path.extname(
          file.originalname
        ).toLowerCase();

      const uniqueName =
        `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 10)}${extension}`;

      cb(
        null,
        uniqueName
      );
    },
  });

// ------------------------------------------------------------
// File validation
// ------------------------------------------------------------

const fileFilter = (
  req,
  file,
  cb
) => {
  if (
    !ALLOWED_MIME_TYPES.has(
      file.mimetype
    )
  ) {
    return cb(
      new multer.MulterError(
        "LIMIT_UNEXPECTED_FILE"
      ),
      false
    );
  }

  cb(
    null,
    true
  );
};

// ------------------------------------------------------------
// Multer instance
// ------------------------------------------------------------

const upload =
  multer({
    storage,

    limits: {
      fileSize:
        MAX_FILE_SIZE,

      files: 1,
    },

    fileFilter,
  });

module.exports = {
  upload,
  TEMP_UPLOAD_DIR,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
};