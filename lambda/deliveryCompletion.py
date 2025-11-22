import json
import os
import uuid
import time
import boto3
from datetime import datetime
from typing import Dict, Any, Optional

# --- Database Imports ---
from sqlalchemy import create_engine, text

# Configuration
DATABASE_URL = os.environ.get("DATABASE_URL")
S3_BUCKET = os.environ.get("S3_BUCKET", "deliverygenie-ml")
S3_TRAINING_PREFIX = os.environ.get("S3_TRAINING_PREFIX", "training-data/delivery-histories")
AWS_REGION = os.environ.get("AWS_REGION", "ap-southeast-1")

# Initialize AWS S3 Client
try:
    s3_client = boto3.client('s3', region_name=AWS_REGION)
    print("✅ S3 client initialized successfully.")
except Exception as e:
    print(f"⚠️ Failed to initialize S3 client: {e}")
    s3_client = None

# Initialize Database
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

def get_delivery_data(delivery_id: str, conn) -> Dict:
    """
    ดึงข้อมูล Delivery พร้อมข้อมูลที่เกี่ยวข้อง
    """
    sql = text("""
        SELECT
            d.id, d.order_id, d.driver_id, d.vehicle_id,
            d.pickup_latitude, d.pickup_longitude,
            d.delivery_latitude, d.delivery_longitude,
            d.delivery_location as delivery_address,
            d.delivery_status as status,
            d.created_at as assigned_at,
            d.pickup_time as picked_up_at,
            d.delivery_time as delivered_at,
            NULL as proof_of_delivery_url,
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
            NULL as store_id,

            -- Driver data
            CONCAT(dr.first_name, ' ', dr.last_name) as driver_name,
            dr.rating as driver_rating,

            -- Vehicle data
            v.vehicle_type,
            v.capacity_weight_kg,
            v.capacity_volume_m3,

            -- Customer data
            c.name as customer_name,
            c.priority_level as customer_tier,

            -- Store name (from first order item)
            (SELECT s.name FROM order_items oi2
             JOIN store_inventories si ON oi2.product_id = si.product_id
             JOIN stores s ON si.store_id = s.id
             WHERE oi2.order_id = o.id LIMIT 1) as store_name

        FROM deliveries d
        JOIN orders o ON d.order_id = o.id
        JOIN drivers dr ON d.driver_id = dr.id
        JOIN vehicles v ON d.vehicle_id = v.id
        JOIN customers c ON o.customer_id = c.id
        WHERE d.id = :delivery_id
    """)

    result = conn.execute(sql, {"delivery_id": delivery_id}).fetchone()

    if not result:
        raise ValueError(f"Delivery {delivery_id} not found")

    return {
        "delivery_id": result[0],
        "order_id": result[1],
        "driver_id": result[2],
        "vehicle_id": result[3],
        "pickup_lat": float(result[4]) if result[4] else None,
        "pickup_lon": float(result[5]) if result[5] else None,
        "delivery_lat": float(result[6]) if result[6] else None,
        "delivery_lon": float(result[7]) if result[7] else None,
        "delivery_address": result[8],
        "status": result[9],
        "assigned_at": result[10].isoformat() if result[10] else None,
        "picked_up_at": result[11].isoformat() if result[11] else None,
        "delivered_at": result[12].isoformat() if result[12] else None,
        "proof_of_delivery_url": result[13],
        "estimated_distance_km": float(result[14]) if result[14] else 0.0,
        "actual_distance_km": float(result[15]) if result[15] else 0.0,
        "total_price": float(result[16]) if result[16] else 0.0,
        "total_weight_kg": float(result[17]) if result[17] else 0.0,
        "total_volume_m3": float(result[18]) if result[18] else 0.0,
        "priority_score": float(result[19]) if result[19] else 50,
        "requires_cold_chain": result[20],
        "is_fragile": result[21],
        "customer_id": result[22],
        "store_id": result[23],
        "driver_name": result[24],
        "driver_rating": float(result[25]) if result[25] else 0.0,
        "vehicle_type": result[26],
        "vehicle_capacity_weight_kg": float(result[27]) if result[27] else 0.0,
        "vehicle_capacity_volume_m3": float(result[28]) if result[28] else 0.0,
        "customer_name": result[29],
        "customer_tier": result[30],
        "store_name": result[31]
    }


def calculate_delivery_duration(delivery: Dict) -> Optional[int]:
    """คำนวณระยะเวลาการส่งของ (นาที)"""
    if not delivery['assigned_at'] or not delivery['delivered_at']:
        return None

    assigned = datetime.fromisoformat(delivery['assigned_at'])
    delivered = datetime.fromisoformat(delivery['delivered_at'])

    duration_seconds = (delivered - assigned).total_seconds()
    return int(duration_seconds / 60)


