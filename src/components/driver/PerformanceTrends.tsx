'use client';

import { TrendingUp, Calendar, BarChart3, Activity, Award } from 'lucide-react';

// ===================================
// Types
// ===================================

export interface TrendData {
  period: string;
  onTimeRate: number;
  deliveries: number;
  avgTime: number;
  rating: number;
  efficiency: number;
}

export interface PerformanceInsight {
  type: 'success' | 'warning' | 'info' | 'danger';
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: string;
}

interface PerformanceTrendsProps {
  driverName: string;
  trends: TrendData[];
  insights: PerformanceInsight[];
  period?: 'week' | 'month' | 'year';
}

// ===================================
// Helper Functions
// ===================================

const getInsightColor = (type: string) => {
  switch (type) {
    case 'success':
      return 'bg-green-50 border-green-500 text-green-700';
    case 'warning':
      return 'bg-yellow-50 border-yellow-500 text-yellow-700';
    case 'info':
      return 'bg-blue-50 border-blue-500 text-blue-700';
    case 'danger':
      return 'bg-red-50 border-red-500 text-red-700';
    default:
      return 'bg-gray-50 border-gray-500 text-gray-700';
  }
};

const getInsightIcon = (type: string) => {
  switch (type) {
    case 'success':
      return '✅';
    case 'warning':
      return '⚠️';
    case 'info':
      return 'ℹ️';
    case 'danger':
      return '🚨';
    default:
      return '📌';
  }
};

const calculateTrend = (data: number[]): { direction: 'up' | 'down' | 'stable'; percentage: number } => {
  if (data.length < 2) return { direction: 'stable', percentage: 0 };

  const recent = data.slice(-3).reduce((a, b) => a + b, 0) / 3;
  const previous = data.slice(0, -3).reduce((a, b) => a + b, 0) / (data.length - 3);

  const percentage = ((recent - previous) / previous) * 100;

  if (Math.abs(percentage) < 2) return { direction: 'stable', percentage: 0 };
  return { direction: percentage > 0 ? 'up' : 'down', percentage: Math.abs(percentage) };
};

// ===================================
// Main Component
// ===================================

export default function PerformanceTrends({
  driverName,
  trends,
  insights,
  period = 'week',
}: PerformanceTrendsProps) {
  // Calculate trends
  const onTimeRates = trends.map(t => t.onTimeRate);
  const deliveryCounts = trends.map(t => t.deliveries);
  const avgTimes = trends.map(t => t.avgTime);

  const onTimeTrend = calculateTrend(onTimeRates);
  const deliveryTrend = calculateTrend(deliveryCounts);
  const timeTrend = calculateTrend(avgTimes);

  // Calculate max values for chart scaling
  const maxDeliveries = Math.max(...deliveryCounts);
  const maxOnTime = 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">แนวโน้มประสิทธิภาพ</h2>
              <p className="text-sm text-gray-600">{driverName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-2">
            <Calendar className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">
              {period === 'week' ? '7 วันที่ผ่านมา' : period === 'month' ? '30 วันที่ผ่านมา' : 'ปีที่ผ่านมา'}
            </span>
          </div>
        </div>

        {/* Trend Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border-2 border-green-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">อัตราตรงเวลา</span>
              <div className={`flex items-center gap-1 ${
                onTimeTrend.direction === 'up' ? 'text-green-600' :
                onTimeTrend.direction === 'down' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {onTimeTrend.direction === 'up' ? '▲' :
                 onTimeTrend.direction === 'down' ? '▼' : '―'}
                <span className="text-xs font-bold">
                  {onTimeTrend.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="text-3xl font-bold text-green-700">
              {trends[trends.length - 1]?.onTimeRate.toFixed(0)}%
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border-2 border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">จำนวนการส่ง</span>
              <div className={`flex items-center gap-1 ${
                deliveryTrend.direction === 'up' ? 'text-green-600' :
                deliveryTrend.direction === 'down' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {deliveryTrend.direction === 'up' ? '▲' :
                 deliveryTrend.direction === 'down' ? '▼' : '―'}
                <span className="text-xs font-bold">
                  {deliveryTrend.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="text-3xl font-bold text-blue-700">
              {trends[trends.length - 1]?.deliveries}
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border-2 border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">เวลาเฉลี่ย</span>
              <div className={`flex items-center gap-1 ${
                timeTrend.direction === 'down' ? 'text-green-600' :
                timeTrend.direction === 'up' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {timeTrend.direction === 'down' ? '▼' :
                 timeTrend.direction === 'up' ? '▲' : '―'}
                <span className="text-xs font-bold">
                  {timeTrend.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="text-3xl font-bold text-purple-700">
              {trends[trends.length - 1]?.avgTime} <span className="text-lg">นาที</span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-600" />
          กราฟประสิทธิภาพ
        </h3>

        <div className="bg-gray-50 rounded-lg p-6">
          {/* Dual axis chart */}
          <div className="relative h-64">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between">
              {[100, 75, 50, 25, 0].map((value, i) => (
                <div key={i} className="flex items-center">
                  <span className="text-xs text-gray-400 w-8">{value}%</span>
                  <div className="flex-1 border-t border-gray-200"></div>
                </div>
              ))}
            </div>

            {/* Bars and Lines */}
            <div className="absolute inset-0 flex items-end justify-between gap-2 pt-8 pb-6 pl-10 pr-4">
              {trends.map((trend, index) => {
                const deliveryHeight = (trend.deliveries / maxDeliveries) * 100;
                const onTimeHeight = (trend.onTimeRate / maxOnTime) * 100;

                return (
                  <div key={index} className="flex-1 flex flex-col items-center relative">
                    {/* Delivery bar */}
                    <div className="w-full flex gap-1 items-end">
                      <div
                        className="flex-1 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg hover:from-blue-600 hover:to-blue-500 transition-all cursor-pointer relative group"
                        style={{ height: `${deliveryHeight}%` }}
                      >
                        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                          {trend.deliveries} รายการ
                        </div>
                      </div>
                      <div
                        className="flex-1 bg-gradient-to-t from-green-500 to-green-400 rounded-t-lg hover:from-green-600 hover:to-green-500 transition-all cursor-pointer relative group"
                        style={{ height: `${onTimeHeight}%` }}
                      >
                        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                          {trend.onTimeRate.toFixed(0)}% ตรงเวลา
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 mt-2">
                      {new Date(trend.period).toLocaleDateString('th-TH', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-sm text-gray-600">จำนวนการส่ง</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm text-gray-600">อัตราตรงเวลา</span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Insights */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-yellow-600" />
          ข้อมูลเชิงลึกและข้อเสนอแนะ
        </h3>

        <div className="space-y-3">
          {insights.map((insight, index) => (
            <div
              key={index}
              className={`border-l-4 rounded-lg p-4 ${getInsightColor(insight.type)}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{getInsightIcon(insight.type)}</span>
                <div className="flex-1">
                  <h4 className="font-bold mb-1">{insight.title}</h4>
                  <p className="text-sm">{insight.description}</p>
                  {insight.action && (
                    <button className="mt-2 text-sm font-medium underline hover:no-underline">
                      {insight.action}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
