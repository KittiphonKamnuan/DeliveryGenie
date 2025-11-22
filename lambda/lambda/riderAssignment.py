import json
import os
import uuid
import time
import math
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime

# --- Database Imports ---
from sqlalchemy import create_engine, text

# Configuration
DATABASE_URL = os.environ.get("DATABASE_URL")
EARTH_RADIUS_KM = 6371

db_engine = None
if DATABASE_URL:
    try:
        clean_url = DATABASE_URL.split("?")[0]
        db_engine = create_engine(
            clean_url,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
            pool_recycle=3600
        )
        print("✅ Database engine created successfully.")
    except Exception as e:
        print(f"❌ Failed to create database engine: {e}")
        db_engine = None


# ==================== Helper Functions ====================

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """คำนวณระยะทางเส้นตรง"""
    lat1_rad, lon1_rad = math.radians(lat1), math.radians(lon1)
    lat2_rad, lon2_rad = math.radians(lat2), math.radians(lon2)
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return EARTH_RADIUS_KM * c


def get_available_riders(store_lat: float, store_lon: float, conn) -> List[Dict]:
    """
    ดึงรายชื่อ Riders ที่:
    1. Available (status = 'available')
    2. Active (is_active = TRUE)
    3. มี Vehicle ที่พร้อมใช้งาน
    """
    sql = text("""
        SELECT
            d.id,
            CONCAT(d.first_name, ' ', d.last_name) as name,
            d.phone,
            NULL as current_lat,
            NULL as current_lon,
            d.status,
            d.total_deliveries,
            d.rating as average_rating,
            v.id as vehicle_id,
            v.vehicle_type,
            v.capacity_weight_kg,
            v.capacity_volume_m3,
            v.license_plate,
            30.0 as fuel_efficiency
        FROM drivers d
        JOIN vehicles v ON d.current_vehicle_id = v.id
        WHERE d.status = 'active'
        ORDER BY d.rating DESC
    """)

    results = conn.execute(sql).fetchall()

    riders = []
    for row in results:
        rider = {
            "driver_id": row[0],
            "driver_name": row[1],
            "driver_phone": row[2],
            "current_lat": float(row[3]) if row[3] else None,
            "current_lon": float(row[4]) if row[4] else None,
            "status": row[5],
            "total_deliveries": row[6] or 0,
            "average_rating": float(row[7]) if row[7] else 0.0,
            "vehicle_id": row[8],
            "vehicle_type": row[9],
            "capacity_weight_kg": float(row[10]) if row[10] is not None else 50.0,
            "capacity_volume_m3": float(row[11]) if row[11] is not None else 0.5,
            "license_plate": row[12],
            "fuel_efficiency": float(row[13]) if row[13] else 30.0
        }

        # คำนวณระยะทางจาก Rider ไปยัง Store
        if rider['current_lat'] and rider['current_lon']:
            distance = calculate_haversine_distance(
                rider['current_lat'], rider['current_lon'],
                store_lat, store_lon
            )
            rider['distance_to_store_km'] = round(distance, 3)
        else:
            rider['distance_to_store_km'] = 999.0  # ไม่ทราบตำแหน่ง

        riders.append(rider)

    return riders


def get_rider_current_load(driver_id: str, conn) -> Dict:
    """
    ดูว่า Rider กำลังขนส่งอะไรอยู่
    - นับจาก deliveries ที่ status IN ('assigned', 'picked_up', 'in_transit')
    """
    sql = text("""
        SELECT
            COALESCE(SUM(
                (SELECT SUM(oi.quantity * p.weight_kg)
                 FROM order_items oi
                 JOIN products p ON oi.product_id = p.id
                 WHERE oi.order_id = o.id)
            ), 0) as current_weight,
            0 as current_volume,
            COUNT(*) as active_deliveries
        FROM deliveries d
        JOIN orders o ON d.order_id = o.id
        WHERE d.driver_id = :driver_id
          AND d.delivery_status IN ('assigned', 'picked_up', 'in_transit')
    """)

    result = conn.execute(sql, {"driver_id": driver_id}).fetchone()

    return {
        "current_weight_kg": float(result[0]) if result[0] else 0.0,
        "current_volume_m3": float(result[1]) if result[1] else 0.0,
        "active_deliveries": result[2] or 0
    }


