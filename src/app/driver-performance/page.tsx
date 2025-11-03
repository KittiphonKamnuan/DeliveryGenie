'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Award, Fuel, Clock, Package, Target, Zap, Trophy, Star } from 'lucide-react';
import { Navigation } from '@/components';


// ===================================
// Types & Interfaces
// ===================================

interface DriverPerformance {
  driver_id: string;
  name: string;
  rank: number;
  total_deliveries: number;
  on_time_deliveries: number;
  on_time_rate: number;
  avg_delivery_time: number; // minutes
  fuel_efficiency: number; // km per liter
  total_distance: number; // km
  customer_rating: number;
  earnings: number;
  badge: string;
  trend: 'up' | 'down' | 'stable';
  weekly_deliveries: number[];
}

// ===================================
// API Data Fetching
// ===================================

interface DriverPerformanceData {
  drivers: DriverPerformance[];
  overallStats: {
    totalDrivers: number;
    avgOnTimeRate: string;
    avgFuelEfficiency: string;
    totalDeliveries: number;
  };
}

// ===================================
// Main Component
// ===================================

export default function DriverPerformance() {
  const [selectedDriver, setSelectedDriver] = useState<DriverPerformance | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [drivers, setDrivers] = useState<DriverPerformance[]>([]);
  const [overallStats, setOverallStats] = useState({
    totalDrivers: 0,
    avgOnTimeRate: '0.0',
    avgFuelEfficiency: '0.0',
    totalDeliveries: 0
  });

  // Fetch driver performance data
  const fetchDriverPerformance = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/drivers/performance');
      const result = await response.json();

      if (result.success) {
        setDrivers(result.drivers);
        setOverallStats(result.overallStats);
      } else {
        setError(result.error || 'Failed to fetch driver performance');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch driver performance');
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount
  useEffect(() => {
    fetchDriverPerformance();
  }, []);

  // Update time
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-br from-yellow-400 to-yellow-600';
    if (rank === 2) return 'bg-gradient-to-br from-gray-300 to-gray-500';
    if (rank === 3) return 'bg-gradient-to-br from-orange-400 to-orange-600';
    return 'bg-seven-green';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-6 h-6" />;
    if (rank === 2) return <Award className="w-6 h-6" />;
    if (rank === 3) return <Star className="w-6 h-6" />;
    return <Target className="w-5 h-5" />;
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (trend === 'down') return <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />;
    return <div className="w-4 h-4 bg-gray-400 rounded-full" />;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-seven-green text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-white text-seven-green px-4 py-2 rounded-lg font-bold text-2xl">
                    7-ELEVEN
                  </div>
                  <h1 className="text-2xl font-bold">Driver Performance Dashboard</h1>
                </div>
                <p className="text-green-50">แดชบอร์ดประสิทธิภาพคนขับรถ</p>
              </div>
            </div>

            <Navigation />

            <div className="text-right bg-white/10 px-6 py-3 rounded-lg backdrop-blur-sm">
              <div className="text-sm text-green-50">เวลาปัจจุบัน</div>
              <div className="text-2xl font-bold">
                {currentTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-md p-6 border-t-4 border-seven-green">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-semibold">การส่งตรงเวลา</p>
                <p className="text-3xl font-bold text-seven-green">{overallStats.avgOnTimeRate}%</p>
              </div>
              <div className="bg-seven-green/10 p-3 rounded-lg">
                <Clock className="w-10 h-10 text-seven-green" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-t-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-semibold">ประสิทธิภาพน้ำมัน</p>
                <p className="text-3xl font-bold text-blue-600">{overallStats.avgFuelEfficiency}</p>
                <p className="text-xs text-gray-500">km/L</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <Fuel className="w-10 h-10 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-t-4 border-seven-orange">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-semibold">การส่งทั้งหมด</p>
                <p className="text-3xl font-bold text-seven-orange">{overallStats.totalDeliveries}</p>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg">
                <Package className="w-10 h-10 text-seven-orange" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-t-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-semibold">Top Performer</p>
                <p className="text-xl font-bold text-purple-600">{drivers.length > 0 ? drivers[0].name : 'N/A'}</p>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <Trophy className="w-10 h-10 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Driver Rankings */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
          <div className="bg-gradient-to-r from-seven-green to-seven-green-dark px-6 py-4">
            <h2 className="text-xl font-bold text-white">🏆 อันดับคนขับรถ</h2>
          </div>

          <div className="divide-y">
            {drivers.map((driver) => (
              <div
                key={driver.driver_id}
                className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setSelectedDriver(driver)}
              >
                <div className="flex items-center justify-between">
                  {/* Rank & Driver Info */}
                  <div className="flex items-center gap-4 flex-1">
                    {/* Rank Badge */}
                    <div className={`${getRankColor(driver.rank)} text-white rounded-full w-16 h-16 flex items-center justify-center font-bold shadow-lg`}>
                      {driver.rank <= 3 ? (
                        <div className="flex flex-col items-center">
                          {getRankIcon(driver.rank)}
                          <span className="text-xs">#{driver.rank}</span>
                        </div>
                      ) : (
                        <span className="text-2xl">#{driver.rank}</span>
                      )}
                    </div>

                    {/* Driver Details */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-xl">{driver.name}</h3>
                        <span className="text-xl">{driver.badge}</span>
                        {getTrendIcon(driver.trend)}
                      </div>
                      <p className="text-sm text-gray-500">รหัส: {driver.driver_id}</p>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-seven-green">{driver.total_deliveries}</div>
                      <div className="text-xs text-gray-500">การส่ง</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{driver.on_time_rate}%</div>
                      <div className="text-xs text-gray-500">ตรงเวลา</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{driver.avg_delivery_time}</div>
                      <div className="text-xs text-gray-500">นาที/ครั้ง</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{driver.fuel_efficiency}</div>
                      <div className="text-xs text-gray-500">km/L</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{driver.customer_rating}</div>
                      <div className="text-xs text-gray-500">⭐ คะแนน</div>
                    </div>
                  </div>
                </div>

                {/* Performance Bar */}
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500">ประสิทธิภาพรวม</span>
                    <span className="text-xs font-bold text-seven-green">{driver.on_time_rate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-seven-green h-2 rounded-full transition-all"
                      style={{ width: `${driver.on_time_rate}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Tips */}
        <div className="mt-6 bg-gradient-to-r from-seven-green/10 to-green-50 border-l-4 border-seven-green rounded-xl p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="bg-seven-green p-2 rounded-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-seven-green-dark mb-2 text-lg">💡 เคล็ดลับเพิ่มประสิทธิภาพ</h3>
              <ul className="text-gray-700 text-sm space-y-1">
                <li>• วางแผนเส้นทางล่วงหน้าเพื่อประหยัดเวลาและน้ำมัน</li>
                <li>• ตรวจสอบสภาพสินค้าก่อนส่งทุกครั้ง</li>
                <li>• ติดต่อลูกค้าล่วงหน้าหากมีความล่าช้า</li>
                <li>• บำรุงรักษารถให้พร้อมใช้งานเสมอ</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Driver Detail Modal */}
      {selectedDriver && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedDriver(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`${getRankColor(selectedDriver.rank)} p-6 text-white`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 rounded-full p-3">
                    {getRankIcon(selectedDriver.rank)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{selectedDriver.name}</h2>
                    <p className="text-white/90">อันดับที่ {selectedDriver.rank} • {selectedDriver.badge}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDriver(null)}
                  className="text-white/80 hover:text-white text-3xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-seven-green/10 to-green-50 rounded-xl p-4 border-2 border-seven-green/20">
                  <Package className="w-8 h-8 text-seven-green mb-2" />
                  <div className="text-2xl font-bold text-seven-green">{selectedDriver.total_deliveries}</div>
                  <div className="text-xs text-gray-600">การส่งทั้งหมด</div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border-2 border-blue-200">
                  <Clock className="w-8 h-8 text-blue-600 mb-2" />
                  <div className="text-2xl font-bold text-blue-600">{selectedDriver.on_time_rate}%</div>
                  <div className="text-xs text-gray-600">ตรงเวลา</div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border-2 border-orange-200">
                  <Fuel className="w-8 h-8 text-orange-600 mb-2" />
                  <div className="text-2xl font-bold text-orange-600">{selectedDriver.fuel_efficiency}</div>
                  <div className="text-xs text-gray-600">km/L</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border-2 border-purple-200">
                  <Star className="w-8 h-8 text-purple-600 mb-2" />
                  <div className="text-2xl font-bold text-purple-600">{selectedDriver.customer_rating}</div>
                  <div className="text-xs text-gray-600">คะแนนลูกค้า</div>
                </div>
              </div>

              {/* Performance Details */}
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-bold mb-3">📊 สถิติการทำงาน</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">การส่งตรงเวลา</span>
                      <span className="font-bold text-seven-green">{selectedDriver.on_time_deliveries} / {selectedDriver.total_deliveries}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">เวลาเฉลี่ยต่อการส่ง</span>
                      <span className="font-bold">{selectedDriver.avg_delivery_time} นาที</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">ระยะทางรวม</span>
                      <span className="font-bold">{selectedDriver.total_distance} km</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">รายได้</span>
                      <span className="font-bold text-seven-green">฿{selectedDriver.earnings.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-bold mb-3">📈 การส่งรายสัปดาห์</h3>
                  <div className="flex items-end justify-between gap-2 h-32">
                    {selectedDriver.weekly_deliveries.map((count, index) => (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-seven-green rounded-t-lg transition-all hover:bg-seven-green-dark"
                          style={{ height: `${(count / 50) * 100}%` }}
                        />
                        <span className="text-xs text-gray-500 mt-2">
                          {['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'][index]}
                        </span>
                        <span className="text-xs font-bold">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedDriver(null)}
                className="w-full mt-6 bg-seven-green hover:bg-seven-green-dark text-white font-bold py-3 rounded-lg transition-colors shadow-md"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}