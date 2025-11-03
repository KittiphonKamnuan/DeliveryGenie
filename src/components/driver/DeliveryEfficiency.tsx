'use client';

import { Package, Clock, MapPin, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

// ===================================
// Types
// ===================================

export interface DeliveryStats {
  totalDeliveries: number;
  completedDeliveries: number;
  onTimeDeliveries: number;
  lateDeliveries: number;
  failedDeliveries: number;
  avgDeliveryTime: number; // minutes
  fastestDelivery: number; // minutes
  slowestDelivery: number; // minutes
  totalDistance: number; // km
  avgDistancePerDelivery: number; // km
}

export interface TimeBreakdown {
  label: string;
  percentage: number;
  minutes: number;
  color: string;
}

interface DeliveryEfficiencyProps {
  driverName: string;
  stats: DeliveryStats;
  timeBreakdown?: TimeBreakdown[];
  showDetails?: boolean;
}

// ===================================
// Helper Functions
// ===================================

const getEfficiencyRating = (onTimeRate: number): {
  rating: string;
  color: string;
  description: string;
} => {
  if (onTimeRate >= 95) {
    return {
      rating: 'ยอดเยี่ยม',
      color: 'text-green-600',
      description: 'ประสิทธิภาพสูงมาก',
    };
  } else if (onTimeRate >= 90) {
    return {
      rating: 'ดีมาก',
      color: 'text-blue-600',
      description: 'ประสิทธิภาพดี',
    };
  } else if (onTimeRate >= 80) {
    return {
      rating: 'ดี',
      color: 'text-yellow-600',
      description: 'ประสิทธิภาพปานกลาง',
    };
  } else {
    return {
      rating: 'ต้องปรับปรุง',
      color: 'text-red-600',
      description: 'ควรพัฒนาเพิ่มเติม',
    };
  }
};

// ===================================
// Main Component
// ===================================

export default function DeliveryEfficiency({
  driverName,
  stats,
  timeBreakdown = [],
  showDetails = true,
}: DeliveryEfficiencyProps) {
  const onTimeRate = (stats.onTimeDeliveries / stats.totalDeliveries) * 100;
  const completionRate = (stats.completedDeliveries / stats.totalDeliveries) * 100;
  const failureRate = (stats.failedDeliveries / stats.totalDeliveries) * 100;

  const rating = getEfficiencyRating(onTimeRate);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-green-100 p-3 rounded-lg">
            <Package className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">ประสิทธิภาพการส่ง</h2>
            <p className="text-sm text-gray-600">{driverName}</p>
          </div>
        </div>

        <div className="text-right">
          <div className={`text-2xl font-bold ${rating.color}`}>{rating.rating}</div>
          <div className="text-sm text-gray-500">{rating.description}</div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border-2 border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-5 h-5 text-blue-600" />
            <span className="text-xs text-gray-600">ทั้งหมด</span>
          </div>
          <div className="text-3xl font-bold text-blue-600">{stats.totalDeliveries}</div>
          <div className="text-xs text-gray-600">การส่ง</div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border-2 border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-xs text-gray-600">สำเร็จ</span>
          </div>
          <div className="text-3xl font-bold text-green-600">{completionRate.toFixed(0)}%</div>
          <div className="text-xs text-gray-600">{stats.completedDeliveries} รายการ</div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border-2 border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-purple-600" />
            <span className="text-xs text-gray-600">ตรงเวลา</span>
          </div>
          <div className="text-3xl font-bold text-purple-600">{onTimeRate.toFixed(0)}%</div>
          <div className="text-xs text-gray-600">{stats.onTimeDeliveries} รายการ</div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border-2 border-orange-200">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-5 h-5 text-orange-600" />
            <span className="text-xs text-gray-600">ระยะทาง</span>
          </div>
          <div className="text-3xl font-bold text-orange-600">{stats.totalDistance}</div>
          <div className="text-xs text-gray-600">km</div>
        </div>
      </div>

      {/* Delivery Status Breakdown */}
      <div className="mb-6">
        <h3 className="font-bold text-gray-800 mb-3">สถานะการส่ง</h3>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-gray-600">ตรงเวลา</span>
              </div>
              <span className="font-bold text-green-600">
                {stats.onTimeDeliveries} ({onTimeRate.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full transition-all"
                style={{ width: `${onTimeRate}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1 text-sm">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <span className="text-gray-600">ส่งช้า</span>
              </div>
              <span className="font-bold text-yellow-600">
                {stats.lateDeliveries} ({((stats.lateDeliveries / stats.totalDeliveries) * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-yellow-500 h-3 rounded-full transition-all"
                style={{ width: `${(stats.lateDeliveries / stats.totalDeliveries) * 100}%` }}
              />
            </div>
          </div>

          {stats.failedDeliveries > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1 text-sm">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span className="text-gray-600">ไม่สำเร็จ</span>
                </div>
                <span className="font-bold text-red-600">
                  {stats.failedDeliveries} ({failureRate.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-red-500 h-3 rounded-full transition-all"
                  style={{ width: `${failureRate}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Time Statistics */}
      {showDetails && (
        <>
          <div className="mb-6">
            <h3 className="font-bold text-gray-800 mb-3">สถิติเวลา</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-sm text-gray-600 mb-1">เฉลี่ย</div>
                <div className="text-2xl font-bold text-blue-600">{stats.avgDeliveryTime}</div>
                <div className="text-xs text-gray-500">นาที/ครั้ง</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <div className="text-sm text-gray-600 mb-1">เร็วที่สุด</div>
                <div className="text-2xl font-bold text-green-600">{stats.fastestDelivery}</div>
                <div className="text-xs text-gray-500">นาที</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 text-center">
                <div className="text-sm text-gray-600 mb-1">ช้าที่สุด</div>
                <div className="text-2xl font-bold text-orange-600">{stats.slowestDelivery}</div>
                <div className="text-xs text-gray-500">นาที</div>
              </div>
            </div>
          </div>

          {/* Time Breakdown */}
          {timeBreakdown.length > 0 && (
            <div className="mb-6">
              <h3 className="font-bold text-gray-800 mb-3">การใช้เวลา</h3>
              <div className="space-y-2">
                {timeBreakdown.map((item, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-1 text-sm">
                      <span className="text-gray-600">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">{item.minutes} นาที</span>
                        <span className="font-bold" style={{ color: item.color }}>
                          {item.percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Distance Metrics */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-bold text-gray-800 mb-3">ระยะทาง</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">รวมทั้งหมด</span>
                <span className="font-bold">{stats.totalDistance.toFixed(0)} km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">เฉลี่ยต่อครั้ง</span>
                <span className="font-bold">{stats.avgDistancePerDelivery.toFixed(1)} km</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
