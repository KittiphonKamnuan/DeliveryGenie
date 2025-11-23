'use client';

import { useState } from 'react';
import { User, Truck, Phone, Mail, MapPin, Star, Calendar, Save, Edit2 } from 'lucide-react';
import Link from 'next/link';

export default function RiderAccountPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    id: 'DRV-001',
    firstName: 'สมชาย',
    lastName: 'ใจดี',
    phone: '081-234-5678',
    email: 'somchai@deliverygenie.com',
    address: '123 ถนนพระราม 4 แขวงพระโขนง เขตคลองเตย กรุงเทพฯ 10110',
    vehicleType: 'มอเตอร์ไซค์',
    licensePlate: 'กข-1234',
    rating: 4.8,
    totalDeliveries: 1247,
    joinedDate: '2024-01-15',
  });

  const handleSave = () => {
    // TODO: Save to API
    setIsEditing(false);
    alert('บันทึกข้อมูลเรียบร้อยแล้ว');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-seven-green to-green-600 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <Link href="/rider" className="text-white/80 hover:text-white mb-4 inline-block">
            ← กลับไปหน้าหลัก
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">บัญชีของฉัน</h1>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg flex items-center gap-2 transition"
            >
              <Edit2 className="w-4 h-4" />
              {isEditing ? 'ยกเลิก' : 'แก้ไข'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-seven-green/10 p-4 rounded-full">
              <User className="w-12 h-12 text-seven-green" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {profile.firstName} {profile.lastName}
              </h2>
              <p className="text-gray-500">ID: {profile.id}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                <span className="text-2xl font-bold text-gray-800">{profile.rating}</span>
              </div>
              <p className="text-sm text-gray-600">คะแนน</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-800 mb-2">
                {profile.totalDeliveries.toLocaleString()}
              </div>
              <p className="text-sm text-gray-600">จัดส่งทั้งหมด</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-bold text-gray-800">
                  {new Date(profile.joinedDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'short' })}
                </span>
              </div>
              <p className="text-sm text-gray-600">เริ่มงาน</p>
            </div>
          </div>

          {/* Personal Information */}
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            ข้อมูลส่วนตัว
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">ชื่อ</label>
                <input
                  type="text"
                  value={profile.firstName}
                  onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 border rounded-lg disabled:bg-gray-50 disabled:text-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">นามสกุล</label>
                <input
                  type="text"
                  value={profile.lastName}
                  onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 border rounded-lg disabled:bg-gray-50 disabled:text-gray-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                เบอร์โทรศัพท์
              </label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-2 border rounded-lg disabled:bg-gray-50 disabled:text-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                อีเมล
              </label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-2 border rounded-lg disabled:bg-gray-50 disabled:text-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                ที่อยู่
              </label>
              <textarea
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                disabled={!isEditing}
                rows={3}
                className="w-full px-4 py-2 border rounded-lg disabled:bg-gray-50 disabled:text-gray-700"
              />
            </div>
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Truck className="w-5 h-5" />
            ข้อมูลยานพาหนะ
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">ประเภทยานพาหนะ</label>
              <select
                value={profile.vehicleType}
                onChange={(e) => setProfile({ ...profile, vehicleType: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-2 border rounded-lg disabled:bg-gray-50 disabled:text-gray-700"
              >
                <option value="มอเตอร์ไซค์">มอเตอร์ไซค์</option>
                <option value="รถกระบะ">รถกระบะ</option>
                <option value="รถตู้">รถตู้</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">ทะเบียนรถ</label>
              <input
                type="text"
                value={profile.licensePlate}
                onChange={(e) => setProfile({ ...profile, licensePlate: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-2 border rounded-lg disabled:bg-gray-50 disabled:text-gray-700"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        {isEditing && (
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              className="flex-1 bg-seven-green text-white py-3 rounded-lg font-bold hover:bg-green-700 transition flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              บันทึกการเปลี่ยนแปลง
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-6 bg-gray-200 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-300 transition"
            >
              ยกเลิก
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
