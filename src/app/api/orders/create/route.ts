// ===================================
// API: Create Order
// ===================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

interface CreateOrderRequest {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  delivery_address: string;
  delivery_latitude: number;
  delivery_longitude: number;
  delivery_notes?: string;
  delivery_date: string;
  delivery_window_start: string;
  delivery_window_end: string;
  items: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
  }>;
  subtotal: number;
  tax: number;
  shipping_fee: number;
  total_amount: number;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'กรุณาเข้าสู่ระบบก่อนสั่งซื้อ' },
        { status: 401 }
      );
    }

    const data: CreateOrderRequest = await request.json();

    // Validate required fields
    if (!data.customer_name || !data.customer_phone || !data.delivery_address) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }

    if (!data.items || data.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ไม่มีสินค้าในตะกร้า' },
        { status: 400 }
      );
    }

    // Create or get customer
    let customer = await prisma.customers.findUnique({
      where: { phone: data.customer_phone },
    });

    if (!customer) {
      customer = await prisma.customers.create({
        data: {
          name: data.customer_name,
          phone: data.customer_phone,
          email: data.customer_email,
          address_line1: data.delivery_address,
          district: 'Unknown', // TODO: Parse from address
          city: 'Bangkok', // TODO: Parse from address
          latitude: data.delivery_latitude,
          longitude: data.delivery_longitude,
          delivery_notes: data.delivery_notes,
          priority_level: 'standard',
        },
      });
    }

    // Generate order number
    const orderCount = await prisma.orders.count();
    const orderNumber = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(orderCount + 1).padStart(4, '0')}`;

    // Create order
    const order = await prisma.orders.create({
      data: {
        order_number: orderNumber,
        customer_id: customer.id,
        order_date: new Date(),
        delivery_date: new Date(data.delivery_date),
        delivery_window_start: new Date(data.delivery_window_start),
        delivery_window_end: new Date(data.delivery_window_end),
        customer_priority: 'standard',
        order_status: 'pending',
        delivery_address: data.delivery_address,
        delivery_latitude: data.delivery_latitude,
        delivery_longitude: data.delivery_longitude,
        delivery_notes: data.delivery_notes,
        subtotal: data.subtotal,
        tax: data.tax,
        shipping_fee: data.shipping_fee,
        total_amount: data.total_amount,
        order_items: {
          create: data.items.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.unit_price * item.quantity,
            expiration_datetime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
          })),
        },
      },
      include: {
        order_items: {
          include: {
            products: true,
          },
        },
      },
    });

    // Calculate priority (call priority API)
    try {
      await fetch(`${request.nextUrl.origin}/api/orders/calculate-priority`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id }),
      });
    } catch (err) {
      console.error('Error calculating priority:', err);
    }

    return NextResponse.json({
      success: true,
      order: {
        order_id: order.id,
        order_number: order.order_number,
        total_amount: order.total_amount,
        order_status: order.order_status,
      },
      message: 'สร้างคำสั่งซื้อสำเร็จ',
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการสร้างคำสั่งซื้อ',
      },
      { status: 500 }
    );
  }
}
