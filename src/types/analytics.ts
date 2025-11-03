// ===================================
// Analytics Types
// ===================================

export interface MetricData {
  label: string;
  value: number;
  change: number;
  trend: 'up' | 'down';
}

export interface DeliveryStatus {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

export interface RealtimeMetric {
  time: string;
  deliveries: number;
  onTime: number;
  delayed: number;
}

export interface ActiveDelivery {
  id: string;
  driver: string;
  location: string;
  eta: string;
  status: 'on_track' | 'delayed' | 'urgent';
}

export interface AnalyticsData {
  metrics: MetricData[];
  deliveryStatus: DeliveryStatus[];
  activeDeliveries: ActiveDelivery[];
  realtimeData: RealtimeMetric[];
}
