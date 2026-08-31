const express = require("express");

const { listPlans } = require("../controllers/plan.controller");

const router = express.Router();

// GET /api/plans - public pricing catalog
router.get("/", listPlans);

module.exports = router;
