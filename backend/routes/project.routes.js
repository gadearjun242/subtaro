const express = require("express");

const {
  protect,
  requireActiveSubscription,
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
  requireActiveSubscription,
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
  requireActiveSubscription,
  resumeProjectController
);


// ============================================================
// UPDATE SUBTITLE (manual edit)
// ============================================================

router.patch(
  "/:projectId/subtitle",
  requireActiveSubscription,
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
  requireActiveSubscription,
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