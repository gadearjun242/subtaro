const mongoose = require("mongoose");

// ============================================================
// CONTACT
// ============================================================
//
// Stores messages submitted through the public contact form.
// No outbound email is sent yet - this just persists the
// message so it can be reviewed (e.g. from a future admin
// panel, or directly in the DB). See BACKEND.md for wiring up
// a real transactional email provider.
// ============================================================

const contactSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200,
        },

        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            maxlength: 254,
        },

        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 5000,
        },

        // Attached automatically if the request was authenticated,
        // so a logged-in user's message can be traced back to their
        // account even if they typed a different contact email.
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true,
        },

        status: {
            type: String,
            enum: ["new", "read", "resolved"],
            default: "new",
            index: true,
        },

        ipAddress: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

module.exports = mongoose.model("Contact", contactSchema);
