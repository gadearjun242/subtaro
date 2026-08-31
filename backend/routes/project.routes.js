const express = require("express");

const {
  protect,
} = require(
  "../middleware/auth.middleware"
);

const {
  createProjectController,
  getProjectController,
  refreshProjectController,
  getProjectLogsController,
  resumeProjectController,
  updateSubtitleController,
  renameProjectController,
  duplicateProjectController,
  deleteProjectController,
} = require(
  "../controllers/project.controller"
);

const router =
  express.Router();


// All project endpoints belong
// to an authenticated user.
router.use(protect);


// ============================================================
// CREATE / SUBMIT
// ============================================================

router.post(
  "/",
  createProjectController
);


// ============================================================
// PROJECT
// ============================================================

router.get(
  "/:projectId",
  getProjectController
);


// ============================================================
// FORCE STATUS REFRESH
// ============================================================

router.get(
  "/:projectId/refresh",
  refreshProjectController
);


// ============================================================
// SERVICE LOGS
// ============================================================

router.get(
  "/:projectId/logs",
  getProjectLogsController
);


// ============================================================
// RESUME
// ============================================================

router.post(
  "/:projectId/resume",
  resumeProjectController
);


// ============================================================
// UPDATE SUBTITLE (manual edit)
// ============================================================

router.patch(
  "/:projectId/subtitle",
  updateSubtitleController
);


// ============================================================
// RENAME
// ============================================================

router.patch(
  "/:projectId",
  renameProjectController
);


// ============================================================
// DUPLICATE
// ============================================================

router.post(
  "/:projectId/duplicate",
  duplicateProjectController
);


// ============================================================
// DELETE
// ============================================================

router.delete(
  "/:projectId",
  deleteProjectController
);


module.exports =
  router;   