# DeliveryGenie Dashboard

> AI-Based Route Optimization System for Last-Mile Delivery in Thailand

**CS341 - Big Data Engineering Project**
King Mongkut's University of Technology Thonburi (KMUTT)

---

## Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Database Setup](#database-setup)
- [Priority Calculation System](#priority-calculation-system)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Team](#team)
- [License](#license)

---

## Overview

DeliveryGenie is an intelligent delivery management system designed to optimize last-mile delivery operations for 7-Eleven Thailand. The system handles **120,000-300,000 orders daily** across **6,000+ branches** in Bangkok and surrounding areas.

### Key Capabilities

- **Real-time GPS Tracking**: Track 500+ delivery drivers with 10-15 second update intervals
- **Smart Priority Calculation**: 6-factor algorithm for optimal delivery sequencing
- **Route Optimization**: AI-driven route planning with traffic and weather integration
- **Multi-temperature Management**: Support for hot food, frozen, chilled, and ambient products
- **Big Data Processing**: Handle 10-25 GB of data daily with 22M GPS points

---

## Problem Statement

### Current Challenges

- **Delivery Delays**: 25% of deliveries arrive late during peak hours (11:00-13:00, 18:00-20:00)
- **Product Spoilage**: Hot food cools down, frozen items melt, sandwiches spoil
- **High-Value Orders**: ฿200-500 orders mixed with ฿30-50 orders
- **Traffic Congestion**: Bangkok's traffic reduces delivery efficiency by 30-40%
- **Customer Priorities**: VIP customers (hospitals, corporate) get same treatment as regular customers

### Our Solution

DeliveryGenie uses **Big Data Analytics** and **Machine Learning** to:

1. Calculate real-time priority scores for every order
2. Optimize delivery routes based on traffic, weather, and priorities
3. Track driver locations and performance metrics
4. Predict delivery times with 95%+ accuracy
5. Reduce spoilage by prioritizing time-sensitive products

---

## Features

### Core Features

- **Priority-Based Scheduling**: 6-factor priority algorithm (Temperature, Expiration, Customer, Value, Time, Fragility)
- **Real-Time Tracking**: Live GPS tracking with 15-second updates
- **Route Optimization**: AI-powered routing with Google Maps integration
- **Traffic Integration**: Real-time traffic data from Google Maps Traffic API
- **Weather Integration**: Thai Meteorological Department API integration
- **Multi-Zone Vehicles**: Support for 4-compartment vehicles (hot, frozen, chilled, ambient)

### Analytics & Reporting

- **Driver Performance**: Delivery success rate, on-time percentage, distance traveled
- **Order Analytics**: Priority distribution, delivery time analysis, spoilage reduction
- **Traffic Patterns**: Congestion heatmaps, optimal delivery windows
- **Weather Impact**: Temperature effects on delivery times

---

## Tech Stack

### Frontend

- **Next.js 15**: React framework with App Router and Turbopack
- **TypeScript 5**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **React Query**: Server state management

### Backend

- **Next.js API Routes**: Serverless API endpoints
- **Prisma ORM 5**: Type-safe database access
- **PostgreSQL 15**: Primary database with PostGIS extension
- **Redis**: Caching layer (traffic, weather, routes)

### Infrastructure

- **AWS RDS**: Managed PostgreSQL database
- **AWS S3**: Data archival and backups
- **AWS Lambda**: Serverless functions (future)
- **Vercel**: Frontend deployment

### Data Processing

- **PostGIS**: Spatial data and geospatial queries
- **Python**: Data analysis and ML model training
- **Pandas/NumPy**: Data manipulation
- **Scikit-learn**: Machine learning models

### External APIs

- **Google Maps API**: Geocoding, directions, traffic
- **Thai Meteorological Department API**: Weather data
- **LINE Notify**: Customer notifications (future)

---

## Project Structure

```
delivery-genie-dashboard/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API Routes
│   │   │   ├── orders/
│   │   │   │   └── calculate-priority/
│   │   │   ├── drivers/
│   │   │   └── routes/
│   │   ├── layout.tsx            # Root layout
│   │   └── page.tsx              # Home page
│   │
│   ├── components/               # React Components
│   │   ├── ui/                   # Reusable UI components
│   │   │   ├── PriorityBadge.tsx
│   │   │   └── index.ts
│   │   ├── features/             # Feature-specific components
│   │   └── layouts/              # Layout components
│   │
│   ├── lib/                      # Core libraries
│   │   ├── config/               # Configuration
│   │   │   └── constants.ts      # App constants
│   │   ├── db/                   # Database
│   │   │   ├── prisma.ts         # Prisma client
│   │   │   └── queries.ts        # Database queries
│   │   ├── types/                # TypeScript types
│   │   │   └── index.ts          # Type definitions
│   │   ├── utils/                # Utility functions
│   │   │   └── priority-calculator.ts
│   │   └── index.ts              # Barrel export
│   │
│   └── styles/                   # Global styles
│       └── globals.css
│
├── prisma/                       # Database
│   ├── schema.prisma             # Database schema (20+ tables)
│   ├── seed.ts                   # Sample data
│   └── migrations/               # Database migrations
│
├── docs/                         # Documentation
│   ├── DATABASE_SCHEMA.md        # Complete schema docs
│   ├── AWS_RDS_SETUP_GUIDE.md    # RDS setup guide
│   ├── AWS_QUICK_START.md        # Quick start guide
│   └── PRIORITY_CALCULATION.md   # Algorithm details
│
├── scripts/                      # Utility scripts
│   ├── setup-rds.sh
│   ├── connect-rds.sh
│   └── backup-rds.sh
│
├── public/                       # Static assets
├── .env                          # Environment variables
├── .env.example                  # Environment template
├── package.json
├── tsconfig.json
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js 18+** and npm/yarn/pnpm
- **PostgreSQL 15+** (local or AWS RDS)
- **Redis** (optional, for caching)
- **Google Maps API Key**
- **Thai Meteorological Department API Key** (optional)

### Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd delivery-genie-dashboard
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/deliverygenie"

# Redis (optional)
REDIS_URL="redis://localhost:6379"

# Google Maps
GOOGLE_MAPS_API_KEY="your-google-maps-api-key"

# Thai Meteorological Department
WEATHER_API_KEY="your-weather-api-key"
WEATHER_API_URL="https://data.tmd.go.th/api/v1"

# AWS (for S3 backups)
AWS_REGION="us-east-1"
AWS_S3_BUCKET="deliverygenie-data-archive"
```

4. **Set up the database**

```bash
# Push schema to database
npm run db:push

# Seed with sample data
npm run db:seed
```

5. **Run the development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

---

## Database Setup

### AWS RDS Setup

We use AWS RDS PostgreSQL 15 with PostGIS extension. See detailed setup instructions in:

- **[AWS RDS Setup Guide](docs/AWS_RDS_SETUP_GUIDE.md)** - Complete setup walkthrough
- **[AWS Quick Start](docs/AWS_QUICK_START.md)** - 5-minute quick start

**RDS Configuration:**

- **Instance Class**: db.t3.micro (Free Tier eligible)
- **Storage**: 20 GB General Purpose SSD (gp3)
- **PostgreSQL Version**: 15.x
- **Multi-AZ**: No (to reduce costs)
- **Public Access**: Yes (for development)
- **Backup Retention**: 7 days
- **Security Group**: Port 5432 open to 0.0.0.0/0 (development only)

### Database Schema

Our schema includes **20+ tables** organized into 10 domains:

1. **Customer & Store Management**: customers, stores
2. **Product Catalog**: products, product_categories
3. **Order Management**: orders, order_items
4. **Driver & Vehicle**: drivers, vehicles, driver_schedules
5. **Delivery & Routing**: deliveries, routes, route_stops
6. **GPS Tracking**: gps_tracking (partitioned by month)
7. **Traffic & Weather**: traffic_data, weather_data
8. **Priority System**: priority_configs, priority_history
9. **Analytics**: delivery_analytics
10. **System**: system_logs, audit_logs

See **[DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md)** for complete documentation.

### Key Database Features

- **Partitioning**: GPS data partitioned by month (22M points/day)
- **Indexing**: 50+ indexes for optimal query performance
- **PostGIS**: Spatial queries for location-based operations
- **JSON Support**: Flexible data storage for priority breakdown
- **Audit Trail**: Complete history of priority calculations

---

## Priority Calculation System

### Algorithm Overview

The priority score is calculated using **6 weighted factors**:

| Factor | Weight | Purpose |
|--------|--------|---------|
| **Temperature** | 30% | Hot food cools, frozen melts |
| **Expiration** | 25% | FEFO strategy (First-Expired-First-Out) |
| **Customer Priority** | 15% | VIP, Premium, Standard, Economy |
| **Order Value** | 10% | High-value orders prioritized |
| **Time Window** | 15% | Minutes until delivery deadline |
| **Fragility** | 5% | Medicine, glass, chips |

**Total Score**: 0-100 (weighted sum)

### Priority Classes

| Class | Score Range | Delivery Target | Color |
|-------|-------------|-----------------|-------|
| **Critical** | 75-100 | ≤30 minutes | 🔴 Red |
| **High** | 60-74 | ≤60 minutes | 🟠 Orange |
| **Medium** | 40-59 | ≤90 minutes | 🔵 Blue |
| **Low** | 0-39 | ≤120 minutes | 🟢 Green |

### Temperature Scoring

```typescript
const TEMPERATURE_SCORES = {
  hot_food: 100,   // 60-70°C - Cools quickly
  frozen: 90,      // -18°C - Melts easily
  chilled: 75,     // 0-4°C - Spoils fast (sandwiches)
  beverage: 40,    // 15-20°C - Lasts longer
  snack: 20,       // Ambient - Doesn't spoil
  medicine: 60,    // Ambient - Requires care
};
```

### Example Calculation

```typescript
import { calculatePriorityScore } from '@/lib';

const result = calculatePriorityScore({
  temperatureCategory: 'hot_food',
  expirationHours: 2,
  customerPriority: 'urgent',
  orderValue: 350,
  minutesUntilDeadline: 25,
  isFragile: false,
});

// Result:
// {
//   score: 87.5,
//   class: 'critical',
//   breakdown: {
//     temperature: 30.0,  // 100 * 0.30
//     expiration: 25.0,   // 100 * 0.25
//     customer: 15.0,     // 100 * 0.15
//     value: 8.0,         // 80 * 0.10
//     timeWindow: 9.0,    // 90 * 0.15
//     fragility: 1.5      // 30 * 0.05
//   }
// }
```

See **[PRIORITY_CALCULATION.md](docs/PRIORITY_CALCULATION.md)** for detailed algorithm documentation.

---

## API Documentation

### Calculate Priority

**POST** `/api/orders/calculate-priority`

Calculate priority score for an order.

**Request:**

```json
{
  "temperatureCategory": "hot_food",
  "expirationHours": 2,
  "customerPriority": "urgent",
  "orderValue": 350,
  "minutesUntilDeadline": 25,
  "isFragile": false
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "score": 87.5,
    "class": "critical",
    "breakdown": {
      "temperature": 30.0,
      "expiration": 25.0,
      "customer": 15.0,
      "value": 8.0,
      "timeWindow": 9.0,
      "fragility": 1.5
    }
  }
}
```

### Get Orders

**GET** `/api/orders?status=pending&priorityClass=critical`

Retrieve orders with filtering and sorting.

### Get Routes

**GET** `/api/routes/:routeId`

Get route details with optimized stop sequence.

### Update GPS Location

**POST** `/api/drivers/:driverId/location`

Update driver's GPS location.

---

## Development

### Available Scripts

```bash
# Development
npm run dev              # Start dev server (localhost:3000)
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Database
npm run db:push          # Push schema to database
npm run db:seed          # Seed with sample data
npm run db:studio        # Open Prisma Studio
npm run db:migrate       # Run migrations

# Testing (future)
npm run test             # Run tests
npm run test:watch       # Run tests in watch mode
```

### Code Structure

- **API Routes**: `src/app/api/` - Serverless functions
- **Components**: `src/components/` - Reusable React components
- **Types**: `src/lib/types/` - TypeScript type definitions
- **Utils**: `src/lib/utils/` - Helper functions
- **Config**: `src/lib/config/` - Application constants

### Import Conventions

Use barrel exports for clean imports:

```typescript
// ✅ Good - Clean imports
import {
  calculatePriorityScore,
  DEFAULT_PRIORITY_WEIGHTS,
  type PriorityResult
} from '@/lib';

// ❌ Bad - Deep imports
import { calculatePriorityScore } from '@/lib/utils/priority-calculator';
import { DEFAULT_PRIORITY_WEIGHTS } from '@/lib/config/constants';
import type { PriorityResult } from '@/lib/types';
```

### Database Queries

Use Prisma for type-safe queries:

```typescript
import { prisma } from '@/lib';

// Find orders with high priority
const orders = await prisma.order.findMany({
  where: {
    priority_class: 'critical',
    status: 'pending',
  },
  orderBy: {
    priority_score: 'desc',
  },
  include: {
    items: true,
    delivery: true,
  },
});
```

---

## Team

**CS341 Big Data Engineering - KMUTT**

| Name | Role | Student ID |
|------|------|-----------|
| **Peerapat Srijerm** | Project Manager, Backend Dev | 66070501023 |
| **Sorawish Setthawong** | Data Engineer, ML Engineer | 66070501054 |
| **Thanakit Loakietkulchai** | Frontend Dev, UI/UX | 66070501078 |
| **Saradanai Warapong** | DevOps, Cloud Infrastructure | 66070501085 |

**Advisor**: TBA
**Institution**: King Mongkut's University of Technology Thonburi (KMUTT)
**Department**: Computer Engineering
**Year**: 2024-2025

---

## 5Vs of Big Data Strategy

### Volume
- **10-25 GB** of data generated daily
- **22 million** GPS points per day
- **6,000+** active stores
- **500+** delivery drivers

### Velocity
- GPS updates every **10-15 seconds**
- **120K-300K** orders processed daily
- Real-time traffic updates every **5 minutes**
- Weather data updated every **15 minutes**

### Variety
- **Structured**: Orders, GPS, deliveries (80%)
- **Semi-structured**: JSON (priority breakdowns, traffic)
- **Unstructured**: Driver notes, customer feedback

### Veracity
- GPS validation (Thailand bounds, max speed 120 km/h)
- Temperature validation (hot food: 60-70°C, frozen: -18°C)
- Order value validation (฿20-1000 range)

### Value
- **25% reduction** in delivery delays (target)
- **30% decrease** in product spoilage (target)
- **15% improvement** in customer satisfaction (target)
- **20% increase** in driver efficiency (target)

---

## License

This project is for educational purposes as part of CS341 Big Data Engineering course at KMUTT.

---

## Resources

- **[Database Schema Documentation](docs/DATABASE_SCHEMA.md)**
- **[AWS RDS Setup Guide](docs/AWS_RDS_SETUP_GUIDE.md)**
- **[Priority Calculation Details](docs/PRIORITY_CALCULATION.md)**
- **Next.js Documentation**: https://nextjs.org/docs
- **Prisma Documentation**: https://www.prisma.io/docs
- **PostGIS Documentation**: https://postgis.net/docs

---

**Built with ❤️ by Team DeliveryGenie | KMUTT 2024-2025**
