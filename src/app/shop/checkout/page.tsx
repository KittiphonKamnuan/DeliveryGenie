'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { CreditCard, MapPin, User, Phone, Mail, Calendar, Clock, AlertCircle, Store as StoreIcon } from 'lucide-react';
import { Header, Button, LoadingSpinner, OrderStatusTracker } from '@/components';
import { useCart } from '@/contexts/CartContext';
import type { Store } from '@/types/shopping';

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { cart, clearCart, setStore: setCartStore } = useCart();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [findingStore, setFindingStore] = useState(true);
  const [nearestStore, setNearestStore] = useState<Store | null>(null);
  const [userCoordinates, setUserCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [customerData, setCustomerData] = useState<any>(null);

  // Get customer_id from session or localStorage (for backward compatibility)
  const customerId = session?.user?.customer_id || (typeof window !== 'undefined' ? localStorage.getItem('customer_id') : null);

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    delivery_address: '',
    delivery_notes: '',
    delivery_date: new Date().toISOString().split('T')[0],
    delivery_time: '14:00',
  });

  // Fetch customer data if logged in
  useEffect(() => {
    const fetchCustomerData = async () => {
      if (customerId) {
        try {
          const response = await fetch(`/api/customers/${customerId}`);
          const result = await response.json();
          if (result.success) {
            setCustomerData(result.customer);
            // Pre-fill form with customer data
            setFormData(prev => ({
              ...prev,
              customer_name: result.customer.name || '',
              customer_phone: result.customer.phone || '',
              customer_email: result.customer.email || '',
              delivery_address: result.customer.address_line1
                ? `${result.customer.address_line1}${result.customer.address_line2 ? ', ' + result.customer.address_line2 : ''}, ${result.customer.district}, ${result.customer.city}${result.customer.postal_code ? ' ' + result.customer.postal_code : ''}`
                : '',
            }));
          }
        } catch (err) {
          console.error('Failed to fetch customer data:', err);
        }
      } else if (session?.user) {
        // If logged in but no customer_id yet, use session data
        setFormData(prev => ({
          ...prev,
          customer_name: session.user.name || '',
          customer_email: session.user.email || '',
          customer_phone: session.user.customer_phone || '',
        }));
      }
    };

    fetchCustomerData();
  }, [customerId, session]);

  useEffect(() => {
    if (cart.items.length === 0) {
      router.push('/shop');
      return;
    }
    findNearestStore();
  }, []);

  const findNearestStore = async () => {
    setFindingStore(true);
    setError(null);

    try {
      // Get user's current location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('เบราว์เซอร์ของคุณไม่รองรับ Geolocation'));
          return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = position.coords;
      setUserCoordinates({ latitude, longitude });

      // Find nearest 7-11 store
      const response = await fetch('/api/stores/nearest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude }),
      });

      const result = await response.json();

      if (result.success) {
        setNearestStore(result.store);
        setCartStore(result.store);
      } else {
        throw new Error(result.error || 'ไม่พบร้าน 7-11 ใกล้เคียง');
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'ไม่สามารถระบุตำแหน่งของคุณได้ กรุณาอนุญาตการเข้าถึงตำแหน่ง'
      );
    } finally {
      setFindingStore(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate
      if (!formData.customer_name || !formData.customer_phone || !formData.delivery_address) {
        throw new Error('กรุณากรอกข้อมูลให้ครบถ้วน');
      }

      if (cart.items.length === 0) {
        throw new Error('ไม่มีสินค้าในตะกร้า');
      }

      if (!nearestStore) {
        throw new Error('ไม่พบข้อมูลร้าน กรุณาลองใหม่อีกครั้ง');
      }

      if (!userCoordinates) {
        throw new Error('ไม่พบข้อมูลตำแหน่งของคุณ');
      }

      const deliveryDateTime = new Date(`${formData.delivery_date}T${formData.delivery_time}`);
      const deliveryWindowStart = new Date(deliveryDateTime.getTime() - 30 * 60000); // -30 min
      const deliveryWindowEnd = new Date(deliveryDateTime.getTime() + 30 * 60000); // +30 min

      // Create order with customer_id from session if available
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId || undefined, // Use session customer_id if available
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone,
          customer_email: formData.customer_email,
          delivery_address: formData.delivery_address,
          delivery_latitude: userCoordinates.latitude,
          delivery_longitude: userCoordinates.longitude,
          delivery_notes: formData.delivery_notes,
          delivery_date: deliveryDateTime.toISOString(),
          delivery_window_start: deliveryWindowStart.toISOString(),
          delivery_window_end: deliveryWindowEnd.toISOString(),
          items: cart.items.map((item) => ({
            product_id: item.product.product_id,
            quantity: item.quantity,
            unit_price: item.product.price,
          })),
          subtotal: cart.subtotal,
          tax: cart.tax,
          shipping_fee: cart.shipping_fee,
          total_amount: cart.total,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      // Save customer ID for order tracking (backward compatibility for guests)
      if (result.order.customer_id && !session?.user?.customer_id) {
        localStorage.setItem('customer_id', result.order.customer_id);
      }

      // Clear cart and redirect to success page
      clearCart();
      router.push(`/shop/order-success?order_id=${result.order.order_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการสร้างคำสั่งซื้อ');
    } finally {
      setLoading(false);
    }
  };

  // Loading state - Finding nearest 7-11
  if (findingStore) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Checkout" subtitle="ชำระเงิน" />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-md mx-auto bg-white rounded-xl shadow-md p-8 text-center">
            <div className="mb-6">
              <LoadingSpinner size="lg" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">กำลังหา 7-11 ใกล้ฉัน...</h2>
            <p className="text-gray-600">
              กรุณารอสักครู่ เรากำลังค้นหาร้าน 7-ELEVEN ที่ใกล้คุณที่สุด
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state - Failed to find store
  if (error && !nearestStore) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Checkout" subtitle="ชำระเงิน" />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-md mx-auto bg-red-50 border-l-4 border-red-500 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-red-800 mb-2">ไม่สามารถหาร้านได้</h3>
                <p className="text-red-700 mb-4">{error}</p>
                <div className="flex gap-2">
                  <Button onClick={findNearestStore} variant="primary">
                    ลองอีกครั้ง
                  </Button>
                  <Button onClick={() => router.push('/shop')} variant="secondary">
                    กลับไปช้อปสินค้า
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Checkout" subtitle="ชำระเงิน" />

      <div className="container mx-auto px-4 py-6">
        {/* Store Info */}
        {nearestStore && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6 max-w-4xl mx-auto">
            <div className="flex items-start gap-4">
              <div className="bg-seven-green/10 p-3 rounded-lg">
                <StoreIcon className="w-6 h-6 text-seven-green" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-gray-800">จัดส่งจากร้าน</h3>
                <p className="text-gray-700 font-medium mt-1">{nearestStore.name}</p>
                <p className="text-sm text-gray-600 mt-1">{nearestStore.address}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-sm text-gray-500">
                    📍 {nearestStore.route_distance_km?.toFixed(1) || nearestStore.distance_km.toFixed(1)} km
                  </span>
                  <span className="text-sm text-gray-500">
                    🕒 {nearestStore.route_duration_min || Math.round((nearestStore.distance_km / 30) * 60)} นาที
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Section */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Information */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  ข้อมูลผู้สั่งซื้อ
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ชื่อ-นามสกุล *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-seven-green focus:border-transparent outline-none"
                      placeholder="กรอกชื่อ-นามสกุล"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        เบอร์โทรศัพท์ *
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="tel"
                          required
                          value={formData.customer_phone}
                          onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-seven-green focus:border-transparent outline-none"
                          placeholder="0XX-XXX-XXXX"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        อีเมล
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="email"
                          value={formData.customer_email}
                          onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-seven-green focus:border-transparent outline-none"
                          placeholder="email@example.com"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Information */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  ข้อมูลการจัดส่ง
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ที่อยู่จัดส่ง *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={formData.delivery_address}
                      onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-seven-green focus:border-transparent outline-none"
                      placeholder="กรอกที่อยู่สำหรับจัดส่ง"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      หมายเหตุการจัดส่ง
                    </label>
                    <input
                      type="text"
                      value={formData.delivery_notes}
                      onChange={(e) => setFormData({ ...formData, delivery_notes: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-seven-green focus:border-transparent outline-none"
                      placeholder="เช่น อาคาร ชั้น ห้อง"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        วันที่ต้องการรับ *
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="date"
                          required
                          value={formData.delivery_date}
                          onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-seven-green focus:border-transparent outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        เวลาที่ต้องการรับ *
                      </label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="time"
                          required
                          value={formData.delivery_time}
                          onChange={(e) => setFormData({ ...formData, delivery_time: e.target.value })}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-seven-green focus:border-transparent outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-md p-6 sticky top-6">
                <h3 className="font-bold text-xl mb-4">สรุปคำสั่งซื้อ</h3>

                {/* Items */}
                <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                  {cart.items.map((item) => (
                    <div key={item.product.product_id} className="flex justify-between text-sm">
                      <span className="text-gray-700">
                        {item.product.name} x{item.quantity}
                      </span>
                      <span className="font-medium">
                        ฿{(item.product.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-200 pt-4 space-y-2 mb-6">
                  <div className="flex justify-between text-gray-700">
                    <span>ยอดรวมสินค้า</span>
                    <span>฿{cart.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>ภาษี</span>
                    <span>฿{cart.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>ค่าจัดส่ง</span>
                    <span>฿{cart.shipping_fee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold text-seven-green pt-2 border-t border-gray-200">
                    <span>ยอดรวมทั้งหมด</span>
                    <span>฿{cart.total.toFixed(2)}</span>
                  </div>
                </div>

                <Button type="submit" fullWidth variant="primary" disabled={loading}>
                  {loading ? (
                    <>
                      <LoadingSpinner size="sm" />
                      กำลังสร้างคำสั่งซื้อ...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      ยืนยันการสั่งซื้อ
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Order Status Tracker */}
      <OrderStatusTracker customerId={customerId || undefined} />
    </div>
  );
}
