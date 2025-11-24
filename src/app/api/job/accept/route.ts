// app/api/jobs/accept/route.ts
import { NextRequest } from 'next/server';

const ASSIGN_API_URL = process.env.ASSIGN_API_URL;

export async function POST(request: NextRequest) {
  if (!ASSIGN_API_URL) {
    return Response.json({ success: false, error: 'ASSIGN_API_URL not configured' }, { status: 500 });
  }

  const body = await request.json();
  const { driver_id, order_id } = body;

  if (!driver_id || !order_id) {
    return Response.json({ success: false, error: 'Missing driver_id or order_id' }, { status: 400 });
  }

  try {
    const res = await fetch(ASSIGN_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id, driver_id }),
    });

    const data = await res.json();

    if (!res.ok) {
      return Response.json({ success: false, error: data.error || 'Assignment failed' }, { status: res.status });
    }

    return Response.json({ success: true, ...data });
  } catch (error: any) {
    console.error('Accept Job Error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}