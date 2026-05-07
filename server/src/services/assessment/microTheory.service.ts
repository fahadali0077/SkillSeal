import { getGemini } from '../../config/gemini';
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

  try {
    // ── Gemini call ──────────────────────────────────────────────────────────
    const genai = getGemini();
    const model = genai.getGenerativeModel({
      model: 'gemini-1.5-pro',
      systemInstruction:
        'Score 0-100: accuracy(60%), completeness(30%), clarity(10%). ' +
        'Return JSON only: {"score":number,"reason":string}',
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 150,
        responseMimeType: 'application/json',
      },
    });

    const prompt = `Question: ${questionText}\nRubric: ${rubric.join(', ')}\nAnswer: "${answer}"`;
    const result = await model.generateContent(prompt);
    const rawText = result.response.text();
    const parsed = JSON.parse(rawText) as { score?: number };
    conceptScore = Math.max(0, Math.min(1, (parsed.score ?? 0) / 100));
  } catch (err) {
    logger.error('[microTheory] Grading failed:', err);
  }

  const phrase = phraseSignal(answer);
  const formality = formalitySignal(answer);
  const pressure = timePressureSignal(answer, timeTakenMs);
  const aiProbability = phrase * 0.4 + formality * 0.4 + pressure * 0.2;

  return { conceptScore, aiScore: aiProbability, aiProbability };
}
