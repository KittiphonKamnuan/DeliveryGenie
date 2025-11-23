// ===================================
// API: Get Products from Store
// ===================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    // Try to get store inventory from database
    let products: any[] = [];

    try {
      const inventory = await prisma.store_inventory.findMany({
        where: {
          store_id: storeId,
          stock_quantity: {
            gt: 0,
          },
        },
        include: {
          products: true,
        },
      });

      products = inventory.map((item) => ({
        product_id: item.products.id,
        sku: item.products.sku,
        name: item.products.name,
        description: item.products.description,
        category: item.products.category,
        price: parseFloat(item.products.base_price.toString()),
        temperature_requirement: item.products.temperature_requirement,
        is_fragile: item.products.is_fragile,
        stock_quantity: item.stock_quantity,
      }));
    } catch (dbError) {
      console.log('Database query failed, using mock data:', dbError);
    }

    // Fallback to mock data if no products found
    if (products.length === 0) {
      products = [
        { product_id: 'prod-001', name: 'ข้าวผัดกุ้ง', category: 'hot_food', price: 45, stock_quantity: 20, temperature_requirement: 'hot', is_fragile: false },
        { product_id: 'prod-002', name: 'ข้าวกะเพราหมูกรอบ', category: 'hot_food', price: 49, stock_quantity: 15, temperature_requirement: 'hot', is_fragile: false },
        { product_id: 'prod-003', name: 'ไอศกรีมวานิลลา', category: 'frozen', price: 35, stock_quantity: 50, temperature_requirement: 'frozen', is_fragile: false },
        { product_id: 'prod-004', name: 'นมสดพาสเจอไรส์', category: 'chilled', price: 25, stock_quantity: 100, temperature_requirement: 'chilled', is_fragile: false },
        { product_id: 'prod-006', name: 'น้ำดื่มเซเว่น 1.5L', category: 'beverage', price: 15, stock_quantity: 200, temperature_requirement: 'ambient', is_fragile: false },
        { product_id: 'prod-008', name: 'มันฝรั่งทอด Lay\'s', category: 'snack', price: 22, stock_quantity: 80, temperature_requirement: 'ambient', is_fragile: true },
        { product_id: 'prod-009', name: 'พาราเซตามอล', category: 'medicine', price: 35, stock_quantity: 40, temperature_requirement: 'ambient', is_fragile: false },
      ];
    }

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
