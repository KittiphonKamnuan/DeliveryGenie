'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Package, ArrowLeft } from 'lucide-react';
import { Header, Button, LoadingSpinner } from '@/components';
import Link from 'next/link';

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 1000);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Order Success" subtitle="สั่งซื้อสำเร็จ" />
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" message="กำลังประมวลผล..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Order Success" subtitle="สั่งซื้อสำเร็จ" />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Success Card */}
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            {/* Success Icon */}
            <div className="bg-green-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-16 h-16 text-green-600" />
            </div>

            <h1 className="text-3xl font-bold text-gray-800 mb-2">สั่งซื้อสำเร็จ!</h1>
            <p className="text-gray-600 mb-8">ขอบคุณที่ใช้บริการ DeliveryGenie</p>

            {/* Order Info */}
            <div className="bg-gray-50 rounded-xl p-6 mb-8">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Package className="w-5 h-5 text-seven-green" />
                <h2 className="font-bold text-gray-800">หมายเลขคำสั่งซื้อ</h2>
              </div>
              <p className="text-2xl font-bold text-seven-green mb-2">
                {orderId ? orderId.slice(0, 8).toUpperCase() : 'XXXXXXXX'}
              </p>
              <p className="text-sm text-gray-500">
                คำสั่งซื้อของคุณกำลังอยู่ในระหว่างการประมวลผล
              </p>
            </div>

            {/* Next Steps */}
            <div className="text-left mb-8">
              <h3 className="font-bold text-gray-800 mb-3">ขั้นตอนต่อไป:</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="bg-seven-green text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                    1
                  </div>
                  <p className="text-sm text-gray-700">
                    ระบบจะคำนวณความสำคัญของคำสั่งซื้อของคุณ
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-seven-green text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                    2
                  </div>
                  <p className="text-sm text-gray-700">
                    คำสั่งซื้อจะถูกมอบหมายให้กับคนขับที่เหมาะสม
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-seven-green text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                    3
                  </div>
                  <p className="text-sm text-gray-700">
                    คุณจะได้รับการแจ้งเตือนเมื่อสินค้ากำลังจะถูกจัดส่ง
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-seven-green text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                    4
                  </div>
                  <p className="text-sm text-gray-700">
                    รอรับสินค้าตามเวลาที่กำหนด
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/" className="flex-1">
                <Button variant="secondary" fullWidth>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  กลับหน้าหลัก
                </Button>
              </Link>
              <Link href="/shop" className="flex-1">
                <Button variant="primary" fullWidth>
                  <Package className="w-4 h-4 mr-2" />
                  ช้อปปิ้งต่อ
                </Button>
              </Link>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 mt-6">
            <p className="text-sm text-blue-800">
              💡 <strong>คำแนะนำ:</strong> คุณสามารถติดตามสถานะคำสั่งซื้อได้ในหน้า Dashboard
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <Header title="Order Success" subtitle="สั่งซื้อสำเร็จ" />
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" message="กำลังโหลด..." />
        </div>
      </div>
    }>
      <OrderSuccessContent />
    </Suspense>
  );
}
