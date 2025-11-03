// ===================================
// Header Component - Reusable header with menu and title
// ===================================

'use client';

import Navigation from './Navigation';

interface HeaderProps {
  title: string;
  subtitle: string;
  currentTime?: Date;
}

export default function Header({ title, subtitle, currentTime }: HeaderProps) {
  return (
    <header className="bg-seven-green text-white shadow-lg">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white text-seven-green px-4 py-2 rounded-lg font-bold text-2xl">
                  7-ELEVEN
                </div>
                <h1 className="text-2xl font-bold">{title}</h1>
              </div>
              <p className="text-green-50">{subtitle}</p>
            </div>
          </div>

          <Navigation />

          {currentTime && (
            <div className="text-right bg-white/10 px-6 py-3 rounded-lg backdrop-blur-sm">
              <div className="text-sm text-green-50">เวลาปัจจุบัน</div>
              <div className="text-2xl font-bold">
                {currentTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
