const express = require("express");

const {
  subtitleWebhook,
} = require(
  "../controllers/webhook.controller"
);

const router =
  express.Router();


// ============================================================
// SUBTITLE SERVICE CALLBACK
// ============================================================

router.post(
  "/subtitle/:projectId",
  subtitleWebhook
);


module.exports = router;