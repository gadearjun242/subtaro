"use strict";

const { transporter, MAIL_ENABLED } = require("../config/mail");

// ============================================================
// CONFIG
// ============================================================

const APP_NAME = process.env.APP_NAME || "Subtaro";

const CLIENT_URL = (
  process.env.CLIENT_URL ||
  (process.env.CLIENT_URLS || "").split(",")[0] ||
  "http://localhost:3000"
).replace(/\/+$/, "");

const BRAND_COLOR = "#6528e0";

// ============================================================
// BASE LAYOUT
// ============================================================
//
// One shared, inline-styled HTML shell (email clients don't
// reliably support external/`<style>` CSS) so every email looks
// consistent without duplicating markup per template.
// ============================================================

function baseLayout({ preheader = "", title, bodyHtml, ctaLabel, ctaUrl }) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <span style="display:none;font-size:1px;color:#f8fafc;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr>
              <td style="padding:28px 32px 0 32px;">
                <div style="display:flex;align-items:center;gap:10px;">
                  <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#6528e0,#ec4899);display:inline-block;"></div>
                  <span style="font-size:18px;font-weight:800;color:#0f172a;vertical-align:middle;">${APP_NAME}</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 8px 32px;">
                <h1 style="margin:0;font-size:20px;font-weight:800;color:#0f172a;">${title}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 8px 32px;font-size:14px;line-height:1.6;color:#475569;">
                ${bodyHtml}
              </td>
            </tr>
            ${
              ctaUrl
                ? `<tr>
              <td style="padding:16px 32px 32px 32px;">
                <a href="${ctaUrl}" style="display:inline-block;background:${BRAND_COLOR};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:12px;">${ctaLabel}</a>
              </td>
            </tr>`
                : `<tr><td style="padding-bottom:32px;"></td></tr>`
            }
            <tr>
              <td style="padding:16px 32px;border-top:1px solid #f1f5f9;font-size:12px;color:#94a3b8;">
                © ${new Date().getFullYear()} ${APP_NAME}. You're receiving this because you have an account with us.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// ============================================================
// SEND (with graceful no-mail-configured fallback)
// ============================================================

async function sendMail({ to, subject, html, text }) {
  if (!MAIL_ENABLED) {
    console.log(`[MAIL] (disabled) Would have sent "${subject}" to ${to}`);
    return { skipped: true, messageId: null };
  }

  const info = await transporter.sendMail({
    to,
    subject,
    html,
    text: text || subject,
  });

  return { skipped: false, messageId: info.messageId };
}

// ============================================================
// VERIFICATION EMAIL
// ============================================================

async function sendVerificationEmail({ to, name, token }) {
  const verifyUrl = `${CLIENT_URL}/verify-email/${token}`;

  const html = baseLayout({
    preheader: "Confirm your email to finish setting up your account.",
    title: `Verify your email, ${name.split(" ")[0]}`,
    bodyHtml: `
      <p>Thanks for signing up for ${APP_NAME}. Confirm your email address to
      make sure you can recover your account and receive updates about your
      projects.</p>
      <p>This link expires in 24 hours.</p>
    `,
    ctaLabel: "Verify email address",
    ctaUrl: verifyUrl,
  });

  return sendMail({
    to,
    subject: `Verify your email — ${APP_NAME}`,
    html,
    text: `Verify your email: ${verifyUrl}`,
  });
}

// ============================================================
// PROJECT COMPLETION EMAIL
// ============================================================

async function sendProjectCompletionEmail({ to, name, project }) {
  const projectUrl = `${CLIENT_URL}/dashboard/projects/${project.projectId}`;

  const rows = [
    ["Project", project.name],
    ["Type", project.inputType === "video" ? "Video" : "Audio"],
    project.subtitle?.subtitleCount != null
      ? ["Subtitle lines", String(project.subtitle.subtitleCount)]
      : null,
    project.subtitle?.wordCount != null
      ? ["Words", String(project.subtitle.wordCount)]
      : null,
    project.subtitle?.languageName
      ? ["Language", project.subtitle.languageName]
      : null,
    project.inputType === "video"
      ? [
          "Delivery",
          project.subtitleMode === "selectable"
            ? "Selectable subtitle track (.mkv)"
            : "Burned-in captions",
        ]
      : null,
  ].filter(Boolean);

  const rowsHtml = rows
    .map(
      ([label, value]) =>
        `<tr>
          <td style="padding:6px 0;color:#94a3b8;">${label}</td>
          <td style="padding:6px 0;text-align:right;font-weight:600;color:#0f172a;">${value}</td>
        </tr>`,
    )
    .join("");

  const html = baseLayout({
    preheader: `${project.name} is ready to view.`,
    title: `"${project.name}" is ready 🎉`,
    bodyHtml: `
      <p>Your subtitles finished processing while you were away — everything's
      ready to review, edit, or download.</p>
      <table role="presentation" width="100%" style="margin-top:12px;font-size:13px;border-collapse:collapse;">
        ${rowsHtml}
      </table>
    `,
    ctaLabel: "View project",
    ctaUrl: projectUrl,
  });

  return sendMail({
    to,
    subject: `"${project.name}" is ready — ${APP_NAME}`,
    html,
    text: `Your project "${project.name}" finished processing: ${projectUrl}`,
  });
}

// ============================================================
// PROJECT FAILURE EMAIL
// ============================================================

async function sendProjectFailureEmail({ to, name, project }) {
  const projectUrl = `${CLIENT_URL}/dashboard/projects/${project.projectId}`;

  const html = baseLayout({
    preheader: `${project.name} ran into a problem.`,
    title: `"${project.name}" needs attention`,
    bodyHtml: `
      <p>Something went wrong while processing this project:</p>
      <p style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:10px 14px;color:#b91c1c;font-size:13px;">
        ${escapeHtml(project.error || "Processing failed.")}
      </p>
      <p>You can review the logs and retry from the project page.</p>
    `,
    ctaLabel: "View project",
    ctaUrl: projectUrl,
  });

  return sendMail({
    to,
    subject: `"${project.name}" failed to process — ${APP_NAME}`,
    html,
    text: `Your project "${project.name}" failed: ${project.error || "Processing failed."} — ${projectUrl}`,
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

module.exports = {
  sendVerificationEmail,
  sendProjectCompletionEmail,
  sendProjectFailureEmail,
};
