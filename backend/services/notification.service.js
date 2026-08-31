"use strict";

const User = require("../models/User");
const Project = require("../models/Project");
const { isUserOnline } = require("./socket.service");
const {
  sendProjectCompletionEmail,
  sendProjectFailureEmail,
} = require("./email.service");

/**
 * Sends (or deliberately skips) a "your project is done/failed"
 * email, and always records what happened on
 * `project.notifications.completionEmail` so support can see the
 * outcome if a user reports never getting an email.
 *
 * Never throws - this is meant to be called fire-and-forget from
 * the webhook flow and must not affect the main response.
 *
 * @param {object} project - a saved Project document (or plain object with _id/userId/projectId/name/etc.)
 * @param {"completed"|"failed"} outcome
 */
async function notifyProjectOutcome(project, outcome) {
  try {
    if (project.notifications?.completionEmail?.enabled === false) {
      await markStatus(project._id, "not_required");
      return;
    }

    // If the user already has a live socket connection (they're on
    // the dashboard watching updates arrive in real time), the
    // in-app toast/notification is enough - an email would just be
    // noise. Only email people who aren't currently watching.
    if (isUserOnline(String(project.userId))) {
      await markStatus(project._id, "not_required");
      return;
    }

    const user = await User.findById(project.userId).select("name email");

    if (!user) {
      await markStatus(project._id, "failed", "Project owner not found");
      return;
    }

    const sendFn =
      outcome === "completed" ? sendProjectCompletionEmail : sendProjectFailureEmail;

    const result = await sendFn({ to: user.email, name: user.name, project });

    await Project.updateOne(
      { _id: project._id },
      {
        $set: {
          "notifications.completionEmail.status": result.skipped ? "failed" : "sent",
          "notifications.completionEmail.sentAt": result.skipped ? null : new Date(),
          "notifications.completionEmail.messageId": result.messageId || null,
          "notifications.completionEmail.lastError": result.skipped
            ? "Mail is not configured on this server (see BACKEND.md)"
            : null,
        },
        $inc: { "notifications.completionEmail.attempts": 1 },
      }
    );
  } catch (error) {
    console.error(
      `notifyProjectOutcome failed for project ${project.projectId}:`,
      error.message
    );
    await markStatus(project._id, "failed", error.message);
  }
}

async function markStatus(projectMongoId, status, lastError = null) {
  try {
    await Project.updateOne(
      { _id: projectMongoId },
      {
        $set: {
          "notifications.completionEmail.status": status,
          "notifications.completionEmail.lastError": lastError,
        },
      }
    );
  } catch (error) {
    console.error(
      `Failed to record notification status for project ${projectMongoId}:`,
      error.message
    );
  }
}

module.exports = {
  notifyProjectOutcome,
};
