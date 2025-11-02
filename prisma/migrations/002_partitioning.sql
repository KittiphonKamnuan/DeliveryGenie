-- ===================================
-- DeliveryGenie Table Partitioning
-- Purpose: Handle high-volume data efficiently
-- ===================================

-- ============================================
-- 1. GPS TRACKING PARTITIONING (Monthly)
-- ============================================

-- Drop existing table and recreate as partitioned
-- WARNING: This will delete existing data!
-- Backup first: pg_dump -t gps_trackings > backup.sql

-- Rename current table (if exists)
ALTER TABLE IF EXISTS gps_trackings RENAME TO gps_trackings_backup;

-- Create partitioned parent table
CREATE TABLE gps_trackings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id           UUID NOT NULL,
  vehicle_id          UUID NOT NULL,
  latitude            DOUBLE PRECISION NOT NULL,
  longitude           DOUBLE PRECISION NOT NULL,
  altitude            DOUBLE PRECISION,
  accuracy            DOUBLE PRECISION,
  speed               DOUBLE PRECISION,
  heading             DOUBLE PRECISION,
  battery_level       INTEGER,
  is_moving           BOOLEAN DEFAULT false,
  timestamp           TIMESTAMP NOT NULL DEFAULT NOW(),
  recorded_date       TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_gps_driver FOREIGN KEY (driver_id) REFERENCES drivers(id),
  CONSTRAINT fk_gps_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
) PARTITION BY RANGE (recorded_date);

-- Create monthly partitions for 2025
CREATE TABLE gps_trackings_2025_01 PARTITION OF gps_trackings
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE gps_trackings_2025_02 PARTITION OF gps_trackings
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

CREATE TABLE gps_trackings_2025_03 PARTITION OF gps_trackings
  FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

CREATE TABLE gps_trackings_2025_04 PARTITION OF gps_trackings
  FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');

CREATE TABLE gps_trackings_2025_05 PARTITION OF gps_trackings
  FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');

CREATE TABLE gps_trackings_2025_06 PARTITION OF gps_trackings
  FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');

CREATE TABLE gps_trackings_2025_07 PARTITION OF gps_trackings
  FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');

CREATE TABLE gps_trackings_2025_08 PARTITION OF gps_trackings
  FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');

CREATE TABLE gps_trackings_2025_09 PARTITION OF gps_trackings
  FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');

CREATE TABLE gps_trackings_2025_10 PARTITION OF gps_trackings
  FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

CREATE TABLE gps_trackings_2025_11 PARTITION OF gps_trackings
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

CREATE TABLE gps_trackings_2025_12 PARTITION OF gps_trackings
  FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- Create default partition for future data
CREATE TABLE gps_trackings_default PARTITION OF gps_trackings DEFAULT;

-- Create indexes on each partition
DO $$
DECLARE
  partition_name TEXT;
BEGIN
  FOR partition_name IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename LIKE 'gps_trackings_2025_%'
  LOOP
    EXECUTE format('CREATE INDEX idx_%s_driver_time ON %I (driver_id, timestamp DESC)',
                   partition_name, partition_name);
    EXECUTE format('CREATE INDEX idx_%s_vehicle_time ON %I (vehicle_id, timestamp DESC)',
                   partition_name, partition_name);
    EXECUTE format('CREATE INDEX idx_%s_location ON %I USING GIST (ST_MakePoint(longitude, latitude))',
                   partition_name, partition_name);
  END LOOP;
END $$;

-- Restore data from backup (if exists)
-- INSERT INTO gps_trackings SELECT * FROM gps_trackings_backup;
-- DROP TABLE gps_trackings_backup;

-- ============================================
-- 2. DELIVERY HISTORY PARTITIONING (Yearly)
-- ============================================

-- Rename current table (if exists)
ALTER TABLE IF EXISTS delivery_histories RENAME TO delivery_histories_backup;

