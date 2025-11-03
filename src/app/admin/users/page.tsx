'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Shield, User, Plus, Edit, Trash2, Check, X } from 'lucide-react';
import { Header, LoadingSpinner, Button } from '@/components';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  created_at: string;
}

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // TODO: Implement API endpoint to fetch users
      // For now, show mock data
      setUsers([
        {
          id: '1',
          name: 'Admin User',
          email: 'admin@deliverygenie.com',
          role: 'admin',
          isActive: true,
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Normal User',
          email: 'user@deliverygenie.com',
          role: 'user',
          isActive: true,
          created_at: new Date().toISOString()
        }
      ]);
    } catch (err) {
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="User Management"
        subtitle="จัดการผู้ใช้งานระบบ"
      />

      <div className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner size="lg" message="กำลังโหลดข้อมูล..." />
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">รายการผู้ใช้งาน</h2>
              <Button variant="secondary" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                เพิ่มผู้ใช้
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ผู้ใช้</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">อีเมล</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">บทบาท</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">สถานะ</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">วันที่สร้าง</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${user.role === 'admin' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                            {user.role === 'admin' ? (
                              <Shield className="w-5 h-5 text-purple-600" />
                            ) : (
                              <User className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{user.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {user.role === 'admin' ? '🔑 ผู้ดูแลระบบ' : '👤 ผู้ใช้งาน'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {user.isActive ? (
                          <span className="flex items-center gap-1 text-green-600 font-medium">
                            <Check className="w-4 h-4" />
                            ใช้งาน
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600 font-medium">
                            <X className="w-4 h-4" />
                            ปิดการใช้งาน
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">
                        {new Date(user.created_at).toLocaleDateString('th-TH')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button className="p-2 hover:bg-blue-50 rounded-lg transition-colors">
                            <Edit className="w-4 h-4 text-blue-600" />
                          </button>
                          <button className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
