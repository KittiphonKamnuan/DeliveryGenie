'use client';

import { useState } from 'react';
import { Settings, Save, RotateCcw } from 'lucide-react';
import { Header, Button, Card } from '@/components';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    // Priority weights
    weight_temperature: 0.30,
    weight_expiration: 0.25,
    weight_customer: 0.15,
    weight_value: 0.10,
    weight_time_window: 0.15,
    weight_fragility: 0.05,

    // Thresholds
    critical_threshold: 75,
    high_threshold: 60,
    medium_threshold: 40,
  });

  const handleSave = () => {
    // TODO: Implement save functionality
    alert('บันทึกการตั้งค่าสำเร็จ');
  };

  const handleReset = () => {
    setSettings({
      weight_temperature: 0.30,
      weight_expiration: 0.25,
      weight_customer: 0.15,
      weight_value: 0.10,
      weight_time_window: 0.15,
      weight_fragility: 0.05,
      critical_threshold: 75,
      high_threshold: 60,
      medium_threshold: 40,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="System Settings"
        subtitle="ตั้งค่าระบบ"
      />

      <div className="container mx-auto px-4 py-6">
        <Card
          title="⚙️ การตั้งค่าการคำนวณความสำคัญ"
          action={{
            label: (
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={handleReset}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  รีเซ็ต
                </Button>
                <Button variant="primary" size="sm" onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" />
                  บันทึก
                </Button>
              </div>
            )
          }}
        >
          <div className="space-y-6">
            {/* Priority Weights */}
            <div>
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                น้ำหนักปัจจัยความสำคัญ
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'weight_temperature', label: 'อุณหภูมิ (Temperature)', color: 'blue' },
                  { key: 'weight_expiration', label: 'การหมดอายุ (Expiration)', color: 'green' },
                  { key: 'weight_customer', label: 'ลูกค้า (Customer)', color: 'purple' },
                  { key: 'weight_value', label: 'มูลค่า (Value)', color: 'orange' },
                  { key: 'weight_time_window', label: 'กรอบเวลา (Time Window)', color: 'red' },
                  { key: 'weight_fragility', label: 'ความเปราะบาง (Fragility)', color: 'yellow' },
                ].map((item) => (
                  <div key={item.key} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {item.label}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={settings[item.key as keyof typeof settings]}
                      onChange={(e) => setSettings({ ...settings, [item.key]: parseFloat(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-seven-green focus:border-transparent outline-none"
                    />
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`bg-${item.color}-500 h-2 rounded-full transition-all`}
                        style={{ width: `${(settings[item.key as keyof typeof settings] as number) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>รวมน้ำหนัก:</strong>{' '}
                  {(
                    settings.weight_temperature +
                    settings.weight_expiration +
                    settings.weight_customer +
                    settings.weight_value +
                    settings.weight_time_window +
                    settings.weight_fragility
                  ).toFixed(2)}{' '}
                  {(settings.weight_temperature +
                    settings.weight_expiration +
                    settings.weight_customer +
                    settings.weight_value +
                    settings.weight_time_window +
                    settings.weight_fragility) === 1.0
                    ? '✅'
                    : '⚠️ ต้องรวมเท่ากับ 1.0'}
                </p>
              </div>
            </div>

            {/* Priority Thresholds */}
            <div className="pt-6 border-t border-gray-200">
              <h3 className="font-bold text-gray-800 mb-4">เกณฑ์คะแนนความสำคัญ</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { key: 'critical_threshold', label: 'สำคัญมาก (Critical)', color: 'red', min: 70 },
                  { key: 'high_threshold', label: 'สำคัญสูง (High)', color: 'orange', min: 50 },
                  { key: 'medium_threshold', label: 'ปานกลาง (Medium)', color: 'blue', min: 30 },
                ].map((item) => (
                  <div key={item.key} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {item.label}
                    </label>
                    <input
                      type="number"
                      min={item.min}
                      max="100"
                      value={settings[item.key as keyof typeof settings]}
                      onChange={(e) => setSettings({ ...settings, [item.key]: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-seven-green focus:border-transparent outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
