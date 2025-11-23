// ===================================
// API: Customer Registration
// ===================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      phone,
      email,
      password,
      address_line1,
      address_line2,
      district,
      city,
      postal_code,
    } = body;

    // Validate required fields
    if (!name || !phone || !password || !address_line1 || !district || !city) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }

    // Check if phone already exists in customers table
    const existingCustomer = await prisma.customers.findUnique({
      where: { phone },
    });

    if (existingCustomer) {
      return NextResponse.json(
        { success: false, error: 'เบอร์โทรศัพท์นี้ถูกใช้งานแล้ว' },
        { status: 400 }
      );
    }

    // Check if phone already exists in users table
    const existingUser = await prisma.users.findFirst({
      where: {
        email: phone, // We use phone as email for customers
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'เบอร์โทรศัพท์นี้ถูกใช้งานแล้ว' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Get coordinates from address (mock for now - you can integrate Google Maps Geocoding API)
    const latitude = 13.7563; // Bangkok default
    const longitude = 100.5018;

    // Create customer in customers table
    const customer = await prisma.customers.create({
      data: {
        id: randomUUID(),
        name,
        phone,
        email: email || null,
        address_line1,
        address_line2: address_line2 || null,
        district,
        city,
        postal_code: postal_code || null,
        latitude,
        longitude,
        priority_level: 'standard',
        updated_at: new Date(),
      },
    });

    // Create user account for authentication (using phone as email)
    await prisma.users.create({
      data: {
        id: randomUUID(),
        name,
        email: phone, // Use phone as unique identifier
        password: hashedPassword,
        role: 'customer',
        isActive: true,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'สมัครสมาชิกสำเร็จ',
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
      },
    });
  } catch (error) {
    console.error('Customer registration error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการสมัครสมาชิก',
      },
      { status: 500 }
    );
  }
}
