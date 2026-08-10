import { useState } from 'react';
import { motion } from 'framer-motion';
import type { IQuestion } from '@SkillSeal/shared';

interface Props { question: IQuestion; onSubmit: (s: string) => void; isSubmitting: boolean; }

function ScenarioText({ text }: { text: string }) {
  const parts = text.split(/(```(?:[a-z]*)\n?[\s\S]*?```)/g);
  return (
    <div className="space-y-4">
      {parts.map((p, i) => {
        if (p.startsWith('```')) {
          const code = p.slice(3).replace(/^[a-z]*\n/, '').replace(/```$/, '').trimEnd();
          return (
            <pre key={i} className="bg-ink-950 border border-ink-700 rounded p-5 font-mono text-[13px] leading-relaxed text-ink-200 overflow-x-auto">
              <code>{code}</code>
            </pre>
          );
        }
        const inl = p.split(/(`[^`]+`)/g);
        return (
          <p key={i} className="text-[19px] leading-[1.55] text-paper">
            {inl.map((s, j) => s.startsWith('`')
              ? <code key={j} className="bg-ink-800 text-seal-300 px-1.5 py-0.5 rounded-sm font-mono text-[15px]">{s.slice(1, -1)}</code>
              : <span key={j}>{s}</span>)}
          </p>
        );
      })}
    </div>
  );
}

const LABELS = ['A', 'B', 'C', 'D'] as const;

export default function ScenarioQuestion({ question, onSubmit, isSubmitting }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const opts = question.options ?? [];
  const handle = (letter: string) => {
    if (isSubmitting || selected) return;
    setSelected(letter);
    setTimeout(() => onSubmit(letter), 150);
  };

  return (
    <div className="w-full max-w-[680px] mx-auto">
      <div className="mb-9"><ScenarioText text={question.text} /></div>

      <div className="space-y-2.5" role="radiogroup">
        {LABELS.slice(0, opts.length).map((letter, idx) => {
          const isSel = selected === letter;
          return (
            <motion.button
              key={letter}
              onClick={() => handle(letter)}
              disabled={isSubmitting || selected !== null}
              whileTap={{ scale: 0.99 }}
              className={`w-full flex items-stretch rounded border text-left min-h-[56px] transition-colors duration-150 outline-none
                focus-visible:ring-1 focus-visible:ring-paper
                ${isSel ? 'border-seal-400 bg-seal-950' : 'border-ink-700 bg-ink-800 hover:border-ink-500'}
                ${(isSubmitting || (selected && !isSel)) ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'}`}
              aria-pressed={isSel}
              role="radio"
              aria-checked={isSel}
            >
              <span className={`w-11 shrink-0 flex items-center justify-center font-mono text-xs font-medium border-r
                ${isSel ? 'border-seal-400 text-seal-300' : 'border-ink-700 text-ink-400'}`}>
                {letter}
              </span>
              <span className="flex-1 text-[15px] leading-snug text-paper px-4 py-3.5 self-center">
                {opts[idx]}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
