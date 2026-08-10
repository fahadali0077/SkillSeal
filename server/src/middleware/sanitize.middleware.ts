// ─────────────────────────────────────────────────────────────────────────────
// sanitize.middleware.ts
//
// Defence-in-depth input hygiene. Two independent concerns:
//   1. sanitizeInput — strips Mongo operator keys ($gt, $ne, …) from user input.
//   2. xssSanitize   — strips the most common script-injection shapes.
//
// AUDIT §1.1: neither was imported anywhere, so none of it ran — and because the
// $where-blocking Mongoose plugin below registers as a side effect of importing
// this file, that never registered either. Both are now mounted in app.ts, after
// the body parsers and ahead of every router.
//
// FOUND DURING VERIFICATION: the <script> pattern contained a literal 0x08
// backspace byte where `\b` was intended, and `<\\/script>` where `<\/script>`
// was intended — so the script-stripping branch never matched anything, even
// though the javascript: and on*= branches worked. Rewritten below.
//
// SCOPE: stripping is a backstop, not the primary defence. The real protection
// is contextual output encoding, which React gives us by default — which is why
// `dangerouslySetInnerHTML` must stay out of the client.
// ─────────────────────────────────────────────────────────────────────────────

import type { Request, Response, NextFunction } from 'express';
import mongoSanitize from 'express-mongo-sanitize';
import mongoose from 'mongoose';

/** Replaces `$`-prefixed keys so Mongo operators can't be smuggled in via req.body. */
export const sanitizeInput = mongoSanitize({ replaceWith: '_' });

// Block $where (server-side JS evaluation) for every query shape taking a filter.
mongoose.plugin(function blockWhere(schema: mongoose.Schema) {
  const reject = function (
    this: Record<string, unknown>,
    next: (err?: Error) => void,
  ): void {
    const filter =
      (this as { getQuery?: () => Record<string, unknown> }).getQuery?.() ?? this;
    if (filter && typeof filter === 'object' && '$where' in filter) {
      next(new Error('$where is not allowed'));
      return;
    }
    next();
  };

  const hooks = [
    'find', 'findOne', 'countDocuments', 'findOneAndUpdate',
    'deleteOne', 'deleteMany', 'updateOne', 'updateMany',
  ] as const;

  hooks.forEach((h) => schema.pre(h as 'find', reject));
});

// ── Script-shape stripping ───────────────────────────────────────────────────

/** <script …>…</script>, including unclosed and attribute-bearing variants. */
const SCRIPT_TAG = /<script\b[^>]*>[\s\S]*?(?:<\/script\s*>|$)/gi;
/** Bare <script> / </script> fragments left over after the pass above. */
const SCRIPT_FRAGMENT = /<\/?script\b[^>]*>/gi;
/** javascript: and vbscript: URL schemes, tolerating interleaved whitespace. */
const SCRIPT_URL = /(?:javascript|vbscript)\s*:/gi;
/** Inline event handlers: onclick=, onerror = , etc. */
const EVENT_HANDLER = /\bon\w+\s*=/gi;

function stripString(value: string): string {
  return value
    .replace(SCRIPT_TAG, '')
    .replace(SCRIPT_FRAGMENT, '')
    .replace(SCRIPT_URL, '')
    .replace(EVENT_HANDLER, '');
}

function stripScripts(obj: unknown, depth = 0): unknown {
  // Guard against deeply nested payloads being used to burn CPU.
  if (depth > 10) return obj;
  if (typeof obj === 'string') return stripString(obj);
  if (Array.isArray(obj)) return obj.map((v) => stripScripts(v, depth + 1));
  if (obj && typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out[k] = stripScripts(v, depth + 1);
    }
    return out;
  }
  return obj;
}

export function xssSanitize(req: Request, _res: Response, next: NextFunction): void {
  if (req.body) req.body = stripScripts(req.body) as Record<string, unknown>;
  // req.query is a getter on some Express versions, so assign defensively.
  if (req.query && Object.keys(req.query).length > 0) {
    try {
      req.query = stripScripts(req.query) as typeof req.query;
    } catch {
      // Read-only query on this Express version — body sanitising still applies.
    }
  }
  next();
}

/** Exported for tests. */
export const __testables = { stripString, stripScripts };
