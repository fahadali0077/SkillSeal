import { motion } from 'framer-motion';
import { CheckCircle2, Circle } from 'lucide-react';
import { useCompleteness } from './useProfile';

export default function ProfileCompletenessBar({ userId }: { userId: string }) {
  const { data, isLoading } = useCompleteness(userId);
  if (isLoading || !data) return null;

  const { score, sections } = data;
  const color = score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-brand' : 'bg-amber-500';

  return (
    <div className="card p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-800">Profile strength</span>
        <span className="text-sm font-bold text-brand">{score}%</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-2 mb-4 overflow-hidden">
        <motion.div
          className={`h-2 rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      {/* Section checklist */}
      <ul className="space-y-1.5">
        {Object.entries(sections).map(([key, { earned, max, label }]) => (
          <li key={key} className="flex items-center justify-between text-sm">
            <span className={`flex items-center gap-2 ${earned ? 'text-gray-700' : 'text-gray-400'}`}>
              {earned
                ? <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                : <Circle      size={14} className="text-gray-300 shrink-0"  />
              }
              {label}
            </span>
            <span className={`text-xs font-medium ${earned ? 'text-green-600' : 'text-gray-300'}`}>
              +{max}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
