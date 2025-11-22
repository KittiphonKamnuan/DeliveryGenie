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
KINESIS_STREAM_NAME = os.environ.get("KINESIS_STREAM_NAME", "deliverygenie-gps-stream")
AWS_REGION = os.environ.get("AWS_REGION", "ap-southeast-1")

# Initialize AWS Kinesis Client
try:
    kinesis_client = boto3.client('kinesis', region_name=AWS_REGION)
    print("✅ Kinesis client initialized successfully.")
except Exception as e:
    print(f"⚠️ Failed to initialize Kinesis client: {e}")
    kinesis_client = None

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

def validate_gps_data(gps_data: Dict) -> bool:
    """ตรวจสอบความถูกต้องของข้อมูล GPS"""
    required_fields = ['driver_id', 'lat', 'lon']  # delivery_id is optional

    for field in required_fields:
        if field not in gps_data:
            raise ValueError(f"Missing required field: {field}")

    # Validate coordinates
    lat = float(gps_data['lat'])
    lon = float(gps_data['lon'])

    if not (-90 <= lat <= 90):
        raise ValueError(f"Invalid latitude: {lat}")

    if not (-180 <= lon <= 180):
        raise ValueError(f"Invalid longitude: {lon}")

    return True


def send_to_kinesis(gps_record: Dict) -> bool:
    """
    ส่งข้อมูล GPS ไปยัง AWS Kinesis Data Stream
    สำหรับ Real-time Analytics และ ML Training
    """
    if not kinesis_client:
        print("⚠️ Kinesis client not available. Skipping stream.")
        return False

    try:
        response = kinesis_client.put_record(
            StreamName=KINESIS_STREAM_NAME,
            Data=json.dumps(gps_record),
            PartitionKey=gps_record['driver_id']  # ใช้ driver_id เป็น partition key
        )

        print(f"✅ Sent to Kinesis: ShardId={response['ShardId']}, SequenceNumber={response['SequenceNumber']}")
        return True

    except Exception as e:
        print(f"❌ Kinesis Error: {e}")
        return False


def save_gps_to_database(gps_data: Dict, conn) -> str:
    """
    บันทึกข้อมูล GPS ลงใน gps_trackings table
    Note: vehicle_id is required in schema, we get it from driver's current_vehicle_id
    """
    gps_id = str(uuid.uuid4())

    # Get driver's current vehicle_id
    vehicle_query = text("SELECT current_vehicle_id FROM drivers WHERE id = :driver_id")
    vehicle_result = conn.execute(vehicle_query, {"driver_id": gps_data['driver_id']}).fetchone()
    vehicle_id = vehicle_result[0] if vehicle_result and vehicle_result[0] else "UNKNOWN"

    sql = text("""
        INSERT INTO gps_trackings (
            id, driver_id, vehicle_id, latitude, longitude,
            speed, heading, accuracy,
            altitude, battery_level, is_moving,
            timestamp, recorded_date
        ) VALUES (
            :id, :driver_id, :vehicle_id, :latitude, :longitude,
            :speed, :heading, :accuracy,
            :altitude, :battery_level, :is_moving,
            :timestamp, :recorded_date
        )
    """)

    timestamp = gps_data.get('timestamp', datetime.now())

    conn.execute(sql, {
        "id": gps_id,
        "driver_id": gps_data['driver_id'],
        "vehicle_id": vehicle_id,
        "latitude": float(gps_data['lat']),
        "longitude": float(gps_data['lon']),
        "speed": gps_data.get('speed_kmh'),  # Map speed_kmh to speed
        "heading": gps_data.get('bearing'),  # Map bearing to heading
        "accuracy": gps_data.get('accuracy_meters'),  # Map accuracy_meters to accuracy
        "altitude": gps_data.get('altitude'),
        "battery_level": gps_data.get('battery_level'),
        "is_moving": gps_data.get('is_moving', True),  # Assume moving if speed > 0
        "timestamp": timestamp,
        "recorded_date": timestamp
    })

    return gps_id


def update_driver_location(driver_id: str, lat: float, lon: float, conn):
    """
    อัปเดตตำแหน่งปัจจุบันของ Driver - No longer needed
    Driver location is tracked in gps_trackings table
    This function is kept for compatibility but does nothing
    """
    # Driver location is stored in gps_trackings table, not drivers table
    # No action needed here
    pass


