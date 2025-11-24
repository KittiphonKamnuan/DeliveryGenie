'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LogIn, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        // Fetch session to get user role
        const sessionResponse = await fetch('/api/auth/session');
        const session = await sessionResponse.json();

        // Role-based redirect
        if (session?.user?.role === 'admin') {
          router.push('/admin');
        } else if (session?.user?.role === 'driver') {
          router.push('/rider');
        } else {
          router.push('/'); // Customer goes to shop
        }
        router.refresh();
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-seven-green to-green-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="bg-seven-green text-white px-6 py-3 rounded-lg font-bold text-3xl inline-block mb-4">
            7-ELEVEN
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">DeliveryGenie</h1>
          <p className="text-gray-600">เข้าสู่ระบบเพื่อใช้งาน</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
              อีเมล
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-seven-green focus:border-transparent outline-none transition"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
              รหัสผ่าน
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-seven-green focus:border-transparent outline-none transition"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-seven-green hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                กำลังเข้าสู่ระบบ...
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                เข้าสู่ระบบ
              </>
            )}
          </button>
        </form>

        {/* Demo Credentials */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center mb-3 font-semibold">บัญชีทดสอบ:</p>
          <div className="space-y-2 text-xs bg-gray-50 rounded-lg p-4">
            <div>
              <span className="text-gray-600 font-semibold">Admin:</span>
              <div className="mt-1 font-mono bg-white px-2 py-1 rounded border text-xs">
                admin@deliverygenie.com / admin123
              </div>
            </div>
            <div>
              <span className="text-gray-600 font-semibold">Rider:</span>
              <div className="mt-1 font-mono bg-white px-2 py-1 rounded border text-xs">
                rider1@deliverygenie.com / password123
              </div>
            </div>
            <div className="text-gray-500 text-center mt-2">
              ลูกค้า: ไม่ต้อง login
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
