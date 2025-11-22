# Schema Mapping - Lambda Code vs Prisma Database

**Created**: 2025-11-22
**Purpose**: Map Lambda code column names to actual Prisma schema

---

## 🔴 Critical Fixes Needed

### 1. **Weather Lambda - Handler Issue**

**Error**: `No module named 'lambda_function'`

**Fix in AWS Console**:
```
Handler: 7-11_weather.lambda_handler
```

---

### 2. **Orders Table - Missing Columns**

Lambda code expects columns that don't exist. Need to calculate from related tables:

```sql
-- Lambda expects these columns:
o.store_id              -- ❌ MISSING - need to add to schema
o.total_weight_kg       -- ❌ MISSING - calculate from order_items
o.total_volume_m3       -- ❌ MISSING - calculate from order_items
o.requires_cold_chain   -- ❌ MISSING - check products
o.is_fragile            -- ❌ MISSING - check products

-- Actual Prisma columns:
o.total_amount          -- ✅ EXISTS (not total_price)
o.customer_id           -- ✅ EXISTS
o.priority_score        -- ✅ EXISTS
```

**Solution - Calculate Missing Fields**:

```sql
-- Get order with calculated fields
SELECT
    o.id,
    o.customer_id,
    NULL as store_id,  -- TODO: Add to schema or get from order_items → products → store
    o.total_amount as total_price,
    o.priority_score,

    -- Calculate total weight from order_items
    COALESCE(SUM(oi.quantity * p.weight_kg), 0) as total_weight_kg,

    -- Calculate total volume (if dimensions exist)
    0 as total_volume_m3,  -- TODO: Calculate from product dimensions

    -- Check if any product requires cold chain
    BOOL_OR(p.temperature_requirement IN ('cold', 'frozen', 'chilled')) as requires_cold_chain,

    -- Check if any product is fragile
    BOOL_OR(p.is_fragile) as is_fragile

FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN products p ON oi.product_id = p.id
WHERE o.id = :order_id
GROUP BY o.id, o.customer_id, o.total_amount, o.priority_score;
```

---

### 3. **Deliveries Table - Column Names Different**

```sql
-- Lambda code uses:
d.pickup_lat           -- ❌ WRONG
d.pickup_lon           -- ❌ WRONG
d.delivery_lat         -- ❌ WRONG
d.delivery_lon         -- ❌ WRONG
d.delivery_address     -- ❌ WRONG
d.status               -- ❌ WRONG
d.assigned_at          -- ❌ MISSING
d.picked_up_at         -- ❌ WRONG
d.delivered_at         -- ❌ WRONG

-- Actual Prisma columns:
d.pickup_latitude      -- ✅ CORRECT
d.pickup_longitude     -- ✅ CORRECT
d.delivery_latitude    -- ✅ CORRECT
d.delivery_longitude   -- ✅ CORRECT
d.delivery_location    -- ✅ CORRECT (not delivery_address)
d.delivery_status      -- ✅ CORRECT (not status)
d.created_at           -- ✅ CORRECT (use instead of assigned_at)
d.pickup_time          -- ✅ CORRECT (not picked_up_at)
d.delivery_time        -- ✅ CORRECT (not delivered_at)
```

**Fixed Query**:

```sql
SELECT
    d.id, d.order_id, d.driver_id, d.vehicle_id,
    d.pickup_latitude, d.pickup_longitude,
    d.delivery_latitude, d.delivery_longitude,
    d.delivery_location as delivery_address,
    d.delivery_status as status,
    d.created_at as assigned_at,
    d.pickup_time as picked_up_at,
    d.delivery_time as delivered_at,
    d.estimated_distance_km,
    d.actual_distance_km,
    d.estimated_duration_min,
    d.actual_duration_min
FROM deliveries d
WHERE d.id = :delivery_id;
```

---

### 4. **Drivers Table - Column Names Different**

```sql
-- Lambda code uses:
dr.name                -- ❌ WRONG (need to concat)
dr.average_rating      -- ❌ WRONG

-- Actual Prisma columns:
dr.first_name          -- ✅ EXISTS
dr.last_name           -- ✅ EXISTS
dr.rating              -- ✅ EXISTS (not average_rating)
```

**Fixed Query**:

```sql
SELECT
    dr.id,
    dr.employee_id,
    CONCAT(dr.first_name, ' ', dr.last_name) as name,
    dr.phone,
    dr.email,
    dr.rating as average_rating,
    dr.status,
    dr.total_deliveries,
    dr.on_time_rate,
    dr.current_vehicle_id
FROM drivers dr
WHERE dr.id = :driver_id;
```

---

### 5. **Customers Table - Column Names Different**

```sql
-- Lambda code uses:
c.tier                 -- ❌ WRONG
c.address              -- ❌ WRONG

-- Actual Prisma columns:
c.priority_level       -- ✅ EXISTS (not tier)
c.address_line1        -- ✅ EXISTS (not address)
c.address_line2        -- ✅ EXISTS
```

**Fixed Query**:

