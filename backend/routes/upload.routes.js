"use strict";

const express = require("express");
const multer = require("multer");

const {
  protect,
} = require(
  "../middleware/auth.middleware"
);

const {
  upload,
  MAX_FILE_SIZE,
} = require(
  "../middleware/upload.middleware"
);

const {
  uploadRateLimiter,
} = require(
  "../middleware/rateLimit.middleware"
);

const {
  uploadProjectFile,
} = require(
  "../controllers/upload.controller"
);

const router =
  express.Router();

// ------------------------------------------------------------
// Authentication required
// ------------------------------------------------------------

router.use(
  protect
);

router.use(
  uploadRateLimiter
);

// ------------------------------------------------------------
// Upload one file
//
// Form-data:
//
// file=<video/audio/image>
// ------------------------------------------------------------

router.post(
  "/",
  (req, res, next) => {
    upload.single("file")(req, res, (error) => {
      if (!error) return next();

      // Multer errors (file too large, unexpected field/type, etc.)
      // otherwise fall through to Express's default HTML error
      // page - turn them into clean JSON instead.
      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({
            success: false,
            message: `File is too large. Maximum upload size is ${Math.floor(
              MAX_FILE_SIZE / (1024 * 1024)
            )} MB.`,
          });
        }

        if (error.code === "LIMIT_UNEXPECTED_FILE") {
          return res.status(400).json({
            success: false,
            message: "Unsupported file type",
          });
        }

        return res.status(400).json({
          success: false,
          message: error.message || "Upload failed",
        });
      }

      return res.status(400).json({
        success: false,
        message: error.message || "Upload failed",
      });
    });
  },
  uploadProjectFile
);

module.exports =
  router;
