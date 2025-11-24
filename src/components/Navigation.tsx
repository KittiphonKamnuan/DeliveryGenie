// ===================================
// Navigation Component - Reusable navigation menu
// ===================================

'use client';

import { useState, useEffect } from 'react';
import { Menu, LogOut, User, Shield } from 'lucide-react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation'; // 1. เพิ่ม import router

export default function Navigation() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: session, status } = useSession(); // 2. เพิ่ม status
  const router = useRouter();
  const pathname = usePathname();

  // 3. เพิ่ม Logic Redirect สำหรับ Rider
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'rider') {
      // ถ้า Rider เข้ามาที่หน้า Homepage (/) ให้ดีดไปที่ /rider ทันที
      if (pathname === '/') {
        router.replace('/rider');
      }
    }
  }, [session, status, pathname, router]);

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/auth/login' });
  };

  return (
    <div className="relative">
      {/* Hamburger Button */}
      <button
        className="flex items-center justify-center p-2 bg-seven-green rounded-lg shadow-lg fixed top-4 left-4 z-50 hover:bg-green-600 transition-colors"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <Menu className="w-6 h-6 text-white" />
      </button>

      {/* Dropdown Menu */}
      {menuOpen && (
        <>
          {/* Overlay to close menu when clicking outside */}
          <div 
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setMenuOpen(false)}
          />
          
          <div className="fixed top-16 left-4 w-64 bg-white text-gray-800 rounded-lg shadow-xl z-50 overflow-hidden border border-gray-100 animate-in slide-in-from-left-2 duration-200">
            {/* User Info */}
            {session?.user && (
              <div className="bg-seven-green text-white px-4 py-4 border-b border-green-600">
                <div className="flex items-center gap-2 mb-1">
                  {session.user.role === 'admin' ? (
                    <Shield className="w-4 h-4" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                  <span className="font-semibold truncate">{session.user.name}</span>
                </div>
                <p className="text-xs text-green-100 truncate">
                  {session.user.role === 'customer' ? session.user.customer_phone : session.user.email}
                </p>
                <p className="text-xs text-green-200 mt-1 font-medium bg-green-800/30 inline-block px-2 py-0.5 rounded">
                  {session.user.role === 'admin' && '🔑 ผู้ดูแลระบบ'}
                  {session.user.role === 'customer' && '🛒 ลูกค้า'}
                  {session.user.role === 'rider' && '🚚 ไรเดอร์'}
                  {!['admin', 'customer', 'rider'].includes(session.user.role) && '👤 ผู้ใช้งาน'}
                </p>
              </div>
            )}

            {/* Menu Items */}
            <div className="py-2 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Customer Role - Shopping Only */}
              {session?.user?.role === 'customer' && (
                <>
                  <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Shopping
                  </div>
                  <Link
                    href="/"
                    className="flex items-center px-4 py-2.5 hover:bg-green-50 transition-colors text-gray-700 hover:text-seven-green font-medium"
                    onClick={() => setMenuOpen(false)}
                  >
                    🛒 ช้อปสินค้า
                  </Link>
                  <Link
                    href="/shop/cart"
                    className="flex items-center px-4 py-2.5 hover:bg-green-50 transition-colors text-gray-700 hover:text-seven-green font-medium"
                    onClick={() => setMenuOpen(false)}
                  >
                    🛍️ ตะกร้าสินค้า
                  </Link>
                  <Link
                    href="/shop/tracking"
                    className="flex items-center px-4 py-2.5 hover:bg-green-50 transition-colors text-gray-700 hover:text-seven-green font-medium"
                    onClick={() => setMenuOpen(false)}
                  >
                    📍 ติดตามการจัดส่ง
                  </Link>
                </>
              )}

              {/* Rider Role - Delivery Dashboard */}
              {session?.user?.role === 'rider' && (
                <>
                  <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Delivery Zone
                  </div>
                  <Link
                    href="/rider"
                    className="flex items-center px-4 py-2.5 hover:bg-blue-50 transition-colors text-blue-600 font-medium bg-blue-50/50"
                    onClick={() => setMenuOpen(false)}
                  >
                    🚚 งานส่งของฉัน
                  </Link>
                  {/* เพิ่มลิงก์อื่นๆ สำหรับ Rider ถ้ามี */}
                </>
              )}

              {/* Admin Role - Full Access */}
              {session?.user?.role === 'admin' && (
                <>
                  <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Analytics & Monitoring
                  </div>
                  <Link
                    href="/"
                    className="block px-4 py-2 hover:bg-gray-100 transition-colors text-gray-700"
                    onClick={() => setMenuOpen(false)}
                  >
                    🌟 Priority System
                  </Link>
                  <Link
                    href="/driver-performance"
                    className="block px-4 py-2 hover:bg-gray-100 transition-colors text-gray-700"
                    onClick={() => setMenuOpen(false)}
                  >
                    🚚 Driver Performance
                  </Link>
                  <Link
                    href="/analytics"
                    className="block px-4 py-2 hover:bg-gray-100 transition-colors text-gray-700"
                    onClick={() => setMenuOpen(false)}
                  >
                    📊 Real-time Analytics
                  </Link>
                  <Link
                    href="/route-optimization"
                    className="block px-4 py-2 hover:bg-gray-100 transition-colors text-gray-700"
                    onClick={() => setMenuOpen(false)}
                  >
                    🗺️ Route Optimization
                  </Link>
                  <Link
                    href="/vehicle-tracking"
                    className="block px-4 py-2 hover:bg-gray-100 transition-colors text-gray-700"
                    onClick={() => setMenuOpen(false)}
                  >
                    📍 Vehicle Tracking
                  </Link>

                  <div className="border-t border-gray-100 my-2"></div>
                  <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Test Shopping
                  </div>
                  <Link
                    href="/"
                    className="block px-4 py-2 hover:bg-gray-100 transition-colors text-gray-700"
                    onClick={() => setMenuOpen(false)}
                  >
                    🛒 หน้าช้อปปิ้ง (Demo)
                  </Link>

                  <div className="border-t border-gray-100 my-2"></div>
                  <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    System
                  </div>
                  <Link
                    href="/admin/users"
                    className="block px-4 py-2 hover:bg-gray-100 transition-colors text-gray-700"
                    onClick={() => setMenuOpen(false)}
                  >
                    👥 จัดการผู้ใช้
                  </Link>
                  <Link
                    href="/admin/settings"
                    className="block px-4 py-2 hover:bg-gray-100 transition-colors text-gray-700"
                    onClick={() => setMenuOpen(false)}
                  >
                    ⚙️ ตั้งค่าระบบ
                  </Link>
                </>
              )}
            </div>

            {/* Login/Logout Button */}
            <div className="border-t border-gray-200 bg-gray-50">
              {session?.user ? (
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-3 text-left hover:bg-red-50 transition-colors flex items-center gap-2 text-red-600 font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  ออกจากระบบ
                </button>
              ) : (
                <Link
                  href="/customer/login"
                  className="block px-4 py-3 hover:bg-green-50 transition-colors text-seven-green font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  <User className="w-4 h-4 inline mr-2" />
                  เข้าสู่ระบบ / สมัครสมาชิก
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}