import { useState } from 'react';
import { motion } from 'framer-motion';
import type { IQuestion } from '@SkillSeal/shared';
interface Props { question: IQuestion; onSubmit: (s: string) => void; isSubmitting: boolean; }
function ScenarioText({ text }: { text: string }) {
  const parts = text.split(/(```(?:[a-z]*)\n?[\s\S]*?```)/g);
  return (<div className="space-y-4">{parts.map((p, i) => {
    if (p.startsWith('```')) { const code = p.slice(3).replace(/^[a-z]*\n/, '').replace(/```$/, '').trimEnd(); return <pre key={i} className="bg-gray-900 text-green-300 p-5 font-mono text-[13px] leading-relaxed overflow-x-auto rounded-xl"><code>{code}</code></pre>; }
    const inl = p.split(/(`[^`]+`)/g); return <p key={i} className="text-[17px] leading-relaxed text-gray-900">{inl.map((s, j) => s.startsWith('`') ? <code key={j} className="bg-gray-100 text-red-700 px-1.5 py-0.5 rounded font-mono text-[14px]">{s.slice(1, -1)}</code> : <span key={j}>{s}</span>)}</p>;
  })}</div>);
}
const LABELS = ['A', 'B', 'C', 'D'] as const;
export default function ScenarioQuestion({ question, onSubmit, isSubmitting }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const opts = question.options ?? [];
  const handle = (letter: string) => { if (isSubmitting || selected) return; setSelected(letter); setTimeout(() => onSubmit(letter), 150); };
  return (
    <div className="w-full max-w-[680px] mx-auto">
      <div className="mb-8"><ScenarioText text={question.text} /></div>
      <div className="space-y-3" role="radiogroup">
        {LABELS.slice(0, opts.length).map((letter, idx) => {
          const isSel = selected === letter;
          return (<motion.button key={letter} onClick={() => handle(letter)} disabled={isSubmitting || selected !== null} whileTap={{ scale: 0.98 }}
            className={`w-full flex items-start gap-4 px-5 py-3 rounded-xl border-2 text-left min-h-[56px] transition-all duration-150 ${isSel ? 'border-brand bg-blue-50 shadow-md' : 'border-gray-200 bg-white hover:border-brand/50 hover:bg-gray-50'} ${(isSubmitting || (selected && !isSel)) ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5 ${isSel ? 'bg-brand text-white' : 'bg-gray-100 text-gray-500'}`}>{letter}</span>
            <span className="flex-1 text-[15px] leading-snug text-gray-800 py-1">{opts[idx]}</span>
          </motion.button>);
        })}
      </div>
    </div>
  );
}
