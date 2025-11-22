import json
import os
import uuid
import time
import math
import urllib.request
from typing import Dict, List, Any, Optional
from datetime import datetime

# --- Database Imports ---
from sqlalchemy import create_engine, text

# Configuration
DATABASE_URL = os.environ.get("DATABASE_URL")
OSRM_ROUTE_API = os.environ.get("OSRM_ROUTE_API", "http://router.project-osrm.org/route/v1/driving")
OSRM_DIRECTIONS_API = os.environ.get("OSRM_DIRECTIONS_API", "http://router.project-osrm.org/route/v1/driving")

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


def get_osrm_navigation(waypoints: List[Dict]) -> Dict:
    """
    เรียก OSRM API เพื่อดึง Turn-by-Turn Navigation
    waypoints: List[{lat, lon, name}]

    Returns:
    - route: Full route geometry
    - steps: Turn-by-turn instructions
    - distance_km: Total distance
    - duration_min: Total duration
    """

    if len(waypoints) < 2:
        raise ValueError("At least 2 waypoints required")

    # Build coordinates string (OSRM uses lon,lat format)
    coords = ";".join([f"{wp['lon']},{wp['lat']}" for wp in waypoints])

    # Request with steps=true, geometries=geojson
    url = f"{OSRM_DIRECTIONS_API}/{coords}?steps=true&geometries=geojson&overview=full"

    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode('utf-8'))

        if data.get('code') != 'Ok':
            raise ValueError(f"OSRM API Error: {data.get('message', 'Unknown error')}")

        routes = data.get('routes', [])
        if not routes:
            raise ValueError("No routes found")

        route = routes[0]

        # Extract Total Distance and Duration
        total_distance_km = route['distance'] / 1000.0
        total_duration_min = route['duration'] / 60.0

        # Extract Legs and Steps
        legs = route.get('legs', [])
        all_steps = []

        for leg_idx, leg in enumerate(legs):
            steps = leg.get('steps', [])

            for step_idx, step in enumerate(steps):
                instruction = {
                    "step_number": len(all_steps) + 1,
                    "leg_index": leg_idx,
                    "maneuver": step.get('maneuver', {}),
                    "instruction": step.get('maneuver', {}).get('instruction', 'Continue'),
                    "type": step.get('maneuver', {}).get('type', 'turn'),
                    "modifier": step.get('maneuver', {}).get('modifier'),
                    "distance_m": step.get('distance', 0),
                    "distance_km": round(step.get('distance', 0) / 1000, 3),
                    "duration_sec": step.get('duration', 0),
                    "duration_min": round(step.get('duration', 0) / 60, 1),
                    "name": step.get('name', 'Unnamed Road'),
                    "location": step.get('maneuver', {}).get('location', [])  # [lon, lat]
                }

                all_steps.append(instruction)

        # Extract Geometry (GeoJSON LineString)
        geometry = route.get('geometry', {})

        return {
            "total_distance_km": round(total_distance_km, 3),
            "total_duration_min": round(total_duration_min, 1),
            "waypoints": waypoints,
            "steps": all_steps,
            "geometry": geometry,
            "total_steps": len(all_steps)
        }

    except urllib.error.URLError as e:
        print(f"❌ OSRM API Connection Error: {e}")
        raise ValueError(f"Cannot connect to OSRM API: {e}")

    except Exception as e:
        print(f"❌ OSRM API Error: {e}")
        raise ValueError(f"OSRM API Error: {e}")


def get_delivery_route(delivery_id: str, conn) -> Dict:
    """
    ดึงข้อมูล Delivery และสร้าง Waypoints
    """
    sql = text("""
        SELECT
            d.id, d.order_id, d.driver_id, d.status,
            d.pickup_lat, d.pickup_lon,
            d.delivery_lat, d.delivery_lon, d.delivery_address,
            s.name as store_name, s.address as store_address,
            c.name as customer_name, c.address as customer_address
        FROM deliveries d
        JOIN orders o ON d.order_id = o.id
        JOIN stores s ON o.store_id = s.id
        JOIN customers c ON o.customer_id = c.id
        WHERE d.id = :delivery_id
    """)

    result = conn.execute(sql, {"delivery_id": delivery_id}).fetchone()

    if not result:
        raise ValueError(f"Delivery {delivery_id} not found")

    delivery = {
        "delivery_id": result[0],
        "order_id": result[1],
        "driver_id": result[2],
        "status": result[3],
        "pickup_lat": float(result[4]),
        "pickup_lon": float(result[5]),
        "delivery_lat": float(result[6]),
        "delivery_lon": float(result[7]),
        "delivery_address": result[8],
        "store_name": result[9],
        "store_address": result[10],
        "customer_name": result[11],
        "customer_address": result[12]
    }

    # Create Waypoints
    waypoints = [
        {
            "lat": delivery['pickup_lat'],
            "lon": delivery['pickup_lon'],
            "name": f"Pickup: {delivery['store_name']}",
            "address": delivery['store_address'],
            "type": "pickup"
        },
        {
            "lat": delivery['delivery_lat'],
            "lon": delivery['delivery_lon'],
            "name": f"Delivery: {delivery['customer_name']}",
            "address": delivery['delivery_address'],
            "type": "delivery"
        }
    ]

    return {
        "delivery": delivery,
        "waypoints": waypoints
    }


