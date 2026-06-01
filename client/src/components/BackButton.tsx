// ─────────────────────────────────────────────────────────────────────────────
// BackButton.tsx  –  reusable, consistent back navigation
// ─────────────────────────────────────────────────────────────────────────────
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface Props {
  to?:    string;     // fallback route if history is empty
  label?: string;     // override default "Back"
  className?: string;
}

export default function BackButton({ to, label = 'Back', className = '' }: Props) {
  const navigate = useNavigate();
  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else if (to) navigate(to);
    else navigate('/');
  };

  return (
    <button
      onClick={goBack}
      className={`btn-ghost text-sm ${className}`}
    >
      <ArrowLeft size={15} />
      {label}
    </button>
  );
}
