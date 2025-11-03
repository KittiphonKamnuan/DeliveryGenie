'use client';

import { useState, useEffect } from 'react';
import { Menu, MapPin, Navigation, Truck, Clock, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Dynamically import map component (client-side only)
const VehicleTrackingMap = dynamic(
  () => import('@/components/map/VehicleTrackingMap'),
  { ssr: false, loading: () => <div className="h-[600px] bg-gray-100 rounded-lg animate-pulse" /> }
);

// Import types
import type { TrackingVehicle, DeliveryStop } from '@/components/map/VehicleTrackingMap';

// ===================================
// Main Component
// ===================================

export default function VehicleTrackingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showTraffic, setShowTraffic] = useState(false);
  const [autoUpdate, setAutoUpdate] = useState(true);

  // Mock data for vehicles
  const [vehicles] = useState<TrackingVehicle[]>([
    {
      id: 'V001',
      driver: 'สมชาย ใจดี',
      lat: 14.0729,
      lon: 100.6058,
      heading: 45,
      speed: 35,
      status: 'driving',
      currentRoute: ['บ้านลูกค้า A', 'บ้านลูกค้า B', 'บ้านลูกค้า C'],
      nextStop: 'บ้านลูกค้า A',
      completedStops: 2,
      totalStops: 5,
    },
    {
      id: 'V002',
      driver: 'สมหญิง ทำดี',
      lat: 14.0293,
      lon: 100.6193,
      heading: 180,
      speed: 0,
      status: 'delivering',
      currentRoute: ['บ้านลูกค้า D', 'บ้านลูกค้า E'],
      nextStop: 'บ้านลูกค้า D',
      completedStops: 1,
      totalStops: 3,
    },
    {
      id: 'V003',
      driver: 'สมศักดิ์ วิ่งเร็ว',
      lat: 14.0156,
      lon: 100.5889,
      heading: 270,
      speed: 45,
      status: 'driving',
      currentRoute: ['บ้านลูกค้า F', 'บ้านลูกค้า G'],
      nextStop: 'บ้านลูกค้า F',
      completedStops: 3,
      totalStops: 5,
    },
  ]);

  // Mock data for delivery stops
  const [stops] = useState<DeliveryStop[]>([
    {
      id: 'S001',
      name: 'บ้านลูกค้า A',
      lat: 14.0493,
      lon: 100.6293,
      status: 'in_progress',
      priority: 8,
      estimatedTime: new Date(Date.now() + 15 * 60000),
    },
    {
      id: 'S002',
      name: 'บ้านลูกค้า B',
      lat: 14.0356,
      lon: 100.6089,
      status: 'pending',
      priority: 6,
      estimatedTime: new Date(Date.now() + 30 * 60000),
    },
    {
      id: 'S003',
      name: 'บ้านลูกค้า C',
      lat: 14.0196,
      lon: 100.6172,
      status: 'pending',
      priority: 5,
      estimatedTime: new Date(Date.now() + 45 * 60000),
    },
    {
      id: 'S004',
      name: 'บ้านลูกค้า D',
      lat: 14.0293,
      lon: 100.6193,
      status: 'in_progress',
      priority: 9,
      estimatedTime: new Date(Date.now() + 10 * 60000),
    },
    {
      id: 'S005',
      name: 'บ้านลูกค้า E',
      lat: 14.0456,
      lon: 100.5989,
      status: 'pending',
      priority: 7,
      estimatedTime: new Date(Date.now() + 60 * 60000),
    },
    {
      id: 'S006',
      name: 'บ้านลูกค้า F',
      lat: 14.0156,
      lon: 100.5889,
      status: 'in_progress',
      priority: 10,
      estimatedTime: new Date(Date.now() + 5 * 60000),
    },
    {
      id: 'S007',
      name: 'บ้านลูกค้า G',
      lat: 14.0029,
      lon: 100.6093,
      status: 'pending',
      priority: 4,
      estimatedTime: new Date(Date.now() + 90 * 60000),
    },
  ]);

  // Update time
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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
                  <h1 className="text-2xl font-bold">Real-Time Vehicle Tracking</h1>
                </div>
                <p className="text-green-50">ติดตามรถส่งของแบบเรียลไทม์</p>
              </div>
            </div>

            <div className="relative">
              <button
                className="flex items-center justify-center p-2 bg-seven-green rounded-lg shadow-lg fixed top-4 left-4 z-50"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <Menu className="w-6 h-6 text-white" />
              </button>

              {menuOpen && (
                <div className="fixed top-16 left-4 w-48 bg-white text-gray-800 rounded-lg shadow-lg z-50">
                  <Link href="/" className="block px-4 py-2 hover:bg-gray-100" onClick={() => setMenuOpen(false)}>
                    🌟 Priority System
                  </Link>
                  <Link href="/driver-performance" className="block px-4 py-2 hover:bg-gray-100" onClick={() => setMenuOpen(false)}>
                    🚚 Driver Performance
                  </Link>
                  <Link href="/analytics" className="block px-4 py-2 hover:bg-gray-100" onClick={() => setMenuOpen(false)}>
                    📊 Real-time Analytics
                  </Link>
                  <Link href="/route-optimization" className="block px-4 py-2 hover:bg-gray-100" onClick={() => setMenuOpen(false)}>
                    🗺️ Route Optimization
                  </Link>
                  <Link href="/vehicle-tracking" className="block px-4 py-2 hover:bg-gray-100" onClick={() => setMenuOpen(false)}>
                    📍 Vehicle Tracking
                  </Link>
                </div>
              )}
            </div>

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
        {/* Controls */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-seven-green" />
                <span className="font-bold text-gray-800">
                  Active Vehicles: {vehicles.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                <span className="font-bold text-gray-800">
                  Delivery Stops: {stops.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <span className="font-bold text-gray-800">
                  In Progress: {stops.filter(s => s.status === 'in_progress').length}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTraffic}
                  onChange={(e) => setShowTraffic(e.target.checked)}
                  className="w-4 h-4 text-seven-green rounded"
                />
                <span className="text-sm font-medium text-gray-700">Show Traffic</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoUpdate}
                  onChange={(e) => setAutoUpdate(e.target.checked)}
                  className="w-4 h-4 text-seven-green rounded"
                />
                <span className="text-sm font-medium text-gray-700">Auto Update</span>
              </label>

              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-4 py-2 bg-seven-green text-white rounded-lg hover:bg-seven-green-dark transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <VehicleTrackingMap
            vehicles={vehicles}
            stops={stops}
            showRoutes={true}
            showTraffic={showTraffic}
            height="600px"
            autoUpdate={autoUpdate}
            updateInterval={2000}
          />
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Driving</div>
              <Truck className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-blue-600">
              {vehicles.filter(v => v.status === 'driving').length}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Delivering</div>
              <MapPin className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-3xl font-bold text-orange-600">
              {vehicles.filter(v => v.status === 'delivering').length}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Idle</div>
              <Clock className="w-5 h-5 text-gray-600" />
            </div>
            <div className="text-3xl font-bold text-gray-600">
              {vehicles.filter(v => v.status === 'idle').length}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Avg Speed</div>
              <Navigation className="w-5 h-5 text-seven-green" />
            </div>
            <div className="text-3xl font-bold text-seven-green">
              {Math.round(
                vehicles.reduce((sum, v) => sum + (v.speed || 0), 0) / vehicles.length
              )} <span className="text-lg">km/h</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
