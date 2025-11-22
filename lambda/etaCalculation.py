import json
import os
import uuid
import time
import math
import urllib.request
import urllib.parse
from datetime import datetime
from typing import Dict, Any, Tuple

# --- Database Imports ---
import sqlalchemy
from sqlalchemy import create_engine, text

# Configuration
DATABASE_URL = os.environ.get("DATABASE_URL")
WEATHER_API_KEY = os.environ.get("WEATHER_API_KEY")  # OpenWeatherMap API Key
OSRM_API_URL = os.environ.get("OSRM_API_URL", "http://router.project-osrm.org/route/v1/driving")
TRAFFIC_API_URL = os.environ.get("TRAFFIC_API_URL")  # Realtime-Traffic.py endpoint

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
    """Fallback: คำนวณระยะทางเส้นตรง"""
    lat1_rad, lon1_rad = math.radians(lat1), math.radians(lon1)
    lat2_rad, lon2_rad = math.radians(lat2), math.radians(lon2)
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return EARTH_RADIUS_KM * c


def get_osrm_route(lat1: float, lon1: float, lat2: float, lon2: float) -> Tuple[float, float]:
    """
    เรียก OSRM API หาระยะทางและเวลาจริงตามถนน
    Returns: (distance_km, duration_min)
    """
    try:
        coords = f"{lon1},{lat1};{lon2},{lat2}"
        url = f"{OSRM_API_URL}/{coords}?overview=false"

        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=2) as response:
            data = json.loads(response.read().decode('utf-8'))

        if data.get('code') == 'Ok' and len(data.get('routes', [])) > 0:
            route = data['routes'][0]
            distance_km = route['distance'] / 1000.0
            duration_min = route['duration'] / 60.0
            return distance_km, duration_min

    except Exception as e:
        print(f"⚠️ OSRM API Error: {e}. Using Haversine fallback.")

    # Fallback
    dist = calculate_haversine_distance(lat1, lon1, lat2, lon2)
    return dist * 1.3, (dist * 1.3 / 30) * 60


def get_weather_conditions(lat: float, lon: float) -> Dict:
    """
    เรียก OpenWeatherMap API เพื่อดูสภาพอากาศ
    Returns: {condition, temp_c, rain_mm, wind_speed_kmh, delay_factor}
    """
    if not WEATHER_API_KEY:
        print("⚠️ WEATHER_API_KEY not set. Using default weather.")
        return {
            "condition": "Clear",
            "temp_c": 30,
            "rain_mm": 0,
            "wind_speed_kmh": 10,
            "delay_factor": 1.0
        }

    try:
        url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={WEATHER_API_KEY}&units=metric"
        req = urllib.request.Request(url)

        with urllib.request.urlopen(req, timeout=2) as response:
            data = json.loads(response.read().decode('utf-8'))

        condition = data.get('weather', [{}])[0].get('main', 'Clear')
        temp_c = data.get('main', {}).get('temp', 30)
        rain_mm = data.get('rain', {}).get('1h', 0)
        wind_speed_ms = data.get('wind', {}).get('speed', 0)
        wind_speed_kmh = wind_speed_ms * 3.6

        # คำนวณ Delay Factor
        delay_factor = 1.0

        # ฝนตก -> ช้าลง 10-40%
        if rain_mm > 0:
            if rain_mm < 2:
                delay_factor *= 1.1  # ฝนเล็กน้อย +10%
            elif rain_mm < 5:
                delay_factor *= 1.2  # ฝนปานกลาง +20%
            else:
                delay_factor *= 1.4  # ฝนหนัก +40%

        # ลมแรง -> ช้าลง 5-15%
        if wind_speed_kmh > 30:
            delay_factor *= 1.05
        elif wind_speed_kmh > 50:
            delay_factor *= 1.15

        # อากาศร้อนมาก -> ช้าลง 5%
        if temp_c > 38:
            delay_factor *= 1.05

        return {
            "condition": condition,
            "temp_c": round(temp_c, 1),
            "rain_mm": round(rain_mm, 2),
            "wind_speed_kmh": round(wind_speed_kmh, 1),
            "delay_factor": round(delay_factor, 2)
        }

    except Exception as e:
        print(f"⚠️ Weather API Error: {e}. Using default weather.")
        return {
            "condition": "Clear",
            "temp_c": 30,
            "rain_mm": 0,
            "wind_speed_kmh": 10,
            "delay_factor": 1.0
        }


def get_traffic_conditions(lat: float, lon: float) -> Dict:
    """
    เรียก Realtime-Traffic.py Lambda เพื่อดูสภาพจราจร
    Returns: {traffic_level, delay_factor}
    """
    if not TRAFFIC_API_URL:
        print("⚠️ TRAFFIC_API_URL not set. Using default traffic.")
        return {"traffic_level": "moderate", "delay_factor": 1.0}

    try:
        traffic_data = {"lat": lat, "lon": lon}
        req = urllib.request.Request(
            TRAFFIC_API_URL,
            data=json.dumps(traffic_data).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )

        with urllib.request.urlopen(req, timeout=2) as response:
            result = json.loads(response.read().decode('utf-8'))

        if result.get('success'):
            traffic_result = result.get('result', {})
            return {
                "traffic_level": traffic_result.get('traffic_level', 'moderate'),
                "delay_factor": traffic_result.get('delay_factor', 1.0)
            }

    except Exception as e:
        print(f"⚠️ Traffic API Error: {e}. Using default traffic.")

    return {"traffic_level": "moderate", "delay_factor": 1.0}


