'use client';

import { useState, useEffect } from 'react';
import { MapPin, Package, Navigation, CheckCircle, Clock, Truck, AlertCircle, User, Map, Zap, List, X } from 'lucide-react';
import { Button, Card, LoadingSpinner } from '@/components'; // ตัด RiderMap ออกจากตรงนี้ เพราะเราจะใช้ Dynamic
import Link from 'next/link';
import dynamic from 'next/dynamic';

// --- Dynamic Imports ---

// แผนที่รวม (สำหรับหน้า Dashboard ดูงานทั้งหมด)
const DynamicRiderMap = dynamic(() => import('@/components/RiderMap'), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">กำลังโหลดแผนที่รวม...</div>,
});

// 🔥 แผนที่นำทาง (สำหรับนำทางทีละงาน)
const NavigationMap = dynamic(() => import('@/components/NavigationMap'), {
  ssr: false,
  loading: () => <div className="h-full bg-gray-100 animate-pulse flex items-center justify-center">กำลังโหลดเส้นทาง...</div>,
});

// --- Interfaces ---
interface Delivery {
  delivery_id: string;
  order_id: string;
  order_number: string;
  delivery_status: string;
  pickup_location: string;
  pickup_lat: number;
  pickup_lon: number;
  delivery_location: string;
  delivery_lat: number;
  delivery_lon: number;
  customer_name: string;
  customer_phone: string;
  estimated_distance_km: number;
  priority_class: string;
  priority_score?: number;
  created_at: string;
}

interface DriverInfo {
  driver_id: string;
  name: string;
  phone: string;
  status: string;
  current_vehicle_id: string;
  total_deliveries: number;
  rating: number;
}