def can_rider_accept_order(
    rider: Dict,
    current_load: Dict,
    order_weight: float,
    order_volume: float
) -> Tuple[bool, str]:
    """
    ตรวจสอบว่า Rider สามารถรับ Order นี้ได้ไหม
    Returns: (can_accept, reason)
    """
    available_weight = rider['capacity_weight_kg'] - current_load['current_weight_kg']
    available_volume = rider['capacity_volume_m3'] - current_load['current_volume_m3']

    # ตรวจสอบน้ำหนัก
    if order_weight > available_weight:
        return False, f"Overweight: Need {order_weight} kg, available {available_weight} kg"

    # ตรวจสอบปริมาตร
    if order_volume > available_volume:
        return False, f"Over volume: Need {order_volume} m³, available {available_volume} m³"

    # ตรวจสอบจำนวน deliveries (สูงสุด 5 orders ต่อครั้ง)
    if current_load['active_deliveries'] >= 5:
        return False, "Too many active deliveries (max 5)"

    return True, "OK"


def calculate_rider_score(rider: Dict, order: Dict, current_load: Dict) -> float:
    """
    คำนวณคะแนนความเหมาะสมของ Rider สำหรับ Order นี้
    คะแนนสูง = เหมาะสมมาก

    Factors:
    1. ระยะทางจาก Rider ไปยัง Store (40%) - ใกล้ = ดี
    2. Rating ของ Rider (30%) - สูง = ดี
    3. Load ปัจจุบัน (20%) - น้อย = ดี (รับของได้เยอะกว่า)
    4. ประสบการณ์ (10%) - เยอะ = ดี
    """

    # 1. Distance Score (40%)
    # ระยะทาง < 2 km = 100, > 10 km = 0
    distance = rider['distance_to_store_km']
    if distance < 2:
        distance_score = 100
    elif distance > 10:
        distance_score = 0
    else:
        distance_score = 100 - ((distance - 2) / 8) * 100

    # 2. Rating Score (30%)
    # Rating 5.0 = 100, 0.0 = 0
    rating_score = (rider['average_rating'] / 5.0) * 100

    # 3. Load Score (20%)
    # Load น้อย = ดี (รับของได้เยอะกว่า)
    weight_used_pct = current_load['current_weight_kg'] / rider['capacity_weight_kg']
    load_score = (1 - weight_used_pct) * 100

    # 4. Experience Score (10%)
    # > 100 deliveries = 100, 0 deliveries = 0
    exp_score = min(rider['total_deliveries'] / 100, 1.0) * 100

    # Calculate Weighted Score
    total_score = (
        distance_score * 0.4 +
        rating_score * 0.3 +
        load_score * 0.2 +
        exp_score * 0.1
    )

    return round(total_score, 2)


