const express = require("express");

const { protect } = require("../middleware/auth.middleware");
const {
  getConfig,
  createCheckoutOrder,
  verifyPayment,
} = require("../controllers/payment.controller");

const router = express.Router();

router.get("/config", getConfig);
router.post("/order", protect, createCheckoutOrder);
router.post("/verify", protect, verifyPayment);

module.exports = router;
