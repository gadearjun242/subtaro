"use strict";

const Contact = require("../models/Contact");

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

// ============================================================
// POST /api/contact
// ============================================================
//
// Public. Body: { name, email, message }
//
// Persists the message so it can be reviewed later. No email is
// actually sent yet - wire up a transactional email provider
// (e.g. via `temp.email.service.txt` as a starting point) and
// call it here before shipping. See BACKEND.md.
// ============================================================

const submitContact = async (req, res) => {
  try {
    const { name, email, message } = req.body || {};

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "Name, email and message are required",
      });
    }

    const trimmedName = String(name).trim();
    const trimmedEmail = String(email).trim().toLowerCase();
    const trimmedMessage = String(message).trim();

    if (trimmedName.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Name must contain at least 2 characters",
      });
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address",
      });
    }

    if (trimmedMessage.length < 5) {
      return res.status(400).json({
        success: false,
        message: "Message is too short",
      });
    }

    if (trimmedMessage.length > 5000) {
      return res.status(400).json({
        success: false,
        message: "Message is too long",
      });
    }

    const contact = await Contact.create({
      name: trimmedName,
      email: trimmedEmail,
      message: trimmedMessage,
      userId: req.user?._id || null,
      ipAddress: req.ip || null,
    });

    return res.status(201).json({
      success: true,
      message: "Thanks — we'll get back to you soon.",
      data: {
        id: contact._id,
        createdAt: contact.createdAt,
      },
    });
  } catch (error) {
    console.error("submitContact error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to send your message right now",
    });
  }
};

module.exports = {
  submitContact,
};
