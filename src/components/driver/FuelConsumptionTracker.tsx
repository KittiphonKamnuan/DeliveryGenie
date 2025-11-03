'use client';

import { Fuel, TrendingUp, TrendingDown, Droplet, DollarSign, Leaf } from 'lucide-react';

// ===================================
// Types
// ===================================

export interface FuelData {
  date: string;
  consumption: number; // liters
  distance: number; // km
  efficiency: number; // km/L
  cost: number; // THB
}

export interface FuelStats {
  totalConsumption: number;
  totalDistance: number;
  avgEfficiency: number;
  totalCost: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  weeklyData: FuelData[];
  monthlyAverage: number;
  bestEfficiency: number;
  worstEfficiency: number;
}

interface FuelConsumptionTrackerProps {
  driverName: string;
  fuelStats: FuelStats;
  showDetails?: boolean;
}

// ===================================
// Helper Functions
// ===================================

const getEfficiencyRating = (efficiency: number): {
  rating: string;
  color: string;
  icon: React.ReactNode;
} => {
  if (efficiency >= 15) {
    return {
      rating: 'ยอดเยี่ยม',
      color: 'text-green-600',
      icon: <Leaf className="w-5 h-5 text-green-600" />,
    };
  } else if (efficiency >= 12) {
    return {
      rating: 'ดี',
      color: 'text-blue-600',
      icon: <Fuel className="w-5 h-5 text-blue-600" />,
    };
  } else if (efficiency >= 10) {
    return {
      rating: 'ปานกลาง',
      color: 'text-yellow-600',
      icon: <Droplet className="w-5 h-5 text-yellow-600" />,
    };
  } else {
    return {
      rating: 'ต้องปรับปรุง',
      color: 'text-red-600',
      icon: <TrendingDown className="w-5 h-5 text-red-600" />,
    };
  }
};

const calculateCO2Savings = (efficiency: number, distance: number): number => {
  // Assume baseline of 10 km/L
  const baseline = 10;
  const fuelSaved = (distance / baseline) - (distance / efficiency);
  const co2PerLiter = 2.31; // kg CO2 per liter of gasoline
  return fuelSaved * co2PerLiter;
};

// ===================================
// Main Component
// ===================================

