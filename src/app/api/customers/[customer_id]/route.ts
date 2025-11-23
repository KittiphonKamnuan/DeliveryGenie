// ===================================
// API: Get Customer Info
// ===================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { customer_id: string } }
) {
  try {
    const customerId = params.customer_id;

    const customer = await prisma.customers.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Transform data for frontend
    const customerData = {
      customer_id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address_line1: customer.address_line1,
      address_line2: customer.address_line2,
      district: customer.district,
      city: customer.city,
      postal_code: customer.postal_code,
      latitude: customer.latitude ? parseFloat(customer.latitude.toString()) : null,
      longitude: customer.longitude ? parseFloat(customer.longitude.toString()) : null,
      priority_level: customer.priority_level
    };

    return NextResponse.json({
      success: true,
      customer: customerData
    });
  } catch (error) {
    console.error('Error fetching customer info:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch customer info'
      },
      { status: 500 }
    );
  }
}
