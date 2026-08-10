// ─────────────────────────────────────────────────────────────────────────────
// groq.ts — the AI client.
//
// AUDIT §2.5: this file used to be named gemini.ts and exported a `getGemini`
// alias, left over from two provider migrations (OpenAI → Gemini → Groq) that
// were never cleaned up. Nothing has called Gemini for some time; the actual
// model is Groq's llama-3.3-70b-versatile. Renamed so grepping for the provider
// finds the truth.
//
// The environment variable accepts GROQ_API_KEY, falling back to the legacy
// GEMINI_API_KEY so existing deployments keep booting while the variable is
// renamed in the hosting dashboard.
// ─────────────────────────────────────────────────────────────────────────────

import Groq from 'groq-sdk';
import { env } from './env';

let _client: Groq | null = null;

export function getGroq(): Groq {
  if (!_client) {
    _client = new Groq({ apiKey: env.GROQ_API_KEY || env.GEMINI_API_KEY });
  }
  return _client;
}

/** The model every AI call in this codebase uses. */
export const AI_MODEL = 'llama-3.3-70b-versatile';
