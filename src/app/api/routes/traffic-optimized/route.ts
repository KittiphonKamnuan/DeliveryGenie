// ===================================
// POST /api/routes/traffic-optimized - Traffic-Optimized Routing
// ===================================

import { NextRequest, NextResponse } from 'next/server';
import { HTTP_STATUS } from '@/lib';

interface Store {
  name: string;
  lat: number;
  lon: number;
}

interface TrafficOptimizedRequest {
  stores: Store[];
  start_index: number;
  use_real_api?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: TrafficOptimizedRequest = await request.json();

    // Validate input
    if (!body.stores || !Array.isArray(body.stores) || body.stores.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'At least 2 stores are required',
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Call Lambda function
    const lambdaUrl = process.env.LAMBDA_TRAFFIC_OPTIMIZED_URL;
    if (!lambdaUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'Lambda endpoint not configured',
        },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }

    const lambdaResponse = await fetch(lambdaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!lambdaResponse.ok) {
      const errorData = await lambdaResponse.text();
      console.error('Lambda error:', errorData);
      return NextResponse.json(
        {
          success: false,
          error: 'Traffic-optimized routing failed',
          details: errorData,
        },
        { status: lambdaResponse.status }
      );
    }

    const result = await lambdaResponse.json();

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error('Error optimizing traffic route:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to optimize traffic route',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
