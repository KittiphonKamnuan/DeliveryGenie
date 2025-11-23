'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';
import { Header, Button, OrderStatusTracker } from '@/components';
import { useCart } from '@/contexts/CartContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CartPage() {
  const [customerId, setCustomerId] = useState<string | null>(null);

  useEffect(() => {
    const storedCustomerId = localStorage.getItem('customer_id');
    if (storedCustomerId) {
      setCustomerId(storedCustomerId);
    }
  }, []);
  const router = useRouter();
  const { cart, updateQuantity, removeFromCart } = useCart();

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Shopping Cart" subtitle="ตะกร้าสินค้า" />

        <div className="container mx-auto px-4 py-20">
          <div className="max-w-md mx-auto text-center">
            <ShoppingCart className="w-24 h-24 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">ตะกร้าสินค้าว่างเปล่า</h2>
            <p className="text-gray-600 mb-6">คุณยังไม่มีสินค้าในตะกร้า</p>
            <Link href="/shop">
              <Button variant="primary">
                <ArrowLeft className="w-4 h-4 mr-2" />
                เริ่มช้อปปิ้ง
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Shopping Cart" subtitle="ตะกร้าสินค้า" />

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {/* Store Info */}
            {cart.store && (
              <div className="bg-seven-green text-white rounded-xl p-4">
                <h3 className="font-bold mb-1">📍 รับสินค้าจาก</h3>
                <p className="text-sm">{cart.store.name}</p>
                <p className="text-xs text-green-100 mt-1">{cart.store.address}</p>
              </div>
            )}

            {/* Cart Items List */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-seven-green to-green-600 px-6 py-4">
                <h2 className="text-xl font-bold text-white">
                  รายการสินค้า ({cart.items.length} รายการ)
                </h2>
              </div>

              <div className="divide-y divide-gray-200">
                {cart.items.map((item) => (
                  <div key={item.product.product_id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex gap-4">
                      {/* Product Image Placeholder */}
                      <div className="bg-gradient-to-br from-gray-100 to-gray-200 w-24 h-24 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-3xl">
                          {item.product.category === 'hot_food' && '🍱'}
                          {item.product.category === 'frozen' && '❄️'}
                          {item.product.category === 'chilled' && '🧊'}
                          {item.product.category === 'beverage' && '🥤'}
                          {item.product.category === 'snack' && '🍿'}
                          {item.product.category === 'medicine' && '💊'}
                        </span>
                      </div>

                      {/* Product Info */}
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-800 mb-1">{item.product.name}</h3>
                        <p className="text-sm text-gray-600 mb-2">
                          SKU: {item.product.sku}
                        </p>
                        <p className="text-lg font-bold text-seven-green">
                          ฿{item.product.price.toFixed(2)}
                        </p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2 bg-gray-100 rounded-lg">
                          <button
                            onClick={() => updateQuantity(item.product.product_id, item.quantity - 1)}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-12 text-center font-bold">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.product_id, item.quantity + 1)}
                            disabled={item.quantity >= item.product.stock_quantity}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <p className="text-lg font-bold text-gray-800">
                          ฿{(item.product.price * item.quantity).toFixed(2)}
                        </p>

                        <button
                          onClick={() => removeFromCart(item.product.product_id)}
                          className="text-red-600 hover:text-red-700 flex items-center gap-1 text-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                          ลบ
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md p-6 sticky top-6">
              <h3 className="font-bold text-xl mb-4">สรุปรายการสั่งซื้อ</h3>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-700">
                  <span>ยอดรวมสินค้า</span>
                  <span>฿{cart.subtotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-gray-700">
                  <span>ภาษีมูลค่าเพิ่ม (7%)</span>
                  <span>฿{cart.tax.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-gray-700">
                  <span>ค่าจัดส่ง</span>
                  <span>฿{cart.shipping_fee.toFixed(2)}</span>
                </div>

                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between text-xl font-bold text-seven-green">
                    <span>ยอดรวมทั้งหมด</span>
                    <span>฿{cart.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <Button
                fullWidth
                variant="primary"
                className="mb-3"
                onClick={() => router.push('/shop/checkout')}
              >
                ดำเนินการชำระเงิน
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              <Link href="/shop">
                <Button fullWidth variant="secondary">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  เลือกซื้อสินค้าเพิ่ม
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Order Status Tracker */}
      <OrderStatusTracker customerId={customerId || undefined} />
    </div>
  );
}
