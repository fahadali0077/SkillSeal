import { useRef, useEffect, useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import type { IQuestion } from '@SkillSeal/shared';
interface Props { question: IQuestion; onSubmit: (t: string) => void; isSubmitting: boolean; registerAutoSubmit: (fn: () => void) => void; }
export default function MicroTheoryQuestion({ question, onSubmit, isSubmitting, registerAutoSubmit }: Props) {
  const [text, setText] = useState('');
  const textRef = useRef(text); textRef.current = text;
  useEffect(() => { registerAutoSubmit(() => onSubmit(textRef.current.trim())); }, []);
  const maxChars = 1000;
  return (
    <div className="w-full max-w-[680px] mx-auto">
      <div className="mb-8 text-center text-[17px] leading-relaxed text-gray-900">{question.text}</div>
      <div className="relative">
        <textarea value={text} onChange={e => setText(e.target.value.slice(0, maxChars))}
          onPaste={e => { e.preventDefault(); e.stopPropagation(); }}
          onContextMenu={e => e.preventDefault()} onCopy={e => e.preventDefault()} onCut={e => e.preventDefault()}
          spellCheck={false} autoComplete="off" autoCorrect="off" autoCapitalize="off"
          data-gramm="false" placeholder="Type your answer here…" rows={4} disabled={isSubmitting}
          className={`w-full resize-none rounded-xl border-2 px-5 py-4 text-[15px] leading-relaxed text-gray-900 placeholder:text-gray-400 outline-none transition-colors font-mono tracking-wide ${isSubmitting ? 'border-gray-200 bg-gray-50 opacity-50' : 'border-gray-300 bg-white focus:border-brand focus:ring-2 focus:ring-brand/20'}`}
          aria-label="Your written response" />
        <div className="absolute bottom-3 right-3"><span className={`text-xs font-mono tabular-nums ${text.length > maxChars * 0.9 ? 'text-orange-500' : 'text-gray-300'}`}>{text.length}/{maxChars}</span></div>
      </div>
      <p className="text-xs text-gray-400 mt-2 text-center">Aim for 2–4 concise sentences. Focus on accuracy.</p>
      <div className="mt-6 flex justify-center">
        <button onClick={() => onSubmit(text.trim())} disabled={isSubmitting || text.trim().length === 0}
          className={`flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-sm transition-all ${isSubmitting || text.trim().length === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-brand text-white hover:bg-brand-dark active:scale-95'}`}
          aria-label="Submit answer">
          {isSubmitting ? <><Loader2 size={16} className="animate-spin" />Submitting…</> : <><Send size={16} />Submit Answer</>}
        </button>
      </div>
    </div>
  );
}