def assign_rider_to_order(order_id: str, conn) -> Dict:
    """
    หา Rider ที่เหมาะสมที่สุดสำหรับ Order นี้
    """

    # 1. ดึงข้อมูล Order (with calculated fields from Prisma schema)
    sql_order = text("""
        SELECT
            o.id,
            NULL as store_id,
            o.customer_id,

            -- Calculate total weight from order_items
            COALESCE(
                (SELECT SUM(oi.quantity * p.weight_kg)
                 FROM order_items oi
                 JOIN products p ON oi.product_id = p.id
                 WHERE oi.order_id = o.id), 0
            ) as total_weight_kg,

            -- Calculate total volume (placeholder - need product dimensions)
            0 as total_volume_m3,

            o.priority_score,

            -- Check if requires cold chain
            EXISTS(
                SELECT 1 FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = o.id
                AND p.temperature_requirement IN ('cold', 'frozen', 'chilled')
            ) as requires_cold_chain,

            -- Check if fragile
            EXISTS(
                SELECT 1 FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = o.id AND p.is_fragile
            ) as is_fragile,

            -- Get store location from first order item
            (SELECT s.latitude FROM order_items oi2
             JOIN store_inventories si ON oi2.product_id = si.product_id
             JOIN stores s ON si.store_id = s.id
             WHERE oi2.order_id = o.id LIMIT 1) as store_lat,

            (SELECT s.longitude FROM order_items oi2
             JOIN store_inventories si ON oi2.product_id = si.product_id
             JOIN stores s ON si.store_id = s.id
             WHERE oi2.order_id = o.id LIMIT 1) as store_lon,

            -- Customer location
            c.latitude as customer_lat,
            c.longitude as customer_lon,
            CONCAT(c.address_line1, COALESCE(', ' || c.address_line2, '')) as customer_address

        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        WHERE o.id = :order_id
    """)

    order_result = conn.execute(sql_order, {"order_id": order_id}).fetchone()

    if not order_result:
        raise ValueError(f"Order {order_id} not found")

    order = {
        "order_id": order_result[0],
        "store_id": order_result[1],
        "customer_id": order_result[2],
        "total_weight_kg": float(order_result[3]) if order_result[3] else 0.0,
        "total_volume_m3": float(order_result[4]) if order_result[4] else 0.0,
        "priority_score": float(order_result[5]) if order_result[5] else 50,
        "requires_cold_chain": order_result[6],
        "is_fragile": order_result[7],
        "store_lat": float(order_result[8]) if order_result[8] is not None else 13.7563,
        "store_lon": float(order_result[9]) if order_result[9] is not None else 100.5018,
        "customer_lat": float(order_result[10]) if order_result[10] is not None else 13.7563,
        "customer_lon": float(order_result[11]) if order_result[11] is not None else 100.5018,
        "customer_address": order_result[12]
    }

    # 2. ดึงรายชื่อ Riders ที่พร้อมให้บริการ
    riders = get_available_riders(order['store_lat'], order['store_lon'], conn)

    if not riders:
        raise ValueError("No available riders at this time")

    # 3. ประเมินแต่ละ Rider
    eligible_riders = []

    for rider in riders:
        current_load = get_rider_current_load(rider['driver_id'], conn)

        can_accept, reason = can_rider_accept_order(
            rider, current_load,
            order['total_weight_kg'], order['total_volume_m3']
        )

        if can_accept:
            score = calculate_rider_score(rider, order, current_load)
            eligible_riders.append({
                "rider": rider,
                "current_load": current_load,
                "score": score
            })

    if not eligible_riders:
        raise ValueError("No eligible riders found (capacity/distance constraints)")

    # 4. เรียงลำดับตามคะแนน (สูงสุดก่อน)
    eligible_riders.sort(key=lambda x: x['score'], reverse=True)

    best_match = eligible_riders[0]
    best_rider = best_match['rider']

    # 5. สร้าง Delivery Record
    delivery_id = str(uuid.uuid4())

    sql_delivery = text("""
        INSERT INTO deliveries (
            id, delivery_number, order_id, driver_id, vehicle_id,
            pickup_latitude, pickup_longitude,
            delivery_latitude, delivery_longitude, delivery_location,
            delivery_status, created_at, updated_at
        ) VALUES (
            :id, :delivery_number, :order_id, :driver_id, :vehicle_id,
            :pickup_lat, :pickup_lon,
            :delivery_lat, :delivery_lon, :delivery_address,
            'pending', NOW(), NOW()
        )
    """)

    # Generate delivery number
    delivery_number = f"DEL-{datetime.now().strftime('%Y%m%d')}-{delivery_id[:8]}"

    conn.execute(sql_delivery, {
        "id": delivery_id,
        "delivery_number": delivery_number,
        "order_id": order['order_id'],
        "driver_id": best_rider['driver_id'],
        "vehicle_id": best_rider['vehicle_id'],
        "pickup_lat": order['store_lat'],
        "pickup_lon": order['store_lon'],
        "delivery_lat": order['customer_lat'],
        "delivery_lon": order['customer_lon'],
        "delivery_address": order['customer_address']
    })

    # 6. อัปเดต Order Status
    sql_update_order = text("""
        UPDATE orders
        SET order_status = 'assigned', updated_at = NOW()
        WHERE id = :order_id
    """)
    conn.execute(sql_update_order, {"order_id": order['order_id']})

    # 7. อัปเดต Driver Status
    sql_update_driver = text("""
        UPDATE drivers
        SET status = 'busy', updated_at = NOW()
        WHERE id = :driver_id
    """)
    conn.execute(sql_update_driver, {"driver_id": best_rider['driver_id']})

    # 8. Log to system_logs
    log_to_system_logs(
        "INFO", "RiderAssignment",
        f"Order {order_id} assigned to Rider {best_rider['driver_name']}",
        {
            "delivery_id": delivery_id,
            "order_id": order_id,
            "driver_id": best_rider['driver_id'],
            "score": best_match['score']
        },
        conn
    )

    return {
        "delivery_id": delivery_id,
        "order_id": order['order_id'],
        "assigned_rider": {
            "driver_id": best_rider['driver_id'],
            "driver_name": best_rider['driver_name'],
            "driver_phone": best_rider['driver_phone'],
            "vehicle_type": best_rider['vehicle_type'],
            "license_plate": best_rider['license_plate'],
            "average_rating": best_rider['average_rating'],
            "distance_to_store_km": best_rider['distance_to_store_km']
        },
        "current_load": best_match['current_load'],
        "assignment_score": best_match['score'],
        "assigned_at": datetime.now().isoformat(),
        "other_candidates": len(eligible_riders) - 1
    }