def update_delivery_status(delivery_id: str, conn) -> Optional[Dict]:
    """
    ดึงข้อมูล Delivery (no last_tracked_at column exists)
    """
    # Just update updated_at timestamp
    sql_update = text("""
        UPDATE deliveries
        SET updated_at = NOW()
        WHERE id = :delivery_id
    """)
    conn.execute(sql_update, {"delivery_id": delivery_id})

    # Get delivery info
    sql_get = text("""
        SELECT
            d.id, d.order_id, d.driver_id, d.delivery_status as status,
            d.pickup_latitude as pickup_lat, d.pickup_longitude as pickup_lon,
            d.delivery_latitude as delivery_lat, d.delivery_longitude as delivery_lon,
            d.delivery_location as delivery_address
        FROM deliveries d
        WHERE d.id = :delivery_id
    """)

    result = conn.execute(sql_get, {"delivery_id": delivery_id}).fetchone()

    if result:
        return {
            "delivery_id": result[0],
            "order_id": result[1],
            "driver_id": result[2],
            "status": result[3],
            "pickup_lat": float(result[4]) if result[4] else None,
            "pickup_lon": float(result[5]) if result[5] else None,
            "delivery_lat": float(result[6]) if result[6] else None,
            "delivery_lon": float(result[7]) if result[7] else None,
            "delivery_address": result[8]
        }

    return None


def process_gps_update(gps_data: Dict, conn) -> Dict:
    """
    ประมวลผลการอัปเดต GPS:
    1. Validate ข้อมูล
    2. บันทึกลง Database (gps_trackings)
    3. อัปเดตตำแหน่งของ Driver (drivers.current_lat/lon)
    4. ส่งข้อมูลไปยัง Kinesis Stream (สำหรับ Real-time Analytics)
    5. อัปเดต Delivery status
    """

    # 1. Validate
    validate_gps_data(gps_data)

    # 2. บันทึก GPS ลง Database (always save, even without delivery_id)
    gps_id = save_gps_to_database(gps_data, conn)

    # 3. อัปเดตตำแหน่ง Driver (no longer needed - kept for compatibility)
    update_driver_location(
        gps_data['driver_id'],
        float(gps_data['lat']),
        float(gps_data['lon']),
        conn
    )

    # 4. ดึงข้อมูล Delivery (if delivery_id provided)
    delivery = None
    if gps_data.get('delivery_id'):
        delivery = update_delivery_status(gps_data['delivery_id'], conn)

    # 5. สร้าง Record สำหรับ Kinesis
    kinesis_record = {
        "gps_id": gps_id,
        "driver_id": gps_data['driver_id'],
        "delivery_id": gps_data.get('delivery_id'),
        "order_id": delivery['order_id'] if delivery else None,
        "lat": float(gps_data['lat']),
        "lon": float(gps_data['lon']),
        "speed_kmh": gps_data.get('speed_kmh'),
        "bearing": gps_data.get('bearing'),
        "accuracy_meters": gps_data.get('accuracy_meters'),
        "delivery_status": delivery['status'] if delivery else None,
        "timestamp": gps_data.get('timestamp', datetime.now().isoformat()),
        "event_type": "gps_update"
    }

    # 6. ส่งไปยัง Kinesis
    kinesis_sent = send_to_kinesis(kinesis_record)

    # 7. Log to system_logs
    log_to_system_logs(
        "INFO", "GPSTracking",
        f"GPS update for driver {gps_data['driver_id']}",
        {
            "gps_id": gps_id,
            "driver_id": gps_data['driver_id'],
            "delivery_id": gps_data.get('delivery_id'),
            "kinesis_sent": kinesis_sent
        },
        conn
    )

    return {
        "gps_id": gps_id,
        "driver_id": gps_data['driver_id'],
        "delivery_id": gps_data.get('delivery_id'),
        "order_id": delivery['order_id'] if delivery else None,
        "location": {
            "lat": float(gps_data['lat']),
            "lon": float(gps_data['lon'])
        },
        "speed_kmh": gps_data.get('speed_kmh'),
        "bearing": gps_data.get('bearing'),
        "accuracy_meters": gps_data.get('accuracy_meters'),
        "delivery_status": delivery['status'] if delivery else None,
        "kinesis_sent": kinesis_sent,
        "timestamp": gps_data.get('timestamp', datetime.now().isoformat())
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
            "user_id": "lambda:RealtimeTracking",
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

        # Support batch updates (multiple GPS points)
        if 'gps_updates' in body and isinstance(body['gps_updates'], list):
            results = []

            with db_engine.connect() as conn:
                with conn.begin():
                    for gps_data in body['gps_updates']:
                        try:
                            result = process_gps_update(gps_data, conn)
                            results.append(result)
                        except Exception as e:
                            print(f"⚠️ Failed to process GPS update: {e}")
                            results.append({"error": str(e), "gps_data": gps_data})

            execution_time = round((time.time() - start_time) * 1000, 2)

            return create_success_response({
                "batch_size": len(body['gps_updates']),
                "successful": len([r for r in results if 'error' not in r]),
                "failed": len([r for r in results if 'error' in r]),
                "results": results
            }, execution_time)

        # Single GPS Update
        else:
            print(f"📍 Processing GPS update for driver {body.get('driver_id')}")

            with db_engine.connect() as conn:
                with conn.begin():
                    result = process_gps_update(body, conn)

            execution_time = round((time.time() - start_time) * 1000, 2)

            print(f"✅ GPS update processed: {result.get('gps_id', 'N/A')}")
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
