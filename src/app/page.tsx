'use client';

import { useState, useEffect } from 'react';
import { MapPin, ShoppingCart, Plus, ThermometerSnowflake, Search } from 'lucide-react';
import { Header, LoadingSpinner, Button, OrderStatusTracker } from '@/components';
import { useCart } from '@/contexts/CartContext';
import { Product, Store } from '@/types/shopping';
import Link from 'next/link';

const CATEGORY_LABELS: Record<string, string> = {
  hot_food: '🍱 อาหารร้อน',
  frozen: '❄️ อาหารแช่แข็ง',
  chilled: '🧊 อาหารแช่เย็น',
  beverage: '🥤 เครื่องดื่ม',
  snack: '🍿 ขนม',
  medicine: '💊 ยา',
};

export default function ShopPage() {
  const { cart, addToCart, setStore } = useCart();
  
  // State
  const [loading, setLoading] = useState(true); // Loading for general page/products
  const [loadingLocation, setLoadingLocation] = useState(true); // Initial loading for location
  const [store, setStoreData] = useState<Store | null>(null);
  const [products, setProducts] = useState<Record<string, Product[]>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);

  useEffect(() => {
    // Start process
    getCurrentLocation();

    // Get customer ID from localStorage
    const storedCustomerId = localStorage.getItem('customer_id');
    if (storedCustomerId) {
      setCustomerId(storedCustomerId);
    }
  }, []);

  const getCurrentLocation = () => {
    setLoadingLocation(true);
    setError(null);

    if (!navigator.geolocation) {
      // Fallback: หาก Browser ไม่รองรับ ให้ใช้พิกัดกลางกทม. ยิงไปหา API จริง
      console.log('Geolocation not supported, using default location to query API');
      findNearestStore(13.7563, 100.5018); 
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        await findNearestStore(latitude, longitude);
      },
      (error) => {
        // Error: หาก User ไม่อนุญาต ให้ใช้พิกัดกลางกทม. ยิงไปหา API จริง
        console.warn('Geolocation access denied or error, using default location query:', error);
        findNearestStore(13.7563, 100.5018);
      }
    );
  };

  const findNearestStore = async (latitude: number, longitude: number) => {
    try {
      setLoading(true);
      
      // 1. หา Store ที่ใกล้ที่สุดจาก API
      const response = await fetch('/api/stores/nearest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.store) {
        // เจอร้าน -> Set Store Data
        setStoreData(result.store);
        setStore(result.store); // Context
        
        // 2. โหลดสินค้าของร้านนั้นทันที
        await loadProducts(result.store.store_id);
      } else {
        // API ทำงานปกติ แต่ไม่เจอร้านในรัศมี
        setError('ไม่พบร้าน 7-Eleven ในบริเวณใกล้เคียงพื้นที่ของคุณ');
        setStoreData(null);
      }
    } catch (err) {
      console.error('Error finding store:', err);
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อกับระบบค้นหาร้านค้า');
    } finally {
      setLoadingLocation(false);
      setLoading(false);
    }
  };

  const loadProducts = async (storeId: string) => {
    try {
      // ดึงสินค้าจาก API จริง
      const response = await fetch(`/api/stores/${storeId}/products`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const result = await response.json();

      if (result.success) {
        // API ควรส่งกลับมาเป็น Grouped Object (ตามที่แก้ไปในไฟล์ API route)
        // หรือถ้าส่งเป็น Array ต้องจัดการ Grouping ที่นี่
        setProducts(result.data || {}); 
      }
    } catch (err) {
      console.error('Error loading products:', err);
      // ไม่ Set Error เต็มหน้าจอ เพื่อให้ยังเห็นข้อมูลร้านค้าได้ แต่สินค้าอาจจะไม่ขึ้น
    }
  };

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1);
  };

  const filteredProducts = () => {
    let allProducts: Product[] = [];

    // Flatten products if they are grouped
    if (selectedCategory === 'all') {
      allProducts = Object.values(products).flat();
    } else {
      allProducts = products[selectedCategory] || [];
    }

    // Search Filter
    if (searchQuery) {
      allProducts = allProducts.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return allProducts;
  };

  // --- Render States ---

  // 1. กำลังหาพิกัด
  if (loadingLocation) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Shop" subtitle="ช้อปสินค้า 7-ELEVEN" />
        <div className="flex flex-col items-center justify-center py-20 h-[60vh]">
          <LoadingSpinner size="lg" message="กำลังค้นหา 7-11 ใกล้คุณ..." />
        </div>
      </div>
    );
  }

  // 2. เกิด Error (หาไม่เจอ หรือ API พัง)
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Shop" subtitle="ช้อปสินค้า 7-ELEVEN" />
        <div className="container mx-auto px-4 py-20">
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-6 max-w-2xl mx-auto text-center">
            <div className="flex justify-center mb-4">
               <MapPin className="w-12 h-12 text-red-400" />
            </div>
            <h3 className="font-bold text-red-800 mb-2 text-xl">ขออภัย</h3>
            <p className="text-red-700 mb-6">{error}</p>
            <Button onClick={getCurrentLocation} className="mx-auto">
              ลองค้นหาใหม่อีกครั้ง
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 3. หน้าจอปกติ
  return (
    <div className="min-h-screen bg-gray-50 pb-20"> {/* pb-20 for fixed tracker space */}
      <Header title="Shop" subtitle="ช้อปสินค้า 7-ELEVEN" />

      <div className="container mx-auto px-4 py-6">
        {/* Store Info Section */}
        {store && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="bg-seven-green/10 p-3 rounded-lg shrink-0">
                  <MapPin className="w-8 h-8 text-seven-green" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{store.name}</h2>
                  <p className="text-gray-600 text-sm mt-1">{store.address}</p>
                  
                  {/* แสดงระยะทางและเวลา (ถ้ามีข้อมูลจาก API) */}
                  {(store.distance_km || store.route_distance_km) && (
                    <div className="flex flex-wrap items-center gap-4 mt-3">
                      <span className="inline-flex items-center text-sm bg-gray-100 px-2 py-1 rounded text-gray-600">
                        📍 {store.route_distance_km?.toFixed(1) || store.distance_km?.toFixed(1) || '?'} km
                      </span>
                      <span className="inline-flex items-center text-sm bg-gray-100 px-2 py-1 rounded text-gray-600">
                        🕒 {store.route_duration_min || (store.distance_km ? Math.round((store.distance_km / 30) * 60) : '?')} นาที
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Cart Button */}
              <Link href="/shop/cart" className="w-full md:w-auto">
                <Button variant="primary" className="relative w-full md:w-auto">
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  ตะกร้าสินค้า
                  {cart.items.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold border-2 border-white">
                      {cart.items.length}
                    </span>
                  )}
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Search and Filter Section */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6 sticky top-0 z-10 border-b border-gray-100">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหาสินค้า..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-seven-green focus:border-transparent outline-none transition-all"
              />
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors border ${
                  selectedCategory === 'all'
                    ? 'bg-seven-green text-white border-seven-green'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                ทั้งหมด
              </button>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors border ${
                    selectedCategory === key
                      ? 'bg-seven-green text-white border-seven-green'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Products Grid Section */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner size="lg" message="กำลังโหลดรายการสินค้า..." />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredProducts().map((product) => (
                <div
                  key={product.product_id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all group"
                >
                  {/* Product Image Area */}
                  <div className="bg-gray-50 h-40 flex items-center justify-center relative">
                    {product.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={product.image_url} 
                          alt={product.name} 
                          className="w-full h-full object-cover"
                        />
                    ) : (
                        <span className="text-5xl group-hover:scale-110 transition-transform duration-300">
                        {CATEGORY_LABELS[product.category]?.split(' ')[0] || '📦'}
                        </span>
                    )}
                    
                    {/* Stock Warning Badge */}
                    {product.stock_quantity < 5 && product.stock_quantity > 0 && (
                        <span className="absolute top-2 right-2 bg-orange-100 text-orange-600 text-[10px] font-bold px-2 py-1 rounded-full">
                            เหลือน้อย
                        </span>
                    )}
                  </div>

                  <div className="p-4">
                    {/* Name */}
                    <h3 className="font-bold text-gray-800 text-sm mb-1 line-clamp-2 h-10 leading-snug">
                      {product.name}
                    </h3>

                    {/* Temperature Info */}
                    {product.temperature_requirement !== 'ambient' && (
                      <div className="flex items-center gap-1 text-xs text-blue-600 mb-2 bg-blue-50 w-fit px-2 py-0.5 rounded-full">
                        <ThermometerSnowflake className="w-3 h-3" />
                        {product.temperature_requirement}
                      </div>
                    )}

                    {/* Price & Stock */}
                    <div className="flex items-end justify-between mb-3 mt-2">
                      <span className="text-lg font-bold text-seven-green">
                        ฿{typeof product.price === 'number' ? product.price.toFixed(2) : product.price}
                      </span>
                      <span className={`text-xs ${product.stock_quantity === 0 ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                        {product.stock_quantity > 0 ? `เหลือ ${product.stock_quantity}` : 'สินค้าหมด'}
                      </span>
                    </div>

                    {/* Add Button */}
                    <Button
                      onClick={() => handleAddToCart(product)}
                      fullWidth
                      size="sm"
                      disabled={product.stock_quantity === 0}
                      variant={product.stock_quantity === 0 ? 'outline' : 'primary'}
                    >
                      {product.stock_quantity === 0 ? 'สินค้าหมด' : (
                          <>
                            <Plus className="w-4 h-4 mr-1" />
                            เพิ่ม
                          </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {filteredProducts().length === 0 && (
              <div className="text-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-lg font-bold text-gray-700">ไม่พบสินค้า</h3>
                <p className="text-gray-500">ลองเปลี่ยนคำค้นหา หรือเลือกหมวดหมู่อื่น</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Order Status Tracker */}
      <OrderStatusTracker customerId={customerId || undefined} />
    </div>
  );
}