// ===================================
// StatsCard Component - Reusable stats card with icon
// ===================================

import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtitle?: string;
  color?: 'green' | 'blue' | 'orange' | 'purple' | 'red';
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
}

const colorClasses = {
  green: {
    border: 'border-seven-green',
    iconBg: 'bg-seven-green/10',
    iconColor: 'text-seven-green',
    textColor: 'text-seven-green',
  },
  blue: {
    border: 'border-blue-500',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    textColor: 'text-blue-600',
  },
  orange: {
    border: 'border-seven-orange',
    iconBg: 'bg-orange-50',
    iconColor: 'text-seven-orange',
    textColor: 'text-seven-orange',
  },
  purple: {
    border: 'border-purple-500',
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
    textColor: 'text-purple-600',
  },
  red: {
    border: 'border-red-500',
    iconBg: 'bg-red-50',
    iconColor: 'text-red-600',
    textColor: 'text-red-600',
  },
};

export default function StatsCard({
  title,
  value,
  icon: Icon,
  subtitle,
  color = 'green',
  trend,
}: StatsCardProps) {
  const colors = colorClasses[color];

  return (
    <div className={`bg-white rounded-xl shadow-md p-6 border-t-4 ${colors.border}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm font-semibold">{title}</p>
          <p className={`text-3xl font-bold ${colors.textColor}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          {trend && (
            <div className={`text-xs font-medium mt-1 ${trend.direction === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trend.direction === 'up' ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}%
            </div>
          )}
        </div>
        <div className={`${colors.iconBg} p-3 rounded-lg`}>
          <Icon className={`w-10 h-10 ${colors.iconColor}`} />
        </div>
      </div>
    </div>
  );
}
