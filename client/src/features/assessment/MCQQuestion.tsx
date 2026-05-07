import { useState } from 'react';
import { motion } from 'framer-motion';
import type { IQuestion } from '@SkillSeal/shared';
interface Props { question: IQuestion; onSubmit: (s: string) => void; isSubmitting: boolean; }
function QText({ text }: { text: string }) {
  const parts = text.split(/(```[\s\S]*?```|`[^`]+`)/g);
  return <div className="text-[17px] leading-relaxed text-gray-900 space-y-3">{parts.map((p, i) => {
    if (p.startsWith('```')) { const code = p.slice(3).replace(/^[a-z]*\n/, '').replace(/```$/, ''); return <pre key={i} className="bg-gray-900 text-green-400 rounded-xl p-4 font-mono text-[13px] overflow-x-auto"><code>{code}</code></pre>; }
    if (p.startsWith('`')) return <code key={i} className="bg-gray-100 text-red-700 px-1.5 py-0.5 rounded font-mono text-[14px]">{p.slice(1, -1)}</code>;
    return <span key={i}>{p}</span>;
  })}</div>;
}
const LABELS = ['A', 'B', 'C', 'D'] as const;
export default function MCQQuestion({ question, onSubmit, isSubmitting }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const opts = question.options ?? [];
  const handle = (letter: string) => { if (isSubmitting || selected) return; setSelected(letter); setTimeout(() => onSubmit(letter), 150); };
  return (
    <div className="w-full max-w-[680px] mx-auto">
      <div className="mb-8 text-center"><QText text={question.text} /></div>
      <div className="space-y-3" role="radiogroup">
        {LABELS.slice(0, opts.length).map((letter, idx) => {
          const isSel = selected === letter;
          return (<motion.button key={letter} onClick={() => handle(letter)} disabled={isSubmitting || selected !== null} whileTap={{ scale: 0.98 }}
            className={`w-full flex items-center gap-4 px-5 rounded-xl border-2 text-left min-h-[56px] transition-all duration-150 outline-none select-none focus-visible:ring-2 focus-visible:ring-brand ${isSel ? 'border-brand bg-blue-50 text-brand shadow-md' : 'border-gray-200 bg-white text-gray-800 hover:border-brand/50 hover:bg-gray-50'} ${(isSubmitting || (selected && !isSel)) ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            aria-pressed={isSel} role="radio" aria-checked={isSel}>
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${isSel ? 'bg-brand text-white' : 'bg-gray-100 text-gray-500'}`}>{letter}</span>
            <span className="flex-1 text-[15px] leading-snug py-3">{opts[idx]}</span>
          </motion.button>);
        })}
      </div>
    </div>
  );
}