export default function FuelConsumptionTracker({
  driverName,
  fuelStats,
  showDetails = true,
}: FuelConsumptionTrackerProps) {
  const efficiencyRating = getEfficiencyRating(fuelStats.avgEfficiency);
  const co2Savings = calculateCO2Savings(fuelStats.avgEfficiency, fuelStats.totalDistance);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-3 rounded-lg">
            <Fuel className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">ประสิทธิภาพการใช้น้ำมัน</h2>
            <p className="text-sm text-gray-600">{driverName}</p>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-2 justify-end mb-1">
            {efficiencyRating.icon}
            <span className={`font-bold ${efficiencyRating.color}`}>
              {efficiencyRating.rating}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            {fuelStats.trend === 'up' ? '▲' : fuelStats.trend === 'down' ? '▼' : '―'}{' '}
            {fuelStats.trendPercentage.toFixed(1)}% จากเดือนที่แล้ว
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border-2 border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Fuel className="w-5 h-5 text-blue-600" />
            <span className="text-xs text-gray-600">ค่าเฉลี่ย</span>
          </div>
          <div className="text-3xl font-bold text-blue-600">
            {fuelStats.avgEfficiency.toFixed(1)}
          </div>
          <div className="text-xs text-gray-600">km/L</div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border-2 border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span className="text-xs text-gray-600">สูงสุด</span>
          </div>
          <div className="text-3xl font-bold text-green-600">
            {fuelStats.bestEfficiency.toFixed(1)}
          </div>
          <div className="text-xs text-gray-600">km/L</div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border-2 border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <Droplet className="w-5 h-5 text-purple-600" />
            <span className="text-xs text-gray-600">น้ำมันใช้</span>
          </div>
          <div className="text-3xl font-bold text-purple-600">
            {fuelStats.totalConsumption.toFixed(0)}
          </div>
          <div className="text-xs text-gray-600">ลิตร</div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border-2 border-orange-200">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-orange-600" />
            <span className="text-xs text-gray-600">ค่าใช้จ่าย</span>
          </div>
          <div className="text-2xl font-bold text-orange-600">
            ฿{fuelStats.totalCost.toLocaleString()}
          </div>
          <div className="text-xs text-gray-600">บาท</div>
        </div>
      </div>

      {/* Weekly Trend Chart */}
      {showDetails && (
        <>
          <div className="mb-6">
            <h3 className="font-bold text-gray-800 mb-3">📈 ประสิทธิภาพรายสัปดาห์</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-end justify-between gap-2 h-48">
                {fuelStats.weeklyData.map((data, index) => {
                  const maxEfficiency = Math.max(...fuelStats.weeklyData.map(d => d.efficiency));
                  const height = (data.efficiency / maxEfficiency) * 100;
                  const isAboveAverage = data.efficiency >= fuelStats.avgEfficiency;

                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div className="text-xs font-bold text-gray-700 mb-1">
                        {data.efficiency.toFixed(1)}
                      </div>
                      <div
                        className={`w-full rounded-t-lg transition-all hover:opacity-80 cursor-pointer ${
                          isAboveAverage
                            ? 'bg-gradient-to-t from-green-500 to-green-400'
                            : 'bg-gradient-to-t from-yellow-500 to-yellow-400'
                        }`}
                        style={{ height: `${height}%` }}
                        title={`${data.date}\n${data.efficiency} km/L\n${data.distance} km\n฿${data.cost}`}
                      />
                      <span className="text-xs text-gray-500 mt-2">
                        {new Date(data.date).toLocaleDateString('th-TH', { weekday: 'short' })}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Average line indicator */}
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                <div className="w-4 h-0.5 bg-blue-500"></div>
                <span>ค่าเฉลี่ย: {fuelStats.avgEfficiency.toFixed(1)} km/L</span>
              </div>
            </div>
          </div>

          {/* Detailed Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-bold text-gray-800 mb-3">💰 การประหยัด</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">ระยะทางรวม</span>
                  <span className="font-bold">{fuelStats.totalDistance.toFixed(0)} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">น้ำมันต่อ 100 km</span>
                  <span className="font-bold">
                    {(100 / fuelStats.avgEfficiency).toFixed(2)} L
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ค่าใช้จ่ายต่อ km</span>
                  <span className="font-bold">
                    ฿{(fuelStats.totalCost / fuelStats.totalDistance).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border-2 border-green-200">
              <h4 className="font-bold text-green-800 mb-3 flex items-center gap-2">
                <Leaf className="w-5 h-5" />
                ผลกระทบต่อสิ่งแวดล้อม
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">CO₂ ประหยัด</span>
                  <span className="font-bold text-green-700">
                    {co2Savings > 0 ? `${co2Savings.toFixed(1)} kg` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ต้นไม้เทียบเท่า</span>
                  <span className="font-bold text-green-700">
                    {co2Savings > 0 ? `${(co2Savings / 21).toFixed(0)} ต้น` : 'N/A'}
                  </span>
                </div>
                <div className="text-xs text-gray-600 mt-2 italic">
                  *เมื่อเทียบกับรถที่ได้ 10 km/L
                </div>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-500 rounded-lg p-4">
            <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
              <Fuel className="w-5 h-5" />
              💡 เคล็ดลับประหยัดน้ำมัน
            </h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• ขับรถด้วยความเร็วคงที่ หลีกเลี่ยงการเร่ง-เบรกกะทันหัน</li>
              <li>• ตรวจสอบแรงดันลมยางสม่ำเสมอ</li>
              <li>• วางแผนเส้นทางเพื่อหลีกเลี่ยงการจราจรติดขัด</li>
              <li>• บำรุงรักษาเครื่องยนต์ให้อยู่ในสภาพดี</li>
              <li>• ปิดเครื่องยนต์เมื่อจอดรอนานเกิน 1 นาที</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