def save_delivery_history(delivery: Dict, completion_data: Dict, conn) -> str:
    """
    บันทึก Delivery History ลงใน delivery_histories table
    (สำหรับ ML Training Data และ Analytics)
    """
    history_id = str(uuid.uuid4())

    duration_min = calculate_delivery_duration(delivery)

    # Map to actual delivery_histories schema
    delivery_date = datetime.fromisoformat(delivery['assigned_at']) if delivery.get('assigned_at') else datetime.now()

    sql = text("""
        INSERT INTO delivery_histories (
            id, delivery_date, day_of_week, hour_of_day,
            origin_latitude, origin_longitude,
            dest_latitude, dest_longitude,
            district, city,
            distance_km, duration_min,
            order_count, total_value, priority_avg,
            traffic_condition, weather_condition, temperature,
            on_time, delay_minutes, success_rate,
            vehicle_type, driver_rating
        ) VALUES (
            :id, :delivery_date, :day_of_week, :hour_of_day,
            :origin_latitude, :origin_longitude,
            :dest_latitude, :dest_longitude,
            :district, :city,
            :distance_km, :duration_min,
            :order_count, :total_value, :priority_avg,
            :traffic_condition, :weather_condition, :temperature,
            :on_time, :delay_minutes, :success_rate,
            :vehicle_type, :driver_rating
        )
    """)

    conn.execute(sql, {
        "id": history_id,
        "delivery_date": delivery_date,
        "day_of_week": delivery_date.weekday(),
        "hour_of_day": delivery_date.hour,
        "origin_latitude": delivery['pickup_lat'],
        "origin_longitude": delivery['pickup_lon'],
        "dest_latitude": delivery['delivery_lat'],
        "dest_longitude": delivery['delivery_lon'],
        "district": delivery.get('district', 'Unknown'),
        "city": delivery.get('city', 'Bangkok'),
        "distance_km": float(completion_data.get('actual_distance_km') or delivery.get('actual_distance_km') or delivery.get('estimated_distance_km') or 5.0),
        "duration_min": duration_min or 0,
        "order_count": 1,
        "total_value": delivery.get('total_amount', 0),
        "priority_avg": delivery.get('priority_score', 0),
        "traffic_condition": "normal",
        "weather_condition": "clear",
        "temperature": 30.0,
        "on_time": completion_data.get('was_on_time', True),
        "delay_minutes": completion_data.get('delay_minutes', 0),
        "success_rate": 1.0,
        "vehicle_type": delivery.get('vehicle_type', 'motorcycle'),
        "driver_rating": delivery.get('driver_rating', 4.5)
    })

    return history_id


def save_to_s3_training_data(delivery: Dict, completion_data: Dict) -> bool:
    """
    บันทึก Training Data ลง S3 สำหรับ ML Model
    Format: JSON Lines (JSONL)
    """
    if not s3_client:
        print("⚠️ S3 client not available. Skipping S3 upload.")
        return False

    try:
        # สร้าง Training Data Record
        training_record = {
            "delivery_id": delivery['delivery_id'],
            "order_id": delivery['order_id'],
            "timestamp": datetime.now().isoformat(),

            # Features for ML
            "features": {
                "pickup_lat": delivery['pickup_lat'],
                "pickup_lon": delivery['pickup_lon'],
                "delivery_lat": delivery['delivery_lat'],
                "delivery_lon": delivery['delivery_lon'],
                "total_weight_kg": delivery['total_weight_kg'],
                "total_volume_m3": delivery['total_volume_m3'],
                "priority_score": delivery['priority_score'],
                "requires_cold_chain": delivery['requires_cold_chain'],
                "is_fragile": delivery['is_fragile'],
                "customer_tier": delivery['customer_tier'],
                "vehicle_type": delivery['vehicle_type'],
                "driver_rating": delivery['driver_rating']
            },

            # Target Variables (Labels)
            "labels": {
                "actual_duration_min": calculate_delivery_duration(delivery),
                "actual_distance_km": completion_data.get('actual_distance_km'),
                "customer_rating": completion_data.get('customer_rating'),
                "was_on_time": completion_data.get('was_on_time', True),
                "delivery_success": True
            },

            # Metadata
            "metadata": {
                "assigned_at": delivery['assigned_at'],
                "picked_up_at": delivery['picked_up_at'],
                "delivered_at": delivery['delivered_at'],
                "driver_id": delivery['driver_id'],
                "customer_id": delivery['customer_id'],
                "store_id": delivery['store_id']
            }
        }

        # S3 Key with partitioning by date
        now = datetime.now()
        s3_key = f"{S3_TRAINING_PREFIX}/year={now.year}/month={now.month:02d}/day={now.day:02d}/{delivery['delivery_id']}.json"

        # Upload to S3
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=s3_key,
            Body=json.dumps(training_record),
            ContentType='application/json'
        )

        print(f"✅ Saved training data to S3: s3://{S3_BUCKET}/{s3_key}")
        return True

    except Exception as e:
        print(f"❌ S3 Upload Error: {e}")
        return False


