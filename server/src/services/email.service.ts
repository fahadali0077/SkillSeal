// ─────────────────────────────────────────────────────────────────────────────
// email.service.ts
// Brevo Transactional Email HTTP API — replaces nodemailer/SMTP entirely.
//
// WHY HTTP instead of SMTP:
//   Render's free tier blocks outbound port 587 at the network level.
//   Any SMTP attempt (smtp.brevo.com, smtp-relay.brevo.com, etc.) results in
//   ENOTFOUND or ETIMEDOUT because DNS for SMTP hosts never resolves.
//   The Brevo HTTP API runs over HTTPS (port 443) which is always open.
//
// Setup (one-time in Brevo dashboard):
//   1. SMTP & API → API Keys → Generate a new key  →  paste as BREVO_API_KEY
//   2. Senders & Domains → Add Domain → verify skillseal.tech DNS records
//   3. Set FROM_EMAIL=noreply@skillseal.tech in Render env vars
// ─────────────────────────────────────────────────────────────────────────────

import logger from '../utils/logger';

const BREVO_API_KEY  = process.env.BREVO_API_KEY  || '';
const FROM_EMAIL     = process.env.FROM_EMAIL      || 'noreply@skillseal.tech';
const FROM_NAME      = 'SkillSeal';
const CLIENT_URL     = process.env.CLIENT_URL      || 'http://localhost:5173';

const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';

// ── Core sender ───────────────────────────────────────────────────────────────

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function sendEmail(opts: SendEmailOptions): Promise<void> {
  console.log(
    `[email] >>> ATTEMPT to=${opts.to} subj="${opts.subject}"` +
    ` via=Brevo-HTTP-API key=${BREVO_API_KEY ? BREVO_API_KEY.slice(0, 8) + '…' : '<MISSING>'}` +
    ` from=${FROM_EMAIL}`,
  );

  if (!BREVO_API_KEY) {
    console.warn('[email] >>> SKIP — BREVO_API_KEY not set');
    logger.warn(`[email] BREVO_API_KEY missing — skipping send to ${opts.to}`);
    return;
  }

  const payload = {
    sender:          { name: FROM_NAME, email: FROM_EMAIL },
    to:              [{ email: opts.to }],
    subject:         opts.subject,
    htmlContent:     opts.html,
    textContent:     opts.text,
  };

  const res = await fetch(BREVO_SEND_URL, {
    method:  'POST',
    headers: {
      'accept':       'application/json',
      'content-type': 'application/json',
      'api-key':      BREVO_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '(unreadable)');
    console.error(
      `[email] >>> FAILURE to=${opts.to} status=${res.status} body=${body}`,
    );
    logger.error(`[email] Brevo API error ${res.status} for ${opts.to}: ${body}`);
    throw new Error(`Brevo API returned ${res.status}: ${body}`);
  }

  const data = await res.json() as { messageId?: string };
  console.log(`[email] >>> SUCCESS to=${opts.to} messageId=${data.messageId ?? 'n/a'}`);
  logger.info(`[email] Sent to ${opts.to} (messageId=${data.messageId ?? 'n/a'})`);
}

// ── Email templates ───────────────────────────────────────────────────────────

export async function sendVerificationEmail(opts: {
  to: string;
  firstName: string;
  token: string;
}): Promise<void> {
  const verifyUrl = `${CLIENT_URL}/verify-email?token=${opts.token}`;

  await sendEmail({
    to:      opts.to,
    subject: 'Verify your SkillSeal account',
    text:    `Hi ${opts.firstName},\n\nClick the link to verify your email:\n${verifyUrl}\n\nLink expires in 24 hours.`,
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
    to:      opts.to,
    subject: 'Reset your SkillSeal password',
    text:    `Hi ${opts.firstName},\n\nReset your password here:\n${resetUrl}\n\nLink expires in 1 hour and can only be used once.`,
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
