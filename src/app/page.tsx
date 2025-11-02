// ===================================
// File: app/page.tsx
// Main Dashboard Page
// ===================================

'use client';

import { useState, useEffect } from 'react';
import { Calculator, Package, Truck, Clock, ThermometerSnowflake, AlertTriangle, RefreshCw, Menu } from 'lucide-react';
import Link from 'next/link';

// ===================================
// Types & Interfaces
// ===================================

interface Product {
  product_id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  expiration_hours: number | null;
}

interface Order {
  order_id: string;
  order_number?: string;
  customer_name: string;
  customer_address: string;
  delivery_latitude: number;
  delivery_longitude: number;
  customer_priority: string;
  order_status: string;
  order_time: string;
  delivery_window_start?: string;
  delivery_window_end: string;
  products: Product[];
  // Calculated fields
  priority_score: number;
  priority_class: string;
  suggested_delivery_order?: number;
  highest_temp_requirement?: string;
  total_value: number;
  earliest_expiration?: number;
  minutes_until_deadline?: number;
  breakdown?: {
    temperature: number;
    expiration: number;
    customer: number;
    value: number;
    timeWindow: number;
    fragility: number;
  };
}


// ===================================
// Main Component
// ===================================

export default function DeliveryPriorityDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    total_value: 0,
    avg_score: 0,
  });

  // Fetch orders from API
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/orders?status=pending&limit=50');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch orders');
      }

      if (result.success) {
        setOrders(result.data);
        setSummary(result.summary);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchOrders();
  }, []);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchOrders();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const getPriorityColor = (priorityClass: string) => {
    switch (priorityClass) {
      case 'critical': return 'bg-seven-red';
      case 'high': return 'bg-seven-orange';
      case 'medium': return 'bg-blue-500';
      default: return 'bg-seven-green';
    }
  };

  const getPriorityIcon = (priorityClass: string) => {
    switch (priorityClass) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🔵';
      default: return '🟢';
    }
  };

  const getTimeRemaining = (deliveryEnd: string) => {
    const end = new Date(deliveryEnd);
    const diff = end.getTime() - currentTime.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes <= 0) return { text: 'เลยเวลา!', urgent: true };
    if (minutes <= 15) return { text: `${minutes} นาที`, urgent: true };
    if (minutes <= 60) return { text: `${minutes} นาที`, urgent: false };
    const hours = Math.floor(minutes / 60);
    return { text: `${hours} ชม. ${minutes % 60} นาที`, urgent: false };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - 7-Eleven Style */}
      <header className="bg-seven-green text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white text-seven-green px-4 py-2 rounded-lg font-bold text-2xl">
                  7-ELEVEN
                </div>
                <h1 className="text-2xl font-bold">DeliveryGenie Priority System</h1>
              </div>
              <p className="text-green-50">ระบบจัดลำดับความสำคัญการจัดส่ง</p>
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
        {/* Loading State */}
        {loading && orders.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <RefreshCw className="w-16 h-16 text-seven-green animate-spin mx-auto mb-4" />
              <p className="text-gray-600 text-lg">กำลังโหลดข้อมูล...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-5 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-red-800 mb-1">เกิดข้อผิดพลาด</h3>
                <p className="text-red-700 text-sm">{error}</p>
                <button
                  onClick={fetchOrders}
                  className="mt-3 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                >
                  ลองอีกครั้ง
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-md p-6 border-t-4 border-seven-green">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-semibold">ออเดอร์ทั้งหมด</p>
                    <p className="text-3xl font-bold text-seven-green">{summary.total}</p>
                  </div>
                  <div className="bg-seven-green/10 p-3 rounded-lg">
                    <Package className="w-10 h-10 text-seven-green" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border-t-4 border-seven-red">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-semibold">🔴 เร่งด่วนมาก</p>
                    <p className="text-3xl font-bold text-seven-red">{summary.critical}</p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg">
                    <AlertTriangle className="w-10 h-10 text-seven-red" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border-t-4 border-seven-orange">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-semibold">🟠 เร่งด่วน</p>
                    <p className="text-3xl font-bold text-seven-orange">{summary.high}</p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <Clock className="w-10 h-10 text-seven-orange" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border-t-4 border-seven-green">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-semibold">มูลค่ารวม</p>
                    <p className="text-3xl font-bold text-seven-green">
                      ฿{summary.total_value.toLocaleString('th-TH')}
                    </p>
                  </div>
                  <div className="bg-seven-green/10 p-3 rounded-lg">
                    <Calculator className="w-10 h-10 text-seven-green" />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Instructions */}
        {!loading && !error && orders.length > 0 && (
          <>
            <div className="bg-gradient-to-r from-seven-green/10 to-green-50 border-l-4 border-seven-green rounded-xl p-5 mb-6 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="bg-seven-green p-2 rounded-lg">
                  <Truck className="w-6 h-6 text-white flex-shrink-0" />
                </div>
                <div>
                  <h3 className="font-bold text-seven-green-dark mb-2 text-lg">
                    💡 คำแนะนำสำหรับพนักงานขับรถ
                  </h3>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    ระบบแสดง<strong className="text-seven-green">ลำดับแนะนำ</strong>
                    การจัดส่ง โดยพิจารณาจาก: อุณหภูมิที่ต้องการ, อายุสินค้า,
                    ความเร่งด่วน, และเวลาส่ง
                    <br />
                    <span className="text-seven-orange font-semibold">⚠️ หมายเหตุ:</span>{' '}
                    ระบบเป็นเพียงคำแนะนำ คุณสามารถปรับเปลี่ยนตามสถานการณ์จริงได้
                  </p>
                </div>
              </div>
            </div>

            {/* Orders List */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
              <div className="bg-gradient-to-r from-seven-green to-seven-green-dark px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">
                  📦 รายการออเดอร์ (เรียงตามความสำคัญ)
                </h2>
                <button
                  onClick={fetchOrders}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-white text-sm font-medium"
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  รีเฟรช
                </button>
              </div>

              <div className="divide-y">
                {orders.map((order) => {
              const timeRemaining = getTimeRemaining(order.delivery_window_end);
              
              return (
                <div 
                  key={order.order_id}
                  className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedOrder(order)}
                >
                  {/* Order Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      {/* Priority Badge */}
                      <div className="flex flex-col items-center">
                        <div className={`${getPriorityColor(order.priority_class || 'low')} text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg`}>
                          #{order.suggested_delivery_order}
                        </div>
                        <span className="text-xs mt-1 text-gray-500">ลำดับแนะนำ</span>
                      </div>

                      {/* Order Info */}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-2xl">{getPriorityIcon(order.priority_class || 'low')}</span>
                          <h3 className="font-bold text-lg">{order.order_id}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            order.priority_class === 'critical' ? 'bg-red-50 text-seven-red border border-seven-red' :
                            order.priority_class === 'high' ? 'bg-orange-50 text-seven-orange border border-seven-orange' :
                            order.priority_class === 'medium' ? 'bg-blue-50 text-blue-600 border border-blue-600' :
                            'bg-green-50 text-seven-green border border-seven-green'
                          }`}>
                            {order.priority_class?.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-gray-600">{order.customer_name}</p>
                        <p className="text-sm text-gray-500">{order.customer_address}</p>
                      </div>
                    </div>

                    {/* Priority Score */}
                    <div className="text-right">
                      <div className="text-3xl font-bold text-seven-green">{order.priority_score}</div>
                      <div className="text-xs text-gray-500 font-semibold">คะแนนความสำคัญ</div>
                    </div>
                  </div>

                  {/* Order Details Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <ThermometerSnowflake className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-500">อุณหภูมิที่ต้องการ</span>
                      </div>
                      <p className="font-semibold text-sm">{order.highest_temp_requirement}</p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-500">เวลาส่งคงเหลือ</span>
                      </div>
                      <p className={`font-semibold text-sm ${timeRemaining.urgent ? 'text-red-600' : 'text-gray-700'}`}>
                        {timeRemaining.text}
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-500">จำนวนสินค้า</span>
                      </div>
                      <p className="font-semibold text-sm">{order.products.length} รายการ</p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Calculator className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-500">มูลค่า</span>
                      </div>
                      <p className="font-semibold text-sm">฿{order.total_value}</p>
                    </div>
                  </div>

                  {/* Products List */}
                  <div className="border-t pt-3">
                    <p className="text-xs text-gray-500 mb-2">สินค้าในออเดอร์:</p>
                    <div className="flex flex-wrap gap-2">
                      {order.products.map((product) => (
                        <div key={product.product_id} className="bg-gray-100 rounded-lg px-3 py-1 text-sm">
                          {product.name} x{product.quantity}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
          </>
        )}

        {/* Empty State */}
        {!loading && !error && orders.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Package className="w-24 h-24 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-700 mb-2">ไม่มีออเดอร์ในขณะนี้</h3>
            <p className="text-gray-500 mb-6">
              ไม่พบออเดอร์ที่รอการจัดส่ง โปรดตรวจสอบอีกครั้งในภายหลัง
            </p>
            <button
              onClick={fetchOrders}
              className="px-6 py-3 bg-seven-green hover:bg-seven-green-dark text-white rounded-lg transition-colors font-medium"
            >
              รีเฟรชข้อมูล
            </button>
          </div>
        )}

        {/* Modal for Order Details */}
        {selectedOrder && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedOrder(null)}
          >
            <div 
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`${getPriorityColor(selectedOrder.priority_class || 'low')} p-6 text-white`}>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl font-bold">{selectedOrder.order_id}</h2>
                  <button 
                    onClick={() => setSelectedOrder(null)}
                    className="text-white/80 hover:text-white text-3xl"
                  >
                    ×
                  </button>
                </div>
                <p className="text-white/90">{selectedOrder.customer_name}</p>
              </div>

              <div className="p-6">
                <div className="bg-gradient-to-br from-seven-green/10 to-green-50 rounded-xl p-6 mb-4 border-2 border-seven-green/20">
                  <div className="text-center">
                    <div className="text-6xl font-bold text-seven-green mb-2">
                      {selectedOrder.priority_score}
                    </div>
                    <div className="text-sm text-gray-600 uppercase tracking-wide font-semibold">
                      คะแนนความสำคัญรวม
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h3 className="font-bold mb-2">ที่อยู่จัดส่ง</h3>
                    <p className="text-gray-700">{selectedOrder.customer_address}</p>
                  </div>

                  <div>
                    <h3 className="font-bold mb-2">สินค้าในออเดอร์</h3>
                    <div className="space-y-2">
                      {selectedOrder.products.map((product) => (
                        <div key={product.product_id} className="flex justify-between items-center bg-gray-50 rounded-lg p-3">
                          <div>
                            <p className="font-semibold">{product.name}</p>
                            <p className="text-sm text-gray-500">
                              {product.category} • หมดอายุใน {product.expiration_hours}h
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">฿{product.price * product.quantity}</p>
                            <p className="text-sm text-gray-500">x{product.quantity}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span>มูลค่ารวม</span>
                      <span className="text-seven-green">฿{selectedOrder.total_value}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedOrder(null)}
                  className="w-full mt-6 bg-seven-green hover:bg-seven-green-dark text-white font-bold py-3 rounded-lg transition-colors shadow-md"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}