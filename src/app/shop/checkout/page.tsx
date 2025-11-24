'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { CreditCard, MapPin, User, Phone, Mail, Calendar, Clock, AlertCircle, Store as StoreIcon } from 'lucide-react';
import { Header, Button, LoadingSpinner, OrderStatusTracker } from '@/components';
import { useCart } from '@/contexts/CartContext';
// ใช้ any ชั่วคราวเพื่อความยืดหยุ่น หรือแก้ type Store ให้มีทั้ง id และ store_id
import type { Store } from '@/types/shopping';

// 💡 Endpoint API (แนะนำให้ย้ายไปใส่ .env ในอนาคต)
const CREATE_ORDER_API_ENDPOINT = 'https://rywh91krwb.execute-api.ap-southeast-1.amazonaws.com/prod/order';

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { cart, clearCart, setStore: setCartStore } = useCart();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [findingStore, setFindingStore] = useState(true);
  // ใช้ any เพื่อรองรับทั้ง id และ store_id โดยไม่แดง
  const [nearestStore, setNearestStore] = useState<any>(null); 
  const [userCoordinates, setUserCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  
  // Get customer_id safely
  const [customerId, setCustomerId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    delivery_address: '',
    delivery_notes: '',
    delivery_date: new Date().toISOString().split('T')[0],
    delivery_time: '14:00',
  });

  // 1. Initialize Data & Check Cart
  useEffect(() => {
    // Check Cart
    if (cart.items.length === 0) {
      router.push('/shop');
      return;
    }

    // Set Customer ID
    if (session?.user?.customer_id) {
      setCustomerId(session.user.customer_id);
    } else if (typeof window !== 'undefined') {
      const localId = localStorage.getItem('customer_id');
      if (localId) setCustomerId(localId);
    }

    // Start finding store
    findNearestStore();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]); // Run when session loads

  // 2. Fetch Customer Data
  useEffect(() => {
    const fetchCustomerData = async () => {
      if (!customerId) {
        // ถ้าไม่มี ID ให้ใช้ข้อมูลจาก Session (ถ้ามี)
        if (session?.user) {
          setFormData(prev => ({
            ...prev,
            customer_name: session.user.name || '',
            customer_email: session.user.email || '',
            // cast type เพื่อเลี่ยง error
            customer_phone: (session.user as any).phone || (session.user as any).customer_phone || '', 
          }));
        }
        return;
      }

      try {
        const response = await fetch(`/api/customers/${customerId}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.customer) {
            const c = result.customer;
            setFormData(prev => ({
              ...prev,
              customer_name: c.name || '',
              customer_phone: c.phone || '',
              customer_email: c.email || '',
              delivery_address: c.address_line1 
                ? `${c.address_line1} ${c.address_line2 || ''} ${c.district || ''} ${c.city || ''} ${c.postal_code || ''}` 
                : '',
            }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch customer data:', err);
      }
    };

    fetchCustomerData();
  }, [customerId, session]);

  // 3. Find Store Logic (Fixed)
  const findNearestStore = async () => {
    setFindingStore(true);
    setError(null);

    try {
      // 3.1 Get Location
      let lat = 13.7563; // Default Bangkok
      let lon = 100.5018;

      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        lat = position.coords.latitude;
        lon = position.coords.longitude;
      } catch (geoError) {
        console.warn("Geolocation failed, using default:", geoError);
        // ไม่ throw error แต่ใช้ค่า default แทน เพื่อให้ไปต่อได้
      }

      setUserCoordinates({ latitude: lat, longitude: lon });

      // 3.2 Call API
      console.log(`Searching store near: ${lat}, ${lon}`);
      const response = await fetch('/api/stores/nearest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lon }),
      });

      const result = await response.json();

      if (result.success && result.store) {
        // 🔥 FIX: Handle Array or Object response
        const storeData = Array.isArray(result.store) ? result.store[0] : result.store;
        
        // 🔥 FIX: Normalize ID (some APIs return 'id', some 'store_id')
        const finalStore = {
            ...storeData,
            id: storeData.id || storeData.store_id // Ensure we have an 'id' property
        };

        console.log("Store Found:", finalStore);
        setNearestStore(finalStore);
        setCartStore(finalStore); // Update Context
      } else {
        throw new Error(result.error || 'ไม่พบร้าน 7-11 ในพื้นที่ให้บริการ');
      }

    } catch (err) {
      console.error("Find Store Error:", err);
      setError('เกิดข้อผิดพลาดในการค้นหาร้านค้า หรืออยู่นอกพื้นที่ให้บริการ');
    } finally {
      setFindingStore(false);
    }
  };

  // 4. Submit Logic
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validation
      if (!formData.customer_name || !formData.customer_phone || !formData.delivery_address) {
        throw new Error('กรุณากรอก ชื่อ, เบอร์โทร และที่อยู่จัดส่ง ให้ครบถ้วน');
      }

      if (!nearestStore || !nearestStore.id) {
        throw new Error('ไม่พบข้อมูลร้านค้าต้นทาง กรุณารีเฟรชหน้าจอ');
      }

      // Prepare Dates
      const deliveryDateTime = new Date(`${formData.delivery_date}T${formData.delivery_time}`);
      
      // Payload Construction
      const payload = {
        // Use specific fields
        store_id: nearestStore.id, // Sure to exist now
        customer_id: customerId || undefined,
        
        // Customer Info
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        customer_email: formData.customer_email,
        
        // Delivery Info
        delivery_address: formData.delivery_address,
        delivery_latitude: userCoordinates?.latitude || 0,
        delivery_longitude: userCoordinates?.longitude || 0,
        delivery_notes: formData.delivery_notes,
        
        // Time
        delivery_date: deliveryDateTime.toISOString(),
        delivery_window_start: new Date(deliveryDateTime.getTime() - 30*60000).toISOString(),
        delivery_window_end: new Date(deliveryDateTime.getTime() + 30*60000).toISOString(),
        
        // Items & Totals
        items: cart.items.map(item => ({
          product_id: item.product.product_id || item.product_id, // Handle varying ID names
          quantity: item.quantity,
          unit_price: item.product.price
        })),
        subtotal: cart.subtotal,
        tax: cart.tax,
        shipping_fee: cart.shipping_fee,
        total_amount: cart.total,
        
        // Status
        order_status: "pending",
        payment_status: "pending"
      };

      console.log("Submitting Order:", payload);

      // Send Request
      const response = await fetch(CREATE_ORDER_API_ENDPOINT, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message || 'ไม่สามารถสร้างคำสั่งซื้อได้');
      }

      // Success
      console.log("Order Created:", result);
      
      // Save guest customer_id if returned
      if (result.order?.customer_id && !customerId) {
        localStorage.setItem('customer_id', result.order.customer_id);
      }

      clearCart();
      // Redirect using the ID from response
      const orderId = result.order?.order_id || result.order_id || result.id;
      router.push(`/shop/order-success?order_id=${orderId}`);

    } catch (err) {
      console.error("Submit Error:", err);
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
    } finally {
      setLoading(false);
    }
  };

  // --- Render ---

  if (findingStore) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Checkout" subtitle="กำลังประมวลผล" />
        <div className="container mx-auto px-4 py-20 flex flex-col items-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 animate-pulse">กำลังค้นหาร้าน 7-ELEVEN ที่ใกล้ที่สุด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Checkout" subtitle="ชำระเงิน" />

      <div className="container mx-auto px-4 py-6">
        
        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div className="flex-1">
                <h3 className="text-red-800 font-bold">เกิดข้อผิดพลาด</h3>
                <p className="text-red-700 text-sm">{error}</p>
                {!nearestStore && (
                    <Button size="sm" onClick={findNearestStore} className="mt-2 bg-red-600 hover:bg-red-700 text-white">
                        ลองค้นหาใหม่
                    </Button>
                )}
            </div>
          </div>
        )}

        {/* Store Info */}
        {nearestStore && (
          <div className="bg-white rounded-xl shadow-sm border border-green-100 p-4 mb-6 flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-full">
                <StoreIcon className="w-6 h-6 text-seven-green" />
            </div>
            <div>
                <p className="text-sm text-gray-500">จัดส่งจากสาขา</p>
                <h3 className="font-bold text-gray-800">{nearestStore.name}</h3>
                <p className="text-xs text-gray-500 truncate max-w-md">{nearestStore.address}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Forms */}
            <div className="lg:col-span-2 space-y-6">
                {/* Customer Form */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-800">
                        <User className="w-5 h-5 text-seven-green"/> ข้อมูลผู้ติดต่อ
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล *</label>
                            <input type="text" required className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
                                value={formData.customer_name} onChange={e => setFormData({...formData, customer_name: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์ *</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"/>
                                    <input type="tel" required className="w-full border rounded-lg pl-10 pr-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
                                        value={formData.customer_phone} onChange={e => setFormData({...formData, customer_phone: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"/>
                                    <input type="email" className="w-full border rounded-lg pl-10 pr-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
                                        value={formData.customer_email} onChange={e => setFormData({...formData, customer_email: e.target.value})} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Delivery Form */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-800">
                        <MapPin className="w-5 h-5 text-seven-green"/> ข้อมูลการจัดส่ง
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ที่อยู่จัดส่ง *</label>
                            <textarea required rows={3} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
                                value={formData.delivery_address} onChange={e => setFormData({...formData, delivery_address: e.target.value})} 
                                placeholder="บ้านเลขที่, ซอย, ถนน, แขวง/ตำบล, เขต/อำเภอ" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">จุดสังเกต / หมายเหตุ</label>
                            <input type="text" className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
                                value={formData.delivery_notes} onChange={e => setFormData({...formData, delivery_notes: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">วันที่ *</label>
                                <input type="date" required className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
                                    value={formData.delivery_date} min={new Date().toISOString().split('T')[0]}
                                    onChange={e => setFormData({...formData, delivery_date: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">เวลา *</label>
                                <input type="time" required className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
                                    value={formData.delivery_time} onChange={e => setFormData({...formData, delivery_time: e.target.value})} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Summary */}
            <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-sm p-6 sticky top-4">
                    <h3 className="font-bold text-lg mb-4 border-b pb-2">สรุปรายการ</h3>
                    <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-1">
                        {cart.items.map((item) => (
                            <div key={item.product.product_id || item.product_id} className="flex justify-between text-sm">
                                <span className="text-gray-600 flex-1">{item.product.name} <span className="text-gray-400">x{item.quantity}</span></span>
                                <span className="font-medium text-gray-800">฿{(item.product.price * item.quantity).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                    
                    <div className="space-y-2 border-t pt-4 text-sm">
                        <div className="flex justify-between text-gray-500"><span>ค่าสินค้า</span><span>฿{cart.subtotal.toFixed(2)}</span></div>
                        <div className="flex justify-between text-gray-500"><span>ค่าจัดส่ง</span><span>฿{cart.shipping_fee.toFixed(2)}</span></div>
                        <div className="flex justify-between text-xl font-bold text-seven-green pt-2 border-t mt-2">
                            <span>ยอดรวมสุทธิ</span>
                            <span>฿{cart.total.toFixed(2)}</span>
                        </div>
                    </div>

                    <Button 
                        type="submit" 
                        fullWidth 
                        variant="primary" 
                        className="mt-6 py-3 text-lg shadow-lg shadow-green-200"
                        disabled={loading || !nearestStore}
                    >
                        {loading ? <LoadingSpinner size="sm" /> : <><CreditCard className="w-5 h-5 mr-2"/> ยืนยันคำสั่งซื้อ</>}
                    </Button>
                </div>
            </div>
        </form>
      </div>
      
      <OrderStatusTracker customerId={customerId || undefined} />
    </div>
  );
}