'use client';

import { useState, useEffect } from 'react';
import { MapPin, Package, Navigation, CheckCircle, Clock, Truck, AlertCircle, User, Map, Zap, List } from 'lucide-react';
import { Button, Card, LoadingSpinner, RiderMap } from '@/components';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react'; // Import Session

// Dynamically import RiderMap to avoid SSR issues with Leaflet
const DynamicRiderMap = dynamic(() => import('@/components/RiderMap'), {
  ssr: false,
  loading: () => (
    <div className="bg-gray-100 rounded-lg p-12 text-center">
      <LoadingSpinner size="lg" message="กำลังโหลดแผนที่..." />
    </div>
  ),
});

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
  store_name?: string; // เพิ่มชื่อสาขา
}

export default function RiderDashboard() {
  const { data: session, status } = useSession();
  const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null);
  const [activeDeliveries, setActiveDeliveries] = useState<Delivery[]>([]);
  const [availableJobs, setAvailableJobs] = useState<Delivery[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingJob, setProcessingJob] = useState(false); // State ตอนกดรับงาน
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lon: number} | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [autoMode, setAutoMode] = useState(false);
  const [deliveryQueue, setDeliveryQueue] = useState<Delivery[]>([]);

  const accessToken = (session as any)?.accessToken;
  const DRIVER_ID = (session?.user as any)?.id;

  const fetchDriverInfo = async () => {
    if (!DRIVER_ID || !accessToken) return;
    try {
      const res = await fetch(`/api/drivers/${DRIVER_ID}?token=${accessToken}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        setDriverInfo(data.driver);
      }
    } catch (err) {
      console.error('Driver info error:', err);
    }
  };
  
  const fetchActiveDeliveries = async () => {
    if (!DRIVER_ID || !accessToken) return;
    try {
      const res = await fetch(
        `/api/deliveries?driver_id=${DRIVER_ID}&status=assigned,picked_up,in_transit&token=${accessToken}`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const data = await res.json();
        setActiveDeliveries(data.deliveries || []);
      }
    } catch (err) {
      console.error('Active deliveries error:', err);
    }
  };

  const fetchAvailableJobs = async () => {
    if (!DRIVER_ID || !accessToken) return;
    try {
      const res = await fetch(`/api/job?limit=10&driver_id=${DRIVER_ID}&token=${accessToken}`);
      if (!res.ok) {
        const err = await res.json();
        console.error('Jobs error:', err);
        return;
      }
      const data = await res.json();
      setAvailableJobs(data.data || []);  // Handle empty data gracefully
      if (data.data?.length === 0) {
        console.log('No jobs available – check driver store or pending orders');
      }
    } catch (error) {
      console.error('Fetch jobs error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Accept Job Logic
  const handleAcceptJob = async () => {
    if (!selectedDelivery || !DRIVER_ID) return;
    
    setProcessingJob(true);
    try {
      const response = await fetch('/api/jobs/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver_id: DRIVER_ID,
          order_id: selectedDelivery.order_id // ใช้ order_id ในการรับงาน
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert('รับงานสำเร็จ! กรุณารับสินค้าที่ร้าน');
        setSelectedDelivery(null);
        // Refresh data
        fetchAvailableJobs();
        fetchActiveDeliveries();
      } else {
        // Response ไม่สำเร็จ (เช่น 500 จาก Lambda ที่มีการ Assign ซ้ำซ้อน)
        // result.error จะเป็นข้อความที่มาจาก ValueError ใน Python
        alert(result.error || `ไม่สามารถรับงานได้ (รหัส: ${response.status})`);
        fetchAvailableJobs(); // Refresh เพื่อดูว่างานหายไปไหม
      }
    } catch (error) {
      console.error('Error accepting job:', error);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อหรือการประมวลผล');
    } finally {
      setProcessingJob(false);
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
          // Start tracking
          startGPSTracking();
        },
        (error) => {
          console.error('Location error:', error);
          // ไม่ alert รบกวนทุกครั้ง แต่แสดงสถานะใน UI แทน
        }
      );
    }
  };

  // Start GPS tracking
  const startGPSTracking = () => {
    const interval = setInterval(() => {
      if ('geolocation' in navigator && DRIVER_ID) {
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
    if (!DRIVER_ID) return;
    try {
      const response = await fetch(`/api/deliveries/${deliveryId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, driver_id: DRIVER_ID })
      });

      if (response.ok) {
        fetchActiveDeliveries();
        // alert(`อัปเดตสถานะเป็น ${newStatus} เรียบร้อย`);
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

  // Navigate to destination
  const navigateToDestination = (lat: number, lon: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`;
    window.open(url, '_blank');
  };

  // Toggle Auto Mode
  const toggleAutoMode = () => {
    if (!autoMode) {
      const sorted = [...activeDeliveries, ...availableJobs].sort((a, b) => {
        return (b.priority_score || 0) - (a.priority_score || 0);
      });
      setDeliveryQueue(sorted);
      setAutoMode(true);
    } else {
      setDeliveryQueue([]);
      setAutoMode(false);
    }
  };

  // Queue Management
  const addToQueue = (delivery: Delivery) => {
    if (!deliveryQueue.find(d => d.delivery_id === delivery.delivery_id)) {
      setDeliveryQueue([...deliveryQueue, delivery]);
    }
  };

  const removeFromQueue = (deliveryId: string) => {
    setDeliveryQueue(deliveryQueue.filter(d => d.delivery_id !== deliveryId));
  };

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

  // Effects
  useEffect(() => {
    if (DRIVER_ID) {
      fetchDriverInfo();
      fetchActiveDeliveries();
      fetchAvailableJobs();
      requestLocation();
    }
  }, [DRIVER_ID]);

  useEffect(() => {
    if (autoMode) {
      const sorted = [...activeDeliveries, ...availableJobs].sort((a, b) => {
        return (b.priority_score || 0) - (a.priority_score || 0);
      });
      setDeliveryQueue(sorted);
    }
  }, [activeDeliveries, availableJobs, autoMode]);

  // Interval Refresh
  useEffect(() => {
    if (!DRIVER_ID) return;
    const interval = setInterval(() => {
      fetchAvailableJobs();
      fetchActiveDeliveries();
    }, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, [DRIVER_ID]);


  // --- Render Helpers ---
  const getPriorityColor = (priorityClass: string) => {
    switch (priorityClass?.toLowerCase()) {
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
        <div className="bg-seven-green text-white p-6 shadow-lg sticky top-0 z-30">
        <div className="container mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">🚚 Rider Dashboard</h1>
              <p className="text-white/80">
                สวัสดี, {driverInfo?.name || 'คนขับ'} 
                {driverInfo?.store_name && <span className="text-xs bg-white/20 px-2 py-1 rounded ml-2">{driverInfo.store_name}</span>}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="flex items-center justify-end gap-2 mb-1">
                  {locationEnabled ? (
                    <><MapPin className="w-4 h-4 text-green-300" /> <span className="text-xs">GPS ON</span></>
                  ) : (
                    <><AlertCircle className="w-4 h-4 text-red-300" /> <span className="text-xs">GPS OFF</span></>
                  )}
                </div>
                <div className="text-xs text-white/80">
                  งานวันนี้: {driverInfo?.total_deliveries || 0}
                </div>
              </div>
              <Link href="/rider/account">
                <button className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition">
                  <User className="w-6 h-6" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* View Mode Toggle & Auto Mode */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6 sticky top-[88px] z-20 border-b border-gray-100">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all text-sm ${
                  viewMode === 'list' ? 'bg-white text-seven-green shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <List className="w-4 h-4" />
                รายการ
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all text-sm ${
                  viewMode === 'map' ? 'bg-white text-seven-green shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Map className="w-4 h-4" />
                แผนที่
              </button>
            </div>

            <button
              onClick={toggleAutoMode}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition text-sm ${
                autoMode ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-200' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Zap className={`w-4 h-4 ${autoMode ? 'fill-current' : ''}`} />
              {autoMode ? 'Auto Mode: ON' : 'Auto Mode: OFF'}
            </button>
          </div>
        </div>

        {/* Queue (Visible only if Auto Mode or Manual Queue has items) */}
        {(autoMode || deliveryQueue.length > 0) && (
          <Card title={`📍 คิวการจัดส่ง (${deliveryQueue.length} จุด)`} className="mb-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {deliveryQueue.map((delivery, index) => (
                <div key={delivery.delivery_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-seven-green transition-colors">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full ${getPriorityColor(delivery.priority_class)} text-white flex items-center justify-center font-bold text-sm shadow-sm`}>
                    {index + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-800 text-sm truncate">{delivery.order_number}</div>
                    <div className="text-xs text-gray-500 truncate">{delivery.delivery_location}</div>
                  </div>

                  {!autoMode && (
                    <div className="flex flex-col gap-1">
                      <button onClick={() => moveInQueue(delivery.delivery_id, 'up')} disabled={index === 0} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 text-xs">▲</button>
                      <button onClick={() => moveInQueue(delivery.delivery_id, 'down')} disabled={index === deliveryQueue.length - 1} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 text-xs">▼</button>
                    </div>
                  )}

                  <button onClick={() => navigateToDestination(delivery.delivery_lat, delivery.delivery_lon)} className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200">
                    <Navigation className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {viewMode === 'map' && (
          <Card title="🗺️ แผนที่จุดส่ง" className="mb-6 h-[500px]">
            <DynamicRiderMap
              deliveries={[...activeDeliveries, ...availableJobs]}
              currentLocation={currentLocation || undefined}
              onLocationSelect={(deliveryId) => {
                const delivery = [...activeDeliveries, ...availableJobs].find(d => d.delivery_id === deliveryId);
                if (delivery) setSelectedDelivery(delivery);
              }}
            />
          </Card>
        )}

        {viewMode === 'list' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Deliveries Column */}
            <div className="space-y-4">
              <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                <Package className="w-5 h-5 text-seven-green" />
                งานที่กำลังทำ ({activeDeliveries.length})
              </h2>
              
              {activeDeliveries.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center border-2 border-dashed border-gray-200">
                  <p className="text-gray-400">ยังไม่มีงานที่รับไว้</p>
                </div>
              ) : (
                activeDeliveries.map((delivery) => (
                  <div key={delivery.delivery_id} className="bg-white rounded-xl shadow-sm border-l-4 border-seven-green p-4 hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-xs font-bold text-gray-400">ORDER</span>
                        <div className="font-bold text-lg text-gray-800">{delivery.order_number}</div>
                      </div>
                      <span className={`${getStatusColor(delivery.delivery_status)} text-white px-2 py-1 rounded text-xs font-bold uppercase tracking-wider`}>
                        {delivery.delivery_status}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm mb-4 bg-gray-50 p-3 rounded-lg">
                      <div className="flex gap-2">
                        <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                        <span className="text-gray-700 line-clamp-2">{delivery.delivery_location}</span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <User className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="text-gray-600">{delivery.customer_name}</span>
                        <a href={`tel:${delivery.customer_phone}`} className="text-blue-600 text-xs underline ml-auto">โทร</a>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {delivery.delivery_status === 'assigned' && (
                        <Button onClick={() => updateDeliveryStatus(delivery.delivery_id, 'picked_up')} size="sm" fullWidth>
                          🛍️ รับสินค้าแล้ว
                        </Button>
                      )}
                      {delivery.delivery_status === 'picked_up' && (
                        <Button onClick={() => updateDeliveryStatus(delivery.delivery_id, 'in_transit')} size="sm" fullWidth>
                          🛵 เริ่มเดินทาง
                        </Button>
                      )}
                      {delivery.delivery_status === 'in_transit' && (
                        <Button onClick={() => completeDelivery(delivery)} variant="primary" size="sm" fullWidth className="bg-green-600 hover:bg-green-700">
                          ✅ จัดส่งสำเร็จ
                        </Button>
                      )}
                      <Button onClick={() => navigateToDestination(delivery.delivery_lat, delivery.delivery_lon)} variant="secondary" size="sm" fullWidth>
                        🧭 นำทาง
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Available Jobs Column */}
            <div className="space-y-4">
              <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                งานใหม่ ({availableJobs.length})
              </h2>

              {availableJobs.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center border-2 border-dashed border-gray-200">
                  <p className="text-gray-400">ไม่มีงานใหม่ในขณะนี้</p>
                </div>
              ) : (
                availableJobs.map((job) => (
                  <div key={job.delivery_id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:border-blue-200 transition-all relative overflow-hidden">
                    {/* Priority Strip */}
                    <div className={`absolute top-0 left-0 w-1 h-full ${getPriorityColor(job.priority_class)}`}></div>

                    <div className="flex justify-between items-start mb-2 pl-3">
                      <div>
                        <div className="font-bold text-gray-800">{job.order_number}</div>
                        <div className="text-xs text-gray-500">{new Date(job.created_at).toLocaleTimeString('th-TH')}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-700">{job.estimated_distance_km.toFixed(1)} กม.</div>
                        <div className={`text-[10px] font-bold uppercase ${getPriorityColor(job.priority_class)} text-white px-1.5 py-0.5 rounded inline-block`}>
                          {job.priority_class}
                        </div>
                      </div>
                    </div>

                    <div className="pl-3 text-sm text-gray-600 mb-4 line-clamp-2">
                      📍 {job.delivery_location}
                    </div>

                    <div className="pl-3 flex gap-2">
                      <Button onClick={() => setSelectedDelivery(job)} size="sm" fullWidth variant="outline">
                        ดูรายละเอียด
                      </Button>
                      {!deliveryQueue.find(d => d.delivery_id === job.delivery_id) && (
                        <Button onClick={() => addToQueue(job)} size="sm" fullWidth variant="secondary">
                          + คิว
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Job Detail Modal */}
      {selectedDelivery && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-in fade-in duration-200" onClick={() => setSelectedDelivery(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="bg-seven-green p-6 text-white relative">
              <button onClick={() => setSelectedDelivery(null)} className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/10 hover:bg-black/20 rounded-full p-1 transition">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
              <h2 className="text-xl font-bold">{selectedDelivery.order_number}</h2>
              <p className="text-white/80 text-sm mt-1">รายละเอียดงานจัดส่ง</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Customer Section */}
              <div className="flex gap-4 items-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-2xl">👤</div>
                <div>
                  <div className="font-bold text-gray-800">{selectedDelivery.customer_name}</div>
                  <div className="text-sm text-gray-500">{selectedDelivery.customer_phone || 'ไม่ระบุเบอร์โทร'}</div>
                </div>
              </div>

              {/* Route Section */}
              <div className="relative border-l-2 border-dashed border-gray-300 ml-2 space-y-8 py-2">
                <div className="relative pl-6">
                  <div className="absolute -left-[9px] top-1 w-4 h-4 bg-seven-green rounded-full border-2 border-white shadow-sm"></div>
                  <div className="text-xs font-bold text-gray-400 uppercase mb-1">รับสินค้า</div>
                  <div className="text-sm font-medium text-gray-800">{selectedDelivery.pickup_location || 'ที่ร้าน'}</div>
                </div>
                <div className="relative pl-6">
                  <div className="absolute -left-[9px] top-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-sm"></div>
                  <div className="text-xs font-bold text-gray-400 uppercase mb-1">ส่งสินค้า</div>
                  <div className="text-sm font-medium text-gray-800">{selectedDelivery.delivery_location}</div>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <div className="text-xs text-gray-500 mb-1">ระยะทาง</div>
                  <div className="font-bold text-gray-800">{selectedDelivery.estimated_distance_km.toFixed(1)} กม.</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <div className="text-xs text-gray-500 mb-1">ค่าส่ง</div>
                  <div className="font-bold text-gray-800">฿30</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <div className="text-xs text-gray-500 mb-1">คะแนนงาน</div>
                  <div className="font-bold text-purple-600">{selectedDelivery.priority_score?.toFixed(0) || '-'}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => navigateToDestination(selectedDelivery.delivery_lat, selectedDelivery.delivery_lon)}
                  variant="secondary"
                  fullWidth
                  className="py-3"
                >
                  <Navigation className="w-4 h-4 inline mr-2" />
                  ดูแผนที่
                </Button>
                <Button
                  onClick={handleAcceptJob}
                  variant="primary"
                  fullWidth
                  disabled={processingJob}
                  className="py-3 shadow-lg shadow-green-200"
                >
                  {processingJob ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>✋ รับงานนี้</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}