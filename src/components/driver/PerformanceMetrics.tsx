'use client';

import { TrendingUp, TrendingDown, Minus, Award, Target, Zap, AlertCircle } from 'lucide-react';

// ===================================
// Types
// ===================================

export interface MetricData {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  color?: string;
  icon?: React.ReactNode;
  target?: number;
  status?: 'excellent' | 'good' | 'average' | 'poor';
}

interface PerformanceMetricsProps {
  metrics: MetricData[];
  title?: string;
  layout?: 'grid' | 'list';
}

// ===================================
// Helper Functions
// ===================================

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'excellent':
      return 'bg-green-50 border-green-500 text-green-700';
    case 'good':
      return 'bg-blue-50 border-blue-500 text-blue-700';
    case 'average':
      return 'bg-yellow-50 border-yellow-500 text-yellow-700';
    case 'poor':
      return 'bg-red-50 border-red-500 text-red-700';
    default:
      return 'bg-gray-50 border-gray-300 text-gray-700';
  }
};

const getStatusBadge = (status?: string) => {
  switch (status) {
    case 'excellent':
      return { icon: <Award className="w-4 h-4" />, label: 'ยอดเยี่ยม', color: 'bg-green-500' };
    case 'good':
      return { icon: <Target className="w-4 h-4" />, label: 'ดี', color: 'bg-blue-500' };
    case 'average':
      return { icon: <Minus className="w-4 h-4" />, label: 'ปานกลาง', color: 'bg-yellow-500' };
    case 'poor':
      return { icon: <AlertCircle className="w-4 h-4" />, label: 'ต้องปรับปรุง', color: 'bg-red-500' };
    default:
      return null;
  }
};

const getTrendIcon = (trend?: string) => {
  switch (trend) {
    case 'up':
      return <TrendingUp className="w-4 h-4 text-green-600" />;
    case 'down':
      return <TrendingDown className="w-4 h-4 text-red-600" />;
    case 'stable':
      return <Minus className="w-4 h-4 text-gray-500" />;
    default:
      return null;
  }
};

// ===================================
// Main Component
// ===================================

export default function PerformanceMetrics({
  metrics,
  title,
  layout = 'grid',
}: PerformanceMetricsProps) {
  if (layout === 'list') {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        {title && <h3 className="font-bold text-lg mb-4">{title}</h3>}
        <div className="space-y-3">
          {metrics.map((metric, index) => {
            const statusBadge = getStatusBadge(metric.status);

            return (
              <div
                key={index}
                className={`p-4 rounded-lg border-l-4 ${getStatusColor(metric.status)} transition-all hover:shadow-md`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {metric.icon && (
                      <div className={`p-2 rounded-lg ${metric.color || 'bg-gray-100'}`}>
                        {metric.icon}
                      </div>
                    )}
                    <div>
                      <div className="text-sm text-gray-600">{metric.label}</div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold">
                          {metric.value}
                        </span>
                        {metric.unit && (
                          <span className="text-sm text-gray-500">{metric.unit}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {metric.trend && (
                      <div className="flex items-center gap-1">
                        {getTrendIcon(metric.trend)}
                        {metric.trendValue && (
                          <span className={`text-sm font-medium ${
                            metric.trend === 'up' ? 'text-green-600' :
                            metric.trend === 'down' ? 'text-red-600' : 'text-gray-500'
                          }`}>
                            {metric.trendValue}
                          </span>
                        )}
                      </div>
                    )}

                    {statusBadge && (
                      <div className={`flex items-center gap-1 ${statusBadge.color} text-white px-3 py-1 rounded-full text-xs font-medium`}>
                        {statusBadge.icon}
                        <span>{statusBadge.label}</span>
                      </div>
                    )}
                  </div>
                </div>

                {metric.target && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>เป้าหมาย: {metric.target}{metric.unit}</span>
                      <span>
                        {((Number(metric.value) / metric.target) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          Number(metric.value) >= metric.target
                            ? 'bg-green-500'
                            : Number(metric.value) >= metric.target * 0.8
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{
                          width: `${Math.min(
                            (Number(metric.value) / metric.target) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Grid layout
  return (
    <div>
      {title && <h3 className="font-bold text-lg mb-4">{title}</h3>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric, index) => {
          const statusBadge = getStatusBadge(metric.status);

          return (
            <div
              key={index}
              className={`bg-white rounded-xl shadow-sm p-6 border-t-4 ${
                metric.color || 'border-gray-300'
              } hover:shadow-lg transition-all`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="text-sm text-gray-600 mb-1">{metric.label}</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">
                      {metric.value}
                    </span>
                    {metric.unit && (
                      <span className="text-sm text-gray-500">{metric.unit}</span>
                    )}
                  </div>
                </div>

                {metric.icon && (
                  <div className={`p-3 rounded-lg ${metric.color || 'bg-gray-100'}`}>
                    {metric.icon}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                {metric.trend && (
                  <div className="flex items-center gap-1">
                    {getTrendIcon(metric.trend)}
                    {metric.trendValue && (
                      <span className={`text-sm font-medium ${
                        metric.trend === 'up' ? 'text-green-600' :
                        metric.trend === 'down' ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        {metric.trendValue}
                      </span>
                    )}
                  </div>
                )}

                {statusBadge && (
                  <div className={`flex items-center gap-1 ${statusBadge.color} text-white px-2 py-1 rounded-full text-xs font-medium`}>
                    {statusBadge.icon}
                    <span>{statusBadge.label}</span>
                  </div>
                )}
              </div>

              {metric.target && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Target: {metric.target}{metric.unit}</span>
                    <span>
                      {((Number(metric.value) / metric.target) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        Number(metric.value) >= metric.target
                          ? 'bg-green-500'
                          : Number(metric.value) >= metric.target * 0.8
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{
                        width: `${Math.min(
                          (Number(metric.value) / metric.target) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
