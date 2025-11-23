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
  const [loading, setLoading] = useState(true);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [store, setStoreData] = useState<Store | null>(null);
  const [products, setProducts] = useState<Record<string, Product[]>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);

  useEffect(() => {
    getCurrentLocation();

    // Get customer ID from localStorage (set after order creation)
    const storedCustomerId = localStorage.getItem('customer_id');
    if (storedCustomerId) {
      setCustomerId(storedCustomerId);
    }
  }, []);

  const getCurrentLocation = () => {
    setLoadingLocation(true);
    setError(null);

    if (!navigator.geolocation) {
      // Fallback to default location (Bangkok center)
      console.log('Geolocation not supported, using default location');
      findNearestStore(13.7563, 100.5018); // Bangkok coordinates
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        await findNearestStore(latitude, longitude);
        setLoadingLocation(false);
      },
      (error) => {
        // Fallback to default location on error
        console.log('Geolocation error, using default location:', error);
        findNearestStore(13.7563, 100.5018); // Bangkok coordinates
      }
    );
  };

  const findNearestStore = async (latitude: number, longitude: number) => {
    try {
      setLoading(true);
      const response = await fetch('/api/stores/nearest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude }),
      });

      const result = await response.json();

      if (result.success && result.store) {
        setStoreData(result.store);
        setStore(result.store);
        await loadProducts(result.store.store_id);
      } else {
        // Fallback to mock store if API fails
        console.log('API failed, using mock store data');
        loadMockStore();
      }
    } catch (err) {
      // Fallback to mock store on error
      console.error('Error finding store:', err);
      loadMockStore();
    } finally {
      setLoadingLocation(false);
      setLoading(false);
    }
  };

  const loadMockStore = () => {
    const mockStore: Store = {
      store_id: 'store-001',
      name: '7-Eleven สาขาสุขุมวิท 55',
      address: '123 ถนนสุขุมวิท 55 แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพฯ 10110',
      latitude: 13.7428,
      longitude: 100.5650,
      is_active: true,
      created_at: new Date().toISOString(),
      distance_km: 2.5,
    };

    setStoreData(mockStore);
    setStore(mockStore);
    loadMockProducts();
  };

  const loadMockProducts = () => {
    const mockProducts: Record<string, Product[]> = {
      hot_food: [
        {
          product_id: 'prod-001',
          store_id: 'store-001',
          name: 'ข้าวผัดกุ้ง',
          category: 'hot_food',
          price: 45,
          stock_quantity: 20,
          temperature_requirement: 'hot',
          expiration_hours: 4,
          is_fragile: false,
          is_active: true,
          created_at: new Date().toISOString(),
        },
        {
          product_id: 'prod-002',
          store_id: 'store-001',
          name: 'ข้าวกะเพราหมูกรอบ',
          category: 'hot_food',
          price: 49,
          stock_quantity: 15,
          temperature_requirement: 'hot',
          expiration_hours: 4,
          is_fragile: false,
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ],
      frozen: [
        {
          product_id: 'prod-003',
          store_id: 'store-001',
          name: 'ไอศกรีมวานิลลา',
          category: 'frozen',
          price: 35,
          stock_quantity: 50,
          temperature_requirement: 'frozen',
          expiration_hours: 720,
          is_fragile: false,
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ],
      chilled: [
        {
          product_id: 'prod-004',
          store_id: 'store-001',
          name: 'นมสดพาสเจอไรส์',
          category: 'chilled',
          price: 25,
          stock_quantity: 100,
          temperature_requirement: 'chilled',
          expiration_hours: 168,
          is_fragile: false,
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ],
      beverage: [
        {
          product_id: 'prod-006',
          store_id: 'store-001',
          name: 'น้ำดื่มเซเว่น 1.5L',
          category: 'beverage',
          price: 15,
          stock_quantity: 200,
          temperature_requirement: 'ambient',
          expiration_hours: 8760,
          is_fragile: false,
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ],
      snack: [
        {
          product_id: 'prod-008',
          store_id: 'store-001',
          name: 'มันฝรั่งทอด Lay\'s',
          category: 'snack',
          price: 22,
          stock_quantity: 80,
          temperature_requirement: 'ambient',
          expiration_hours: 2160,
          is_fragile: true,
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ],
      medicine: [
        {
          product_id: 'prod-009',
          store_id: 'store-001',
          name: 'พาราเซตามอล',
          category: 'medicine',
          price: 35,
          stock_quantity: 40,
          temperature_requirement: 'ambient',
          expiration_hours: 17520,
          is_fragile: false,
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ],
    };

    setProducts(mockProducts);
  };

  const loadProducts = async (storeId: string) => {
    try {
      const response = await fetch(`/api/stores/${storeId}/products`);
      const result = await response.json();

      if (result.success) {
        setProducts(result.products);
      }
    } catch (err) {
      console.error('Error loading products:', err);
    }
  };

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1);
  };

  const filteredProducts = () => {
    let allProducts: Product[] = [];

    if (selectedCategory === 'all') {
      allProducts = Object.values(products).flat();
    } else {
      allProducts = products[selectedCategory] || [];
    }

    if (searchQuery) {
      allProducts = allProducts.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return allProducts;
  };

  if (loadingLocation) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Shop" subtitle="ช้อปสินค้า 7-ELEVEN" />
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" message="กำลังหา 7-11 ใกล้ฉัน..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Shop" subtitle="ช้อปสินค้า 7-ELEVEN" />
        <div className="container mx-auto px-4 py-20">
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-6 max-w-2xl mx-auto">
            <h3 className="font-bold text-red-800 mb-2">เกิดข้อผิดพลาด</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <Button onClick={getCurrentLocation}>ลองอีกครั้ง</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Shop" subtitle="ช้อปสินค้า 7-ELEVEN" />

      <div className="container mx-auto px-4 py-6">
        {/* Store Info */}
        {store && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="bg-seven-green/10 p-3 rounded-lg">
                  <MapPin className="w-8 h-8 text-seven-green" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{store.name}</h2>
                  <p className="text-gray-600 text-sm mt-1">{store.address}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-sm text-gray-500">
                      📍 {store.route_distance_km?.toFixed(1) || store.distance_km.toFixed(1)} km
                    </span>
                    <span className="text-sm text-gray-500">
                      🕒 {store.route_duration_min || Math.round((store.distance_km / 30) * 60)} นาที
                    </span>
                  </div>
                </div>
              </div>

              {/* Cart Summary */}
              <Link href="/shop/cart">
                <Button variant="primary" className="relative">
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  ตะกร้า
                  {cart.items.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
                      {cart.items.length}
                    </span>
                  )}
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหาสินค้า..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-seven-green focus:border-transparent outline-none"
              />
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-seven-green text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ทั้งหมด
              </button>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === key
                      ? 'bg-seven-green text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner size="lg" message="กำลังโหลดสินค้า..." />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts().map((product) => (
              <div
                key={product.product_id}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Product Image Placeholder */}
                <div className="bg-gradient-to-br from-gray-100 to-gray-200 h-40 flex items-center justify-center">
                  <span className="text-5xl">
                    {product.category === 'hot_food' && '🍱'}
                    {product.category === 'frozen' && '❄️'}
                    {product.category === 'chilled' && '🧊'}
                    {product.category === 'beverage' && '🥤'}
                    {product.category === 'snack' && '🍿'}
                    {product.category === 'medicine' && '💊'}
                  </span>
                </div>

                <div className="p-4">
                  {/* Product Info */}
                  <h3 className="font-bold text-gray-800 text-sm mb-1 line-clamp-2 h-10">
                    {product.name}
                  </h3>

                  {/* Temperature Badge */}
                  {product.temperature_requirement !== 'ambient' && (
                    <div className="flex items-center gap-1 text-xs text-blue-600 mb-2">
                      <ThermometerSnowflake className="w-3 h-3" />
                      {product.temperature_requirement}
                    </div>
                  )}

                  {/* Price */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-bold text-seven-green">
                      ฿{product.price.toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-500">คงเหลือ {product.stock_quantity}</span>
                  </div>

                  {/* Add to Cart Button */}
                  <Button
                    onClick={() => handleAddToCart(product)}
                    fullWidth
                    size="sm"
                    disabled={product.stock_quantity === 0}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    เพิ่มลงตะกร้า
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredProducts().length === 0 && !loading && (
          <div className="text-center py-20">
            <p className="text-xl text-gray-500">ไม่พบสินค้า</p>
          </div>
        )}
      </div>

      {/* Order Status Tracker - Fixed at bottom */}
      <OrderStatusTracker customerId={customerId || undefined} />
    </div>
  );
}
