"use strict";

const Project = require("../models/Project");
const { deleteFile, deleteByPrefix } = require("./cloudinary.service");

// ============================================================
// CLOUDINARY CLEANUP
// ============================================================
//
// Layout in Cloudinary:
//
//   subtitle-app/users/<userId>/uploads/...                 source uploads
//   subtitle-app/users/<userId>/projects/<projectId>/...    subtitle, output, stems
//
// Deleting a project removes the whole project folder (so nothing
// the record forgot about can linger) plus its source upload -
// unless a duplicated project still points at the same source.
// ============================================================

const projectFolder = (userId, projectId) =>
  `subtitle-app/users/${userId}/projects/${projectId}`;

const isPublicIdReferencedElsewhere = async (publicId, excludeMongoId) => {
  if (!publicId) return false;

  const count = await Project.countDocuments({
    _id: { $ne: excludeMongoId },
    $or: [
      { "input.publicId": publicId },
      { "subtitle.file.publicId": publicId },
      { "output.file.publicId": publicId },
      { "stems.vocal.publicId": publicId },
      { "stems.instrument.publicId": publicId },
    ],
  });

  return count > 0;
};

async function deleteProjectAssets(project) {
  const report = { prefixes: [], files: [], errors: [] };
  const userId = String(project.userId);

  // 1. Per-project folder: subtitle, rendered output, vocal/instrument stems.
  //    Skipped if a duplicate shares one of its files (rare; the
  //    per-file pass below still removes the unshared ones).
  const prefix = projectFolder(userId, project.projectId);

  try {
    report.prefixes.push(await deleteByPrefix(prefix));
  } catch (error) {
    report.errors.push(`${prefix}: ${error.message}`);
  }

  // 2. Any tracked file outside that folder (the original upload, or
  //    files from before the folder layout existed).
  const tracked = [
    { file: project.input, type: "video" },
    { file: project.subtitle?.file, type: "raw" },
    { file: project.output?.file, type: "video" },
    { file: project.stems?.vocal, type: "video" },
    { file: project.stems?.instrument, type: "video" },
  ].filter((entry) => entry.file?.publicId);

  for (const { file, type } of tracked) {
    try {
      if (await isPublicIdReferencedElsewhere(file.publicId, project._id)) continue;
      await deleteFile(file.publicId, file.resourceType || type);
      report.files.push(file.publicId);
    } catch (error) {
      report.errors.push(`${file.publicId}: ${error.message}`);
    }
  }

  return report;
}

async function deleteUserAssets(userId) {
  const base = `subtitle-app/users/${userId}`;

  try {
    return await deleteByPrefix(base);
  } catch (error) {
    return { prefix: base, deleted: 0, errors: [error.message] };
  }
}

module.exports = {
  projectFolder,
  deleteProjectAssets,
  deleteUserAssets,
};
