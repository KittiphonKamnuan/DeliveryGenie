// ===================================
// Card Component - Reusable card container
// ===================================

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface CardProps {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export default function Card({ title, icon: Icon, children, action, className = '' }: CardProps) {
  return (
    <div className={`bg-white rounded-xl shadow-sm p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-seven-green" />}
          {title}
        </h2>
        {action && (
          <button
            onClick={action.onClick}
            className="px-3 py-1 bg-seven-green text-white rounded-lg text-sm font-medium hover:bg-seven-green-dark transition-colors"
          >
            {action.label}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
