'use client';

import { useState, useEffect } from 'react';
import { Package, Truck, Users, DollarSign, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { LoadingSpinner, Card } from '@/components';

interface DashboardStats {
  totalOrders: number;
  activeDeliveries: number;
  totalRiders: number;
  revenue: number;
  completedToday: number;
  avgDeliveryTime: number;
  pendingOrders: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    activeDeliveries: 0,
    totalRiders: 0,
    revenue: 0,
    completedToday: 0,
    avgDeliveryTime: 0,
    pendingOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/stats');

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data.stats);
        }
      } else {
        console.error('Failed to fetch stats');
        // Fallback to mock data
        setStats({
          totalOrders: 0,
          activeDeliveries: 0,
          totalRiders: 0,
          revenue: 0,
          completedToday: 0,
          avgDeliveryTime: 0,
          pendingOrders: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Fallback to mock data on error
      setStats({
        totalOrders: 0,
        activeDeliveries: 0,
        totalRiders: 0,
        revenue: 0,
        completedToday: 0,
        avgDeliveryTime: 0,
        pendingOrders: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" message="กำลังโหลดข้อมูล..." />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Navigation role="admin" userName="Admin" />

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
            <p className="text-gray-600">ภาพรวมระบบจัดส่ง DeliveryGenie</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Orders */}
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500 font-medium">คำสั่งซื้อทั้งหมด</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.totalOrders.toLocaleString()}</p>
                </div>
                <Package className="w-12 h-12 text-blue-500 opacity-20" />
              </div>
              <div className="flex items-center text-sm text-green-600">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span>+12% จากเมื่อวาน</span>
              </div>
            </div>

            {/* Active Deliveries */}
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500 font-medium">กำลังจัดส่ง</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.activeDeliveries}</p>
                </div>
                <Truck className="w-12 h-12 text-orange-500 opacity-20" />
              </div>
              <div className="text-sm text-gray-600">
                รอดำเนินการ: {stats.pendingOrders} คำสั่ง
              </div>
            </div>

            {/* Total Riders */}
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Riders ออนไลน์</p>
                  <p className="text-3xl font-bold text-green-600">{stats.totalRiders}</p>
                </div>
                <Users className="w-12 h-12 text-green-500 opacity-20" />
              </div>
              <div className="text-sm text-gray-600">
                จาก 52 Riders ทั้งหมด
              </div>
            </div>

            {/* Revenue */}
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500 font-medium">รายได้วันนี้</p>
                  <p className="text-3xl font-bold text-purple-600">฿{stats.revenue.toLocaleString()}</p>
                </div>
                <DollarSign className="w-12 h-12 text-purple-500 opacity-20" />
              </div>
              <div className="flex items-center text-sm text-green-600">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span>+8% จากเมื่อวาน</span>
              </div>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                จัดส่งสำเร็จวันนี้
              </h3>
              <div className="text-4xl font-bold text-green-600 mb-2">{stats.completedToday}</div>
              <p className="text-sm text-gray-600">คำสั่งที่จัดส่งสำเร็จแล้ว</p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                เวลาจัดส่งเฉลี่ย
              </h3>
              <div className="text-4xl font-bold text-blue-600 mb-2">{stats.avgDeliveryTime} นาที</div>
              <p className="text-sm text-gray-600">จากเป้าหมาย 30 นาที</p>
            </div>
          </div>

          {/* Quick Links */}
          <Card title="เมนูด่วน">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <a
                href="/admin/orders"
                className="bg-blue-50 hover:bg-blue-100 rounded-lg p-4 transition-colors text-center"
              >
                <Package className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="font-medium text-gray-800">ดูคำสั่งซื้อ</p>
              </a>
              <a
                href="/admin/riders"
                className="bg-green-50 hover:bg-green-100 rounded-lg p-4 transition-colors text-center"
              >
                <Truck className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="font-medium text-gray-800">จัดการ Riders</p>
              </a>
              <a
                href="/analytics"
                className="bg-purple-50 hover:bg-purple-100 rounded-lg p-4 transition-colors text-center"
              >
                <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="font-medium text-gray-800">Analytics</p>
              </a>
              <a
                href="/admin/settings"
                className="bg-gray-50 hover:bg-gray-100 rounded-lg p-4 transition-colors text-center"
              >
                <Users className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="font-medium text-gray-800">ตั้งค่าระบบ</p>
              </a>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
