// ===================================
// Rider Map Component (OpenStreetMap)
// แสดงแผนที่และจุดส่งแบบ Interactive
// ===================================

'use client';

import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation } from 'lucide-react';

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface Delivery {
  delivery_id: string;
  order_number: string;
  pickup_lat: number;
  pickup_lon: number;
  delivery_lat: number;
  delivery_lon: number;
  priority_class: string;
  priority_score?: number;
  customer_name: string;
  delivery_location: string;
}

interface RiderMapProps {
  deliveries: Delivery[];
  currentLocation?: { lat: number; lon: number };
  onLocationSelect?: (deliveryId: string) => void;
}

// Custom marker icons by priority
const createCustomIcon = (priorityClass: string, index: number) => {
  const color = getPriorityColor(priorityClass);

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 16px;
      ">
        ${index + 1}
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

const createCurrentLocationIcon = () => {
  return L.divIcon({
    className: 'current-location-marker',
    html: `
      <div style="
        background-color: #4285F4;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 4px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      "></div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

const getPriorityColor = (priorityClass: string): string => {
  switch (priorityClass) {
    case 'critical': return '#EF4444';
    case 'high': return '#F97316';
    case 'medium': return '#3B82F6';
    default: return '#10B981';
  }
};

// Component to handle map bounds
function MapBoundsHandler({ deliveries, currentLocation }: { deliveries: Delivery[], currentLocation?: { lat: number; lon: number } }) {
  const map = useMap();

  useEffect(() => {
    if (deliveries.length === 0 && !currentLocation) return;

    const bounds: L.LatLngBoundsExpression = [];

    // Add current location
    if (currentLocation) {
      bounds.push([currentLocation.lat, currentLocation.lon]);
    }

    // Add delivery locations
    deliveries.forEach(delivery => {
      bounds.push([delivery.delivery_lat, delivery.delivery_lon]);
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [deliveries, currentLocation, map]);

  return null;
}

export default function RiderMap({ deliveries, currentLocation, onLocationSelect }: RiderMapProps) {
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);

  // Default center (Bangkok)
  const defaultCenter: [number, number] = currentLocation
    ? [currentLocation.lat, currentLocation.lon]
    : [13.7563, 100.5018];

  // Calculate route line if there are deliveries
  const routePoints = useMemo(() => {
    if (deliveries.length === 0) return [];

    const points: [number, number][] = [];

    if (currentLocation) {
      points.push([currentLocation.lat, currentLocation.lon]);
    }

    deliveries.forEach(delivery => {
      points.push([delivery.delivery_lat, delivery.delivery_lon]);
    });

    return points;
  }, [deliveries, currentLocation]);

  return (
    <div className="relative w-full h-full min-h-[600px] rounded-lg overflow-hidden">
      <MapContainer
        center={defaultCenter}
        zoom={12}
        className="w-full h-full"
        style={{ minHeight: '600px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {currentLocation && (
          <Marker
            position={[currentLocation.lat, currentLocation.lon]}
            icon={createCurrentLocationIcon()}
          >
            <Popup>
              <div className="text-sm">
                <strong>ตำแหน่งของคุณ</strong>
              </div>
            </Popup>
          </Marker>
        )}

        {deliveries.map((delivery, index) => (
          <Marker
            key={delivery.delivery_id}
            position={[delivery.delivery_lat, delivery.delivery_lon]}
            icon={createCustomIcon(delivery.priority_class, index)}
            eventHandlers={{
              click: () => {
                setSelectedDeliveryId(delivery.delivery_id);
                if (onLocationSelect) {
                  onLocationSelect(delivery.delivery_id);
                }
              },
            }}
          >
            <Popup>
              <div className="text-sm p-2" style={{ minWidth: '200px' }}>
                <h3 className="font-bold text-base mb-2">{delivery.order_number}</h3>
                <p className="mb-1">
                  <strong>ลูกค้า:</strong> {delivery.customer_name}
                </p>
                <p className="mb-1">
                  <strong>ที่อยู่:</strong> {delivery.delivery_location}
                </p>
                <p className="mb-1">
                  <strong>Priority:</strong>{' '}
                  <span
                    className="px-2 py-1 rounded text-white text-xs font-bold"
                    style={{ backgroundColor: getPriorityColor(delivery.priority_class) }}
                  >
                    {delivery.priority_class.toUpperCase()}
                  </span>
                </p>
                {delivery.priority_score && (
                  <p>
                    <strong>Score:</strong> {delivery.priority_score.toFixed(1)}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {routePoints.length > 1 && (
          <Polyline
            positions={routePoints}
            color="#00A651"
            weight={4}
            opacity={0.7}
            dashArray="10, 10"
          />
        )}

        <MapBoundsHandler deliveries={deliveries} currentLocation={currentLocation} />
      </MapContainer>

      {/* Legend */}
      <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg z-[1000]">
        <h4 className="font-bold text-sm mb-2">สัญลักษณ์</h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white" />
            <span>ตำแหน่งของคุณ</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white" />
            <span>Critical</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-orange-500 border-2 border-white" />
            <span>High</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-600 border-2 border-white" />
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white" />
            <span>Low</span>
          </div>
        </div>
      </div>

      {/* Delivery List Overlay */}
      <div className="absolute bottom-4 left-4 bg-white p-4 rounded-lg shadow-lg max-h-72 overflow-y-auto max-w-xs z-[1000]">
        <h4 className="font-bold text-sm mb-3">จุดส่งทั้งหมด ({deliveries.length})</h4>
        <div className="space-y-2">
          {deliveries.map((delivery, index) => (
            <button
              key={delivery.delivery_id}
              onClick={() => {
                setSelectedDeliveryId(delivery.delivery_id);
                if (onLocationSelect) {
                  onLocationSelect(delivery.delivery_id);
                }
              }}
              className={`w-full text-left p-2 rounded text-xs hover:bg-gray-100 transition ${
                selectedDeliveryId === delivery.delivery_id
                  ? 'bg-green-50 border-2 border-seven-green'
                  : 'border border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: getPriorityColor(delivery.priority_class) }}
                >
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{delivery.order_number}</div>
                  <div className="text-gray-600 truncate">{delivery.customer_name}</div>
                </div>
                <Navigation className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
