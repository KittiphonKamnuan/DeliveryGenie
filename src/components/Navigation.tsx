// ===================================
// Navigation Component - Reusable navigation menu
// ===================================

'use client';

import { useState } from 'react';
import { Menu, LogOut, User, Shield } from 'lucide-react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

export default function Navigation() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: session } = useSession();

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/auth/login' });
  };

  return (
    <div className="relative">
      {/* Hamburger Button */}
      <button
        className="flex items-center justify-center p-2 bg-seven-green rounded-lg shadow-lg fixed top-4 left-4 z-50"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <Menu className="w-6 h-6 text-white" />
      </button>

      {/* Dropdown Menu */}
      {menuOpen && (
        <div className="fixed top-16 left-4 w-64 bg-white text-gray-800 rounded-lg shadow-lg z-50 overflow-hidden">
          {/* User Info */}
          {session?.user && (
            <div className="bg-seven-green text-white px-4 py-3 border-b border-green-600">
              <div className="flex items-center gap-2 mb-1">
                {session.user.role === 'admin' ? (
                  <Shield className="w-4 h-4" />
                ) : (
                  <User className="w-4 h-4" />
                )}
                <span className="font-semibold">{session.user.name}</span>
              </div>
              <p className="text-xs text-green-100">
                {session.user.role === 'customer' ? session.user.customer_phone : session.user.email}
              </p>
              <p className="text-xs text-green-200 mt-1">
                {session.user.role === 'admin' && '🔑 ผู้ดูแลระบบ'}
                {session.user.role === 'customer' && '🛒 ลูกค้า'}
                {session.user.role === 'rider' && '🚚 ไรเดอร์'}
                {!['admin', 'customer', 'rider'].includes(session.user.role) && '👤 ผู้ใช้งาน'}
              </p>
            </div>
          )}

          {/* Menu Items */}
          <div className="py-2">
            {/* Customer Role - Shopping Only */}
            {session?.user?.role === 'customer' && (
              <>
                <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase">
                  Shopping
                </div>
                <Link
                  href="/shop"
                  className="block px-4 py-2 hover:bg-gray-100 transition-colors text-seven-green font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  🛒 ช้อปสินค้า
                </Link>
                <Link
                  href="/shop/cart"
                  className="block px-4 py-2 hover:bg-gray-100 transition-colors text-seven-green"
                  onClick={() => setMenuOpen(false)}
                >
                  🛍️ ตะกร้าสินค้า
                </Link>
              </>
            )}

            {/* Rider Role - Delivery Dashboard */}
            {session?.user?.role === 'rider' && (
              <>
                <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase">
                  Delivery
                </div>
                <Link
                  href="/rider"
                  className="block px-4 py-2 hover:bg-gray-100 transition-colors text-blue-600 font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  🚚 งานส่งของฉัน
                </Link>
              </>
            )}

            {/* Admin Role - Full Access */}
            {session?.user?.role === 'admin' && (
              <>
                <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase">
                  Dashboard
                </div>
                <Link
                  href="/"
                  className="block px-4 py-2 hover:bg-gray-100 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  🌟 Priority System
                </Link>
                <Link
                  href="/driver-performance"
                  className="block px-4 py-2 hover:bg-gray-100 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  🚚 Driver Performance
                </Link>
                <Link
                  href="/analytics"
                  className="block px-4 py-2 hover:bg-gray-100 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  📊 Real-time Analytics
                </Link>
                <Link
                  href="/route-optimization"
                  className="block px-4 py-2 hover:bg-gray-100 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  🗺️ Route Optimization
                </Link>
                <Link
                  href="/vehicle-tracking"
                  className="block px-4 py-2 hover:bg-gray-100 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  📍 Vehicle Tracking
                </Link>

                <div className="border-t border-gray-200 my-2"></div>
                <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase">
                  Shopping
                </div>
                <Link
                  href="/shop"
                  className="block px-4 py-2 hover:bg-gray-100 transition-colors text-seven-green"
                  onClick={() => setMenuOpen(false)}
                >
                  🛒 ช้อปสินค้า
                </Link>
                <Link
                  href="/shop/cart"
                  className="block px-4 py-2 hover:bg-gray-100 transition-colors text-seven-green"
                  onClick={() => setMenuOpen(false)}
                >
                  🛍️ ตะกร้าสินค้า
                </Link>

                <div className="border-t border-gray-200 my-2"></div>
                <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase">
                  Admin
                </div>
                <Link
                  href="/admin/users"
                  className="block px-4 py-2 hover:bg-gray-100 transition-colors text-purple-600"
                  onClick={() => setMenuOpen(false)}
                >
                  👥 จัดการผู้ใช้
                </Link>
                <Link
                  href="/admin/settings"
                  className="block px-4 py-2 hover:bg-gray-100 transition-colors text-purple-600"
                  onClick={() => setMenuOpen(false)}
                >
                  ⚙️ ตั้งค่าระบบ
                </Link>
              </>
            )}
          </div>

          {/* Login/Logout Button */}
          <div className="border-t border-gray-200">
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
      )}
    </div>
  );
}
