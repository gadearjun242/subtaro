const mongoose = require("mongoose");

// ============================================================
// PLAN
// ============================================================
//
// A small, admin-editable catalog of subscription tiers. Every
// new user is auto-enrolled in the "free_trial" plan for 30
// days (see the `subscription` sub-document default on the
// User model). Upgrading to any other plan currently happens
// through a placeholder "activate" endpoint with no real
// payment processor wired in yet - see BACKEND.md.
// ============================================================

const planSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            index: true,
            enum: [
                "free_trial",
                "monthly",
                "quarterly",
                "half_yearly",
                "yearly",
                "lifetime",
            ],
        },

        name: {
            type: String,
            required: true,
            trim: true,
        },

        description: {
            type: String,
            trim: true,
            default: "",
        },

        // Billing cycle length in days. `null` means the plan
        // never expires (used for "lifetime").
        durationDays: {
            type: Number,
            default: null,
            min: 0,
        },

        isLifetime: {
            type: Boolean,
            default: false,
        },

        // Price is stored as a plain decimal amount (e.g. 9.00)
        // in `currency`. No payment gateway is wired in yet -
        // this is display-only until one is added.
        price: {
            type: Number,
            required: true,
            min: 0,
        },

        currency: {
            type: String,
            default: "USD",
            uppercase: true,
            trim: true,
        },

        // Shown as a "Save X%" / "Most popular" style badge on
        // the pricing page. Optional.
        badge: {
            type: String,
            default: null,
        },

        features: {
            type: [String],
            default: [],
        },

        isDefault: {
            type: Boolean,
            default: false,
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        sortOrder: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

module.exports = mongoose.model("Plan", planSchema);
