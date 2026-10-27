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

/**
 * Delete EVERY asset under a folder prefix (all three resource
 * types), then try to remove the now-empty folder. Used when a
 * project or account is deleted so nothing is orphaned in
 * Cloudinary - including stems, previews and legacy outputs that
 * the project record no longer tracks individually.
 *
 * Best-effort per resource type; returns a summary instead of
 * throwing so one failure never blocks the rest of the cleanup.
 */
const deleteByPrefix = async (prefix) => {
  if (!prefix || typeof prefix !== "string" || prefix.length < 12) {
    throw new Error("A specific Cloudinary folder prefix is required");
  }

  const folder = prefix.replace(/\/+$/, "");
  const summary = { prefix: folder, deleted: 0, errors: [] };

  for (const resourceType of ["video", "image", "raw"]) {
    try {
      const result = await cloudinary.api.delete_resources_by_prefix(
        `${folder}/`,
        { resource_type: resourceType, invalidate: true }
      );
      summary.deleted += Object.values(result?.deleted || {}).filter(
        (v) => v === "deleted"
      ).length;
    } catch (error) {
      summary.errors.push(`${resourceType}: ${error.message}`);
    }
  }

  try {
    await cloudinary.api.delete_folder(folder);
  } catch {
    // Folder may not exist or may still hold sub-folders; harmless.
  }

  return summary;
};

module.exports = {
  uploadFile,
  deleteFile,
  deleteByPrefix,
};