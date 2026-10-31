"use strict";

const Plan = require("../models/Plan");
const PLAN_CATALOG = require("../data/planCatalog.json");

// ============================================================
// SEED
// ============================================================

const ensurePlansSeeded = async () => {
    const operations = PLAN_CATALOG.map((plan) => ({
        updateOne: {
            filter: { key: plan.key },
            update: { $set: plan },
            upsert: true,
        },
    }));

    await Plan.bulkWrite(operations);

    // Retired plans (lifetime was removed) must disappear from the
    // pricing page; existing holders keep their subscription window.
    await Plan.updateMany(
        { key: { $nin: PLAN_CATALOG.map((p) => p.key) } },
        { $set: { isActive: false } }
    );
};

// ============================================================
// LOOKUPS
// ============================================================

const getActivePlans = () =>
    Plan.find({ isActive: true }).sort({ sortOrder: 1 }).lean();

const getPlanByKey = (key) => Plan.findOne({ key }).lean();

/**
 * Given a plan, compute the subscription window a user should
 * get starting now (used by the mock "activate" endpoint).
 */
const computeSubscriptionWindow = (plan) => {
    const startedAt = new Date();

    if (plan.isLifetime || !plan.durationDays) {
        return { startedAt, expiresAt: null, isLifetime: true };
    }

    const expiresAt = new Date(
        startedAt.getTime() + plan.durationDays * 24 * 60 * 60 * 1000
    );

    return { startedAt, expiresAt, isLifetime: false };
};

module.exports = {
    PLAN_CATALOG,
    ensurePlansSeeded,
    getActivePlans,
    getPlanByKey,
    computeSubscriptionWindow,
};
