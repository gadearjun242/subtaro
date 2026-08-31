const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 100,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },

        password: {
            type: String,
            required: true,
            select: false,
        },

        avatar: {
            type: String,
            default: null,
        },

        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user",
            index: true,
        },

        isEmailVerified: {
            type: Boolean,
            default: false,
        },

        emailVerification: {
            verified: {
                type: Boolean,
                default: false,
            },

            tokenHash: {
                type: String,
                default: null,
                select: false,
            },

            expiresAt: {
                type: Date,
                default: null,
                select: false,
            },

            verifiedAt: {
                type: Date,
                default: null,
            },

            lastSentAt: {
                type: Date,
                default: null,
            },

            sendCount: {
                type: Number,
                default: 0,
                min: 0,
            },
        },

        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },

        tokenVersion: {
            type: Number,
            default: 0,
            min: 0,
        },

        lastLoginAt: {
            type: Date,
            default: null,
        },

        // ============================================================
        // SUBSCRIPTION
        // ============================================================
        //
        // Every new user is auto-enrolled in a 30-day free trial by
        // default (see the field-level defaults below - no controller
        // code needs to run this manually, Mongoose applies these the
        // moment `User.create()` runs).
        //
        // Upgrading currently happens through a placeholder endpoint
        // with no real payment processor wired in - see BACKEND.md.
        // ============================================================

        subscription: {
            planKey: {
                type: String,
                enum: [
                    "free_trial",
                    "monthly",
                    "quarterly",
                    "half_yearly",
                    "yearly",
                    "lifetime",
                ],
                default: "free_trial",
            },

            status: {
                type: String,
                enum: ["trialing", "active", "expired", "cancelled"],
                default: "trialing",
            },

            startedAt: {
                type: Date,
                default: Date.now,
            },

            // null for the lifetime plan (never expires)
            expiresAt: {
                type: Date,
                default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },

            isLifetime: {
                type: Boolean,
                default: false,
            },

            // Populated once a real payment gateway is wired in.
            lastPayment: {
                amount: { type: Number, default: null },
                currency: { type: String, default: null },
                provider: { type: String, default: null },
                reference: { type: String, default: null },
                paidAt: { type: Date, default: null },
            },
        },

        analytics: {
            totalProjects: {
                type: Number,
                default: 0,
                min: 0,
            },

            completedProjects: {
                type: Number,
                default: 0,
                min: 0,
            },

            failedProjects: {
                type: Number,
                default: 0,
                min: 0,
            },

            totalProcessingTimeSeconds: {
                type: Number,
                default: 0,
                min: 0,
            },

            totalUploadedBytes: {
                type: Number,
                default: 0,
                min: 0,
            },
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

// ============================================================
// INSTANCE METHODS
// ============================================================

/**
 * Whether the user's current plan is still usable right now.
 * Purely informational today - no route currently blocks
 * access based on this, it's there for the frontend/UI and
 * for whenever access-gating is added.
 */
userSchema.methods.hasActiveAccess = function hasActiveAccess() {
    const sub = this.subscription;

    if (!sub) return true; // legacy users without a subscription sub-doc

    if (sub.isLifetime || sub.planKey === "lifetime") return true;

    if (sub.status === "cancelled" || sub.status === "expired") return false;

    if (!sub.expiresAt) return true;

    return new Date(sub.expiresAt).getTime() > Date.now();
};

module.exports = mongoose.model("User", userSchema);