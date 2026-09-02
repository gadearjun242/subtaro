const cloudinary = require("../config/cloudinary");

/**
 * Upload a file to Cloudinary.
 *
 * Supported:
 * - image
 * - video
 * - audio
 * - raw
 *
 * @param {string} filePath
 * @param {object} options
 * @returns {Promise<object>}
 */
const uploadFile = async (filePath, options = {}) => {
  if (!filePath) {
    throw new Error("File path is required");
  }

  const {
    folder = "subtitle-app",
    resourceType = "auto",
    publicId,
    overwrite,
  } = options;

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: resourceType,
      folder,
      ...(publicId ? { public_id: publicId } : {}),
      // Only meaningful (and only sent) when a fixed publicId is
      // also given - overwriting an auto-generated publicId makes
      // no sense since nothing else could already be there.
      ...(publicId && overwrite !== undefined
        ? { overwrite, invalidate: overwrite }
        : {}),
    });

    return {
      publicId: result.public_id,
      url: result.secure_url,
      resourceType: result.resource_type,
      format: result.format || null,
      originalFilename: result.original_filename || null,
      bytes: result.bytes || null,
      width: result.width || null,
      height: result.height || null,
      duration: result.duration || null,
      createdAt: result.created_at || null,
    };
  } catch (error) {
    console.error("Cloudinary upload failed:", error.message);

    throw new Error(
      `Cloudinary upload failed: ${error.message}`
    );
  }
};

/**
 * Delete a file from Cloudinary.
 *
 * @param {string} publicId
 * @param {string} resourceType
 * @returns {Promise<object>}
 */
const deleteFile = async (
  publicId,
  resourceType = "image"
) => {
  if (!publicId) {
    throw new Error("Cloudinary publicId is required");
  }

  const allowedResourceTypes = [
    "image",
    "video",
    "raw",
  ];

  if (!allowedResourceTypes.includes(resourceType)) {
    throw new Error(
      `Unsupported Cloudinary resource type: ${resourceType}`
    );
  }

  try {
    const result = await cloudinary.uploader.destroy(
      publicId,
      {
        resource_type: resourceType,
        invalidate: true,
      }
    );

    if (
      result.result !== "ok" &&
      result.result !== "not found"
    ) {
      throw new Error(
        `Cloudinary delete failed: ${result.result}`
      );
    }

    return {
      publicId,
      resourceType,
      result: result.result,
    };
  } catch (error) {
    console.error(
      "Cloudinary delete failed:",
      error.message
    );

    throw new Error(
      `Cloudinary delete failed: ${error.message}`
    );
  }
};

module.exports = {
  uploadFile,
  deleteFile,
};