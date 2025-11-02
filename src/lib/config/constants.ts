// ===================================
// Application Constants
// ===================================

import type { PriorityWeights } from '../types';

// ============================================
// Priority Calculation Weights
// ============================================

export const DEFAULT_PRIORITY_WEIGHTS: PriorityWeights = {
  temperature: 0.30,   // 30% - Highest weight
  expiration: 0.25,    // 25% - FEFO strategy
  customer: 0.15,      // 15% - Customer tier
  value: 0.10,         // 10% - Order value
  timeWindow: 0.15,    // 15% - Time sensitivity
  fragility: 0.05,     // 5% - Handling care
};

// Validate weights sum to 1.0
const weightsSum = Object.values(DEFAULT_PRIORITY_WEIGHTS).reduce((a, b) => a + b, 0);
if (Math.abs(weightsSum - 1.0) > 0.001) {
  throw new Error(`Priority weights must sum to 1.0, got ${weightsSum}`);
}

// ============================================
// Priority Thresholds
// ============================================

export const PRIORITY_THRESHOLDS = {
  CRITICAL: 75,  // 75-100: Deliver ≤30 min
  HIGH: 60,      // 60-74:  Deliver ≤60 min
  MEDIUM: 40,    // 40-59:  Deliver ≤90 min
  LOW: 0,        // 0-39:   Deliver ≤120 min
} as const;

// ============================================
// Temperature Scores
// ============================================

export const TEMPERATURE_SCORES = {
  hot_food: 100,   // 60-70°C - Cools quickly
  frozen: 90,      // -18°C - Melts easily
  chilled: 75,     // 0-4°C - Spoils fast (sandwiches)
  beverage: 40,    // 15-20°C - Lasts longer
  snack: 20,       // Ambient - Doesn't spoil
  medicine: 60,    // Ambient - Requires care
} as const;

// ============================================
// Expiration Scores
// ============================================

export const EXPIRATION_THRESHOLDS = {
  VERY_URGENT: { hours: 3, score: 100 },      // Hot food
  URGENT: { hours: 8, score: 90 },            // Sandwiches
  MODERATE: { hours: 24, score: 70 },         // Fresh food
  NORMAL: { hours: 168, score: 50 },          // 1 week
  LOW: { hours: Infinity, score: 30 },        // Long-lasting
} as const;

// ============================================
// Customer Priority Scores
// ============================================

export const CUSTOMER_PRIORITY_SCORES = {
  urgent: 100,     // VIP / Hospital
  high: 75,        // Premium members
  standard: 50,    // Regular customers
  economy: 25,     // Budget tier
} as const;

// ============================================
// Order Value Thresholds
// ============================================

export const ORDER_VALUE_THRESHOLDS = [
  { min: 500, score: 100 },
  { min: 200, score: 80 },
  { min: 100, score: 60 },
  { min: 50, score: 40 },
  { min: 0, score: 20 },
] as const;

// ============================================
// Time Window Scores
// ============================================

export const TIME_WINDOW_THRESHOLDS = {
  CRITICAL: { minutes: 15, score: 100 },
  VERY_URGENT: { minutes: 30, score: 90 },
  URGENT: { minutes: 60, score: 70 },
  MODERATE: { minutes: 120, score: 50 },
  NORMAL: { minutes: Infinity, score: 30 },
} as const;

// ============================================
// Fragility Scores
// ============================================

export const FRAGILITY_SCORES = {
  fragile: 100,    // Medicine, glass, chips
  normal: 30,      // Standard items
} as const;

// ============================================
// GPS Tracking Settings
// ============================================

export const GPS_SETTINGS = {
  UPDATE_INTERVAL_SECONDS: 15,
  BATCH_SIZE: 1000,
  RETENTION_DAYS: 30,

  // Thailand GPS bounds
  BOUNDS: {
    MIN_LATITUDE: 13.0,
    MAX_LATITUDE: 19.0,
    MIN_LONGITUDE: 97.0,
    MAX_LONGITUDE: 106.0,
  },

  // Speed validation
  MAX_SPEED_KMH: 120,
} as const;

// ============================================
// Route Optimization Settings
// ============================================

export const ROUTE_SETTINGS = {
  MAX_STOPS_PER_ROUTE: 20,
  MAX_ROUTE_DURATION_HOURS: 8,
  OPTIMIZATION_TIMEOUT_SECONDS: 30,
  TRAFFIC_UPDATE_INTERVAL_MINUTES: 5,
} as const;

// ============================================
// Cache TTL (seconds)
// ============================================

export const CACHE_TTL = {
  TRAFFIC: 300,      // 5 minutes
  WEATHER: 900,      // 15 minutes
  STORES: 3600,      // 1 hour
  PRODUCTS: 3600,    // 1 hour
  ROUTES: 1800,      // 30 minutes
} as const;

// ============================================
// API Rate Limits
// ============================================

export const API_LIMITS = {
  GOOGLE_MAPS_DAILY_QUOTA: 2500,
  GOOGLE_GEOCODING_DAILY_QUOTA: 1000,
  WEATHER_API_UNLIMITED: true,
} as const;

// ============================================
// Database Settings
// ============================================

export const DB_SETTINGS = {
  POOL_MIN: 2,
  POOL_MAX: 10,
  CONNECTION_TIMEOUT_MS: 20000,
  QUERY_TIMEOUT_MS: 30000,
} as const;

// ============================================
// Feature Flags
// ============================================

export const FEATURES = {
  ML_PREDICTIONS: false,
  REAL_TIME_TRACKING: true,
  AUTO_ROUTING: true,
  SMS_NOTIFICATIONS: false,
  EMAIL_NOTIFICATIONS: true,
} as const;

// ============================================
// Environment Variables (with defaults)
// ============================================

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000'),
  APP_URL: process.env.APP_URL || 'http://localhost:3000',

  // Database
  DATABASE_URL: process.env.DATABASE_URL!,

  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

  // Google Maps
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || '',

  // Weather
  WEATHER_API_KEY: process.env.WEATHER_API_KEY || '',
  WEATHER_API_URL: process.env.WEATHER_API_URL || 'https://data.tmd.go.th/api/v1',

  // AWS
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || 'deliverygenie-data-archive',
} as const;

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL'] as const;
for (const envVar of requiredEnvVars) {
  if (!ENV[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// ============================================
// Logging Levels
// ============================================

export const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
} as const;

export const CURRENT_LOG_LEVEL = LOG_LEVELS[
  (process.env.LOG_LEVEL?.toUpperCase() as keyof typeof LOG_LEVELS) || 'INFO'
];

// ============================================
// HTTP Status Codes
// ============================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ============================================
// Error Codes
// ============================================

export const ERROR_CODES = {
  // Validation errors (1xxx)
  VALIDATION_ERROR: 'E1000',
  INVALID_INPUT: 'E1001',
  MISSING_REQUIRED_FIELD: 'E1002',

  // Database errors (2xxx)
  DATABASE_ERROR: 'E2000',
  RECORD_NOT_FOUND: 'E2001',
  DUPLICATE_RECORD: 'E2002',

  // Business logic errors (3xxx)
  PRIORITY_CALCULATION_ERROR: 'E3000',
  ROUTE_OPTIMIZATION_ERROR: 'E3001',
  GPS_VALIDATION_ERROR: 'E3002',

  // External API errors (4xxx)
  GOOGLE_MAPS_ERROR: 'E4000',
  WEATHER_API_ERROR: 'E4001',

  // System errors (5xxx)
  INTERNAL_ERROR: 'E5000',
  SERVICE_UNAVAILABLE: 'E5001',
} as const;
