'use client';

import { useState, useEffect, JSX } from 'react';
import { Menu,  TrendingUp, TrendingDown, Clock, Package, Truck, MapPin, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

// ===================================
// Types & Interfaces
// ===================================

interface MetricData {
  label: string;
  value: number;
  change: number;
  trend: 'up' | 'down';
}

interface DeliveryStatus {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

interface RealtimeMetric {
  time: string;
  deliveries: number;
  onTime: number;
  delayed: number;
}

interface ActiveDelivery {
  id: string;
  driver: string;
  location: string;
  eta: string;
  status: 'on_track' | 'delayed' | 'urgent';
}

// ===================================
// Mock Data Generator
// ===================================

const generateRealtimeData = (existingData: RealtimeMetric[]): RealtimeMetric => {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  return {
    time: timeStr,
    deliveries: Math.floor(Math.random() * 20) + 40,
    onTime: Math.floor(Math.random() * 15) + 35,
    delayed: Math.floor(Math.random() * 8) + 2
  };
};

const mockActiveDeliveries: ActiveDelivery[] = [
  { id: 'D001', driver: 'หนุ่ม น้อย', location: 'ลาดพร้าว', eta: '45 นาที', status: 'on_track' },
  { id: 'D002', driver: 'มิว อินโทรเวิร์ต', location: 'เชียงราก', eta: '12 นาที', status: 'on_track' },
  { id: 'D003', driver: 'บอมบ์ มั่งคั่ง', location: 'เตาปูน', eta: '35 นาที', status: 'delayed' },
  { id: 'D004', driver: 'แฮม ร่ำรวย', location: 'คลองหลวง', eta: '30 นาที', status: 'urgent' }
];

// ===================================
// Main Component
// ===================================

export default function RealtimeAnalyticsDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLive, setIsLive] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [realtimeData, setRealtimeData] = useState<RealtimeMetric[]>([
    { time: '15:30:00', deliveries: 45, onTime: 40, delayed: 5 },
    { time: '15:30:05', deliveries: 48, onTime: 43, delayed: 5 },
    { time: '15:30:10', deliveries: 52, onTime: 46, delayed: 6 },
    { time: '15:30:15', deliveries: 47, onTime: 42, delayed: 5 },
    { time: '15:30:20', deliveries: 50, onTime: 45, delayed: 5 }
  ]);

  const [metrics, setMetrics] = useState<MetricData[]>([
    { label: 'Total Deliveries', value: 1247, change: 12.5, trend: 'up' },
    { label: 'On-Time Rate', value: 94.2, change: 2.3, trend: 'up' },
    { label: 'Active Drivers', value: 28, change: -3.1, trend: 'down' },
    { label: 'Avg Delivery Time', value: 23, change: -5.2, trend: 'down' }
  ]);

  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus[]>([
    { status: 'Delivered', count: 856, percentage: 68.6, color: '#00A550' },
    { status: 'In Transit', count: 285, percentage: 22.9, color: '#3B82F6' },
    { status: 'Pending', count: 78, percentage: 6.3, color: '#F59E0B' },
    { status: 'Failed', count: 28, percentage: 2.2, color: '#EF4444' }
  ]);

  // Simulate real-time updates
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timeInterval);
  }, []);

  useEffect(() => {
    if (!isLive) return;

    const dataInterval = setInterval(() => {
      setRealtimeData(prev => {
        const newData = [...prev.slice(1), generateRealtimeData(prev)];
        return newData;
      });

      // Update metrics with random changes
      setMetrics(prev => prev.map(m => ({
        ...m,
        value: m.value + (Math.random() - 0.5) * 2,
        change: (Math.random() - 0.5) * 5
      })));
    }, 2000); // Update every 2 seconds (เร็วขึ้น!)

    return () => clearInterval(dataInterval);
  }, [isLive]);

  const getStatusIcon = (status: string) => {
    if (status === 'on_track') return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (status === 'delayed') return <Clock className="w-4 h-4 text-orange-600" />;
    return <AlertCircle className="w-4 h-4 text-red-600" />;
  };

  const getStatusColor = (status: string) => {
    if (status === 'on_track') return 'bg-green-50 text-green-700 border-green-200';
    if (status === 'delayed') return 'bg-orange-50 text-orange-700 border-orange-200';
    return 'bg-red-50 text-red-700 border-red-200';
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
                  <h1 className="text-2xl font-bold">Real-time Analytics Dashboard</h1>
                </div>
                <p className="text-green-50">แดชบอร์ดวิเคราะห์ข้อมูลแบบเรียลไทม์</p>
              </div>
            </div>


            <div className="relative">
      {/* Hamburger Button */}
      <button
        className="flex items-center justify-center p-2 bg-seven-green rounded-lg shadow-lg fixed top-4 left-4 z-50"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <Menu className="w-6 h-6 text-white" />
      </button>

      {/* Dropdown Menu */}
      {menuOpen && (
        <div className="fixed top-16 left-4 w-48 bg-white text-gray-800 rounded-lg shadow-lg z-50">
          <Link
            href="/"
            className="block px-4 py-2 hover:bg-gray-100"
            onClick={() => setMenuOpen(false)}
          >
            🌟 Priority System
          </Link>
          <Link
            href="/driver-performance"
            className="block px-4 py-2 hover:bg-gray-100"
            onClick={() => setMenuOpen(false)}
          >
            🚚 Driver Performance
          </Link>
          <Link 
            href="/analytics"
            className="block px-4 py-2 hover:bg-gray-100"
            onClick={() => setMenuOpen(false)}
          >
            📊 Real-time Analytics
          </Link>
        </div>
      )}
    </div>


              {/* Time */}
              <div className="text-right bg-white/10 px-6 py-3 rounded-lg backdrop-blur-sm">
              <div className="text-sm text-green-50">เวลาปัจจุบัน</div>
              <div className="text-2xl font-bold">
                {currentTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
              </div>
              </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {metrics.map((metric, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-[#00A550]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500 font-medium">{metric.label}</span>
                {metric.trend === 'up' ? (
                  <TrendingUp className="w-5 h-5 text-green-600" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-1">
                {metric.value.toFixed(metric.label.includes('Rate') || metric.label.includes('Time') ? 1 : 0)}
                {metric.label.includes('Rate') && '%'}
                {metric.label.includes('Time') && ' min'}
              </div>
              <div className={`text-xs font-medium ${metric.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {metric.trend === 'up' ? '↑' : '↓'} {Math.abs(metric.change).toFixed(1)}% from last hour
              </div>
            </div>
          ))}
        </div>

        {/* Main Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Real-time Delivery Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">📊 Real-time Delivery Flow</h2>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg border border-green-200">
                  <div className="w-4 h-4 bg-[#00A550] rounded-sm" />
                  <span className="text-gray-700 font-medium">Total Deliveries</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="w-4 h-4 bg-blue-500 rounded-sm" />
                  <span className="text-gray-700 font-medium">On-Time</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="w-4 h-4 bg-orange-500 rounded-sm" />
                  <span className="text-gray-700 font-medium">Delayed</span>
                </div>
              </div>
            </div>
            
            <div className="relative pt-4" style={{ height: '320px' }}>
              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 bottom-10 flex flex-col justify-between text-xs text-gray-500 w-10">
                <span>60</span>
                <span>45</span>
                <span>30</span>
                <span>15</span>
                <span>0</span>
              </div>
              
              {/* Y-axis title */}
              <div className="absolute -left-6 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-semibold text-gray-600">
                จำนวนการส่ง (ครั้ง)
              </div>
              
              {/* Chart Area */}
              <div className="absolute left-12 right-4 top-0 bottom-10">
                <svg className="w-full h-full" viewBox="0 0 700 280" preserveAspectRatio="none">
                  {/* Grid lines */}
                  {[0, 70, 140, 210, 280].map((y, i) => (
                    <line key={i} x1="0" y1={y} x2="700" y2={y} stroke="#e5e7eb" strokeWidth="1.5"/>
                  ))}
                  
                  {/* Deliveries line - Green */}
                  <path
                    d={realtimeData.map((d, i) => {
                      const x = (i / (realtimeData.length - 1)) * 700;
                      const y = 280 - ((d.deliveries / 60) * 280);
                      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="#00A550"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  
                  {/* Data points for Deliveries */}
                  {realtimeData.map((d, i) => {
                    const x = (i / (realtimeData.length - 1)) * 700;
                    const y = 280 - ((d.deliveries / 60) * 280);
                    return (
                      <g key={`del-${i}`}>
                        <circle cx={x} cy={y} r="5" fill="#00A550" />
                        {i === realtimeData.length - 1 && (
                          <text x={x} y={y - 12} textAnchor="middle" className="text-xs font-bold" fill="#00A550">
                            {d.deliveries}
                          </text>
                        )}
                      </g>
                    );
                  })}
                  
                  {/* On-Time line - Blue */}
                  <path
                    d={realtimeData.map((d, i) => {
                      const x = (i / (realtimeData.length - 1)) * 700;
                      const y = 280 - ((d.onTime / 60) * 280);
                      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  
                  {/* Data points for On-Time */}
                  {realtimeData.map((d, i) => {
                    const x = (i / (realtimeData.length - 1)) * 700;
                    const y = 280 - ((d.onTime / 60) * 280);
                    return (
                      <g key={`ontime-${i}`}>
                        <circle cx={x} cy={y} r="4" fill="#3B82F6" />
                        {i === realtimeData.length - 1 && (
                          <text x={x} y={y - 12} textAnchor="middle" className="text-xs font-bold" fill="#3B82F6">
                            {d.onTime}
                          </text>
                        )}
                      </g>
                    );
                  })}
                  
                  {/* Delayed line - Orange */}
                  <path
                    d={realtimeData.map((d, i) => {
                      const x = (i / (realtimeData.length - 1)) * 700;
                      const y = 280 - ((d.delayed / 60) * 280);
                      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  
                  {/* Data points for Delayed */}
                  {realtimeData.map((d, i) => {
                    const x = (i / (realtimeData.length - 1)) * 700;
                    const y = 280 - ((d.delayed / 60) * 280);
                    return (
                      <g key={`delayed-${i}`}>
                        <circle cx={x} cy={y} r="4" fill="#F59E0B" />
                        {i === realtimeData.length - 1 && (
                          <text x={x + 8} y={y + 4} textAnchor="start" className="text-xs font-bold" fill="#F59E0B">
                            {d.delayed}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* X-axis labels */}
              <div className="absolute left-12 right-4 bottom-0 flex justify-between text-xs text-gray-500">
                {realtimeData.map((d, i) => (
                  <span key={i} className="text-center">{d.time.slice(0, 5)}</span>
                ))}
              </div>
              
              {/* X-axis title */}
              <div className="absolute left-1/2 -translate-x-1/2 -bottom-13 text-xs font-semibold text-gray-600">
                เวลา (Time)
              </div>
            </div>
          </div>

          {/* Delivery Status Distribution */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">📈 Delivery Status</h2>
            <div className="space-y-4">
              {deliveryStatus.map((status, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{status.status}</span>
                    <span className="text-sm font-bold" style={{ color: status.color }}>
                      {status.count} ({status.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${status.percentage}%`,
                        backgroundColor: status.color
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Donut Chart Visual */}
            <div className="mt-6 relative" style={{ height: '180px' }}>
              <svg className="w-full h-full" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="80" fill="none" stroke="#e5e7eb" strokeWidth="30"/>
                {deliveryStatus.reduce((acc, status, index) => {
                  const startAngle = acc.angle;
                  const angle = (status.percentage / 100) * 360;
                  const endAngle = startAngle + angle;
                  
                  const x1 = 100 + 80 * Math.cos((startAngle - 90) * Math.PI / 180);
                  const y1 = 100 + 80 * Math.sin((startAngle - 90) * Math.PI / 180);
                  const x2 = 100 + 80 * Math.cos((endAngle - 90) * Math.PI / 180);
                  const y2 = 100 + 80 * Math.sin((endAngle - 90) * Math.PI / 180);
                  
                  const largeArc = angle > 180 ? 1 : 0;
                  
                  acc.elements.push(
                    <path
                      key={index}
                      d={`M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`}
                      fill={status.color}
                      opacity="0.8"
                    />
                  );
                  
                  acc.angle = endAngle;
                  return acc;
                }, { angle: 0, elements: [] as JSX.Element[] }).elements}
                <circle cx="100" cy="100" r="50" fill="white"/>
                <text x="100" y="95" textAnchor="middle" className="text-2xl font-bold fill-gray-800">
                  {deliveryStatus.reduce((sum, s) => sum + s.count, 0)}
                </text>
                <text x="100" y="110" textAnchor="middle" className="text-xs fill-gray-500">
                  Total
                </text>
              </svg>
            </div>
          </div>
        </div>

        {/* Active Deliveries */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">🚚 Active Deliveries</h2>
            <span className="text-sm text-gray-500">Updated {currentTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {mockActiveDeliveries.map((delivery) => (
              <div 
                key={delivery.id}
                className={`p-4 rounded-lg border-2 ${getStatusColor(delivery.status)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm">{delivery.id}</span>
                  {getStatusIcon(delivery.status)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <Truck className="w-3 h-3" />
                    <span className="font-medium">{delivery.driver}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <MapPin className="w-3 h-3" />
                    <span>{delivery.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Clock className="w-3 h-3" />
                    <span>ETA: {delivery.eta}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        
      </div>
    </div>
  );
}