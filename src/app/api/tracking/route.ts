// ===================================
// API: GPS Tracking Proxy
// ===================================

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const gpsData = await request.json();

    // Validate required fields
    if (!gpsData.driver_id || !gpsData.lat || !gpsData.lon) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: driver_id, lat, lon' },
        { status: 400 }
      );
    }

    // Forward to Lambda tracking endpoint
    const lambdaUrl = process.env.LAMBDA_TRACKING_URL;

    if (!lambdaUrl) {
      console.warn('LAMBDA_TRACKING_URL not configured, skipping GPS tracking');
      return NextResponse.json({
        success: true,
        message: 'GPS tracking endpoint not configured'
      });
    }

    const response = await fetch(lambdaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(gpsData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lambda tracking error:', errorText);
      throw new Error(`Lambda tracking failed: ${response.status}`);
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error sending GPS tracking data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send GPS tracking data'
      },
      { status: 500 }
    );
  }
}
