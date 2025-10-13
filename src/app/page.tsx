// ===================================
// File: app/page.tsx
// Main Dashboard Page
// ===================================

'use client';

import { useState, useEffect } from 'react';
import { Calculator, Package, Truck, Clock, ThermometerSnowflake, AlertTriangle } from 'lucide-react';

// ===================================
// Types & Interfaces
// ===================================

interface Product {
  product_id: string;
  name: string;
  category: 'hot_food' | 'frozen' | 'chilled' | 'beverage' | 'snack' | 'daily_goods' | 'medicine';
  price: number;
  quantity: number;
  expiration_hours: number; // ชั่วโมงจนกว่าจะหมดอายุ
}

interface Order {
  order_id: string;
  customer_name: string;
  customer_address: string;
  delivery_latitude: number;
  delivery_longitude: number;
  customer_priority: 'urgent' | 'high' | 'standard' | 'economy';
  order_time: string;
  delivery_window_end: string;
  products: Product[];
  // Calculated fields
  priority_score?: number;
  priority_class?: string;
  suggested_delivery_order?: number;
  highest_temp_requirement?: string;
  total_value?: number;
  earliest_expiration?: number;
}

// ===================================
// Priority Calculator (Realistic Version)
// ===================================

class OrderPriorityCalculator {
  // Temperature categories based on product category
  private tempRequirements = {
    hot_food: { temp: 'hot', score: 100, label: 'ร้อน 60-70°C', icon: '🔥', color: 'red' },
    frozen: { temp: 'frozen', score: 90, label: 'แช่แข็ง -18°C', icon: '❄️', color: 'blue' },
    chilled: { temp: 'chilled', score: 75, label: 'เย็น 0-4°C', icon: '🧊', color: 'cyan' },
    beverage: { temp: 'cool', score: 40, label: 'เย็น 15-20°C', icon: '🥤', color: 'green' },
    snack: { temp: 'ambient', score: 20, label: 'ปกติ', icon: '🍪', color: 'gray' },
    daily_goods: { temp: 'ambient', score: 20, label: 'ปกติ', icon: '📦', color: 'gray' },
    medicine: { temp: 'ambient', score: 60, label: 'ปกติ (ยา)', icon: '💊', color: 'purple' }
  };

  private customerPriorityScores = {
    urgent: 100,
    high: 75,
    standard: 50,
    economy: 25
  };

  calculateOrderPriority(order: Order): Order {
    const now = new Date(order.order_time);
    
    // 1. หา Temperature Requirement สูงสุดในออเดอร์
    const tempScores = order.products.map(p => 
      this.tempRequirements[p.category]?.score || 20
    );
    const maxTempScore = Math.max(...tempScores);
    const highestTempProduct = order.products.find(p => 
      this.tempRequirements[p.category]?.score === maxTempScore
    );
    const tempRequirement = this.tempRequirements[highestTempProduct?.category || 'snack'];

    // 2. หาอายุสั้นที่สุด (Earliest Expiration)
    const expirations = order.products.map(p => p.expiration_hours);
    const minExpiration = Math.min(...expirations);
    const expirationScore = this.scoreExpiration(minExpiration);

    // 3. Customer Priority
    const customerScore = this.customerPriorityScores[order.customer_priority] || 50;

    // 4. Total Order Value
    const totalValue = order.products.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    const valueScore = this.scoreValue(totalValue);

    // 5. Delivery Window Urgency
    const deliveryEnd = new Date(order.delivery_window_end);
    const minutesRemaining = (deliveryEnd.getTime() - now.getTime()) / (1000 * 60);
    const windowScore = this.scoreDeliveryWindow(minutesRemaining);

    // 6. Fragility (Medicine = fragile)
    const hasMedicine = order.products.some(p => p.category === 'medicine');
    const fragilityScore = hasMedicine ? 100 : 30;

    // Calculate weighted score
    const weights = {
      temperature: 0.30,      // เพิ่มน้ำหนักเพราะสำคัญที่สุด
      expiration: 0.25,       // เพิ่มเพราะเกี่ยวกับของเสีย
      customer_priority: 0.15,
      value: 0.10,
      delivery_window: 0.15,
      fragility: 0.05
    };

    const totalScore = 
      (maxTempScore * weights.temperature) +
      (expirationScore * weights.expiration) +
      (customerScore * weights.customer_priority) +
      (valueScore * weights.value) +
      (windowScore * weights.delivery_window) +
      (fragilityScore * weights.fragility);

    // Classify priority
    const priorityClass = this.classifyPriority(totalScore);

    return {
      ...order,
      priority_score: Math.round(totalScore * 100) / 100,
      priority_class: priorityClass,
      highest_temp_requirement: tempRequirement.label,
      total_value: totalValue,
      earliest_expiration: minExpiration
    };
  }

