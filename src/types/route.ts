// ===================================
// Route Types
// ===================================

export interface Location {
  name: string;
  lat: number;
  lon: number;
  priority?: number;
}

export interface RouteResult {
  original_order: string[];
  optimized_order: string[];
  total_distance: number;
  total_duration: number;
  savings?: {
    distance_saved: number;
    time_saved: number;
  };
}

export type OptimizationType = 'core' | 'multi-stop' | 'traffic';
