// ===================================
// Driver Types
// ===================================

export interface DriverPerformance {
  driver_id: string;
  name: string;
  rank: number;
  total_deliveries: number;
  on_time_deliveries: number;
  on_time_rate: number;
  avg_delivery_time: number; // minutes
  fuel_efficiency: number; // km per liter
  total_distance: number; // km
  customer_rating: number;
  earnings: number;
  badge: string;
  trend: 'up' | 'down' | 'stable';
  weekly_deliveries: number[];
}

export interface DriverPerformanceData {
  drivers: DriverPerformance[];
  overallStats: {
    totalDrivers: number;
    avgOnTimeRate: string;
    avgFuelEfficiency: string;
    totalDeliveries: number;
  };
}
