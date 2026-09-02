"use strict";

const fs = require("fs/promises");
const path = require("path");

const {
  uploadFile,
} = require("../services/cloudinary.service");


// ============================================================
// HELPERS
// ============================================================

const detectInputType = (
  mimeType
) => {
  if (
    mimeType.startsWith(
      "video/"
    )
  ) {
    return "video";
  }

  if (
    mimeType.startsWith(
      "audio/"
    )
  ) {
    return "audio";
  }

  if (
    mimeType.startsWith(
      "image/"
    )
  ) {
    return "image";
  }

  return null;
};


// ============================================================
// UPLOAD
// ============================================================

const uploadProjectFile =
  async (
    req,
    res
  ) => {
    let temporaryFilePath =
      null;

    try {
      // --------------------------------------------------------
      // Authentication
      // --------------------------------------------------------

      const userId =
        req.user._id;

      // --------------------------------------------------------
      // Multer file
      // --------------------------------------------------------

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message:
            "A file is required",
        });
      }

      temporaryFilePath =
        req.file.path;

      // --------------------------------------------------------
      // Determine type
      // --------------------------------------------------------

      const inputType =
        detectInputType(
          req.file.mimetype
        );

      if (!inputType) {
        return res.status(400).json({
          success: false,
          message:
            "Unsupported file type",
        });
      }

      // --------------------------------------------------------
      // Sanitize original filename
      // --------------------------------------------------------

      const originalFilename =
        path.basename(
          req.file.originalname
        );

      // --------------------------------------------------------
      // Cloudinary folder
      // --------------------------------------------------------

      const userFolder =
        `subtitle-app/users/${userId}/uploads`;

      // --------------------------------------------------------
      // Cloudinary resource type
      //
      // Cloudinary generally handles audio through the
      // "video" resource type.
      // --------------------------------------------------------

      let resourceType =
        "raw";

      if (
        inputType === "video" ||
        inputType === "audio"
      ) {
        resourceType =
          "video";
      }

      if (
        inputType === "image"
      ) {
        resourceType =
          "image";
      }

      // --------------------------------------------------------
      // Upload
      // --------------------------------------------------------

      const cloudinaryFile =
        await uploadFile(
          temporaryFilePath,
          {
            folder:
              userFolder,

            resourceType,

            publicId:
              undefined,
          }
        );

      // --------------------------------------------------------
      // Return upload information
      // --------------------------------------------------------

      return res.status(201).json({
        success: true,

        message:
          "File uploaded successfully",

        data: {
          file: {
            url:
              cloudinaryFile.url,

            publicId:
              cloudinaryFile.publicId,

            resourceType:
              cloudinaryFile.resourceType,

            format:
              cloudinaryFile.format,

            originalName:
              originalFilename,

            sizeBytes:
              cloudinaryFile.bytes ||
              req.file.size,

            mimeType:
              req.file.mimetype,

            width:
              cloudinaryFile.width ||
              null,

            height:
              cloudinaryFile.height ||
              null,

            durationSeconds:
              cloudinaryFile.duration ||
              null,
          },

          inputType,
        },
      });
    } catch (error) {
      console.error(
        "uploadProjectFile error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "File upload failed",
      });
    } finally {
      // --------------------------------------------------------
      // Always delete local temporary file.
      // --------------------------------------------------------

      if (
        temporaryFilePath
      ) {
        try {
          await fs.unlink(
            temporaryFilePath
          );
        } catch (cleanupError) {
          // File may already have been removed.
          console.error(
            "Temporary file cleanup failed:",
            cleanupError.message
          );
        }
      }
    }
  };


module.exports = {
  uploadProjectFile,
};