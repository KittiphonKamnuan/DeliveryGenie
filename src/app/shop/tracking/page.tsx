'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Truck, Package, Phone, Navigation as NavIcon, Clock } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { LoadingSpinner, Button } from '@/components';
import dynamic from 'next/dynamic';

// Dynamic import for Leaflet to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const Polyline = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polyline),
  { ssr: false }
);

interface RiderLocation {
  lat: number;
  lon: number;
  bearing: number;
  speed_kmh: number;
  timestamp: string;
}

interface DeliveryInfo {
  delivery_id: string;
  order_number: string;
  status: string;
  rider_name: string;
  rider_phone: string;
  pickup_location: string;
  delivery_location: string;
  delivery_lat: number;
  delivery_lon: number;
  estimated_arrival: string;
  rider_location?: RiderLocation;
}

export default function TrackingPage() {
  const [deliveries, setDeliveries] = useState<DeliveryInfo[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryInfo | null>(null);
  const [riderLocation, setRiderLocation] = useState<RiderLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    fetchActiveDeliveries();
  }, []);

  // Real-time GPS tracking - update every 5 seconds
  useEffect(() => {
    if (!selectedDelivery) return;

    const interval = setInterval(() => {
      fetchRiderLocation(selectedDelivery.delivery_id);
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedDelivery]);

  const fetchActiveDeliveries = async () => {
    try {
      setLoading(true);
      // TODO: Get customer_id from auth session
      const customerId = 'mock-customer-id';

      const response = await fetch(`/api/customers/${customerId}/deliveries`);

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.deliveries) {
          setDeliveries(data.deliveries);
          if (data.deliveries.length > 0) {
            setSelectedDelivery(data.deliveries[0]);
            setRiderLocation(data.deliveries[0].rider_location);
          }
        }
      } else {
        console.error('Failed to fetch deliveries');
        setDeliveries([]);
      }
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRiderLocation = async (deliveryId: string) => {
    try {
      const response = await fetch(`/api/tracking/${deliveryId}`);

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.delivery && data.delivery.rider_location) {
          setRiderLocation(data.delivery.rider_location);
          // Update estimated arrival if changed
          if (data.delivery.estimated_arrival) {
            setSelectedDelivery(prev =>
              prev ? { ...prev, estimated_arrival: data.delivery.estimated_arrival } : null
            );
          }
        }
      }
    } catch (error) {
      console.error('Error fetching rider location:', error);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'รอดำเนินการ';
      case 'assigned': return 'มอบหมาย Rider แล้ว';
      case 'picked_up': return 'Rider รับสินค้าแล้ว';
      case 'in_transit': return 'กำลังจัดส่ง';
      case 'delivered': return 'จัดส่งสำเร็จ';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-500';
      case 'assigned': return 'bg-blue-500';
      case 'picked_up': return 'bg-yellow-500';
      case 'in_transit': return 'bg-purple-500';
      case 'delivered': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getTimeRemaining = (estimatedArrival: string) => {
    const diff = new Date(estimatedArrival).getTime() - Date.now();
    const minutes = Math.floor(diff / 60000);
    if (minutes <= 0) return 'กำลังมาถึง';
    if (minutes < 60) return `${minutes} นาที`;
    return `${Math.floor(minutes / 60)} ชม. ${minutes % 60} นาที`;
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
      <Navigation role="customer" userName="ลูกค้า" />

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">ติดตามการจัดส่ง</h1>
            <p className="text-gray-600">ติดตามตำแหน่ง Rider แบบ Real-time</p>
          </div>

          {deliveries.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <Package className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-700 mb-2">ไม่มีการจัดส่งที่กำลังดำเนินการ</h3>
              <p className="text-gray-500 mb-6">คุณยังไม่มีคำสั่งซื้อที่กำลังจัดส่ง</p>
              <Button href="/">เริ่มช้อปปิ้ง</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Delivery Info Sidebar */}
              <div className="lg:col-span-1 space-y-4">
                {deliveries.map((delivery) => (
                  <div
                    key={delivery.delivery_id}
                    onClick={() => {
                      setSelectedDelivery(delivery);
                      setRiderLocation(delivery.rider_location || null);
                    }}
                    className={`bg-white rounded-xl shadow-md p-4 cursor-pointer transition-all ${
                      selectedDelivery?.delivery_id === delivery.delivery_id
                        ? 'ring-2 ring-seven-green'
                        : 'hover:shadow-lg'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-gray-800">{delivery.order_number}</span>
                      <span className={`${getStatusColor(delivery.status)} text-white px-3 py-1 rounded-full text-xs font-bold`}>
                        {getStatusText(delivery.status)}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Truck className="w-4 h-4" />
                        <span>{delivery.rider_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span className="line-clamp-1">{delivery.delivery_location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>จัดส่งใน: {getTimeRemaining(delivery.estimated_arrival)}</span>
                      </div>
                    </div>

                    <Button
                      href={`tel:${delivery.rider_phone}`}
                      variant="secondary"
                      size="sm"
                      fullWidth
                      className="mt-3"
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      โทร Rider
                    </Button>
                  </div>
                ))}
              </div>

              {/* Map */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow-md p-4">
                  <div className="mb-4">
                    <h3 className="font-bold text-gray-800 mb-2">
                      แผนที่ติดตาม - {selectedDelivery?.order_number}
                    </h3>
                    {riderLocation && (
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>ความเร็ว: {riderLocation.speed_kmh.toFixed(0)} km/h</span>
                        <span>อัปเดตล่าสุด: {new Date(riderLocation.timestamp).toLocaleTimeString('th-TH')}</span>
                      </div>
                    )}
                  </div>

                  <div className="h-[500px] rounded-lg overflow-hidden">
                    {typeof window !== 'undefined' && selectedDelivery && riderLocation && (
                      <MapContainer
                        ref={mapRef}
                        center={[riderLocation.lat, riderLocation.lon]}
                        zoom={15}
                        className="h-full w-full"
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        />

                        {/* Rider Marker */}
                        <Marker position={[riderLocation.lat, riderLocation.lon]}>
                          <Popup>
                            <div className="text-center">
                              <p className="font-bold">🚚 {selectedDelivery.rider_name}</p>
                              <p className="text-sm">{riderLocation.speed_kmh.toFixed(0)} km/h</p>
                            </div>
                          </Popup>
                        </Marker>

                        {/* Destination Marker */}
                        <Marker position={[selectedDelivery.delivery_lat, selectedDelivery.delivery_lon]}>
                          <Popup>
                            <div className="text-center">
                              <p className="font-bold">📍 ปลายทาง</p>
                              <p className="text-sm">{selectedDelivery.delivery_location}</p>
                            </div>
                          </Popup>
                        </Marker>

                        {/* Route Line */}
                        <Polyline
                          positions={[
                            [riderLocation.lat, riderLocation.lon],
                            [selectedDelivery.delivery_lat, selectedDelivery.delivery_lon],
                          ]}
                          color="blue"
                          weight={3}
                          opacity={0.6}
                          dashArray="10, 10"
                        />
                      </MapContainer>
                    )}
                  </div>

                  <div className="mt-4 flex gap-3">
                    <Button
                      onClick={() => {
                        if (mapRef.current) {
                          mapRef.current.setView([riderLocation!.lat, riderLocation!.lon], 15);
                        }
                      }}
                      variant="secondary"
                      size="sm"
                    >
                      <NavIcon className="w-4 h-4 mr-2" />
                      มุมมอง Rider
                    </Button>
                    <Button
                      onClick={() => {
                        if (mapRef.current && selectedDelivery) {
                          mapRef.current.setView([selectedDelivery.delivery_lat, selectedDelivery.delivery_lon], 15);
                        }
                      }}
                      variant="secondary"
                      size="sm"
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      มุมมองปลายทาง
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
