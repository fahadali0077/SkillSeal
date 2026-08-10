import { getGroq } from '../../config/groq';
import logger from '../../utils/logger';

export interface MicroTheoryEvaluation {
  conceptScore: number;
  aiScore: number;
  aiProbability: number;
}

const GPT_PHRASES = [
  'It is worth noting', 'In the context of', 'Essentially,', 'Furthermore,',
  'This approach ensures', 'This method allows', 'It is important to note',
  'One key aspect', 'In summary,', 'To summarize,',
];

function phraseSignal(answer: string): number {
  const lower = answer.toLowerCase();
  return Math.min(1, GPT_PHRASES.filter(p => lower.includes(p.toLowerCase())).length / 6);
}

function formalitySignal(answer: string): number {
  const t = answer.trim();
  const sentenceComplete = /^[A-Z]/.test(t) && /[.!?]$/.test(t);
  const hasFormalStructure = t.length > 80 && /[^.!?]{20,}\.[^.!?]{10,}/.test(t);
  return (sentenceComplete ? 0.5 : 0) + (hasFormalStructure ? 0.5 : 0);
}

function timePressureSignal(answer: string, ms: number): number {
  const wc = answer.trim().split(/\s+/).filter(Boolean).length;
  if (ms < 8000 && wc > 40) return 0.8;
  if (ms < 15000 && wc > 60) return 0.5;
  return 0.1;
}

export async function evaluateMicroTheory(
  answer: string,
  rubric: string[],
  questionText: string,
  timeTakenMs = 30000
): Promise<MicroTheoryEvaluation> {
  if (!answer || answer.trim().split(/\s+/).length < 3) {
    return { conceptScore: 0, aiScore: 0, aiProbability: 0 };
  }

  let conceptScore = 0;
  let groqError: string | null = null;

  // PARTIAL-01: retry the Groq call up to 3 times with exponential backoff.
  // Network blips and 429s are common; without this every transient failure
  // silently zeroed the answer's conceptScore and tanked the user's grade.
  // On final failure we log with a distinct groqError flag so ops can
  // distinguish "model graded as zero" from "model never returned".
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const groq = getGroq();
      const chatCompletion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content:
              'Score 0-100: accuracy(60%), completeness(30%), clarity(10%). ' +
              'Return JSON only: {"score":number,"reason":string}',
          },
          {
            role: 'user',
            content: `Question: ${questionText}\nRubric: ${rubric.join(', ')}\nAnswer: "${answer}"`,
          },
        ],
        temperature: 0.2,
        max_tokens: 150,
        response_format: { type: 'json_object' },
      });

      const rawText = chatCompletion.choices[0]?.message?.content ?? '';
      const parsed = JSON.parse(rawText) as { score?: number };
      conceptScore = Math.max(0, Math.min(1, (parsed.score ?? 0) / 100));
      groqError = null;
      break; // success
    } catch (err) {
      groqError = (err as Error).message ?? 'unknown';
      if (attempt < MAX_ATTEMPTS) {
        // Exponential backoff: 500ms, 1000ms, 2000ms
        const delay = 500 * 2 ** (attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  if (groqError) {
    // Distinct log shape so it's grep-able in production.
    logger.error(`[microTheory] groqError=true attempts=${MAX_ATTEMPTS} reason="${groqError}" answer_len=${answer.length}`);
  }

  const phrase = phraseSignal(answer);
  const formality = formalitySignal(answer);
  const pressure = timePressureSignal(answer, timeTakenMs);
  const aiProbability = phrase * 0.4 + formality * 0.4 + pressure * 0.2;

  // CRIT-06: aiScore is the canonical "authenticity percentage" (0-100, higher = more human).
  // aiProbability remains the raw probability (0-1, higher = more AI-like).
  return { conceptScore, aiScore: Math.round((1 - aiProbability) * 100), aiProbability };
}
