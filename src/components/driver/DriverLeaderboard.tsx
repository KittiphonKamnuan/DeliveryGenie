'use client';

import { Trophy, Award, Star, Medal, TrendingUp, TrendingDown, Target } from 'lucide-react';

// ===================================
// Types
// ===================================

export interface LeaderboardDriver {
  rank: number;
  driverId: string;
  name: string;
  avatar?: string;
  score: number;
  badge: string;
  metrics: {
    deliveries: number;
    onTimeRate: number;
    avgTime: number;
    fuelEfficiency: number;
    rating: number;
  };
  trend: 'up' | 'down' | 'stable';
  rankChange?: number;
}

interface DriverLeaderboardProps {
  drivers: LeaderboardDriver[];
  title?: string;
  showTop?: number;
  highlightId?: string;
}

// ===================================
// Helper Functions
// ===================================

const getRankBadge = (rank: number) => {
  switch (rank) {
    case 1:
      return {
        color: 'bg-gradient-to-br from-yellow-400 to-yellow-600',
        icon: <Trophy className="w-8 h-8 text-white" />,
        label: '🥇 แชมป์',
        textColor: 'text-yellow-600',
        borderColor: 'border-yellow-500',
      };
    case 2:
      return {
        color: 'bg-gradient-to-br from-gray-300 to-gray-500',
        icon: <Award className="w-8 h-8 text-white" />,
        label: '🥈 รองแชมป์',
        textColor: 'text-gray-600',
        borderColor: 'border-gray-400',
      };
    case 3:
      return {
        color: 'bg-gradient-to-br from-orange-400 to-orange-600',
        icon: <Star className="w-8 h-8 text-white" />,
        label: '🥉 อันดับ 3',
        textColor: 'text-orange-600',
        borderColor: 'border-orange-500',
      };
    default:
      return {
        color: 'bg-gradient-to-br from-green-500 to-green-700',
        icon: <Medal className="w-6 h-6 text-white" />,
        label: `#${rank}`,
        textColor: 'text-green-600',
        borderColor: 'border-green-500',
      };
  }
};

const getTrendIcon = (trend: string, change?: number) => {
  if (trend === 'up') {
    return (
      <div className="flex items-center gap-1 text-green-600">
        <TrendingUp className="w-4 h-4" />
        {change && <span className="text-xs font-bold">+{change}</span>}
      </div>
    );
  } else if (trend === 'down') {
    return (
      <div className="flex items-center gap-1 text-red-600">
        <TrendingDown className="w-4 h-4" />
        {change && <span className="text-xs font-bold">-{change}</span>}
      </div>
    );
  } else {
    return (
      <div className="flex items-center gap-1 text-gray-500">
        <Target className="w-4 h-4" />
        <span className="text-xs">―</span>
      </div>
    );
  }
};

// ===================================
// Main Component
// ===================================

