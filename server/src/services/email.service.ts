// ─────────────────────────────────────────────────────────────────────────────
// email.service.ts
// Brevo (SMTP) wrapper for all transactional emails.
// Falls back to console-logging in development so the server runs without
// real credentials during local development.
// ─────────────────────────────────────────────────────────────────────────────

import nodemailer from 'nodemailer';
import logger from '../utils/logger';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
// FROM_EMAIL must be a sender (or domain) verified in Brevo. Defaults to the
// production domain — override via env if you've verified a different sender.
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@skillseal.tech';
const FROM_NAME = 'SkillSeal';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// ── Transporter ───────────────────────────────────────────────────────────────
// Created lazily so a missing SMTP config in dev doesn't crash the server.
let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false,          // Brevo uses STARTTLS on port 587
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return _transporter;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function sendEmail(opts: SendEmailOptions): Promise<void> {
  // Diagnostic logging via console.* — bypasses Winston entirely so we see
  // the line in Render's Logs tab even if the Winston pipeline is misconfigured.
  console.log(`[email] >>> ATTEMPT to=${opts.to} subj="${opts.subject}" host=${SMTP_HOST}:${SMTP_PORT} user=${SMTP_USER ? SMTP_USER.slice(0, 8) + '…' : '<MISSING>'} from=${FROM_EMAIL}`);

  const hasSmtp = !!SMTP_USER && !!SMTP_PASS;
  if (!hasSmtp) {
    console.warn(`[email] >>> SKIP — SMTP credentials missing`);
    logger.warn(`[email] SMTP credentials missing – skipping send to ${opts.to}`);
    return;
  }

  try {
    const info = await getTransporter().sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
    console.log(`[email] >>> SUCCESS to=${opts.to} id=${info.messageId} response=${info.response}`);
    logger.info(`[email] Sent to ${opts.to} (id=${info.messageId})`);
  } catch (err) {
    // Surface the full SMTP error so problems are visible — not just swallowed.
    const e = err as { code?: string; response?: string; responseCode?: number; command?: string; message?: string };
    console.error(`[email] >>> FAILURE to=${opts.to} code=${e.code} responseCode=${e.responseCode} command=${e.command} message="${e.message}" response="${e.response}"`);
    logger.error(`[email] Failed to send to ${opts.to} (${opts.subject}):`, err);
    throw err;
  }
}

// ── Email templates ───────────────────────────────────────────────────────────

export async function sendVerificationEmail(opts: {
  to: string;
  firstName: string;
  token: string;
}): Promise<void> {
  const verifyUrl = `${CLIENT_URL}/verify-email?token=${opts.token}`;

  await sendEmail({
    to: opts.to,
    subject: 'Verify your SkillSeal account',
    text: `Hi ${opts.firstName},\n\nClick the link to verify your email:\n${verifyUrl}\n\nLink expires in 24 hours.`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#1E40AF">Verify your SkillSeal account</h2>
        <p>Hi <strong>${opts.firstName}</strong>,</p>
        <p>Thanks for joining SkillSeal. Click the button below to verify your email address.</p>
        <a href="${verifyUrl}"
           style="display:inline-block;background:#1E40AF;color:#fff;padding:12px 24px;
                  border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0">
          Verify Email Address
        </a>
        <p style="color:#666;font-size:13px">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#999;font-size:12px">© ${new Date().getFullYear()} SkillSeal</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  firstName: string;
  token: string;
}): Promise<void> {
  const resetUrl = `${CLIENT_URL}/reset-password?token=${opts.token}`;

  await sendEmail({
    to: opts.to,
    subject: 'Reset your SkillSeal password',
    text: `Hi ${opts.firstName},\n\nReset your password here:\n${resetUrl}\n\nLink expires in 1 hour and can only be used once.`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#1E40AF">Reset your password</h2>
        <p>Hi <strong>${opts.firstName}</strong>,</p>
        <p>We received a request to reset your SkillSeal password. Click the button below to choose a new one.</p>
        <a href="${resetUrl}"
           style="display:inline-block;background:#1E40AF;color:#fff;padding:12px 24px;
                  border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0">
          Reset Password
        </a>
        <p style="color:#666;font-size:13px">This link expires in 1 hour and can only be used once.</p>
        <p style="color:#666;font-size:13px">If you didn't request a password reset, ignore this email — your account is safe.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#999;font-size:12px">© ${new Date().getFullYear()} SkillSeal</p>
      </div>
    `,
  });
}