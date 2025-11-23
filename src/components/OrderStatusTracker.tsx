// ===================================
// Order Status Tracker Component
// แสดงสถานะการจัดส่งแบบ Real-time
// ===================================

'use client';

import { useState, useEffect } from 'react';
import { Truck, Package, CheckCircle, Clock, MapPin } from 'lucide-react';
import Link from 'next/link';

interface Delivery {
  delivery_id: string;
  order_number: string;
  delivery_status: string;
  rider_name?: string;
  estimated_arrival?: string;
  current_location?: {
    latitude: number;
    longitude: number;
  };
}

interface OrderStatusTrackerProps {
  customerId?: string;
}

const STATUS_CONFIG = {
  pending: {
    label: 'รอดำเนินการ',
    color: 'bg-gray-500',
    icon: Clock,
  },
  assigned: {
    label: 'กำลังจัดเตรียม',
    color: 'bg-blue-500',
    icon: Package,
  },
  picked_up: {
    label: 'กำลังจัดส่ง',
    color: 'bg-yellow-500',
    icon: Truck,
  },
  in_transit: {
    label: 'ใกล้ถึงแล้ว',
    color: 'bg-orange-500',
    icon: MapPin,
  },
  delivered: {
    label: 'จัดส่งสำเร็จ',
    color: 'bg-green-500',
    icon: CheckCircle,
  },
};

export default function OrderStatusTracker({ customerId }: OrderStatusTrackerProps) {
  const [activeDeliveries, setActiveDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (!customerId) return;

    // Fetch active deliveries
    const fetchDeliveries = async () => {
      try {
        const response = await fetch(`/api/customers/${customerId}/deliveries`);
        const data = await response.json();

        console.log('📦 Delivery response:', data); // Debug log

        if (data.success) {
          setActiveDeliveries(data.deliveries || []);
        } else {
          console.error('Failed to fetch deliveries:', data.error);
        }
      } catch (error) {
        console.error('Error fetching deliveries:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDeliveries();

    // Poll every 10 seconds for updates
    const interval = setInterval(fetchDeliveries, 10000);

    return () => clearInterval(interval);
  }, [customerId]);

  // Show loading state
  if (!customerId) {
    return null;
  }

  // Show empty state only after loading is complete
  if (!loading && activeDeliveries.length === 0) {
    return null;
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-seven-green hover:bg-seven-green-dark text-white px-4 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all"
        >
          <Truck className="w-5 h-5 animate-bounce" />
          <span className="font-medium">{activeDeliveries.length} คำสั่งซื้อ</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-seven-green shadow-2xl z-50 max-h-64 overflow-y-auto">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Truck className="w-6 h-6 text-seven-green" />
            สถานะการจัดส่งของคุณ
          </h3>
          <button
            onClick={() => setIsMinimized(true)}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-4 text-gray-500">
              กำลังโหลดข้อมูล...
            </div>
          ) : activeDeliveries.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              ไม่มีคำสั่งซื้อที่กำลังดำเนินการ
            </div>
          ) : (
            activeDeliveries.map((delivery) => {
              const statusConfig = STATUS_CONFIG[delivery.delivery_status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
              const StatusIcon = statusConfig.icon;

              return (
                <Link
                  key={delivery.delivery_id}
                  href={`/shop/tracking?delivery_id=${delivery.delivery_id}`}
                  className="block bg-gray-50 hover:bg-gray-100 rounded-lg p-4 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`${statusConfig.color} p-2 rounded-full`}>
                        <StatusIcon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">
                          คำสั่งซื้อ #{delivery.order_number}
                        </p>
                        <p className="text-sm text-gray-600">{statusConfig.label}</p>
                        {delivery.rider_name && (
                          <p className="text-xs text-gray-500">
                            ไรเดอร์: {delivery.rider_name}
                          </p>
                        )}
                      </div>
                    </div>

                    {delivery.estimated_arrival && (
                      <div className="text-right">
                        <p className="text-xs text-gray-500">ถึงโดยประมาณ</p>
                        <p className="text-sm font-medium text-seven-green">
                          {new Date(delivery.estimated_arrival).toLocaleTimeString('th-TH', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    )}

                    {delivery.delivery_status === 'picked_up' || delivery.delivery_status === 'in_transit' ? (
                      <div className="bg-seven-green text-white text-xs px-3 py-1 rounded-full">
                        ดูแผนที่
                      </div>
                    ) : null}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
