import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from './env';

let _client: GoogleGenerativeAI | null = null;

export function getGemini(): GoogleGenerativeAI {
  if (!_client) {
    _client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }
  return _client;
}