  private scoreExpiration(hours: number): number {
    if (hours <= 3) return 100;  // อาหารร้อน
    if (hours <= 8) return 90;   // แซนด์วิช
    if (hours <= 24) return 70;
    if (hours <= 168) return 50; // 1 สัปดาห์
    return 30;
  }

  private scoreValue(value: number): number {
    if (value >= 500) return 100;
    if (value >= 200) return 80;
    if (value >= 100) return 60;
    if (value >= 50) return 40;
    return 20;
  }

  private scoreDeliveryWindow(minutes: number): number {
    if (minutes <= 15) return 100;
    if (minutes <= 30) return 90;
    if (minutes <= 60) return 70;
    if (minutes <= 120) return 50;
    return 30;
  }

  private classifyPriority(score: number): string {
    if (score >= 75) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }
}

// ===================================
// Mock Data
// ===================================

const mockOrders: Order[] = [
  {
    order_id: 'ORD001',
    customer_name: 'คุณสมชาย ใจดี',
    customer_address: 'หอพัก Eton ชั้น 5 ห้อง 501',
    delivery_latitude: 13.9660,
    delivery_longitude: 100.5970,
    customer_priority: 'urgent',
    order_time: new Date().toISOString(),
    delivery_window_end: new Date(Date.now() + 25 * 60000).toISOString(),
    products: [
      { product_id: 'P001', name: 'ข้าวกล่องหมูกระเพรา', category: 'hot_food', price: 65, quantity: 1, expiration_hours: 3 },
      { product_id: 'P002', name: 'น้ำดื่ม', category: 'beverage', price: 10, quantity: 2, expiration_hours: 8760 }
    ]
  },
  {
    order_id: 'ORD002',
    customer_name: 'คุณสมหญิง รักสวย',
    customer_address: 'หอพักลุมพินี ตึก A ชั้น 3',
    delivery_latitude: 13.9680,
    delivery_longitude: 100.5980,
    customer_priority: 'urgent',
    order_time: new Date().toISOString(),
    delivery_window_end: new Date(Date.now() + 30 * 60000).toISOString(),
    products: [
      { product_id: 'P003', name: 'ไอศกรีมวานิลลา', category: 'frozen', price: 89, quantity: 2, expiration_hours: 720 },
      { product_id: 'P004', name: 'โค้ก', category: 'beverage', price: 20, quantity: 1, expiration_hours: 8760 }
    ]
  },
  {
    order_id: 'ORD003',
    customer_name: 'คุณวิชัย มั่งคั่ง',
    customer_address: 'อาคารศูนย์รังสิต มธ. อาคาร SC ห้อง 210',
    delivery_latitude: 13.9640,
    delivery_longitude: 100.5960,
    customer_priority: 'high',
    order_time: new Date().toISOString(),
    delivery_window_end: new Date(Date.now() + 45 * 60000).toISOString(),
    products: [
      { product_id: 'P005', name: 'แซนด์วิชไข่ทูน่า', category: 'chilled', price: 45, quantity: 2, expiration_hours: 8 },
      { product_id: 'P006', name: 'กาแฟเย็น', category: 'beverage', price: 40, quantity: 1, expiration_hours: 24 }
    ]
  },
  {
    order_id: 'ORD004',
    customer_name: 'คุณนิดา สุขสันต์',
    customer_address: 'โรงพยาบาลธรรมศาสตร์ ตึกผู้ป่วยนอก',
    delivery_latitude: 13.9700,
    delivery_longitude: 100.5930,
    customer_priority: 'high',
    order_time: new Date().toISOString(),
    delivery_window_end: new Date(Date.now() + 60 * 60000).toISOString(),
    products: [
      { product_id: 'P007', name: 'ยาพาราเซตามอล', category: 'medicine', price: 120, quantity: 1, expiration_hours: 17520 },
      { product_id: 'P008', name: 'น้ำเกลือแร่', category: 'beverage', price: 15, quantity: 3, expiration_hours: 8760 }
    ]
  },
  {
    order_id: 'ORD005',
    customer_name: 'คุณประยุทธ อยู่เย็น',
    customer_address: 'ตลาดรังสิต ร้านค้าเลขที่ 42',
    delivery_latitude: 13.9620,
    delivery_longitude: 100.5920,
    customer_priority: 'standard',
    order_time: new Date().toISOString(),
    delivery_window_end: new Date(Date.now() + 120 * 60000).toISOString(),
    products: [
      { product_id: 'P009', name: 'มาม่า', category: 'snack', price: 25, quantity: 5, expiration_hours: 4380 },
      { product_id: 'P010', name: 'น้ำดื่ม 6 ขวด', category: 'beverage', price: 60, quantity: 1, expiration_hours: 8760 }
    ]
  }
];

