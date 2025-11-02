-- ===================================
-- DeliveryGenie Advanced Indexes
-- Purpose: Optimize query performance
-- ===================================

-- ============================================
-- 1. SPATIAL INDEXES (Requires PostGIS)
-- ============================================

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add spatial columns
ALTER TABLE customers ADD COLUMN IF NOT EXISTS location geography(POINT, 4326);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS location geography(POINT, 4326);

-- Populate spatial columns
UPDATE customers SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography;
UPDATE stores SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography;

-- Create spatial indexes
CREATE INDEX IF NOT EXISTS idx_customers_location_gist ON customers USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_stores_location_gist ON stores USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_gps_trackings_location ON gps_trackings USING GIST(ST_MakePoint(longitude, latitude));

-- ============================================
-- 2. COMPOSITE INDEXES
-- ============================================

-- Orders: Priority + Date (most common query)
CREATE INDEX IF NOT EXISTS idx_orders_priority_date
ON orders(priority_score DESC, delivery_date, order_status);

-- Orders: Status + Date (for filtering)
CREATE INDEX IF NOT EXISTS idx_orders_status_date
ON orders(order_status, delivery_date)
WHERE order_status IN ('pending', 'assigned', 'in_transit');

-- Deliveries: Status + Driver + Date
CREATE INDEX IF NOT EXISTS idx_deliveries_status_driver_date
ON deliveries(delivery_status, driver_id, created_at DESC);

-- GPS Tracking: Driver + Time (for route replay)
CREATE INDEX IF NOT EXISTS idx_gps_driver_timestamp
ON gps_trackings(driver_id, timestamp DESC, recorded_date);

-- GPS Tracking: Vehicle + Time
CREATE INDEX IF NOT EXISTS idx_gps_vehicle_timestamp
ON gps_trackings(vehicle_id, timestamp DESC, recorded_date);

-- Route Stops: Route + Order (for efficiency)
CREATE INDEX IF NOT EXISTS idx_route_stops_route_order
ON route_stops(route_id, stop_order, status);

-- ============================================
-- 3. PARTIAL INDEXES (Smaller, Faster)
-- ============================================

-- Only index active orders
CREATE INDEX IF NOT EXISTS idx_orders_active
ON orders(delivery_date, priority_score DESC)
WHERE order_status IN ('pending', 'assigned', 'in_transit');

-- Only index active drivers
CREATE INDEX IF NOT EXISTS idx_drivers_active
ON drivers(status, rating DESC, on_time_rate DESC)
WHERE status = 'active';

-- Only index available vehicles
CREATE INDEX IF NOT EXISTS idx_vehicles_available
ON vehicles(vehicle_type, capacity_weight_kg)
WHERE current_status = 'available';

-- Only index recent GPS data (last 7 days)
CREATE INDEX IF NOT EXISTS idx_gps_recent
ON gps_trackings(driver_id, timestamp DESC)
WHERE recorded_date >= CURRENT_DATE - INTERVAL '7 days';

-- ============================================
-- 4. COVERING INDEXES (Index-only scans)
-- ============================================

-- Orders: Include frequently accessed columns
CREATE INDEX IF NOT EXISTS idx_orders_covering
ON orders(order_status, delivery_date)
INCLUDE (priority_score, priority_class, customer_id, total_amount);

-- Deliveries: Include status and times
CREATE INDEX IF NOT EXISTS idx_deliveries_covering
ON deliveries(driver_id, delivery_status)
INCLUDE (order_id, estimated_arrival, actual_arrival, delay_minutes);

-- ============================================
-- 5. EXPRESSION INDEXES
-- ============================================

-- Date-based queries (extract date from timestamp)
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date
ON orders((delivery_date::date));

CREATE INDEX IF NOT EXISTS idx_deliveries_created_date
ON deliveries((created_at::date));

-- Lowercase search for customer names
CREATE INDEX IF NOT EXISTS idx_customers_name_lower
ON customers(LOWER(name));

-- ============================================
-- 6. FULL-TEXT SEARCH INDEXES
-- ============================================

-- Add tsvector columns
ALTER TABLE orders ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Populate tsvector columns
UPDATE orders SET search_vector =
  to_tsvector('simple', COALESCE(order_number, '') || ' ' ||
                        COALESCE(delivery_address, '') || ' ' ||
                        COALESCE(delivery_notes, ''));

UPDATE customers SET search_vector =
  to_tsvector('simple', COALESCE(name, '') || ' ' ||
                        COALESCE(phone, '') || ' ' ||
                        COALESCE(address_line1, ''));

UPDATE products SET search_vector =
  to_tsvector('simple', COALESCE(sku, '') || ' ' ||
                        COALESCE(name, '') || ' ' ||
                        COALESCE(description, ''));

-- Create GIN indexes for full-text search
CREATE INDEX IF NOT EXISTS idx_orders_search
ON orders USING GIN(search_vector);

CREATE INDEX IF NOT EXISTS idx_customers_search
ON customers USING GIN(search_vector);

CREATE INDEX IF NOT EXISTS idx_products_search
ON products USING GIN(search_vector);

-- ============================================
-- 7. BTREE INDEXES FOR SORTING
-- ============================================

-- Orders by priority (DESC)
CREATE INDEX IF NOT EXISTS idx_orders_priority_desc
ON orders(priority_score DESC NULLS LAST, created_at DESC);

-- Drivers by rating (DESC)
CREATE INDEX IF NOT EXISTS idx_drivers_rating_desc
ON drivers(rating DESC NULLS LAST, total_deliveries DESC);

-- Routes by optimization score
CREATE INDEX IF NOT EXISTS idx_routes_optimization
ON routes(optimization_score DESC NULLS LAST, route_date DESC);

-- ============================================
-- 8. JSONB INDEXES
-- ============================================

-- Index specific JSON fields
CREATE INDEX IF NOT EXISTS idx_orders_priority_breakdown
ON orders USING GIN(priority_breakdown jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_vehicles_temp_zones
ON vehicles USING GIN(temperature_zones jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_routes_geometry
ON routes USING GIN(route_geometry jsonb_path_ops);

-- ============================================
-- 9. FOREIGN KEY INDEXES (Performance)
-- ============================================

-- These might already exist, but ensuring they're present
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_driver_id ON deliveries(driver_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_vehicle_id ON deliveries(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_route_id ON deliveries(route_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_route_id ON route_stops(route_id);
CREATE INDEX IF NOT EXISTS idx_gps_trackings_driver_id ON gps_trackings(driver_id);
CREATE INDEX IF NOT EXISTS idx_gps_trackings_vehicle_id ON gps_trackings(vehicle_id);

-- ============================================
-- VERIFY INDEXES
-- ============================================

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Check index usage statistics
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

ANALYZE; -- Update statistics
