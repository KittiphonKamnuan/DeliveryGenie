// ===================================
// API: Find Nearest Store
// ===================================

import { NextRequest, NextResponse } from 'next/server';

interface Store {
  store_id: string;
  store_code: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance_km: number;
}

interface RouteResponse {
  distance_km: number;
  duration_min: number;
}

export async function POST(request: NextRequest) {
  try {
    const { latitude, longitude } = await request.json();

    if (!latitude || !longitude) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุพิกัดของคุณ' },
        { status: 400 }
      );
    }

    // 1. Get top 10 stores from Lambda API
    const storesResponse = await fetch(
      process.env.LAMBDA_NEARBY_7_URL || 'https://rywh91krwb.execute-api.ap-southeast-1.amazonaws.com/prod/nearby7',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lat: latitude,
          lon: longitude,
          limit: 10
        }),
      }
    );

    if (!storesResponse.ok) {
      const errorText = await storesResponse.text();
      console.error('Lambda stores API error:', {
        status: storesResponse.status,
        statusText: storesResponse.statusText,
        body: errorText,
      });
      throw new Error(`Failed to fetch stores: ${storesResponse.status} ${storesResponse.statusText}`);
    }

    const lambdaResponse = await storesResponse.json();
    console.log('Lambda stores API response:', JSON.stringify(lambdaResponse, null, 2));

    // Parse body if it's a string (Lambda response format)
    let storesData;
    if (typeof lambdaResponse.body === 'string') {
      storesData = JSON.parse(lambdaResponse.body);
    } else {
      storesData = lambdaResponse;
    }

    // Get stores from the response - handle both array and single store formats
    let stores: any[] = [];

    if (storesData.nearest_store) {
      // Single store format from new backend
      stores = [storesData.nearest_store];
    } else if (storesData.top_10_nearest) {
      // Array format
      stores = storesData.top_10_nearest;
    } else if (storesData.all_stores) {
      stores = storesData.all_stores;
    } else if (storesData.stores) {
      stores = storesData.stores;
    }

    console.log('Extracted stores count:', stores.length);
    console.log('First store:', JSON.stringify(stores[0], null, 2));

    // Map Lambda response to our Store interface
    const mappedStores: Store[] = stores.map((store: any) => ({
      store_id: store.id?.toString() || Math.random().toString(),
      store_code: `7ELV-${store.id}`,
      name: store.name || '7-Eleven',
      address: store.address || 'ไม่ระบุที่อยู่',
      latitude: store.lat,
      longitude: store.lon,
      distance_km: store.distance_km || store.distance || 0,
      route_duration_min: store.duration_min,
    }));
    console.log('Mapped stores count:', mappedStores.length);
    console.log('First mapped store:', JSON.stringify(mappedStores[0], null, 2));

    if (mappedStores.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบร้านในพื้นที่ของคุณ' },
        { status: 404 }
      );
    }

    // 2. Calculate actual route distance for each store
    const storesWithRouteDistance = await Promise.all(
      mappedStores.map(async (store) => {
        try {
          // Calculate route using Lambda API
          const routeResponse = await fetch(
            process.env.LAMBDA_CORE_ROUTE_URL || '',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                origin: { lat: store.latitude, lng: store.longitude },
                destination: { lat: latitude, lng: longitude },
              }),
            }
          );

          if (routeResponse.ok) {
            const routeData: RouteResponse = await routeResponse.json();
            return {
              ...store,
              route_distance_km: routeData.distance_km,
              route_duration_min: routeData.duration_min,
            };
          }
        } catch (err) {
          console.error(`Error calculating route for store ${store.store_id}:`, err);
        }

        // Fallback to straight-line distance
        return {
          ...store,
          route_distance_km: store.distance_km,
          route_duration_min: Math.round((store.distance_km / 30) * 60), // Estimate: 30 km/h
        };
      })
    );

    // 3. Sort by actual route distance and get nearest
    storesWithRouteDistance.sort((a, b) => a.route_distance_km - b.route_distance_km);
    const nearestStore = storesWithRouteDistance[0];

    return NextResponse.json({
      success: true,
      store: nearestStore,
      alternatives: storesWithRouteDistance.slice(1, 5), // Show 4 alternatives
    });
  } catch (error) {
    console.error('Error finding nearest store:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการค้นหาร้าน',
      },
      { status: 500 }
    );
  }
}
