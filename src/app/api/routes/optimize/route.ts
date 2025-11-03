// ===================================
// POST /api/routes/optimize - Core Route Optimization
// ===================================

import { NextRequest, NextResponse } from 'next/server';
import { HTTP_STATUS } from '@/lib';

interface Store {
  name: string;
  lat: number;
  lon: number;
}

interface OptimizeRouteRequest {
  stores: Store[];
  start_index: number;
  end_index: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: OptimizeRouteRequest = await request.json();

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
    const lambdaUrl = process.env.LAMBDA_CORE_ROUTE_URL;
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
          error: 'Route optimization failed',
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
    console.error('Error optimizing route:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to optimize route',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
