import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // ตรวจสอบ path นี้ให้ถูกต้อง
import { Prisma } from '@prisma/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    console.log(`🔍 Fetching products for Store ID: ${storeId}`);

    if (!storeId) {
      return NextResponse.json({ success: false, error: 'Store ID is required' }, { status: 400 });
    }

    // 1. ตรวจสอบว่าร้านค้ามีอยู่จริงหรือไม่
    const store = await prisma.stores.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      console.log('❌ Store not found');
      return NextResponse.json({ success: false, error: 'Store not found' }, { status: 404 });
    }

    // 2. สร้างเงื่อนไขการค้นหา (Where Condition)
    // แก้ไข: ลบเงื่อนไข stock_quantity: { gt: 0 } ออกชั่วคราวเพื่อให้เห็นของที่ Stock 0 ด้วย
    const whereCondition: any = {
      store_id: storeId,
      // stock_quantity: { gt: 0 }, // <--- Comment บรรทัดนี้ออกถ้าอยากเห็นของที่หมด stock
    };

    // ถ้ามีการระบุ Category มา ให้กรองที่ตัว Product ที่ Associate อยู่
    if (category) {
      whereCondition.products = {
        category: category
      };
    }

    // 3. ดึงข้อมูล Inventory
    // *** สำคัญ: ตรวจสอบชื่อ Model ใน prisma ว่าเป็น store_inventory หรือ store_inventories ***
    // ส่วนใหญ่ Prisma จะใช้ชื่อตาม Table ใน DB (มักเป็นพหูพจน์) หรือตามที่ map ไว้
    // ลองเปลี่ยนเป็น prisma.store_inventories (เติม s) หาก prisma.store_inventory ใช้ไม่ได้
    
    // @ts-ignore (ใช้ ignore เผื่อชื่อ model ไม่ตรง แต่ runtime อาจจะผ่านถ้า db ตรง)
    const inventory = await prisma.store_inventories.findMany({
      where: whereCondition,
      include: {
        products: true, // Join ไปตาราง Products
      },
    });

    console.log(`📦 Found ${inventory.length} inventory items`);

    // 4. แปลงข้อมูล (Mapping)
    const products = inventory.map((item: any) => {
      // ป้องกันกรณี item.products เป็น null (Data integrity issue)
      if (!item.products) return null;

      return {
        inventory_id: item.id, // ID ของรายการใน Stock
        product_id: item.products.id,
        sku: item.products.sku,
        name: item.products.name,
        description: item.products.description,
        category: item.products.category,
        image_url: item.products.image_url || null,
        price: item.products.base_price ? Number(item.products.base_price) : 0,
        stock_quantity: item.quantity,
      };
    }).filter(Boolean); // กรองค่า null ออก

    // 5. จัดกลุ่ม (Grouping)
    let responseData;
    const categories = [...new Set(products.map((p: any) => p.category))];

    if (category) {
      responseData = products;
    } else {
      const groupedProducts = categories.reduce((acc: any, cat: any) => {
        acc[cat] = products.filter((p: any) => p.category === cat);
        return acc;
      }, {});
      responseData = groupedProducts;
    }

    return NextResponse.json({
      success: true,
      store_id: storeId,
      total_products: products.length,
      categories,
      data: responseData,
    });

  } catch (error) {
    console.error('❌ Error fetching products:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal Server Error',
        debug_info: error // ส่ง error กลับไปดูใน postman เพื่อ debug ง่ายขึ้น
      },
      { status: 500 }
    );
  }
}