def save_route_to_database(delivery_id: str, route_data: Dict, conn) -> str:
    """
    บันทึก Route ลงใน routes table
    """
    route_id = str(uuid.uuid4())

    sql = text("""
        INSERT INTO routes (
            id, delivery_id,
            start_lat, start_lon,
            end_lat, end_lon,
            total_distance_km, estimated_duration_min,
            route_geometry, created_at, updated_at
        ) VALUES (
            :id, :delivery_id,
            :start_lat, :start_lon,
            :end_lat, :end_lon,
            :total_distance_km, :estimated_duration_min,
            :route_geometry, NOW(), NOW()
        )
    """)

    waypoints = route_data['waypoints']
    start_wp = waypoints[0]
    end_wp = waypoints[-1]

    conn.execute(sql, {
        "id": route_id,
        "delivery_id": delivery_id,
        "start_lat": start_wp['lat'],
        "start_lon": start_wp['lon'],
        "end_lat": end_wp['lat'],
        "end_lon": end_wp['lon'],
        "total_distance_km": route_data['total_distance_km'],
        "estimated_duration_min": route_data['total_duration_min'],
        "route_geometry": json.dumps(route_data['geometry'])
    })

    return route_id


def save_route_stops(route_id: str, steps: List[Dict], conn):
    """
    บันทึก Route Stops (Turn-by-Turn Instructions) ลงใน route_stops table
    """
    for step in steps:
        stop_id = str(uuid.uuid4())

        sql = text("""
            INSERT INTO route_stops (
                id, route_id, step_number, instruction,
                distance_km, duration_min, created_at, updated_at
            ) VALUES (
                :id, :route_id, :step_number, :instruction,
                :distance_km, :duration_min, NOW(), NOW()
            )
        """)

        conn.execute(sql, {
            "id": stop_id,
            "route_id": route_id,
            "step_number": step['step_number'],
            "instruction": step['instruction'],
            "distance_km": step['distance_km'],
            "duration_min": step['duration_min']
        })


def calculate_navigation(delivery_id: str, conn) -> Dict:
    """
    คำนวณ Route Navigation สำหรับ Delivery
    """

    # 1. ดึงข้อมูล Delivery และ Waypoints
    route_info = get_delivery_route(delivery_id, conn)
    delivery = route_info['delivery']
    waypoints = route_info['waypoints']

    # 2. เรียก OSRM API เพื่อดึง Turn-by-Turn Navigation
    navigation = get_osrm_navigation(waypoints)

    # 3. บันทึก Route ลง Database
    route_id = save_route_to_database(delivery_id, navigation, conn)

    # 4. บันทึก Route Stops (Turn-by-Turn Instructions)
    save_route_stops(route_id, navigation['steps'], conn)

    # 5. อัปเดต Delivery status
    sql_update = text("""
        UPDATE deliveries
        SET route_calculated = TRUE, updated_at = NOW()
        WHERE id = :delivery_id
    """)
    conn.execute(sql_update, {"delivery_id": delivery_id})

    # 6. Log to system_logs
    log_to_system_logs(
        "INFO", "RouteNavigation",
        f"Route calculated for delivery {delivery_id}",
        {
            "route_id": route_id,
            "delivery_id": delivery_id,
            "distance_km": navigation['total_distance_km'],
            "steps": navigation['total_steps']
        },
        conn
    )

    return {
        "route_id": route_id,
        "delivery_id": delivery_id,
        "delivery_status": delivery['status'],
        "waypoints": waypoints,
        "navigation": {
            "total_distance_km": navigation['total_distance_km'],
            "total_duration_min": navigation['total_duration_min'],
            "total_steps": navigation['total_steps'],
            "steps": navigation['steps'],
            "geometry": navigation['geometry']
        }
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
            "user_id": "lambda:RouteNavigation",
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
            'algorithm': 'OSRM Turn-by-Turn Navigation',
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

        print(f"🗺️ Calculating navigation for delivery {delivery_id}")

        # Calculate Navigation
        with db_engine.connect() as conn:
            with conn.begin():
                result = calculate_navigation(delivery_id, conn)

        execution_time = round((time.time() - start_time) * 1000, 2)

        print(f"✅ Route calculated: {result['navigation']['total_steps']} steps, {result['navigation']['total_distance_km']} km")
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