def complete_delivery(delivery_id: str, completion_data: Dict, conn) -> Dict:
    """
    ประมวลผลการจบการส่งของ:
    1. อัปเดต Delivery Status -> 'delivered'
    2. อัปเดต Order Status -> 'delivered'
    3. บันทึก delivery_histories (สำหรับ Analytics)
    4. ส่งข้อมูลไปยัง S3 (สำหรับ ML Training)
    5. อัปเดต Driver Status -> 'available'
    6. อัปเดต Driver Statistics
    """

    # 1. ดึงข้อมูล Delivery
    delivery = get_delivery_data(delivery_id, conn)

    if delivery['status'] == 'delivered':
        raise ValueError("Delivery already completed")

    # 2. อัปเดต Delivery Status
    sql_delivery = text("""
        UPDATE deliveries
        SET delivery_status = 'delivered',
            delivery_time = NOW(),
            notes = :notes,
            updated_at = NOW()
        WHERE id = :delivery_id
    """)

    conn.execute(sql_delivery, {
        "delivery_id": delivery_id,
        "notes": completion_data.get('notes')
    })

    # 3. อัปเดต Order Status
    sql_order = text("""
        UPDATE orders
        SET order_status = 'delivered', updated_at = NOW()
        WHERE id = :order_id
    """)
    conn.execute(sql_order, {"order_id": delivery['order_id']})

    # 4. บันทึก delivery_histories
    history_id = save_delivery_history(delivery, completion_data, conn)

    # 5. อัปเดต Driver Statistics
    sql_driver = text("""
        UPDATE drivers
        SET total_deliveries = total_deliveries + 1,
            rating = (
                (rating * total_deliveries + :new_rating) /
                (total_deliveries + 1)
            ),
            updated_at = NOW()
        WHERE id = :driver_id
    """)

    customer_rating = completion_data.get('customer_rating', delivery['driver_rating'])

    conn.execute(sql_driver, {
        "driver_id": delivery['driver_id'],
        "new_rating": customer_rating
    })

    # 6. บันทึก Training Data ไปยัง S3
    # อัปเดต delivery dict ด้วยข้อมูลล่าสุด
    delivery['delivered_at'] = datetime.now().isoformat()
    s3_saved = save_to_s3_training_data(delivery, completion_data)

    # 7. Log to system_logs
    log_to_system_logs(
        "INFO", "DeliveryCompletion",
        f"Delivery {delivery_id} completed successfully",
        {
            "delivery_id": delivery_id,
            "order_id": delivery['order_id'],
            "driver_id": delivery['driver_id'],
            "history_id": history_id,
            "s3_saved": s3_saved,
            "customer_rating": customer_rating
        },
        conn
    )

    return {
        "delivery_id": delivery_id,
        "order_id": delivery['order_id'],
        "driver_id": delivery['driver_id'],
        "driver_name": delivery['driver_name'],
        "customer_name": delivery['customer_name'],
        "store_name": delivery['store_name'],
        "status": "delivered",
        "delivered_at": delivery['delivered_at'],
        "duration_min": calculate_delivery_duration(delivery),
        "actual_distance_km": completion_data.get('actual_distance_km'),
        "customer_rating": customer_rating,
        "history_id": history_id,
        "s3_saved": s3_saved,
        "proof_of_delivery_url": completion_data.get('proof_of_delivery_url')
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
            "user_id": "lambda:DeliveryCompletion",
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

        delivery_id = body.get('delivery_id')

        if not delivery_id:
            return create_error_response(400, "Missing required field: delivery_id")

        completion_data = {
            "proof_of_delivery_url": body.get('proof_of_delivery_url'),
            "customer_signature": body.get('customer_signature'),
            "customer_rating": body.get('customer_rating', 5.0),
            "actual_distance_km": body.get('actual_distance_km'),
            "was_on_time": body.get('was_on_time', True),
            "notes": body.get('notes')
        }

        print(f"✅ Completing delivery {delivery_id}")

        # Complete Delivery
        with db_engine.connect() as conn:
            with conn.begin():
                result = complete_delivery(delivery_id, completion_data, conn)

        execution_time = round((time.time() - start_time) * 1000, 2)

        print(f"✅ Delivery completed: {result['delivery_id']}")
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
