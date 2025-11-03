// ===================================
// API: Get Products from Store
// ===================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    // Get store inventory with product details
    const inventory = await prisma.storeInventory.findMany({
      where: {
        store_id: storeId,
        quantity: {
          gt: 0, // Only in-stock items
        },
        ...(category && {
          product: {
            category: category,
          },
        }),
      },
      include: {
        product: true,
      },
    });

    // Transform data for frontend
    const products = inventory.map((item) => ({
      product_id: item.product.id,
      sku: item.product.sku,
      name: item.product.name,
      description: item.product.description,
      category: item.product.category,
      price: item.product.base_price,
      temperature_requirement: item.product.temperature_requirement,
      is_fragile: item.product.is_fragile,
      stock_quantity: item.quantity,
      expiration_date: item.expiration_date,
    }));

    // Group by category
    const categories = [...new Set(products.map((p) => p.category))];
    const groupedProducts = categories.reduce((acc, cat) => {
      acc[cat] = products.filter((p) => p.category === cat);
      return acc;
    }, {} as Record<string, typeof products>);

    return NextResponse.json({
      success: true,
      store_id: storeId,
      total_products: products.length,
      categories,
      products: category ? products : groupedProducts,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการดึงข้อมูลสินค้า',
      },
      { status: 500 }
    );
  }
}
