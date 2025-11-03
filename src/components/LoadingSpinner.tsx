// ===================================
// LoadingSpinner Component - Reusable loading indicator
// ===================================

import { RefreshCw } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export default function LoadingSpinner({ size = 'md', message }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      <RefreshCw className={`${sizeClasses[size]} animate-spin text-seven-green`} />
      {message && <span className="text-gray-600">{message}</span>}
    </div>
  );
}