```sql
SELECT
    c.id,
    c.name,
    c.phone,
    c.email,
    CONCAT(c.address_line1, COALESCE(', ' || c.address_line2, '')) as address,
    c.district,
    c.city,
    c.postal_code,
    c.latitude,
    c.longitude,
    c.priority_level as tier,
    c.delivery_notes
FROM customers c
WHERE c.id = :customer_id;
```

---

### 6. **Vehicles Table - Column Names Different**

```sql
-- Lambda code uses:
v.type                 -- ❌ WRONG

-- Actual Prisma columns:
v.vehicle_type         -- ✅ EXISTS (not type)
v.capacity_weight_kg   -- ✅ EXISTS
v.capacity_volume_m3   -- ✅ EXISTS
```

**Fixed Query**:

```sql
SELECT
    v.id,
    v.vehicle_number,
    v.vehicle_type as type,
    v.license_plate,
    v.capacity_weight_kg,
    v.capacity_volume_m3,
    v.temperature_zones,
    v.current_status as status,
    v.fuel_type,
    v.fuel_efficiency
FROM vehicles v
WHERE v.id = :vehicle_id;
```

---

## 📝 Complete Fixed Queries for Lambda Functions

### **riderAssignment.py** - Fixed Query

```sql
-- Get order with calculated fields
SELECT
    o.id,
    o.customer_id,
    NULL as store_id,  -- Need to add to schema
    o.total_amount,
    o.priority_score,

    -- Calculate from order_items
    COALESCE(SUM(oi.quantity * p.weight_kg), 0) as total_weight_kg,
    0 as total_volume_m3,

    -- Check products
    BOOL_OR(p.temperature_requirement IN ('cold', 'frozen', 'chilled')) as requires_cold_chain,
    BOOL_OR(p.is_fragile) as is_fragile,

    -- Store location (from first order_item)
    (SELECT s.latitude FROM order_items oi2
     JOIN products p2 ON oi2.product_id = p2.id
     JOIN store_inventories si ON p2.id = si.product_id
     JOIN stores s ON si.store_id = s.id
     WHERE oi2.order_id = o.id LIMIT 1) as store_lat,

    (SELECT s.longitude FROM order_items oi2
     JOIN products p2 ON oi2.product_id = p2.id
     JOIN store_inventories si ON p2.id = si.product_id
     JOIN stores s ON si.store_id = s.id
     WHERE oi2.order_id = o.id LIMIT 1) as store_lon,

    -- Customer location
    c.latitude as customer_lat,
    c.longitude as customer_lon,
    CONCAT(c.address_line1, COALESCE(', ' || c.address_line2, '')) as customer_address

FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN products p ON oi.product_id = p.id
JOIN customers c ON o.customer_id = c.id
WHERE o.id = :order_id
GROUP BY o.id, o.customer_id, o.total_amount, o.priority_score,
         c.latitude, c.longitude, c.address_line1, c.address_line2;
```

### **deliveryCompletion.py** - Fixed Query

```sql
SELECT
    d.id, d.order_id, d.driver_id, d.vehicle_id,
    d.pickup_latitude, d.pickup_longitude,
    d.delivery_latitude, d.delivery_longitude,
    d.delivery_location as delivery_address,
    d.delivery_status as status,
    d.created_at as assigned_at,
    d.pickup_time as picked_up_at,
    d.delivery_time as delivered_at,
    d.estimated_distance_km,
    d.actual_distance_km,

    -- Order data with calculated fields
    o.total_amount,
    COALESCE(
        (SELECT SUM(oi.quantity * p.weight_kg)
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = o.id), 0
    ) as total_weight_kg,
    0 as total_volume_m3,
    o.priority_score,
    EXISTS(
        SELECT 1 FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = o.id
        AND p.temperature_requirement IN ('cold', 'frozen', 'chilled')
    ) as requires_cold_chain,
    EXISTS(
        SELECT 1 FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = o.id AND p.is_fragile
    ) as is_fragile,

    o.customer_id,
    NULL as store_id,  -- Need to add

    -- Driver data
    CONCAT(dr.first_name, ' ', dr.last_name) as driver_name,
    dr.rating as driver_rating,

    -- Vehicle data
    v.vehicle_type as vehicle_type,
    v.capacity_weight_kg,
    v.capacity_volume_m3,

    -- Customer data
    c.name as customer_name,
    c.priority_level as customer_tier

FROM deliveries d
JOIN orders o ON d.order_id = o.id
JOIN drivers dr ON d.driver_id = dr.id
JOIN vehicles v ON d.vehicle_id = v.id
JOIN customers c ON o.customer_id = c.id
WHERE d.id = :delivery_id;
```

---

## ✅ TODO: Update Lambda Code

Need to update these files with correct column names:

1. **riderAssignment.py** - Line ~224 (get_order_data query)
2. **deliveryCompletion.py** - Line ~73 (get_delivery_data query)
3. **realtimeTracking.py** - Add delivery_id validation
4. **7-11_weather.py** - Fix handler configuration in AWS Lambda Console

---

**Priority**: HIGH - These fixes are required for Lambda functions to work with production database!
