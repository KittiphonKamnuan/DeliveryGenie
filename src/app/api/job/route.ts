// app/api/job/route.ts
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const driverId = searchParams.get('driver_id');
  const limit = searchParams.get('limit') || '10';

  if (!token || !driverId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ต้องเรียก path นี้เป๊ะ ๆ ตาม Lambda
  const url = `https://rywh91krwb.execute-api.ap-southeast-1.amazonaws.com/prod/api/jobs?driver_id=${driverId}&limit=${limit}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  const text = await res.text();
  console.log('Jobs API Response:', res.status, text); // ดู error ชัด ๆ

  if (!res.ok) {
    return Response.json({ 
      error: 'Failed to fetch jobs', 
      status: res.status,
      details: text 
    }, { status: 500 });
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { data: [] };
  }

  return Response.json({ success: true, data: data.data || [] });
}