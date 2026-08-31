"use strict";

const { getActivePlans } = require("../services/plan.service");

// ============================================================
// GET /api/plans
// ============================================================
//
// Public - no auth required. Powers the pricing page.
// ============================================================

const listPlans = async (req, res) => {
  try {
    const plans = await getActivePlans();

    return res.status(200).json({
      success: true,
      data: { plans },
    });
  } catch (error) {
    console.error("listPlans error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load plans",
    });
  }
};

module.exports = {
  listPlans,
};
