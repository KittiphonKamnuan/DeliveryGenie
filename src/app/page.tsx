'use client';

import { useState, useEffect } from 'react';
import { Calculator, Package, Truck, Clock, ThermometerSnowflake, AlertTriangle } from 'lucide-react';
import { Header, LoadingSpinner, Button, Card } from '@/components';
import type { Order, OrderSummary } from '@/types';

export default function DeliveryPriorityDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<OrderSummary & { total_value: number; avg_score: number }>({
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
      <Header
        title="DeliveryGenie Priority System"
        subtitle="ระบบจัดลำดับความสำคัญการจัดส่ง"
        currentTime={currentTime}
      />

      <div className="container mx-auto px-4 py-6">
        {/* Loading State */}
        {loading && orders.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner size="lg" message="กำลังโหลดข้อมูล..." />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-5 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-bold text-red-800 mb-1">เกิดข้อผิดพลาด</h3>
                <p className="text-red-700 text-sm">{error}</p>
                <Button
                  onClick={fetchOrders}
                  variant="danger"
                  size="sm"
                  className="mt-3"
                >
                  ลองอีกครั้ง
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        {!loading && orders.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-seven-green">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium mb-1">ออเดอร์ทั้งหมด</p>
                    <p className="text-3xl font-bold text-seven-green">{summary.total}</p>
                  </div>
                  <Package className="w-10 h-10 text-seven-green opacity-20" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-seven-red">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium mb-1">สำคัญมาก</p>
                    <p className="text-3xl font-bold text-seven-red">{summary.critical}</p>
                  </div>
                  <AlertTriangle className="w-10 h-10 text-seven-red opacity-20" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-seven-orange">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium mb-1">สำคัญสูง</p>
                    <p className="text-3xl font-bold text-seven-orange">{summary.high}</p>
                  </div>
                  <Truck className="w-10 h-10 text-seven-orange opacity-20" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium mb-1">คะแนนเฉลี่ย</p>
                    <p className="text-3xl font-bold text-blue-600">{summary.avg_score.toFixed(1)}</p>
                  </div>
                  <Calculator className="w-10 h-10 text-blue-600 opacity-20" />
                </div>
              </div>
            </div>

            {/* Orders Table */}
            <Card
              title="🎯 รายการออเดอร์ตามลำดับความสำคัญ"
              action={{ label: '↻ รีเฟรช', onClick: fetchOrders }}
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ลำดับ</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ออเดอร์</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ลูกค้า</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ความสำคัญ</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">คะแนน</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">เวลาที่เหลือ</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">สินค้า</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">การดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {orders.map((order, index) => {
                      const timeRemaining = getTimeRemaining(order.delivery_window_end);
                      return (
                        <tr key={order.order_id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedOrder(order)}>
                          <td className="px-4 py-4">
                            <div className="text-xl font-bold text-gray-700">#{order.suggested_delivery_order || index + 1}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-medium text-gray-900">{order.order_number || order.order_id.slice(0, 8)}</div>
                            <div className="text-xs text-gray-500">{new Date(order.order_time).toLocaleString('th-TH')}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-medium text-gray-900">{order.customer_name}</div>
                            <div className="text-xs text-gray-500 max-w-xs truncate">{order.customer_address}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`${getPriorityColor(order.priority_class)} text-white px-3 py-1 rounded-full text-xs font-bold uppercase`}>
                                {getPriorityIcon(order.priority_class)} {order.priority_class}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-lg font-bold text-gray-900">{order.priority_score.toFixed(1)}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className={`flex items-center gap-2 ${timeRemaining.urgent ? 'text-red-600 font-bold' : 'text-gray-700'}`}>
                              <Clock className="w-4 h-4" />
                              {timeRemaining.text}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm text-gray-600">{order.products.length} รายการ</div>
                            {order.highest_temp_requirement && (
                              <div className="flex items-center gap-1 text-xs text-blue-600 mt-1">
                                <ThermometerSnowflake className="w-3 h-3" />
                                {order.highest_temp_requirement}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <Button
                              onClick={(e) => {
                                e?.stopPropagation();
                                setSelectedOrder(order);
                              }}
                              variant="secondary"
                              size="sm"
                            >
                              ดูรายละเอียด
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {/* No Orders */}
        {!loading && !error && orders.length === 0 && (
          <div className="text-center py-20">
            <Package className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <p className="text-xl text-gray-500">ไม่มีออเดอร์ที่รอดำเนินการ</p>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className={`${getPriorityColor(selectedOrder.priority_class)} p-6 text-white`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-2xl font-bold">{getPriorityIcon(selectedOrder.priority_class)} {selectedOrder.order_number || selectedOrder.order_id.slice(0, 8)}</h2>
                  <p className="text-white/90">คะแนนความสำคัญ: {selectedOrder.priority_score.toFixed(2)}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="text-white/80 hover:text-white text-3xl">×</button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-bold text-gray-700 mb-3">ข้อมูลลูกค้า</h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-gray-500">ชื่อ:</span> <span className="font-medium">{selectedOrder.customer_name}</span></div>
                    <div><span className="text-gray-500">ที่อยู่:</span> <span className="font-medium">{selectedOrder.customer_address}</span></div>
                    <div><span className="text-gray-500">ระดับลูกค้า:</span> <span className="font-medium">{selectedOrder.customer_priority}</span></div>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-gray-700 mb-3">การจัดส่ง</h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-gray-500">สถานะ:</span> <span className="font-medium">{selectedOrder.order_status}</span></div>
                    <div><span className="text-gray-500">เวลาส่ง:</span> <span className="font-medium">{new Date(selectedOrder.delivery_window_end).toLocaleString('th-TH')}</span></div>
                    <div><span className="text-gray-500">เวลาที่เหลือ:</span> <span className="font-medium">{getTimeRemaining(selectedOrder.delivery_window_end).text}</span></div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-bold text-gray-700 mb-3">รายการสินค้า ({selectedOrder.products.length} รายการ)</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  {selectedOrder.products.map((product, idx) => (
                    <div key={idx} className="flex items-center justify-between border-b border-gray-200 pb-2 last:border-0">
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-gray-500">{product.category}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">฿{product.price.toFixed(2)} × {product.quantity}</div>
                        <div className="text-xs text-gray-500">฿{(product.price * product.quantity).toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedOrder.breakdown && (
                <div>
                  <h3 className="font-bold text-gray-700 mb-3">การคำนวณคะแนน</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-xs text-gray-600">อุณหภูมิ</div>
                      <div className="text-lg font-bold text-blue-600">{selectedOrder.breakdown.temperature.toFixed(1)}</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-xs text-gray-600">การหมดอายุ</div>
                      <div className="text-lg font-bold text-green-600">{selectedOrder.breakdown.expiration.toFixed(1)}</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3">
                      <div className="text-xs text-gray-600">ลูกค้า</div>
                      <div className="text-lg font-bold text-purple-600">{selectedOrder.breakdown.customer.toFixed(1)}</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3">
                      <div className="text-xs text-gray-600">มูลค่า</div>
                      <div className="text-lg font-bold text-orange-600">{selectedOrder.breakdown.value.toFixed(1)}</div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3">
                      <div className="text-xs text-gray-600">กรอบเวลา</div>
                      <div className="text-lg font-bold text-red-600">{selectedOrder.breakdown.timeWindow.toFixed(1)}</div>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-3">
                      <div className="text-xs text-gray-600">ความเปราะบาง</div>
                      <div className="text-lg font-bold text-yellow-600">{selectedOrder.breakdown.fragility.toFixed(1)}</div>
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={() => setSelectedOrder(null)}
                fullWidth
                className="mt-6"
              >
                ปิด
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
