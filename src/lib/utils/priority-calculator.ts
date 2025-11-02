// ===================================
// Priority Calculation Utility
// ===================================

import {
  DEFAULT_PRIORITY_WEIGHTS,
  TEMPERATURE_SCORES,
  CUSTOMER_PRIORITY_SCORES,
  ORDER_VALUE_THRESHOLDS,
  FRAGILITY_SCORES,
  PRIORITY_THRESHOLDS,
} from '../config/constants';
import type {
  PriorityResult,
  PriorityBreakdown,
  CustomerPriorityLevel,
  TemperatureCategory,
} from '../types';

// ============================================
// Main Priority Calculation Function
// ============================================

export function calculatePriorityScore(params: {
  temperatureCategory: string;
  expirationHours: number;
  customerPriority: string;
  orderValue: number;
  minutesUntilDeadline: number;
  isFragile: boolean;
}): PriorityResult {
  const {
    temperatureCategory,
    expirationHours,
    customerPriority,
    orderValue,
    minutesUntilDeadline,
    isFragile,
  } = params;

  // Calculate individual scores (0-100)
  const tempScore = calculateTemperatureScore(temperatureCategory);
  const expScore = calculateExpirationScore(expirationHours);
  const custScore = calculateCustomerScore(customerPriority);
  const valueScore = calculateValueScore(orderValue);
  const timeScore = calculateTimeWindowScore(minutesUntilDeadline);
  const fragilityScore = calculateFragilityScore(isFragile);

  // Apply weights
  const breakdown: PriorityBreakdown = {
    temperature: tempScore * DEFAULT_PRIORITY_WEIGHTS.temperature,
    expiration: expScore * DEFAULT_PRIORITY_WEIGHTS.expiration,
    customer: custScore * DEFAULT_PRIORITY_WEIGHTS.customer,
    value: valueScore * DEFAULT_PRIORITY_WEIGHTS.value,
    timeWindow: timeScore * DEFAULT_PRIORITY_WEIGHTS.timeWindow,
    fragility: fragilityScore * DEFAULT_PRIORITY_WEIGHTS.fragility,
  };

  // Calculate total score
  const score = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

  // Determine priority class
  const priorityClass = getPriorityClass(score);

  return {
    score: Math.round(score * 100) / 100, // Round to 2 decimal places
    class: priorityClass,
    breakdown,
  };
}

// ============================================
// Individual Score Calculators
// ============================================

export function calculateTemperatureScore(category: string): number {
  const normalizedCategory = category.toLowerCase() as TemperatureCategory;
  return TEMPERATURE_SCORES[normalizedCategory] || TEMPERATURE_SCORES.snack;
}

export function calculateExpirationScore(hoursUntilExpiry: number): number {
  if (hoursUntilExpiry <= 3) return 100;      // Hot food
  if (hoursUntilExpiry <= 8) return 90;       // Sandwiches
  if (hoursUntilExpiry <= 24) return 70;      // Fresh food
  if (hoursUntilExpiry <= 168) return 50;     // 1 week
  return 30;                                   // Long-lasting
}

export function calculateCustomerScore(priority: string): number {
  const normalizedPriority = priority.toLowerCase() as CustomerPriorityLevel;
  return CUSTOMER_PRIORITY_SCORES[normalizedPriority] || CUSTOMER_PRIORITY_SCORES.standard;
}

export function calculateValueScore(orderValue: number): number {
  for (const threshold of ORDER_VALUE_THRESHOLDS) {
    if (orderValue >= threshold.min) {
      return threshold.score;
    }
  }
  return 20; // Default minimum score
}

export function calculateTimeWindowScore(minutesRemaining: number): number {
  if (minutesRemaining <= 15) return 100;
  if (minutesRemaining <= 30) return 90;
  if (minutesRemaining <= 60) return 70;
  if (minutesRemaining <= 120) return 50;
  return 30;
}

export function calculateFragilityScore(isFragile: boolean): number {
  return isFragile ? FRAGILITY_SCORES.fragile : FRAGILITY_SCORES.normal;
}

// ============================================
// Priority Class Determination
// ============================================

export function getPriorityClass(score: number): 'critical' | 'high' | 'medium' | 'low' {
  if (score >= PRIORITY_THRESHOLDS.CRITICAL) return 'critical';
  if (score >= PRIORITY_THRESHOLDS.HIGH) return 'high';
  if (score >= PRIORITY_THRESHOLDS.MEDIUM) return 'medium';
  return 'low';
}

// ============================================
// Helper Functions
// ============================================

export function calculateMinutesUntilDeadline(deadlineDate: Date | string): number {
  const deadline = typeof deadlineDate === 'string' ? new Date(deadlineDate) : deadlineDate;
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60)));
}

export function calculateHoursUntilExpiry(expiryDate: Date | string): number {
  const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  return Math.max(0, diffMs / (1000 * 60 * 60));
}

export function getHighestTemperatureRequirement(categories: string[]): string {
  const scores = categories.map((cat) => ({
    category: cat,
    score: calculateTemperatureScore(cat),
  }));

  const highest = scores.reduce((max, curr) =>
    curr.score > max.score ? curr : max
  );

  return highest.category;
}

export function getEarliestExpiration(expirationDates: Date[]): Date {
  return new Date(Math.min(...expirationDates.map((d) => d.getTime())));
}

// ============================================
// Validation Functions
// ============================================

export function validatePriorityInputs(params: {
  temperatureCategory: string;
  expirationHours: number;
  customerPriority: string;
  orderValue: number;
  minutesUntilDeadline: number;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate temperature category
  const validCategories = Object.keys(TEMPERATURE_SCORES);
  if (!validCategories.includes(params.temperatureCategory.toLowerCase())) {
    errors.push(`Invalid temperature category: ${params.temperatureCategory}`);
  }

  // Validate expiration hours
  if (params.expirationHours < 0) {
    errors.push('Expiration hours must be non-negative');
  }

  // Validate customer priority
  const validPriorities = Object.keys(CUSTOMER_PRIORITY_SCORES);
  if (!validPriorities.includes(params.customerPriority.toLowerCase())) {
    errors.push(`Invalid customer priority: ${params.customerPriority}`);
  }

  // Validate order value
  if (params.orderValue < 0) {
    errors.push('Order value must be non-negative');
  }

  // Validate time window
  if (params.minutesUntilDeadline < 0) {
    errors.push('Minutes until deadline must be non-negative');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================
// Batch Processing
// ============================================

export function calculateBatchPriorities(
  orders: Array<{
    order_id: string;
    temperatureCategory: string;
    expirationHours: number;
    customerPriority: string;
    orderValue: number;
    minutesUntilDeadline: number;
    isFragile: boolean;
  }>
): Array<{
  order_id: string;
  priority: PriorityResult;
}> {
  return orders.map((order) => ({
    order_id: order.order_id,
    priority: calculatePriorityScore(order),
  }));
}

// ============================================
// Sorting & Ranking
// ============================================

export function sortByPriority<T extends { priority_score: number }>(
  items: T[],
  order: 'asc' | 'desc' = 'desc'
): T[] {
  return [...items].sort((a, b) => {
    const diff = a.priority_score - b.priority_score;
    return order === 'asc' ? diff : -diff;
  });
}

export function assignDeliveryOrder<T extends { priority_score: number }>(
  items: T[]
): Array<T & { delivery_order: number }> {
  const sorted = sortByPriority(items, 'desc');
  return sorted.map((item, index) => ({
    ...item,
    delivery_order: index + 1,
  }));
}