def get_time_of_day_factor() -> float:
    """
    คำนวณ Delay Factor จากช่วงเวลาในวัน
    - Rush Hour (7-9, 17-19): +20%
    - Night (22-5): -10% (ถนนโล่ง)
    - Normal: 0%
    """
    current_hour = datetime.now().hour

    # Rush Hour
    if (7 <= current_hour <= 9) or (17 <= current_hour <= 19):
        return 1.2

    # Night
    if current_hour >= 22 or current_hour <= 5:
        return 0.9

    return 1.0


def calculate_eta(origin: Dict, destination: Dict, vehicle_weight_kg: float = 0) -> Dict:
    """
    คำนวณ ETA โดยพิจารณา:
    1. ระยะทางจริง (OSRM)
    2. สภาพอากาศ (OpenWeatherMap)
    3. การจราจร (Realtime-Traffic.py)
    4. ช่วงเวลา (Rush Hour)
    5. น้ำหนักรถ (Heavy Load = Slower)
    """

    # 1. Get Base Route
    distance_km, base_duration_min = get_osrm_route(
        origin['lat'], origin['lon'],
        destination['lat'], destination['lon']
    )

    # 2. Get Weather Conditions
    weather = get_weather_conditions(destination['lat'], destination['lon'])

    # 3. Get Traffic Conditions
    traffic = get_traffic_conditions(destination['lat'], destination['lon'])

    # 4. Time of Day Factor
    time_factor = get_time_of_day_factor()

    # 5. Vehicle Weight Factor (Heavy = Slower)
    weight_factor = 1.0
    if vehicle_weight_kg > 0:
        # น้ำหนัก 20kg+ ทำให้ช้าลง 10%
        if vehicle_weight_kg > 20:
            weight_factor = 1.1
        elif vehicle_weight_kg > 15:
            weight_factor = 1.05

    # 6. Calculate Final ETA
    total_delay_factor = (
        weather['delay_factor'] *
        traffic['delay_factor'] *
        time_factor *
        weight_factor
    )

    adjusted_duration_min = base_duration_min * total_delay_factor

    return {
        "distance_km": round(distance_km, 3),
        "base_duration_min": round(base_duration_min, 1),
        "adjusted_duration_min": round(adjusted_duration_min, 1),
        "eta_minutes": round(adjusted_duration_min, 1),
        "weather": weather,
        "traffic": traffic,
        "time_of_day_factor": round(time_factor, 2),
        "weight_factor": round(weight_factor, 2),
        "total_delay_factor": round(total_delay_factor, 2)
    }


# ==================== Logging & Response ====================

def log_to_system_logs(level: str, log_type: str, message: str, details: Dict, request_id: str):
    if not db_engine:
        return
    sql = text("""
        INSERT INTO system_logs (id, log_level, log_type, message, details, user_id, ip_address, created_at)
        VALUES (:id, :log_level, :log_type, :message, :details, :user_id, :ip_address, NOW())
    """)
    try:
        with db_engine.connect() as conn:
            with conn.begin():
                conn.execute(sql, {
                    "id": str(uuid.uuid4()), "log_level": level, "log_type": log_type,
                    "message": message, "details": json.dumps(details),
                    "user_id": "lambda:ETACalculation", "ip_address": request_id
                })
        print(f"✅ Logged to DB: {log_type}")
    except Exception as e:
        print(f"❌ Log Error: {e}")


def create_success_response(result: Dict, execution_time_ms: float) -> Dict:
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'success': True,
            'algorithm': 'ETA Calculation (Weather + Traffic + Time)',
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
    request_id = context.request_id if hasattr(context, 'request_id') else "local"

    try:
        # Parse Input
        body = json.loads(event['body']) if 'body' in event else event

        origin = body.get('origin')
        destination = body.get('destination')
        vehicle_weight_kg = body.get('vehicle_weight_kg', 0)

        # Validation
        if not origin or 'lat' not in origin or 'lon' not in origin:
            return create_error_response(400, "Missing 'origin' with lat/lon")

        if not destination or 'lat' not in destination or 'lon' not in destination:
            return create_error_response(400, "Missing 'destination' with lat/lon")

        # Validate coordinates
        try:
            origin_lat = float(origin['lat'])
            origin_lon = float(origin['lon'])
            dest_lat = float(destination['lat'])
            dest_lon = float(destination['lon'])

            if not (-90 <= origin_lat <= 90) or not (-180 <= origin_lon <= 180):
                return create_error_response(400, "Invalid origin coordinates range")

            if not (-90 <= dest_lat <= 90) or not (-180 <= dest_lon <= 180):
                return create_error_response(400, "Invalid destination coordinates range")

            origin['lat'] = origin_lat
            origin['lon'] = origin_lon
            destination['lat'] = dest_lat
            destination['lon'] = dest_lon

        except (ValueError, TypeError):
            return create_error_response(400, "Coordinates must be valid numbers")

        print(f"📍 Calculating ETA from ({origin['lat']}, {origin['lon']}) to ({destination['lat']}, {destination['lon']})")

        # Calculate ETA
        result = calculate_eta(origin, destination, vehicle_weight_kg)

        execution_time = round((time.time() - start_time) * 1000, 2)

        # Log Success
        log_to_system_logs(
            "INFO", "ETACalculation", "ETA calculated successfully",
            {"origin": origin, "destination": destination, "eta_min": result['eta_minutes']},
            request_id
        )

        return create_success_response(result, execution_time)

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        execution_time = round((time.time() - start_time) * 1000, 2)
        return create_error_response(500, f"Internal server error: {str(e)}")
