import { NextRequest, NextResponse } from 'next/server';

// Interface สำหรับข้อมูลที่ Frontend จะนำไปใช้
interface FrontendStore {
  store_id: string;    // ใช้สำหรับ key ใน React
  store_code: string;  // รหัสร้านสาขา (มาจาก id ของ Lambda)
  name: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  route_duration_min: number;
}

export async function POST(request: NextRequest) {
  try {
    // 1. รับค่าจาก Frontend
    const { latitude, longitude } = await request.json();

    if (!latitude || !longitude) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุพิกัดของคุณ' },
        { status: 400 }
      );
    }

    // 2. เรียก Lambda API
    // หมายเหตุ: ส่ง key เป็น 'latitude', 'longitude' ตามที่ Logs ของคุณแสดง
    const lambdaUrl = process.env.LAMBDA_NEARBY_7_URL || 'https://rywh91krwb.execute-api.ap-southeast-1.amazonaws.com/prod/nearby7';
    
    const storesResponse = await fetch(lambdaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latitude: latitude,
        longitude: longitude
      }),
    });

    if (!storesResponse.ok) {
      throw new Error(`Lambda API error: ${storesResponse.status}`);
    }

    const lambdaResponse = await storesResponse.json();

    // 3. แปลงข้อมูล body (Lambda มักส่ง body เป็น string ซ้อนมา)
    let bodyData;
    if (typeof lambdaResponse.body === 'string') {
      bodyData = JSON.parse(lambdaResponse.body);
    } else {
      bodyData = lambdaResponse;
    }

    // 4. ตรวจสอบว่าเจอร้านหรือไม่
    // จาก Logs: Lambda ส่งกลับมาเป็น object เดียวชื่อ "nearest_store"
    if (!bodyData.nearest_store) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบร้านในพื้นที่ของคุณ' },
        { status: 404 }
      );
    }

    const rawStore = bodyData.nearest_store;

    // 5. Map ข้อมูลให้ตรงกับ Frontend Interface
    // *** จุดแก้ไขสำคัญ: id จาก Lambda คือ store_code ***
    const mappedStore: FrontendStore = {
      store_id: rawStore.id,       // ใช้ค่านี้เป็น ID อ้างอิง
      store_code: rawStore.id,     // ใช้ค่านี้เป็น รหัสสาขา (เช่น 3311245008)
      name: rawStore.name,
      latitude: rawStore.lat,
      longitude: rawStore.lon,
      distance_km: rawStore.distance_km,
      // Lambda คำนวณเวลามาให้แล้ว (2.3 นาที) ไม่ต้องคำนวณซ้ำ
      route_duration_min: rawStore.duration_min 
    };

    console.log('Matched Store Code:', mappedStore.store_code);

    return NextResponse.json({
      success: true,
      store: mappedStore,
      alternatives: [], // ตอนนี้ Lambda ส่งมาแค่ร้านเดียว
      metadata: bodyData.metadata
    });

  } catch (error) {
    console.error('Error finding nearest store:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'เกิดข้อผิดพลาดในการเชื่อมต่อกับระบบค้นหา',
      },
      { status: 500 }
    );
  }
}