export default function RiderDashboard() {
  const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null);
  const [activeDeliveries, setActiveDeliveries] = useState<Delivery[]>([]);
  const [availableJobs, setAvailableJobs] = useState<Delivery[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lon: number} | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [autoMode, setAutoMode] = useState(false);
  const [deliveryQueue, setDeliveryQueue] = useState<Delivery[]>([]);
  
  // 🔥 State สำหรับการนำทาง
  const [navigationTarget, setNavigationTarget] = useState<Delivery | null>(null);

  const DRIVER_ID = '11fef86d-2900-4152-a48a-0c0e55b532ba';

  // Fetch driver info
  const fetchDriverInfo = async () => {
    try {
      const response = await fetch(`/api/drivers/${DRIVER_ID}`);
      if (response.ok) {
        const data = await response.json();
        setDriverInfo(data.driver);
      }
    } catch (error) {
      console.error('Error fetching driver info:', error);
    }
  };

  // Fetch active deliveries
  const fetchActiveDeliveries = async () => {
    try {
      const response = await fetch(`/api/deliveries?driver_id=${DRIVER_ID}&status=assigned,picked_up,in_transit`);
      if (response.ok) {
        const data = await response.json();
        setActiveDeliveries(data.deliveries || []);
      }
    } catch (error) {
      console.error('Error fetching active deliveries:', error);
    }
  };

  // Fetch available jobs with priority scores
  const fetchAvailableJobs = async () => {
    try {
      // Use orders API to get priority scores
      const response = await fetch('/api/orders?status=pending&limit=10');
      if (response.ok) {
        const data = await response.json();

        if (data.success && data.data) {
          // Transform orders to delivery format with priority scores
          const jobsWithPriority = data.data.map((order: any) => ({
            delivery_id: order.order_id,
            order_id: order.order_id,
            order_number: order.order_number,
            delivery_status: 'pending',
            pickup_location: '7-Eleven (ร้านที่ใกล้ที่สุด)',
            pickup_lat: 13.7428,
            pickup_lon: 100.5650,
            delivery_location: order.customer_address,
            delivery_lat: order.delivery_latitude ? parseFloat(order.delivery_latitude.toString()) : 0,
            delivery_lon: order.delivery_longitude ? parseFloat(order.delivery_longitude.toString()) : 0,
            customer_name: order.customer_name,
            customer_phone: '',
            estimated_distance_km: 5, // TODO: Calculate actual distance
            priority_class: order.priority_class,
            priority_score: order.priority_score,
            created_at: order.order_time,
          }));

          setAvailableJobs(jobsWithPriority);
        }
      }
    } catch (error) {
      console.error('Error fetching available jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Request location permission
  const requestLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
          setLocationEnabled(true);
        },
        (error) => {
          console.error('Location error:', error);
          // Fallback location (Bangkok) for demo
          setCurrentLocation({ lat: 13.7563, lon: 100.5018 });
        }
      );
    }
  };

  // Start GPS tracking
  const startGPSTracking = () => {
    const interval = setInterval(() => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const gpsData = {
              driver_id: DRIVER_ID,
              lat: position.coords.latitude,
              lon: position.coords.longitude,
              speed_kmh: position.coords.speed ? position.coords.speed * 3.6 : 0,
              bearing: position.coords.heading || 0,
              accuracy_meters: position.coords.accuracy,
              timestamp: new Date().toISOString()
            };

            // Send to Lambda tracking endpoint
            try {
              await fetch(process.env.NEXT_PUBLIC_LAMBDA_TRACKING_URL || '/api/tracking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(gpsData)
              });
            } catch (error) {
              console.error('GPS tracking error:', error);
            }
          }
        );
      }
    }, 15000); // Every 15 seconds

    return () => clearInterval(interval);
  };

  // Update delivery status
  const updateDeliveryStatus = async (deliveryId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/deliveries/${deliveryId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, driver_id: DRIVER_ID })
      });

      if (response.ok) {
        fetchActiveDeliveries();
        alert(`อัปเดตสถานะเป็น ${newStatus} เรียบร้อย`);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
    }
  };

  // Complete delivery
  const completeDelivery = async (delivery: Delivery) => {
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_LAMBDA_COMPLETE_URL || '/api/deliveries/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delivery_id: delivery.delivery_id,
          notes: 'จัดส่งสำเร็จ'
        })
      });

      if (response.ok) {
        fetchActiveDeliveries();
        alert('บันทึกการจัดส่งสำเร็จแล้ว!');
      }
    } catch (error) {
      console.error('Error completing delivery:', error);
      alert('เกิดข้อผิดพลาดในการบันทึก');
    }
  };

  // 🔥 แก้ไขฟังก์ชันนำทาง: ไม่เปิด Tab ใหม่ แต่เปิด Modal ในแอป
  const startInAppNavigation = (delivery: Delivery) => {
    if (!currentLocation) {
      alert('กรุณาเปิดใช้งานตำแหน่งของคุณก่อนเริ่มนำทาง');
      requestLocation();
      return;
    }
    setNavigationTarget(delivery);
    // ปิด Modal รายละเอียดงานถ้าเปิดอยู่
    setSelectedDelivery(null); 
  };

  // Navigate to destination
  const navigateToDestination = (lat: number, lon: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`;
    window.open(url, '_blank');
  };

  // Toggle Auto Mode - จัดเรียงตาม Priority
  const toggleAutoMode = () => {
    if (!autoMode) {
      // เปิด Auto mode - เรียงตาม priority score
      const sorted = [...activeDeliveries, ...availableJobs].sort((a, b) => {
        return (b.priority_score || 0) - (a.priority_score || 0);
      });
      setDeliveryQueue(sorted);
      setAutoMode(true);
    } else {
      // ปิด Auto mode - ให้ rider เลือกเอง
      setDeliveryQueue([]);
      setAutoMode(false);
    }
  };

  // เพิ่มจุดส่งเข้า queue (สำหรับ manual mode)
  const addToQueue = (delivery: Delivery) => {
    if (!deliveryQueue.find(d => d.delivery_id === delivery.delivery_id)) {
      setDeliveryQueue([...deliveryQueue, delivery]);
    }
  };

  // ลบจุดส่งออกจาก queue
  const removeFromQueue = (deliveryId: string) => {
    setDeliveryQueue(deliveryQueue.filter(d => d.delivery_id !== deliveryId));
  };

  // เปลี่ยนลำดับในqueue
  const moveInQueue = (deliveryId: string, direction: 'up' | 'down') => {
    const index = deliveryQueue.findIndex(d => d.delivery_id === deliveryId);
    if (index === -1) return;

    const newQueue = [...deliveryQueue];
    if (direction === 'up' && index > 0) {
      [newQueue[index], newQueue[index - 1]] = [newQueue[index - 1], newQueue[index]];
    } else if (direction === 'down' && index < newQueue.length - 1) {
      [newQueue[index], newQueue[index + 1]] = [newQueue[index + 1], newQueue[index]];
    }
    setDeliveryQueue(newQueue);
  };

  useEffect(() => {
    fetchDriverInfo();
    fetchActiveDeliveries();
    fetchAvailableJobs();
    requestLocation();
  }, []);

  // Auto-update queue when auto mode is on
  useEffect(() => {
    if (autoMode) {
      const sorted = [...activeDeliveries, ...availableJobs].sort((a, b) => {
        return (b.priority_score || 0) - (a.priority_score || 0);
      });
      setDeliveryQueue(sorted);
    }
  }, [activeDeliveries, availableJobs, autoMode]);

  const getPriorityColor = (priorityClass: string) => {
    switch (priorityClass) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-blue-500';
      default: return 'bg-green-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-blue-500';
      case 'picked_up': return 'bg-yellow-500';
      case 'in_transit': return 'bg-purple-500';
      case 'delivered': return 'bg-green-500';
      default: return 'bg-gray-500';
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
    <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-seven-green text-white p-6 shadow-lg">
        <div className="container mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">🚚 Rider Dashboard</h1>
              <p className="text-white/80">สวัสดี, {driverInfo?.name || 'คนขับ'}</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="flex items-center gap-2 mb-1">
                  {locationEnabled ? (
                    <><MapPin className="w-5 h-5" /> <span>ตำแหน่งเปิดอยู่</span></>
                  ) : (
                    <><AlertCircle className="w-5 h-5" /> <span>ตำแหน่งปิด</span></>
                  )}
                </div>
                <div className="text-sm text-white/80">
                  ⭐ คะแนน: {driverInfo?.rating.toFixed(1)} | จัดส่งสำเร็จ: {driverInfo?.total_deliveries}
                </div>
              </div>
              <Link href="/rider/account">
                <button className="bg-white/20 hover:bg-white/30 p-3 rounded-full transition">
                  <User className="w-6 h-6" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* View Mode Toggle & Auto Mode */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                  viewMode === 'list' ? 'bg-seven-green text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <List className="w-5 h-5" />
                รายการ
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                  viewMode === 'map' ? 'bg-seven-green text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Map className="w-5 h-5" />
                แผนที่
              </button>
            </div>

            <button
              onClick={toggleAutoMode}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition ${
                autoMode ? 'bg-purple-600 text-white shadow-lg' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Zap className="w-5 h-5" />
              {autoMode ? '🤖 Auto Mode (ON)' : 'Auto Mode (OFF)'}
            </button>
          </div>

          {autoMode && (
            <div className="mt-4 p-3 bg-purple-50 border-l-4 border-purple-500 rounded">
              <p className="text-sm text-purple-800">
                <strong>Auto Mode เปิดอยู่:</strong> ระบบจะจัดลำดับการส่งตาม Priority Score โดยอัตโนมัติ (คะแนนสูง = ความสำคัญสูง)
              </p>
            </div>
          )}
        </div>

        {/* Delivery Queue Section */}
        {deliveryQueue.length > 0 && (
          <Card title={`📍 คิวการจัดส่ง (${deliveryQueue.length} จุด)`} className="mb-6">
            <div className="space-y-3">
              {deliveryQueue.map((delivery, index) => (
                <div key={delivery.delivery_id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full ${getPriorityColor(delivery.priority_class)} text-white flex items-center justify-center font-bold text-lg`}>
                    {index + 1}
                  </div>

                  <div className="flex-1">
                    <div className="font-bold text-gray-800">{delivery.order_number}</div>
                    <div className="text-sm text-gray-600">{delivery.customer_name}</div>
                    <div className="text-xs text-gray-500 mt-1">{delivery.delivery_location}</div>
                  </div>

                  <div className="text-right">
                    <span className={`${getPriorityColor(delivery.priority_class)} text-white px-2 py-1 rounded text-xs font-bold uppercase block mb-1`}>
                      {delivery.priority_class}
                    </span>
                    {delivery.priority_score && (
                      <div className="text-xs font-medium text-gray-600">
                        Score: {delivery.priority_score.toFixed(1)}
                      </div>
                    )}
                  </div>

                  {!autoMode && (
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => moveInQueue(delivery.delivery_id, 'up')}
                        disabled={index === 0}
                        className="p-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveInQueue(delivery.delivery_id, 'down')}
                        disabled={index === deliveryQueue.length - 1}
                        className="p-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        ▼
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => removeFromQueue(delivery.delivery_id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    ✕
                  </button>

                  <button
                    onClick={() => navigateToDestination(delivery.delivery_lat, delivery.delivery_lon)}
                    className="p-2 bg-seven-green text-white rounded hover:bg-green-700"
                  >
                    <Navigation className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {viewMode === 'map' && (
          <Card title="🗺️ แผนที่จุดส่ง" className="mb-6">
            <DynamicRiderMap
              deliveries={[...activeDeliveries, ...availableJobs]}
              currentLocation={currentLocation || undefined}
              onLocationSelect={(deliveryId) => {
                const delivery = [...activeDeliveries, ...availableJobs].find(d => d.delivery_id === deliveryId);
                if (delivery) {
                  setSelectedDelivery(delivery);
                }
              }}
            />
          </Card>
        )}

        {viewMode === 'list' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Deliveries */}
            <Card title="📦 งานที่กำลังทำ" className="h-fit">
              {activeDeliveries.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <Package className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                  <p>ยังไม่มีงานที่กำลังทำ</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeDeliveries.map((delivery) => (
                  <div key={delivery.delivery_id} className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-bold text-lg">{delivery.order_number}</div>
                        <div className="text-sm text-gray-500">{delivery.customer_name}</div>
                      </div>
                      <span className={`${getStatusColor(delivery.delivery_status)} text-white px-3 py-1 rounded-full text-xs font-bold uppercase`}>
                        {delivery.delivery_status}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <div className="font-medium">ที่อยู่จัดส่ง:</div>
                          <div className="text-gray-600">{delivery.delivery_location}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">ระยะทาง: {delivery.estimated_distance_km.toFixed(1)} กม.</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {delivery.delivery_status === 'assigned' && (
                        <Button
                          onClick={() => updateDeliveryStatus(delivery.delivery_id, 'picked_up')}
                          variant="primary"
                          size="sm"
                          fullWidth
                        >
                          รับสินค้าแล้ว
                        </Button>
                      )}
                      {delivery.delivery_status === 'picked_up' && (
                        <Button
                          onClick={() => updateDeliveryStatus(delivery.delivery_id, 'in_transit')}
                          variant="primary"
                          size="sm"
                          fullWidth
                        >
                          เริ่มเดินทาง
                        </Button>
                      )}
                      {delivery.delivery_status === 'in_transit' && (
                        <Button
                          onClick={() => completeDelivery(delivery)}
                          variant="primary"
                          size="sm"
                          fullWidth
                        >
                          <CheckCircle className="w-4 h-4 inline mr-1" />
                          จัดส่งสำเร็จ
                        </Button>
                      )}
                      <Button
                        onClick={() => navigateToDestination(delivery.delivery_lat, delivery.delivery_lon)}
                        variant="secondary"
                        size="sm"
                      >
                        <Navigation className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

            {/* Available Jobs */}
            <Card title="🆕 งานใหม่ที่พร้อมรับ" className="h-fit">
            {availableJobs.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <Clock className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                <p>ยังไม่มีงานใหม่</p>
              </div>
            ) : (
              <div className="space-y-4">
                {availableJobs.map((job) => (
                  <div key={job.delivery_id} className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-bold text-lg">{job.order_number}</div>
                        <div className="text-sm text-gray-500">{job.customer_name}</div>
                      </div>
                      <div className="text-right">
                        <span className={`${getPriorityColor(job.priority_class)} text-white px-3 py-1 rounded-full text-xs font-bold uppercase block mb-1`}>
                          {job.priority_class}
                        </span>
                        {job.priority_score && (
                          <div className="text-xs text-gray-600">
                            คะแนน: {job.priority_score.toFixed(1)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <div className="font-medium">ที่อยู่จัดส่ง:</div>
                          <div className="text-gray-600">{job.delivery_location}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">ระยะทาง: {job.estimated_distance_km.toFixed(1)} กม.</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {!autoMode && !deliveryQueue.find(d => d.delivery_id === job.delivery_id) && (
                        <Button
                          onClick={() => addToQueue(job)}
                          variant="secondary"
                          size="sm"
                          fullWidth
                        >
                          + เพิ่มเข้าคิว
                        </Button>
                      )}
                      {deliveryQueue.find(d => d.delivery_id === job.delivery_id) && (
                        <div className="flex-1 bg-green-100 text-green-700 py-2 px-3 rounded text-sm text-center font-medium">
                          ✓ อยู่ในคิวแล้ว
                        </div>
                      )}
                      <Button
                        onClick={() => setSelectedDelivery(job)}
                        variant="primary"
                        size="sm"
                        fullWidth={autoMode || deliveryQueue.find(d => d.delivery_id === job.delivery_id) ? true : false}
                      >
                        ดูรายละเอียด
                      </Button>
                    </div>
                  </div>
                ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* Job Detail Modal */}
      {selectedDelivery && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedDelivery(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="bg-seven-green p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{selectedDelivery.order_number}</h2>
                  <p className="text-white/90">รายละเอียดงานจัดส่ง</p>
                </div>
                <button onClick={() => setSelectedDelivery(null)} className="text-white/80 hover:text-white text-3xl">×</button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-gray-700 mb-2">ข้อมูลลูกค้า</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                    <div><span className="text-gray-500">ชื่อ:</span> <span className="font-medium">{selectedDelivery.customer_name}</span></div>
                    <div><span className="text-gray-500">เบอร์โทร:</span> <span className="font-medium">{selectedDelivery.customer_phone}</span></div>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-gray-700 mb-2">จุดรับสินค้า</h3>
                  <div className="bg-gray-50 rounded-lg p-4 text-sm">
                    <div className="text-gray-600">{selectedDelivery.pickup_location}</div>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-gray-700 mb-2">จุดส่งสินค้า</h3>
                  <div className="bg-gray-50 rounded-lg p-4 text-sm">
                    <div className="text-gray-600">{selectedDelivery.delivery_location}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-xs text-gray-600">ระยะทาง</div>
                    <div className="text-lg font-bold text-blue-600">{selectedDelivery.estimated_distance_km.toFixed(1)} กม.</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="text-xs text-gray-600">ความสำคัญ</div>
                    <div className="text-lg font-bold text-purple-600 uppercase">{selectedDelivery.priority_class}</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={() => navigateToDestination(selectedDelivery.delivery_lat, selectedDelivery.delivery_lon)}
                  variant="secondary"
                  fullWidth
                >
                  <Navigation className="w-4 h-4 inline mr-2" />
                  นำทาง
                </Button>
                <Button
                  onClick={() => {
                    // Accept job logic here
                    setSelectedDelivery(null);
                    alert('รับงานสำเร็จ! กรุณารับสินค้าที่ร้าน');
                  }}
                  variant="primary"
                  fullWidth
                >
                  รับงานนี้
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}