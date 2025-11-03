// ===================================
// API: Get All Products
// ===================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Get all active products
    const products = await prisma.products.findMany({
      where: {
        is_active: true,
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    });

    // Group by category
    const groupedProducts = products.reduce((acc, product) => {
      const category = product.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push({
        product_id: product.id,
        name: product.name,
        category: product.category,
        price: product.base_price,
        temperature_requirement: product.temperature_requirement,
        is_fragile: product.is_fragile,
        stock_quantity: 100, // Default stock for display (will check actual store inventory at checkout)
      });
      return acc;
    }, {} as Record<string, any[]>);

    return NextResponse.json({
      success: true,
      products: groupedProducts,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch products',
      },
      { status: 500 }
    );
  }
}
