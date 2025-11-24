'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Helper: ปรับมุมกล้อง
const FitBounds = ({ coords }: { coords: [number, number][] }) => {
  const map = useMap();
  useEffect(() => {
    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [coords, map]);
  return null;
};

interface NavigationMapProps {
  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;
}

const NavigationMap = ({ startLat, startLon, endLat, endLon }: NavigationMapProps) => {
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [distance, setDistance] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);
  
  // ใช้ useRef เก็บ Icons เพื่อความเสถียร
  const startIconRef = useRef<any>(null);
  const endIconRef = useRef<any>(null);

  useEffect(() => {
    // Force check window object
    if (typeof window !== 'undefined') {
      // Setup Icons
      startIconRef.current = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      endIconRef.current = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      setIsMounted(true);
    }
  }, []);

  useEffect(() => {
    if (!startLat || !startLon || !endLat || !endLon) return;

    const fetchRoute = async () => {
      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson`
        );
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const coords = route.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);
          setRouteCoords(coords);
          setDistance((route.distance / 1000).toFixed(2) + ' กม.');
          setDuration((route.duration / 60).toFixed(0) + ' นาที');
        }
      } catch (error) {
        console.error("Error fetching route:", error);
      }
    };

    fetchRoute();
  }, [startLat, startLon, endLat, endLon]);

  // 🔥 Critical Fix: ถ้ายังไม่ Mount ห้าม return MapContainer เด็ดขาด
  if (!isMounted) {
    return <div className="w-full h-full bg-gray-200 flex items-center justify-center">Loading Map Engine...</div>;
  }

  return (
    <div className="relative w-full h-full z-0" style={{ minHeight: '100%' }}>
      {/* Force Load CSS */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossOrigin=""/>
      
      {distance && (
        <div className="absolute top-4 right-4 z-[1000] bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <div className="text-sm font-bold text-gray-700">🚗 {distance}</div>
          <div className="text-sm font-bold text-blue-600">⏱️ {duration}</div>
        </div>
      )}

      <MapContainer center={[startLat, startLon]} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        
        {startIconRef.current && (
            <Marker position={[startLat, startLon]} icon={startIconRef.current}><Popup>Start</Popup></Marker>
        )}
        {endIconRef.current && (
            <Marker position={[endLat, endLon]} icon={endIconRef.current}><Popup>End</Popup></Marker>
        )}
        
        {routeCoords.length > 0 && (
          <>
            <Polyline positions={routeCoords} color="#3b82f6" weight={6} opacity={0.8} />
            <FitBounds coords={routeCoords} />
          </>
        )}
      </MapContainer>
    </div>
  );
};

export default NavigationMap;