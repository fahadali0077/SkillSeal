import { useRef, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { IQuestion } from '@SkillSeal/shared';

interface Props {
  question: IQuestion;
  onSubmit: (t: string) => void;
  isSubmitting: boolean;
  registerAutoSubmit: (fn: () => void) => void;
}

export default function MicroTheoryQuestion({ question, onSubmit, isSubmitting, registerAutoSubmit }: Props) {
  const [text, setText] = useState('');
  const textRef = useRef(text); textRef.current = text;
  useEffect(() => { registerAutoSubmit(() => onSubmit(textRef.current.trim())); }, []);
  const maxChars = 1000;
  const empty = text.trim().length === 0;

  return (
    <div className="w-full max-w-[680px] mx-auto">
      <div className="mb-8 text-[19px] leading-[1.55] text-paper">{question.text}</div>

      <div className="relative">
        <textarea
          value={text}
          onChange={e => setText(e.target.value.slice(0, maxChars))}
          onPaste={e => { e.preventDefault(); e.stopPropagation(); }}
          onContextMenu={e => e.preventDefault()}
          onCopy={e => e.preventDefault()}
          onCut={e => e.preventDefault()}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          data-gramm="false"
          placeholder="Type your answer here…"
          rows={5}
          disabled={isSubmitting}
          className={`w-full resize-none rounded border px-5 py-4 text-[15px] leading-relaxed
            font-mono text-paper placeholder:text-ink-400 outline-none transition-colors duration-150
            ${isSubmitting ? 'border-ink-700 bg-ink-800 opacity-50' : 'border-ink-700 bg-ink-800 focus:border-ink-300'}`}
          aria-label="Your written response"
        />
        <div className="absolute bottom-3 right-4">
          <span className={`font-mono text-[11px] tabular-nums ${text.length > maxChars * 0.9 ? 'text-warn' : 'text-ink-500'}`}>
            {text.length}/{maxChars}
          </span>
        </div>
      </div>

      <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-400 mt-3">
        Two to four sentences · graded on accuracy
      </p>

      <div className="mt-7">
        <button
          onClick={() => onSubmit(text.trim())}
          disabled={isSubmitting || empty}
          className={`inline-flex items-center gap-2 px-6 py-3 rounded font-semibold text-sm transition-colors duration-150
            ${isSubmitting || empty
              ? 'bg-ink-800 text-ink-500 border border-ink-700 cursor-not-allowed'
              : 'bg-seal-600 text-paper hover:bg-seal-700'}`}
          aria-label="Submit answer"
        >
          {isSubmitting ? <><Loader2 size={16} className="animate-spin" />Submitting…</> : 'Submit answer'}
        </button>
      </div>
    </div>
  );
}
