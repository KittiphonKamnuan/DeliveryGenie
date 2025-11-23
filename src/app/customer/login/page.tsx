'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LogIn, AlertCircle, UserPlus } from 'lucide-react';

export default function CustomerLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Login Form
  const [loginData, setLoginData] = useState({
    phone: '',
    password: '',
  });

  // Register Form
  const [registerData, setRegisterData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    address_line1: '',
    address_line2: '',
    district: '',
    city: '',
    postal_code: '',
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        phone: loginData.phone,
        password: loginData.password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        router.push('/shop');
        router.refresh();
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (registerData.password !== registerData.confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน');
      return;
    }

    if (registerData.password.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/customers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData),
      });

      const data = await response.json();

      if (data.success) {
        // Auto login after registration
        const result = await signIn('credentials', {
          phone: registerData.phone,
          password: registerData.password,
          redirect: false,
        });

        if (result?.ok) {
          router.push('/shop');
          router.refresh();
        }
      } else {
        setError(data.error || 'ไม่สามารถสมัครสมาชิกได้');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการสมัครสมาชิก');
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
          <p className="text-gray-600">
            {mode === 'login' ? 'เข้าสู่ระบบลูกค้า' : 'สมัครสมาชิก'}
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`flex-1 py-2 rounded-lg font-medium transition ${
              mode === 'login'
                ? 'bg-seven-green text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <LogIn className="w-4 h-4 inline mr-2" />
            เข้าสู่ระบบ
          </button>
          <button
            onClick={() => {
              setMode('register');
              setError('');
            }}
            className={`flex-1 py-2 rounded-lg font-medium transition ${
              mode === 'register'
                ? 'bg-seven-green text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <UserPlus className="w-4 h-4 inline mr-2" />
            สมัครสมาชิก
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Login Form */}
        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                เบอร์โทรศัพท์
              </label>
              <input
                id="phone"
                type="tel"
                value={loginData.phone}
                onChange={(e) => setLoginData({ ...loginData, phone: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-seven-green focus:border-transparent outline-none transition"
                placeholder="0812345678"
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
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
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
        ) : (
          /* Register Form */
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ชื่อ-นามสกุล *
              </label>
              <input
                type="text"
                value={registerData.name}
                onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-seven-green focus:border-transparent outline-none"
                placeholder="สมชาย ใจดี"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                เบอร์โทรศัพท์ *
              </label>
              <input
                type="tel"
                value={registerData.phone}
                onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-seven-green focus:border-transparent outline-none"
                placeholder="0812345678"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                อีเมล
              </label>
              <input
                type="email"
                value={registerData.email}
                onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-seven-green focus:border-transparent outline-none"
                placeholder="somchai@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ที่อยู่ *
              </label>
              <input
                type="text"
                value={registerData.address_line1}
                onChange={(e) => setRegisterData({ ...registerData, address_line1: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-seven-green focus:border-transparent outline-none mb-2"
                placeholder="บ้านเลขที่ ถนน"
                required
              />
              <input
                type="text"
                value={registerData.address_line2}
                onChange={(e) => setRegisterData({ ...registerData, address_line2: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-seven-green focus:border-transparent outline-none"
                placeholder="ตึก ห้อง (ถ้ามี)"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  เขต/อำเภอ *
                </label>
                <input
                  type="text"
                  value={registerData.district}
                  onChange={(e) => setRegisterData({ ...registerData, district: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-seven-green focus:border-transparent outline-none"
                  placeholder="บางนา"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  จังหวัด *
                </label>
                <input
                  type="text"
                  value={registerData.city}
                  onChange={(e) => setRegisterData({ ...registerData, city: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-seven-green focus:border-transparent outline-none"
                  placeholder="กรุงเทพ"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                รหัสไปรษณีย์
              </label>
              <input
                type="text"
                value={registerData.postal_code}
                onChange={(e) => setRegisterData({ ...registerData, postal_code: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-seven-green focus:border-transparent outline-none"
                placeholder="10260"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                รหัสผ่าน * (อย่างน้อย 6 ตัวอักษร)
              </label>
              <input
                type="password"
                value={registerData.password}
                onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-seven-green focus:border-transparent outline-none"
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ยืนยันรหัสผ่าน *
              </label>
              <input
                type="password"
                value={registerData.confirmPassword}
                onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-seven-green focus:border-transparent outline-none"
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
                  กำลังสมัครสมาชิก...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  สมัครสมาชิก
                </>
              )}
            </button>
          </form>
        )}

        {/* Guest Shopping Link */}
        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600 mb-3">หรือ</p>
          <button
            onClick={() => router.push('/shop')}
            className="text-seven-green hover:underline font-medium"
          >
            ช้อปปิ้งแบบไม่ต้องเข้าสู่ระบบ (Guest)
          </button>
        </div>
      </div>
    </div>
  );
}