export default function DriverLeaderboard({
  drivers,
  title = '🏆 อันดับคนขับรถ',
  showTop,
  highlightId,
}: DriverLeaderboardProps) {
  const displayDrivers = showTop ? drivers.slice(0, showTop) : drivers;

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-seven-green to-seven-green-dark px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <div className="text-white text-sm bg-white/20 px-3 py-1 rounded-full">
            {drivers.length} คนขับ
          </div>
        </div>
      </div>

      {/* Top 3 Podium */}
      {drivers.length >= 3 && (
        <div className="bg-gradient-to-b from-gray-50 to-white p-6 border-b-2 border-gray-100">
          <div className="flex items-end justify-center gap-4">
            {/* 2nd Place */}
            <div className="flex flex-col items-center flex-1">
              <div className="relative">
                <div className={`w-16 h-16 ${getRankBadge(2).color} rounded-full flex items-center justify-center shadow-lg mb-2`}>
                  {getRankBadge(2).icon}
                </div>
                <div className="absolute -top-1 -right-1 text-2xl">{drivers[1].badge}</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-gray-800">{drivers[1].name}</div>
                <div className="text-xs text-gray-500">{drivers[1].score} คะแนน</div>
                <div className="mt-1">{getTrendIcon(drivers[1].trend, drivers[1].rankChange)}</div>
              </div>
              <div className="w-full bg-gradient-to-t from-gray-400 to-gray-300 rounded-t-lg mt-3 h-24 flex items-center justify-center">
                <span className="text-4xl font-bold text-white">2</span>
              </div>
            </div>

            {/* 1st Place */}
            <div className="flex flex-col items-center flex-1">
              <div className="relative">
                <div className={`w-20 h-20 ${getRankBadge(1).color} rounded-full flex items-center justify-center shadow-xl mb-2 animate-pulse`}>
                  {getRankBadge(1).icon}
                </div>
                <div className="absolute -top-2 -right-2 text-3xl">{drivers[0].badge}</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg text-gray-800">{drivers[0].name}</div>
                <div className="text-sm text-yellow-600 font-bold">{drivers[0].score} คะแนน</div>
                <div className="mt-1">{getTrendIcon(drivers[0].trend, drivers[0].rankChange)}</div>
              </div>
              <div className="w-full bg-gradient-to-t from-yellow-500 to-yellow-400 rounded-t-lg mt-3 h-32 flex items-center justify-center shadow-lg">
                <span className="text-5xl font-bold text-white">1</span>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="flex flex-col items-center flex-1">
              <div className="relative">
                <div className={`w-16 h-16 ${getRankBadge(3).color} rounded-full flex items-center justify-center shadow-lg mb-2`}>
                  {getRankBadge(3).icon}
                </div>
                <div className="absolute -top-1 -right-1 text-2xl">{drivers[2].badge}</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-gray-800">{drivers[2].name}</div>
                <div className="text-xs text-gray-500">{drivers[2].score} คะแนน</div>
                <div className="mt-1">{getTrendIcon(drivers[2].trend, drivers[2].rankChange)}</div>
              </div>
              <div className="w-full bg-gradient-to-t from-orange-500 to-orange-400 rounded-t-lg mt-3 h-20 flex items-center justify-center">
                <span className="text-4xl font-bold text-white">3</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard List */}
      <div className="divide-y divide-gray-100">
        {displayDrivers.map((driver) => {
          const rankBadge = getRankBadge(driver.rank);
          const isHighlighted = driver.driverId === highlightId;

          return (
            <div
              key={driver.driverId}
              className={`p-4 hover:bg-gray-50 transition-colors ${
                isHighlighted ? 'bg-blue-50 border-l-4 border-blue-500' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Rank Badge */}
                <div className={`${rankBadge.color} text-white rounded-full w-14 h-14 flex items-center justify-center font-bold shadow-md flex-shrink-0`}>
                  {driver.rank <= 3 ? (
                    <div className="flex flex-col items-center">
                      {rankBadge.icon}
                      <span className="text-xs mt-0.5">#{driver.rank}</span>
                    </div>
                  ) : (
                    <span className="text-xl">#{driver.rank}</span>
                  )}
                </div>

                {/* Driver Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg truncate">{driver.name}</h3>
                    <span className="text-2xl">{driver.badge}</span>
                    {getTrendIcon(driver.trend, driver.rankChange)}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>รหัส: {driver.driverId}</span>
                    <span className="font-bold text-purple-600">{driver.score} คะแนน</span>
                  </div>
                </div>

                {/* Metrics */}
                <div className="hidden md:grid grid-cols-5 gap-3 text-center">
                  <div>
                    <div className="text-lg font-bold text-blue-600">{driver.metrics.deliveries}</div>
                    <div className="text-xs text-gray-500">การส่ง</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-600">{driver.metrics.onTimeRate}%</div>
                    <div className="text-xs text-gray-500">ตรงเวลา</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-purple-600">{driver.metrics.avgTime}</div>
                    <div className="text-xs text-gray-500">นาที</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-orange-600">{driver.metrics.fuelEfficiency}</div>
                    <div className="text-xs text-gray-500">km/L</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-yellow-600">{driver.metrics.rating}</div>
                    <div className="text-xs text-gray-500">⭐ คะแนน</div>
                  </div>
                </div>
              </div>

              {/* Mobile Metrics */}
              <div className="md:hidden mt-3 grid grid-cols-5 gap-2 text-center">
                <div>
                  <div className="text-sm font-bold text-blue-600">{driver.metrics.deliveries}</div>
                  <div className="text-xs text-gray-500">ส่ง</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-green-600">{driver.metrics.onTimeRate}%</div>
                  <div className="text-xs text-gray-500">เวลา</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-purple-600">{driver.metrics.avgTime}</div>
                  <div className="text-xs text-gray-500">นาที</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-orange-600">{driver.metrics.fuelEfficiency}</div>
                  <div className="text-xs text-gray-500">km/L</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-yellow-600">{driver.metrics.rating}</div>
                  <div className="text-xs text-gray-500">⭐</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show More */}
      {showTop && drivers.length > showTop && (
        <div className="bg-gray-50 p-4 text-center border-t">
          <button className="text-seven-green hover:text-seven-green-dark font-medium text-sm">
            แสดงเพิ่มเติม ({drivers.length - showTop} คนขับ)
          </button>
        </div>
      )}
    </div>
  );
}