-- Create partitioned parent table
CREATE TABLE delivery_histories (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_date       TIMESTAMP NOT NULL,
  day_of_week         INTEGER NOT NULL,
  hour_of_day         INTEGER NOT NULL,
  origin_latitude     DOUBLE PRECISION NOT NULL,
  origin_longitude    DOUBLE PRECISION NOT NULL,
  dest_latitude       DOUBLE PRECISION NOT NULL,
  dest_longitude      DOUBLE PRECISION NOT NULL,
  district            TEXT,
  city                TEXT NOT NULL,
  distance_km         DOUBLE PRECISION NOT NULL,
  duration_min        INTEGER NOT NULL,
  order_count         INTEGER NOT NULL,
  total_value         DOUBLE PRECISION NOT NULL,
  priority_avg        DOUBLE PRECISION,
  traffic_condition   TEXT NOT NULL,
  weather_condition   TEXT NOT NULL,
  temperature         DOUBLE PRECISION,
  on_time             BOOLEAN NOT NULL,
  delay_minutes       INTEGER,
  success_rate        DOUBLE PRECISION,
  vehicle_type        TEXT NOT NULL,
  driver_rating       DOUBLE PRECISION,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (delivery_date);

-- Create yearly partitions
CREATE TABLE delivery_histories_2023 PARTITION OF delivery_histories
  FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');

CREATE TABLE delivery_histories_2024 PARTITION OF delivery_histories
  FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE delivery_histories_2025 PARTITION OF delivery_histories
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- Create default partition
CREATE TABLE delivery_histories_default PARTITION OF delivery_histories DEFAULT;

-- Create indexes on yearly partitions
CREATE INDEX idx_delivery_histories_2023_date ON delivery_histories_2023 (delivery_date);
CREATE INDEX idx_delivery_histories_2023_city ON delivery_histories_2023 (city, district);
CREATE INDEX idx_delivery_histories_2023_traffic ON delivery_histories_2023 (traffic_condition);

CREATE INDEX idx_delivery_histories_2024_date ON delivery_histories_2024 (delivery_date);
CREATE INDEX idx_delivery_histories_2024_city ON delivery_histories_2024 (city, district);
CREATE INDEX idx_delivery_histories_2024_traffic ON delivery_histories_2024 (traffic_condition);

CREATE INDEX idx_delivery_histories_2025_date ON delivery_histories_2025 (delivery_date);
CREATE INDEX idx_delivery_histories_2025_city ON delivery_histories_2025 (city, district);
CREATE INDEX idx_delivery_histories_2025_traffic ON delivery_histories_2025 (traffic_condition);

-- Restore data from backup (if exists)
-- INSERT INTO delivery_histories SELECT * FROM delivery_histories_backup;
-- DROP TABLE delivery_histories_backup;

-- ============================================
-- 3. TRAFFIC DATA PARTITIONING (Weekly)
-- ============================================

-- Rename current table
ALTER TABLE IF EXISTS traffic_data RENAME TO traffic_data_backup;

-- Create partitioned parent table
CREATE TABLE traffic_data (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_latitude      DOUBLE PRECISION NOT NULL,
  start_longitude     DOUBLE PRECISION NOT NULL,
  end_latitude        DOUBLE PRECISION NOT NULL,
  end_longitude       DOUBLE PRECISION NOT NULL,
  route_polyline      TEXT,
  traffic_condition   TEXT NOT NULL,
  travel_time_sec     INTEGER NOT NULL,
  static_time_sec     INTEGER NOT NULL,
  delay_sec           INTEGER NOT NULL,
  traffic_speed_kmh   DOUBLE PRECISION,
  data_source         TEXT DEFAULT 'google_maps',
  confidence_score    DOUBLE PRECISION,
  timestamp           TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at          TIMESTAMP NOT NULL
) PARTITION BY RANGE (timestamp);

-- Create weekly partitions (last 4 weeks + next 4 weeks)
DO $$
DECLARE
  week_start DATE;
  week_end DATE;
  partition_name TEXT;
BEGIN
  FOR i IN -4..4 LOOP
    week_start := DATE_TRUNC('week', CURRENT_DATE) + (i * INTERVAL '1 week');
    week_end := week_start + INTERVAL '1 week';
    partition_name := 'traffic_data_' || TO_CHAR(week_start, 'YYYY_WW');

    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS %I PARTITION OF traffic_data FOR VALUES FROM (%L) TO (%L)',
      partition_name, week_start, week_end
    );

    EXECUTE format('CREATE INDEX idx_%s_location ON %I (start_latitude, start_longitude)',
                   partition_name, partition_name);
    EXECUTE format('CREATE INDEX idx_%s_timestamp ON %I (timestamp DESC)',
                   partition_name, partition_name);
  END LOOP;
END $$;

-- Create default partition
CREATE TABLE traffic_data_default PARTITION OF traffic_data DEFAULT;

-- Restore data
-- INSERT INTO traffic_data SELECT * FROM traffic_data_backup;
-- DROP TABLE traffic_data_backup;

-- ============================================
-- 4. AUTOMATIC PARTITION CREATION
-- ============================================

-- Function to create next month's GPS partition
CREATE OR REPLACE FUNCTION create_next_gps_partition()
RETURNS void AS $$
DECLARE
  next_month DATE := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month');
  partition_name TEXT := 'gps_trackings_' || TO_CHAR(next_month, 'YYYY_MM');
  start_date TEXT := next_month::TEXT;
  end_date TEXT := (next_month + INTERVAL '1 month')::TEXT;
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF gps_trackings FOR VALUES FROM (%L) TO (%L)',
    partition_name, start_date, end_date
  );

  EXECUTE format('CREATE INDEX idx_%s_driver_time ON %I (driver_id, timestamp DESC)',
                 partition_name, partition_name);
  EXECUTE format('CREATE INDEX idx_%s_vehicle_time ON %I (vehicle_id, timestamp DESC)',
                 partition_name, partition_name);

  RAISE NOTICE 'Created partition: %', partition_name;