def log_to_system_logs(level: str, log_type: str, message: str, details: Dict, conn):
    """Log to system_logs table"""
    sql = text("""
        INSERT INTO system_logs (id, log_level, log_type, message, details, user_id, ip_address, created_at)
        VALUES (:id, :log_level, :log_type, :message, :details, :user_id, :ip_address, NOW())
    """)
    try:
        conn.execute(sql, {
            "id": str(uuid.uuid4()),
            "log_level": level,
            "log_type": log_type,
            "message": message,
            "details": json.dumps(details),
            "user_id": "lambda:RiderAssignment",
            "ip_address": "system"
        })
    except Exception as e:
        print(f"❌ Log Error: {e}")


# ==================== Response Helpers ====================

def create_success_response(result: Dict, execution_time_ms: float) -> Dict:
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'success': True,
            'algorithm': 'Smart Rider Assignment (Capacity + Score)',
            'execution_time_ms': execution_time_ms,
            'result': result
        }, ensure_ascii=False, indent=2)
    }


def create_error_response(status_code: int, error: str, details: Any = None) -> Dict:
    return {
        'statusCode': status_code,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'success': False,
            'error': error,
            'details': details
        }, ensure_ascii=False, indent=2)
    }


# ==================== Lambda Handler ====================

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    start_time = time.time()

    if not db_engine:
        return create_error_response(500, "Database connection not available")

    try:
        # Parse Input
        body = json.loads(event['body']) if 'body' in event else event

        order_id = body.get('order_id')

        if not order_id:
            return create_error_response(400, "Missing required field: order_id")

        print(f"🚚 Assigning rider for order {order_id}")

        # Assign Rider
        with db_engine.connect() as conn:
            with conn.begin():
                result = assign_rider_to_order(order_id, conn)

        execution_time = round((time.time() - start_time) * 1000, 2)

        print(f"✅ Order assigned to {result['assigned_rider']['driver_name']}")
        return create_success_response(result, execution_time)

    except ValueError as e:
        print(f"⚠️ Validation Error: {str(e)}")
        execution_time = round((time.time() - start_time) * 1000, 2)
        return create_error_response(400, str(e))

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        execution_time = round((time.time() - start_time) * 1000, 2)
        return create_error_response(500, f"Internal server error: {str(e)}")
