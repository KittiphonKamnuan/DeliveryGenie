// ===================================
// API: Complete Delivery Proxy
// ===================================

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const completionData = await request.json();

    // Validate required fields
    if (!completionData.delivery_id) {
      return NextResponse.json(
        { success: false, error: 'Missing delivery_id' },
        { status: 400 }
      );
    }

    // Forward to Lambda completion endpoint
    const lambdaUrl = process.env.LAMBDA_COMPLETE_URL;

    if (!lambdaUrl) {
      return NextResponse.json(
        { success: false, error: 'Completion endpoint not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(lambdaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(completionData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lambda completion error:', errorText);
      throw new Error(`Delivery completion failed: ${response.status}`);
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error completing delivery:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete delivery'
      },
      { status: 500 }
    );
  }
}
