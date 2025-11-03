'use client';

import { useState, useEffect } from 'react';
import { Menu, MapPin, Navigation, Zap, TrendingUp, RefreshCw, Play } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Dynamically import map component (client-side only)
const RouteOptimizationMap = dynamic(
  () => import('@/components/map/RouteOptimizationMap'),
  { ssr: false, loading: () => <div className="h-96 bg-gray-100 rounded-lg animate-pulse" /> }
);

// ===================================
// Types & Interfaces
// ===================================

interface Location {
  name: string;
  lat: number;
  lon: number;
  priority?: number;
}

interface OptimizedRoute {
  route_order: number[];
  total_distance: number;
  total_duration: number;
  route_details?: {
    from: string;
    to: string;
    distance: number;
    duration: number;
  }[];
}

interface RouteResult {
  original_order: string[];
  optimized_order: string[];
  total_distance: number;
  total_duration: number;
  savings?: {
    distance_saved: number;
    time_saved: number;
  };
}

// ===================================
// Main Component
// ===================================

export default function RouteOptimizationPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [optimizationType, setOptimizationType] = useState<'core' | 'multi-stop' | 'traffic'>('multi-stop');
  const [locations, setLocations] = useState<Location[]>([
    { name: '7-11 มธ. รังสิต', lat: 14.0729, lon: 100.6058, priority: 10 },
    { name: 'บ้านลูกค้า A', lat: 14.0293, lon: 100.6193, priority: 8 },
    { name: 'บ้านลูกค้า B', lat: 14.0156, lon: 100.5889, priority: 6 },
    { name: 'บ้านลูกค้า C', lat: 13.9896, lon: 100.6172, priority: 5 },
  ]);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Update time
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const optimizeRoute = async () => {
    try {
      setLoading(true);
      setError(null);

      let endpoint = '';
      let requestBody: Record<string, unknown> = {
        stores: locations.map(loc => ({
          name: loc.name,
          lat: loc.lat,
          lon: loc.lon,
          priority: loc.priority,
        })),
        start_index: 0,
      };

      switch (optimizationType) {
        case 'core':
          endpoint = '/api/routes/optimize';
          requestBody = {
            ...requestBody,
            end_index: locations.length - 1,
          };
          break;
        case 'multi-stop':
          endpoint = '/api/routes/multi-stop';
          requestBody = {
            ...requestBody,
            use_priority: true,
          };
          break;
        case 'traffic':
          endpoint = '/api/routes/traffic-optimized';
          requestBody = {
            ...requestBody,
            use_real_api: false,
          };
          break;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (result.success) {
        setRouteResult(result.data);
      } else {
        setError(result.error || 'Optimization failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to optimize route');
    } finally {
      setLoading(false);
    }
  };

  const addLocation = () => {
    const newLocation: Location = {
      name: `Location ${locations.length + 1}`,
      lat: 14.0 + Math.random() * 0.1,
      lon: 100.6 + Math.random() * 0.1,
      priority: Math.floor(Math.random() * 10) + 1,
    };
    setLocations([...locations, newLocation]);
  };

  const removeLocation = (index: number) => {
    if (locations.length > 2) {
      setLocations(locations.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-seven-green text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-white text-seven-green px-4 py-2 rounded-lg font-bold text-2xl">
                    7-ELEVEN
                  </div>
                  <h1 className="text-2xl font-bold">Route Optimization</h1>
                </div>
                <p className="text-green-50">เพิ่มประสิทธิภาพเส้นทางด้วย AI</p>
              </div>
            </div>

            <div className="relative">
              <button
                className="flex items-center justify-center p-2 bg-seven-green rounded-lg shadow-lg fixed top-4 left-4 z-50"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <Menu className="w-6 h-6 text-white" />
              </button>

              {menuOpen && (
                <div className="fixed top-16 left-4 w-48 bg-white text-gray-800 rounded-lg shadow-lg z-50">
                  <Link href="/" className="block px-4 py-2 hover:bg-gray-100" onClick={() => setMenuOpen(false)}>
                    🌟 Priority System
                  </Link>
                  <Link href="/driver-performance" className="block px-4 py-2 hover:bg-gray-100" onClick={() => setMenuOpen(false)}>
                    🚚 Driver Performance
                  </Link>
                  <Link href="/analytics" className="block px-4 py-2 hover:bg-gray-100" onClick={() => setMenuOpen(false)}>
                    📊 Real-time Analytics
                  </Link>
                  <Link href="/route-optimization" className="block px-4 py-2 hover:bg-gray-100" onClick={() => setMenuOpen(false)}>
                    🗺️ Route Optimization
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-1 space-y-4">
            {/* Optimization Type */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-seven-green" />
                Optimization Type
              </h2>
              <div className="space-y-2">
                <button
                  className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
                    optimizationType === 'core'
                      ? 'bg-seven-green text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  onClick={() => setOptimizationType('core')}
                >
                  Core Route
                </button>
                <button
                  className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
                    optimizationType === 'multi-stop'
                      ? 'bg-seven-green text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  onClick={() => setOptimizationType('multi-stop')}
                >
                  Multi-Stop TSP
                </button>
                <button
                  className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
                    optimizationType === 'traffic'
                      ? 'bg-seven-green text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  onClick={() => setOptimizationType('traffic')}
                >
                  Traffic-Optimized
                </button>
              </div>
            </div>

            {/* Locations */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-seven-green" />
                  Locations ({locations.length})
                </h2>
                <button
                  onClick={addLocation}
                  className="px-3 py-1 bg-seven-green text-white rounded-lg text-sm font-medium hover:bg-seven-green-dark transition-colors"
                >
                  + Add
                </button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {locations.map((loc, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{loc.name}</div>
                      <div className="text-xs text-gray-500">
                        {loc.lat.toFixed(4)}, {loc.lon.toFixed(4)}
                      </div>
                      {loc.priority && (
                        <div className="text-xs text-seven-green font-medium">Priority: {loc.priority}</div>
                      )}
                    </div>
                    {index > 0 && (
                      <button
                        onClick={() => removeLocation(index)}
                        className="ml-2 text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Optimize Button */}
            <button
              onClick={optimizeRoute}
              disabled={loading || locations.length < 2}
              className="w-full bg-seven-green hover:bg-seven-green-dark text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Optimizing...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Optimize Route
                </>
              )}
            </button>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
          </div>

          {/* Right Panel - Results */}
          <div className="lg:col-span-2 space-y-4">
            {/* Interactive Map */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Navigation className="w-5 h-5 text-seven-green" />
                Route Visualization
              </h2>
              <RouteOptimizationMap
                locations={locations}
                optimizationResult={routeResult}
                showOptimizedRoute={true}
                showOriginalRoute={!!routeResult}
                height="500px"
              />
            </div>

            {/* Results */}
            {routeResult && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-seven-green" />
                  Optimization Results
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="text-sm text-gray-600 mb-1">Total Distance</div>
                    <div className="text-2xl font-bold text-seven-green">
                      {routeResult.total_distance.toFixed(2)} km
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="text-sm text-gray-600 mb-1">Total Duration</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {Math.round(routeResult.total_duration / 60)} min
                    </div>
                  </div>
                  {routeResult.savings && (
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <div className="text-sm text-gray-600 mb-1">Distance Saved</div>
                      <div className="text-2xl font-bold text-purple-600">
                        {routeResult.savings.distance_saved.toFixed(2)} km
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-gray-700 mb-2">Original Order:</h3>
                    <div className="flex flex-wrap gap-2">
                      {routeResult.original_order.map((stop, index) => (
                        <div key={index} className="bg-gray-100 px-3 py-2 rounded-lg text-sm">
                          {index + 1}. {stop}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-seven-green mb-2">Optimized Order:</h3>
                    <div className="flex flex-wrap gap-2">
                      {routeResult.optimized_order.map((stop, index) => (
                        <div key={index} className="bg-green-50 px-3 py-2 rounded-lg text-sm border border-green-200">
                          {index + 1}. {stop}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
