// ===================================
// Priority Badge Component
// ===================================

import type { PriorityClass } from '@/lib/types';

interface PriorityBadgeProps {
  priorityClass: PriorityClass;
  score?: number;
  className?: string;
}

const PRIORITY_STYLES: Record<PriorityClass, { bg: string; text: string; emoji: string }> = {
  critical: { bg: 'bg-red-100', text: 'text-red-800', emoji: '🔴' },
  high: { bg: 'bg-orange-100', text: 'text-orange-800', emoji: '🟠' },
  medium: { bg: 'bg-blue-100', text: 'text-blue-800', emoji: '🔵' },
  low: { bg: 'bg-green-100', text: 'text-green-800', emoji: '🟢' },
};

export function PriorityBadge({ priorityClass, score, className = '' }: PriorityBadgeProps) {
  const style = PRIORITY_STYLES[priorityClass];

  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text} ${className}`}
    >
      <span>{style.emoji}</span>
      <span className="uppercase">{priorityClass}</span>
      {score !== undefined && <span className="font-bold">({score.toFixed(1)})</span>}
    </span>
  );
}
