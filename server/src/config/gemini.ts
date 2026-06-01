import Groq from 'groq-sdk';
import { env } from './env';

let _client: Groq | null = null;

export function getGroq(): Groq {
  if (!_client) {
    _client = new Groq({ apiKey: env.GEMINI_API_KEY });
  }
  return _client;
}

// Legacy alias — keeps all existing imports working without changes
export const getGemini = getGroq;
