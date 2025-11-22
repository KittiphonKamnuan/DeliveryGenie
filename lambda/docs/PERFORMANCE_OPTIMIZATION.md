# ⚡ Performance Optimization Guide - DeliveryGenie

**Problem**: `npm run dev` และ `npm run build` ช้า

---

## 🐌 สาเหตุที่ช้า

1. **Turbopack (Beta)** - ยังไม่เสถียร
2. **TypeScript** - 71 ไฟล์ ต้อง type check
3. **Prisma** - Generate client ใช้เวลา
4. **Map Libraries** - Google Maps/Leaflet ขนาดใหญ่
5. **Components** - 20+ components ต้อง compile

---

## ✅ วิธีแก้ (แนะนำ)

### 1. ปิด Turbopack (ใช้ Webpack ปกติ)

**แก้ไข `package.json`:**
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

**คำสั่ง**:
```bash
npm run dev
```

---

### 2. เพิ่ม SWC Minification

**แก้ไข `next.config.ts`:**
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true, // เพิ่มบรรทัดนี้

  // Optimize images
  images: {
    domains: ['maps.googleapis.com'],
  },

  // Reduce build output
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

export default nextConfig;
```

---

### 3. เพิ่ม TypeScript Incremental Build

**สร้าง/แก้ไข `tsconfig.json`:**
```json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo"
  }
}
```

---

### 4. ปิด Type Checking ใน Dev Mode

**แก้ไข `next.config.ts`:**
```typescript
const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // ปิด type check ตอน dev (เร็วขึ้น)
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },

  // ปิด ESLint ตอน build (เร็วขึ้น)
  eslint: {
    ignoreDuringBuilds: true,
  },
};
```

---

### 5. ใช้ Dynamic Import สำหรับ Map Components

**แก้ไข pages ที่ใช้ Map:**

**Before:**
```typescript
import VehicleTrackingMap from '@/components/map/VehicleTrackingMap';

export default function Page() {
  return <VehicleTrackingMap />;
}
```

**After:**
```typescript
import dynamic from 'next/dynamic';

const VehicleTrackingMap = dynamic(
  () => import('@/components/map/VehicleTrackingMap'),
  {
    ssr: false,
    loading: () => <LoadingSpinner />
  }
);

export default function Page() {
  return <VehicleTrackingMap />;
}
```

---

### 6. Cache Prisma Client

**แก้ไข `src/lib/prisma.ts`:**
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

---

### 7. ลดขนาด node_modules

```bash
# ลบ node_modules และ reinstall
rm -rf node_modules package-lock.json
npm install

# หรือใช้ pnpm (เร็วกว่า npm)
npm install -g pnpm
pnpm install
```

---

### 8. ใช้ Production Dependencies Only

**ตอน deploy ใช้:**
```bash
npm install --production
```

---

## 🚀 Quick Fix (แนะนำที่สุด)

**แก้ไข `package.json` และ `next.config.ts` เท่านั้น:**

### 1. package.json
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

### 2. next.config.ts
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Speed up development
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  // Optimize images
  images: {
    domains: ['maps.googleapis.com'],
  },
};

export default nextConfig;
```

**แล้วรัน:**
```bash
npm run dev
```

---

## 📊 ผลลัพธ์ที่คาดหวัง

| การแก้ไข | Dev Start Time | Build Time |
|----------|---------------|------------|
| **Before** | 30-60s | 2-3 min |
| **After** | 10-15s | 1-2 min |
| **Improvement** | 50-70% | 33-50% |

---

## 🔥 Advanced Optimization (Optional)

### 1. ใช้ SWC Loader สำหรับ Libraries

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  experimental: {
    swcPlugins: [],
  },
};
```

### 2. Parallel Build

```bash
# ใน package.json
"build": "next build --experimental-build-worker"
```

### 3. Reduce Bundle Size

```bash
# ติดตั้ง bundle analyzer
npm install --save-dev @next/bundle-analyzer

# next.config.ts
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);

# รัน
ANALYZE=true npm run build
```

---

## ⚡ ทำทันที (ไม่ต้องแก้โค้ด)

### Option 1: ใช้ --fast-refresh
```bash
NEXT_PRIVATE_FAST_REFRESH=true npm run dev
```

### Option 2: เพิ่ม Memory สำหรับ Node
```bash
NODE_OPTIONS='--max-old-space-size=4096' npm run dev
```

### Option 3: ลด Parallel Processes
```bash
# ใน .env.local
NEXT_TELEMETRY_DISABLED=1
```

---

## 🎯 Recommended Steps (ทำตามลำดับ)

1. ✅ **ปิด Turbopack** (แก้ package.json)
2. ✅ **แก้ next.config.ts** (เพิ่ม swcMinify + ignore checks)
3. ✅ **เพิ่ม Memory** (NODE_OPTIONS)
4. ⚠️ **Dynamic Import Maps** (ถ้ายังช้า)
5. ⚠️ **ใช้ pnpm แทน npm** (ถ้ายังช้า)

---

## 🔍 Debugging

### เช็คว่าอะไรทำให้ช้า:
```bash
# เปิด verbose logging
DEBUG=* npm run dev

# หรือ
NEXT_DEBUG_BUILD=1 npm run build
```

---

## ✅ Solution Summary

**แก้เร็วที่สุด (1 นาที):**
```bash
# 1. ลบ --turbopack จาก package.json
# 2. เพิ่ม swcMinify: true ใน next.config.ts
# 3. รัน
npm run dev
```

**ควรเร็วขึ้น 50-70%!** ⚡