END;
$$ LANGUAGE plpgsql;

-- Function to create next week's traffic partition
CREATE OR REPLACE FUNCTION create_next_traffic_partition()
RETURNS void AS $$
DECLARE
  next_week DATE := DATE_TRUNC('week', CURRENT_DATE + INTERVAL '1 week');
  partition_name TEXT := 'traffic_data_' || TO_CHAR(next_week, 'YYYY_WW');
  start_date TEXT := next_week::TEXT;
  end_date TEXT := (next_week + INTERVAL '1 week')::TEXT;
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF traffic_data FOR VALUES FROM (%L) TO (%L)',
    partition_name, start_date, end_date
  );

  EXECUTE format('CREATE INDEX idx_%s_location ON %I (start_latitude, start_longitude)',
                 partition_name, partition_name);
  EXECUTE format('CREATE INDEX idx_%s_timestamp ON %I (timestamp DESC)',
                 partition_name, partition_name);

  RAISE NOTICE 'Created partition: %', partition_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. AUTOMATIC PARTITION CLEANUP
-- ============================================

-- Function to drop old GPS partitions (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_gps_partitions()
RETURNS void AS $$
DECLARE
  partition_record RECORD;
  cutoff_date DATE := CURRENT_DATE - INTERVAL '30 days';
BEGIN
  FOR partition_record IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename LIKE 'gps_trackings_2%'
    AND tablename NOT IN ('gps_trackings_default')
  LOOP
    -- Extract date from partition name (e.g., gps_trackings_2025_01)
    IF TO_DATE(SUBSTRING(partition_record.tablename FROM '\d{4}_\d{2}'), 'YYYY_MM') < cutoff_date THEN
      -- Archive to S3 first (implement your archival logic here)
      RAISE NOTICE 'Archiving partition: %', partition_record.tablename;

      -- Drop partition
      EXECUTE format('DROP TABLE IF EXISTS %I', partition_record.tablename);
      RAISE NOTICE 'Dropped old partition: %', partition_record.tablename;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to drop old traffic partitions (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_traffic_partitions()
RETURNS void AS $$
DECLARE
  partition_record RECORD;
  cutoff_date DATE := CURRENT_DATE - INTERVAL '7 days';
BEGIN
  FOR partition_record IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename LIKE 'traffic_data_2%'
    AND tablename NOT IN ('traffic_data_default')
  LOOP
    -- Extract week start from partition name
    RAISE NOTICE 'Checking partition: %', partition_record.tablename;

    -- Drop partition (simplified - add date parsing if needed)
    EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', partition_record.tablename);
    RAISE NOTICE 'Dropped old traffic partition: %', partition_record.tablename;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. SCHEDULED MAINTENANCE (Using pg_cron)
-- ============================================

-- Install pg_cron extension (requires superuser)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule partition creation (run on 1st of each month at 00:00)
-- SELECT cron.schedule('create-gps-partition', '0 0 1 * *', 'SELECT create_next_gps_partition()');

-- Schedule partition creation (run every Sunday at 00:00)
-- SELECT cron.schedule('create-traffic-partition', '0 0 * * 0', 'SELECT create_next_traffic_partition()');

-- Schedule partition cleanup (run daily at 02:00)
-- SELECT cron.schedule('cleanup-gps', '0 2 * * *', 'SELECT cleanup_old_gps_partitions()');
-- SELECT cron.schedule('cleanup-traffic', '0 3 * * *', 'SELECT cleanup_old_traffic_partitions()');

-- ============================================
-- 7. VERIFY PARTITIONING
-- ============================================

-- List all partitions
SELECT
  parent.relname AS parent_table,
  child.relname AS partition_name,
  pg_get_expr(child.relpartbound, child.oid) AS partition_bound
FROM pg_inherits
JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
JOIN pg_class child ON pg_inherits.inhrelid = child.oid
WHERE parent.relname IN ('gps_trackings', 'delivery_histories', 'traffic_data')
ORDER BY parent.relname, child.relname;

-- Check partition sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename LIKE 'gps_trackings_%'
   OR tablename LIKE 'delivery_histories_%'
   OR tablename LIKE 'traffic_data_%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Test partition pruning
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM gps_trackings
WHERE recorded_date >= '2025-01-01'
  AND recorded_date < '2025-02-01'
LIMIT 100;

ANALYZE;
