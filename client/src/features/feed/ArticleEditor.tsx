// ─────────────────────────────────────────────────────────────────────────────
// ArticleEditor.tsx  –  markdown-style toolbar for article creation
// ─────────────────────────────────────────────────────────────────────────────
import { useRef } from 'react';
import { Bold, Italic, List, ListOrdered, Quote, Code, Heading2, Minus } from 'lucide-react';

interface Props {
  value:    string;
  onChange: (v: string) => void;
  maxLen?:  number;
}

type WrapType = 'bold' | 'italic' | 'code' | 'blockquote' | 'h2' | 'ul' | 'ol' | 'hr';

export default function ArticleEditor({ value, onChange, maxLen = 125000 }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const wrap = (type: WrapType) => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    const selected = value.slice(start, end);
    const before   = value.slice(0, start);
    const after    = value.slice(end);

    let insert = selected;
    switch (type) {
      case 'bold':       insert = `**${selected || 'bold text'}**`; break;
      case 'italic':     insert = `*${selected || 'italic text'}*`; break;
      case 'code':       insert = `\`${selected || 'code'}\``; break;
      case 'blockquote': insert = `\n> ${selected || 'quote'}\n`; break;
      case 'h2':         insert = `\n## ${selected || 'Heading'}\n`; break;
      case 'ul':         insert = `\n- ${selected || 'item'}\n`; break;
      case 'ol':         insert = `\n1. ${selected || 'item'}\n`; break;
      case 'hr':         insert = `\n---\n`; break;
    }
    const next = before + insert + after;
    if (next.length <= maxLen) {
      onChange(next);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(before.length, before.length + insert.length);
      });
    }
  };

  const pct = Math.min(100, (value.length / maxLen) * 100);
  const overLimit = value.length > maxLen;

  const TOOLS: { icon: React.ReactNode; type: WrapType; title: string }[] = [
    { icon: <Heading2 size={15} />, type: 'h2',        title: 'Heading' },
    { icon: <Bold      size={15} />, type: 'bold',      title: 'Bold' },
    { icon: <Italic    size={15} />, type: 'italic',    title: 'Italic' },
    { icon: <Code      size={15} />, type: 'code',      title: 'Inline code' },
    { icon: <Quote     size={15} />, type: 'blockquote',title: 'Blockquote' },
    { icon: <List      size={15} />, type: 'ul',        title: 'Bullet list' },
    { icon: <ListOrdered size={15}/>, type: 'ol',       title: 'Numbered list' },
    { icon: <Minus     size={15} />, type: 'hr',        title: 'Divider' },
  ];

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 bg-gray-50">
        {TOOLS.map((t) => (
          <button
            key={t.type}
            type="button"
            onClick={() => wrap(t.type)}
            title={t.title}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors"
          >
            {t.icon}
          </button>
        ))}
        <div className="flex-1" />
        <span className={`text-xs mr-1 ${overLimit ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
          {value.length.toLocaleString()} / {maxLen.toLocaleString()}
        </span>
      </div>

      {/* Textarea */}
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => { if (e.target.value.length <= maxLen) onChange(e.target.value); }}
        placeholder="Write your article here… Use ## for headings, **bold**, *italic*"
        className="w-full px-4 py-3 text-sm text-gray-800 resize-y min-h-[320px] outline-none font-mono leading-relaxed"
      />

      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div
          className={`h-full transition-all duration-300 ${overLimit ? 'bg-red-400' : pct > 80 ? 'bg-amber-400' : 'bg-brand'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
