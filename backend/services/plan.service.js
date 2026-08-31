"use strict";

const Plan = require("../models/Plan");

// ============================================================
// CATALOG
// ============================================================
//
// Source of truth for the seed data. Edit prices/features here
// and re-deploy - `ensurePlansSeeded()` upserts by `key`, so
// re-running it (e.g. on every server boot) is always safe and
// picks up edits made here without wiping any other Plan
// fields an admin may have changed directly in the DB.
// ============================================================

const PLAN_CATALOG = [
    {
        key: "free_trial",
        name: "Free Trial",
        description: "Try everything, no card required.",
        durationDays: 30,
        isLifetime: false,
        price: 0,
        currency: "USD",
        badge: null,
        isDefault: true,
        sortOrder: 0,
        features: [
            "30 days full access",
            "Unlimited video & audio uploads",
            "Speaker-aware transcription",
            "Editable subtitles",
            "Live processing updates",
        ],
    },
    {
        key: "monthly",
        name: "Monthly",
        description: "Flexible, cancel any time.",
        durationDays: 30,
        isLifetime: false,
        price: 9,
        currency: "USD",
        badge: null,
        isDefault: false,
        sortOrder: 1,
        features: [
            "Everything in Free Trial",
            "Priority processing queue",
            "Extended storage",
            "Email support",
        ],
    },
    {
        key: "quarterly",
        name: "3 Months",
        description: "A quarter of savings.",
        durationDays: 90,
        isLifetime: false,
        price: 24,
        currency: "USD",
        badge: "Save 11%",
        isDefault: false,
        sortOrder: 2,
        features: [
            "Everything in Monthly",
            "Batch project uploads",
            "Priority support",
        ],
    },
    {
        key: "half_yearly",
        name: "6 Months",
        description: "Half a year, better value.",
        durationDays: 180,
        isLifetime: false,
        price: 45,
        currency: "USD",
        badge: "Save 17%",
        isDefault: false,
        sortOrder: 3,
        features: [
            "Everything in 3 Months",
            "Advanced analytics",
            "Early access to new features",
        ],
    },
    {
        key: "yearly",
        name: "12 Months",
        description: "Our best recurring value.",
        durationDays: 365,
        isLifetime: false,
        price: 79,
        currency: "USD",
        badge: "Most popular",
        isDefault: false,
        sortOrder: 4,
        features: [
            "Everything in 6 Months",
            "Dedicated support channel",
            "2 months free vs. monthly",
        ],
    },
    {
        key: "lifetime",
        name: "Lifetime",
        description: "Pay once, use it forever.",
        durationDays: null,
        isLifetime: true,
        price: 199,
        currency: "USD",
        badge: "Best value",
        isDefault: false,
        sortOrder: 5,
        features: [
            "Everything in 12 Months",
            "One-time payment, no renewals",
            "Lifetime updates",
        ],
    },
];

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