// ===================================
// Main Component
// ===================================

export default function DeliveryPriorityDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [sortedOrders, setSortedOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Calculate priority for all orders
    const calculator = new OrderPriorityCalculator();
    const calculated = mockOrders.map(order => calculator.calculateOrderPriority(order));
    
    // Sort by priority score
    const sorted = [...calculated].sort((a, b) => 
      (b.priority_score || 0) - (a.priority_score || 0)
    );
    
    // Add suggested delivery order
    sorted.forEach((order, index) => {
      order.suggested_delivery_order = index + 1;
    });
    
    setOrders(calculated);
    setSortedOrders(sorted);
  }, []);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
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

  const summary = {
    total: orders.length,
    critical: orders.filter(o => o.priority_class === 'critical').length,
    high: orders.filter(o => o.priority_class === 'high').length,
    totalValue: orders.reduce((sum, o) => sum + (o.total_value || 0), 0)
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
        {/* Summary Cards */}
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
                <p className="text-3xl font-bold text-seven-green">฿{summary.totalValue}</p>
              </div>
              <div className="bg-seven-green/10 p-3 rounded-lg">
                <Calculator className="w-10 h-10 text-seven-green" />
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-gradient-to-r from-seven-green/10 to-green-50 border-l-4 border-seven-green rounded-xl p-5 mb-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="bg-seven-green p-2 rounded-lg">
              <Truck className="w-6 h-6 text-white flex-shrink-0" />
            </div>
            <div>
              <h3 className="font-bold text-seven-green-dark mb-2 text-lg">💡 คำแนะนำสำหรับพนักงานขับรถ</h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                ระบบแสดง<strong className="text-seven-green">ลำดับแนะนำ</strong>การจัดส่ง โดยพิจารณาจาก: อุณหภูมิที่ต้องการ, อายุสินค้า, ความเร่งด่วน, และเวลาส่ง
                <br/>
                <span className="text-seven-orange font-semibold">⚠️ หมายเหตุ:</span> ระบบเป็นเพียงคำแนะนำ คุณสามารถปรับเปลี่ยนตามสถานการณ์จริงได้
              </p>
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
          <div className="bg-gradient-to-r from-seven-green to-seven-green-dark px-6 py-4">
            <h2 className="text-xl font-bold text-white">📦 รายการออเดอร์ (เรียงตามความสำคัญ)</h2>
          </div>

          <div className="divide-y">
            {sortedOrders.map((order) => {
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