import json
import math
import time
import urllib.request
import urllib.parse
import os
import uuid
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta

# --- Database Imports ---
import sqlalchemy
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError

# --- SerpAPI Import ---
import requests

# Configuration
OVERPASS_API_URL = "https://overpass-api.de/api/interpreter"
CACHE_TTL_MINUTES = 5
SERPAPI_KEY = os.environ.get("SERPAPI_KEY")

# SerpAPI Endpoint
SERPAPI_ENDPOINT = "https://serpapi.com/search"

if SERPAPI_KEY:
    print(f"✅ SerpAPI key configured (Free tier: 250 searches/month)")
else:
    print("⚠️ SERPAPI_KEY not set. Will use fallback calculation.")

# Database Configuration
DATABASE_URL = os.environ.get("DATABASE_URL")
db_engine = None
if DATABASE_URL:
    try:
        db_engine = create_engine(DATABASE_URL.split("?")[0])
        print("✅ Database engine for logging/cache created successfully.")
    except Exception as e:
        print(f"❌ Failed to create logging/cache database engine: {e}")
        db_engine = None
else:
    print("⚠️ DATABASE_URL not set. Caching/logging will be disabled.")


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371
    lat1_rad, lon1_rad = math.radians(lat1), math.radians(lon1)
    lat2_rad, lon2_rad = math.radians(lat2), math.radians(lon2)
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    a = (math.sin(dlat / 2) ** 2 + 
         math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def get_time_of_day_factor() -> tuple:
    """คำนวณ traffic factor ตามเวลา"""
    current_hour = datetime.now().hour
    if 7 <= current_hour < 9: return 1.8, "Rush Hour (เช้า)"
    elif 17 <= current_hour < 20: return 2.0, "Rush Hour (เย็น)"
    elif 12 <= current_hour < 14: return 1.3, "Lunch Time"
    elif 22 <= current_hour or current_hour < 6: return 0.7, "Night Time"
    else: return 1.0, "Normal Traffic"


def get_serpapi_traffic(lat1: float, lon1: float, lat2: float, lon2: float) -> Optional[Dict]:
    """
    🚗 ใช้ SerpAPI Google Maps Directions API แบบ Real-time Traffic
    API: https://serpapi.com/google-maps-directions-api
    Free tier: 250 searches/month
    Returns: {distance_km, duration_normal_sec, duration_traffic_sec, traffic_condition, delay_factor}
    """
    if not SERPAPI_KEY:
        return None

    try:
        # Call SerpAPI Google Maps Directions
        # Use timestamp for real-time traffic
        current_timestamp = int(datetime.now().timestamp())

        params = {
            'api_key': SERPAPI_KEY,
            'engine': 'google_maps_directions',
            'start_coords': f"{lat1},{lon1}",
            'end_coords': f"{lat2},{lon2}",
            'travel_mode': '0',  # 0 = Driving
            'time': f'depart_at:{current_timestamp}'  # Real-time traffic
        }

        response = requests.get(SERPAPI_ENDPOINT, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        # Check for errors
        if 'error' in data:
            print(f"⚠️ SerpAPI Error: {data['error']}")
            return None

        # Check if directions found
        if 'directions' not in data or len(data['directions']) == 0:
            print("⚠️ SerpAPI returned no routes")
            return None

        # Extract first route (Driving mode)
        route = data['directions'][0]

        # ระยะทาง (meters → km)
        distance_m = route.get('distance', 0)
        distance_km = distance_m / 1000.0

        # ระยะเวลาจริง (seconds, มี traffic)
        duration_traffic_sec = route.get('duration', 0)

        # ระยะเวลาปกติ (ไม่มี traffic) - ประมาณจากความเร็วเฉลี่ย 50 km/h
        # ถ้า SerpAPI ไม่มี typical_duration ให้ประมาณ
        duration_normal_sec = (distance_km / 50) * 3600 if distance_km > 0 else duration_traffic_sec

        # ถ้ามี typical_duration_range ให้ใช้ค่าต่ำสุดเป็น normal duration
        if 'typical_duration_range' in route:
            # Parse "15–18 min" -> 15 min = 900 sec
            typical_range = route['typical_duration_range']
            if '–' in typical_range:
                min_duration_str = typical_range.split('–')[0].strip()
                min_duration_min = int(min_duration_str.split()[0])
                duration_normal_sec = min_duration_min * 60

        # คำนวณ delay factor
        delay_factor = duration_traffic_sec / duration_normal_sec if duration_normal_sec > 0 else 1.0

        # กำหนด traffic_condition ตาม delay_factor
        if delay_factor < 1.2:
            traffic_condition = "light"
        elif delay_factor < 1.5:
            traffic_condition = "moderate"
        elif delay_factor < 2.0:
            traffic_condition = "heavy"
        else:
            traffic_condition = "severe"

        # คำนวณ effective speed
        travel_time_min = duration_traffic_sec / 60.0
        effective_speed_kmh = (distance_km / (travel_time_min / 60)) if travel_time_min > 0 else 0

        print(f"✅ SerpAPI: {distance_km:.2f}km, {travel_time_min:.1f}min, traffic={traffic_condition}")

        return {
            'distance_km': round(distance_km, 3),
            'duration_normal_sec': int(duration_normal_sec),
            'duration_traffic_sec': int(duration_traffic_sec),
            'travel_time_min': round(travel_time_min, 1),
            'traffic_condition': traffic_condition,
            'delay_factor': round(delay_factor, 2),
            'effective_speed_kmh': round(effective_speed_kmh, 1),
            'confidence': 0.95,  # SerpAPI (Google data) มีความแม่นยำสูง
            'data_source': 'SerpAPI (Google Maps Traffic)'
        }

    except requests.exceptions.RequestException as e:
        print(f"❌ SerpAPI Request Error: {e}")
        return None
    except Exception as e:
        print(f"❌ SerpAPI Error: {e}")
        import traceback
        traceback.print_exc()
        return None


def get_road_type_from_osm(lat1: float, lon1: float, lat2: float, lon2: float) -> str:
    """Query OSM สำหรับหาประเภทถนน (เหมือนเดิม)"""
    try:
        min_lat, max_lat = min(lat1, lat2) - 0.005, max(lat1, lat2) + 0.005
        min_lon, max_lon = min(lon1, lon2) - 0.005, max(lon1, lon2) + 0.005
        query = f"""[out:json][timeout:10]; way["highway"]({min_lat},{min_lon},{max_lat},{max_lon}); out body;"""
        params = {'data': query}
        url = f"{OVERPASS_API_URL}?{urllib.parse.urlencode(params)}"
        req = urllib.request.Request(url, headers={'User-Agent': 'TrafficRouter/1.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
        elements = data.get('elements', [])
        if elements:
            return elements[0].get('tags', {}).get('highway', 'residential')
        return 'residential'
    except Exception as e:
        print(f"OSM query error: {str(e)}")
        return 'residential'


# --- MODIFIED: ใช้ Database เป็น Cache ---
def get_traffic_data(lat1: float, lon1: float, lat2: float, lon2: float, use_real_api: bool = False) -> Dict:
    """
    ดึงข้อมูล Traffic จาก 'traffic_data' (Cache) หรือคำนวณใหม่
    """
    if db_engine:
        # 1. Check DB Cache
        sql_check_cache = text("""
            SELECT 
                traffic_condition, travel_time_sec, static_time_sec, delay_sec, 
                traffic_speed_kmh, data_source, confidence_score, timestamp, 
                (traffic_speed_kmh / 60) * travel_time_sec AS distance_km_approx, -- ประมาณระยะทาง
                (SELECT 'residential') AS road_type -- Mock road_type
            FROM traffic_data
            WHERE start_latitude = :lat1 AND start_longitude = :lon1
              AND end_latitude = :lat2 AND end_longitude = :lon2
              AND expires_at > NOW()
            ORDER BY timestamp DESC
            LIMIT 1;
        """)
        try:
            with db_engine.connect() as conn:
                cached = conn.execute(sql_check_cache, {
                    "lat1": lat1, "lon1": lon1, "lat2": lat2, "lon2": lon2
                }).first()
            
            if cached:
                print(f"DB Cache HIT: {lat1:.4f},{lon1:.4f} -> {lat2:.4f},{lon2:.4f}")
                cached_data = cached._asdict()
                # แปลงกลับให้ format เหมือนเดิม
                return {
                    'distance_km': round(cached_data['distance_km_approx'], 3),
                    'road_type': cached_data['road_type'],
                    'base_speed_kmh': 0, # N/A from cache
                    'time_of_day': "From Cache",
                    'time_factor': 0, # N/A
                    'traffic_condition': cached_data['traffic_condition'],
                    'traffic_multiplier': 0, # N/A
                    'effective_speed_kmh': round(cached_data['traffic_speed_kmh'], 1),
                    'travel_time_min': round(cached_data['travel_time_sec'] / 60.0, 1),
                    'confidence': round(cached_data['confidence_score'], 2),
                    'last_updated': cached_data['timestamp'].isoformat(),
                    'data_source': f"Database Cache ({cached_data['data_source']})"
                }
        except Exception as e:
            print(f"DB Cache check error: {e}")
            
    # 2. Cache Miss: คำนวณใหม่
    print(f"DB Cache MISS: {lat1:.4f},{lon1:.4f} -> {lat2:.4f},{lon2:.4f}. Calculating new data...")

    # 🚗 Try SerpAPI first (Real Traffic Data from Google Maps)
    serpapi_data = get_serpapi_traffic(lat1, lon1, lat2, lon2)

    if serpapi_data:
        # ใช้ข้อมูลจาก SerpAPI (Google Maps)
        print("✅ Using SerpAPI real traffic data")
        result = {
            'distance_km': serpapi_data['distance_km'],
            'road_type': 'serpapi',  # SerpAPI ไม่ได้ให้ road_type
            'base_speed_kmh': 0,  # N/A from SerpAPI
            'time_of_day': "From SerpAPI",
            'time_factor': 0,  # N/A
            'traffic_condition': serpapi_data['traffic_condition'],
            'traffic_multiplier': serpapi_data['delay_factor'],
            'effective_speed_kmh': serpapi_data['effective_speed_kmh'],
            'travel_time_min': serpapi_data['travel_time_min'],
            'confidence': serpapi_data['confidence'],
            'last_updated': datetime.now().isoformat(),
            'data_source': serpapi_data['data_source']
        }
    else:
        # Fallback: ใช้การคำนวณแบบเดิม (ไม่ใช่ mock, แต่เป็นการประมาณจาก time-of-day)
        print("⚠️ SerpAPI unavailable, using fallback calculation")
        distance = calculate_distance(lat1, lon1, lat2, lon2)
        time_factor, time_desc = get_time_of_day_factor()

        road_type = 'residential'
        if use_real_api:
            road_type = get_road_type_from_osm(lat1, lon1, lat2, lon2)
        else:
            if distance > 10: road_type = 'motorway'
            elif distance > 5: road_type = 'primary'
            elif distance > 2: road_type = 'secondary'

        base_speeds = {'motorway': 90, 'trunk': 80, 'primary': 60, 'secondary': 50, 'tertiary': 40, 'residential': 30, 'service': 20}
        base_speed = base_speeds.get(road_type, 40)

        # ใช้ time_factor แทน random (ไม่ใช่ mock, แต่เป็นการประมาณจากช่วงเวลา)
        if time_factor > 1.5:
            traffic_condition = 'heavy'
            traffic_multiplier = 1.8
        elif time_factor > 1.2:
            traffic_condition = 'moderate'
            traffic_multiplier = 1.4
        elif time_factor < 0.9:
            traffic_condition = 'light'
            traffic_multiplier = 0.9
        else:
            traffic_condition = 'moderate'
            traffic_multiplier = 1.0

        effective_speed = base_speed / (time_factor * traffic_multiplier)
        travel_time_min = (distance / effective_speed) * 60 if effective_speed > 0 else float('inf')
        confidence = 0.70  # ต่ำกว่า Google เพราะเป็นการประมาณ

        data_source = 'Time-of-Day Estimation (OSM)' if use_real_api else 'Time-of-Day Estimation'

        result = {
            'distance_km': round(distance, 3),
            'road_type': road_type,
            'base_speed_kmh': base_speed,
            'time_of_day': time_desc,
            'time_factor': time_factor,
            'traffic_condition': traffic_condition,
            'traffic_multiplier': traffic_multiplier,
            'effective_speed_kmh': round(effective_speed, 1),
            'travel_time_min': round(travel_time_min, 1),
            'confidence': confidence,
            'last_updated': datetime.now().isoformat(),
            'data_source': data_source
        }
    
    # 3. Save to DB Cache
    if db_engine:
        sql_save_cache = text("""
            INSERT INTO traffic_data (
                id, start_latitude, start_longitude, end_latitude, end_longitude,
                traffic_condition, travel_time_sec, static_time_sec, delay_sec,
                traffic_speed_kmh, data_source, confidence_score,
                timestamp, expires_at
            ) VALUES (
                :id, :lat1, :lon1, :lat2, :lon2,
                :condition, :travel_sec, :static_sec, :delay_sec,
                :speed_kmh, :source, :confidence,
                NOW(), NOW() + INTERVAL '5 minutes'
            );
        """)
        try:
            # Extract values from result dict (works for both SerpAPI and fallback)
            travel_time_min = result['travel_time_min']
            distance_km = result['distance_km']
            effective_speed_kmh = result['effective_speed_kmh']
            traffic_condition = result['traffic_condition']
            data_source = result['data_source']
            confidence = result['confidence']

            travel_sec = travel_time_min * 60
            # Calculate static time assuming 50 km/h average speed
            static_sec = (distance_km / 50) * 3600 if distance_km > 0 else 0
            delay_sec = travel_sec - static_sec

            with db_engine.connect() as conn:
                with conn.begin():
                    conn.execute(sql_save_cache, {
                        "id": str(uuid.uuid4()),
                        "lat1": lat1, "lon1": lon1, "lat2": lat2, "lon2": lon2,
                        "condition": traffic_condition,
                        "travel_sec": travel_sec,
                        "static_sec": static_sec,
                        "delay_sec": delay_sec,
                        "speed_kmh": effective_speed_kmh,
                        "source": data_source,
                        "confidence": confidence
                    })
            print("Successfully saved segment to traffic_data cache.")
        except Exception as e:
            print(f"DB Cache save error: {e}")
            
    return result


def optimize_route_with_traffic(stores: List[Dict], start_idx: int = 0, use_real_api: bool = False) -> Dict:
    """
    Optimize route โดยคำนึงถึง traffic (โค้ดส่วนนี้เหมือนเดิม)
    """
    n = len(stores)
    traffic_matrix = []
    
    for i in range(n):
        row = []
        for j in range(n):
            if i == j:
                row.append({'distance_km': 0, 'travel_time_min': 0, 'traffic_condition': 'none'})
            else:
                # --- MODIFIED: เรียกฟังก์ชันใหม่ ---
                traffic_data = get_traffic_data(
                    stores[i]['lat'], stores[i]['lon'],
                    stores[j]['lat'], stores[j]['lon'],
                    use_real_api
                )
                row.append(traffic_data)
        traffic_matrix.append(row)
    
    # Greedy algorithm
    route = [start_idx]
    unvisited = set(range(n))
    unvisited.remove(start_idx)
    current = start_idx
    total_time = 0
    total_distance = 0
    
    while unvisited:
        next_stop = min(unvisited, key=lambda x: traffic_matrix[current][x]['travel_time_min'])
        total_time += traffic_matrix[current][next_stop]['travel_time_min']
        total_distance += traffic_matrix[current][next_stop]['distance_km']
        route.append(next_stop)
        unvisited.remove(next_stop)
        current = next_stop
    
    # สร้างรายละเอียด
    segments = []
    cumulative_time = 0
    cumulative_distance = 0
    for i in range(len(route) - 1):
        from_idx, to_idx = route[i], route[i + 1]
        traffic = traffic_matrix[from_idx][to_idx]
        cumulative_time += traffic['travel_time_min']
        cumulative_distance += traffic['distance_km']
        segments.append({
            'step': i + 1,
            'from': {'index': from_idx, 'name': stores[from_idx].get('name'), 'lat': stores[from_idx]['lat'], 'lon': stores[from_idx]['lon']},
            'to': {'index': to_idx, 'name': stores[to_idx].get('name'), 'lat': stores[to_idx]['lat'], 'lon': stores[to_idx]['lon']},
            'distance_km': traffic['distance_km'],
            'travel_time_min': traffic['travel_time_min'],
            'traffic_condition': traffic.get('traffic_condition'),
            'road_type': traffic.get('road_type'),
            'effective_speed_kmh': traffic.get('effective_speed_kmh'),
            'cumulative_time_min': round(cumulative_time, 1),
            'cumulative_distance_km': round(cumulative_distance, 3)
        })
    
    avg_confidence = sum(t.get('confidence', 0.8) for row in traffic_matrix for t in row if t['distance_km'] > 0) / (n*n - n) if (n*n-n) > 0 else 0.8
    
    return {
        'optimized_route': route,
        'total_stops': n,
        'total_distance_km': round(total_distance, 3),
        'total_travel_time_min': round(total_time, 1),
        'average_speed_kmh': round(total_distance / (total_time / 60), 1) if total_time > 0 else 0,
        'traffic_confidence': round(avg_confidence, 2),
        'segments': segments
    }


# --- ADDED: Database Logging Function (Copy from L2/L3) ---
def log_to_system_logs(level: str, log_type: str, message: str, details: Dict, request_id: str):
    """
    บันทึก Log ลงตาราง system_logs (Best-effort)
    """
    if not db_engine:
        print("Logging DB engine not available. Skipping log.")
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
                    "user_id": "lambda:RouteTraffic", # ระบุตัวตนใหม่
                    "ip_address": request_id
                })
        print(f"Successfully logged to system_logs (Type: {log_type})")
    except Exception as e:
        print(f"Error logging to system_logs: {e}")
# ----------------------------------------


def create_success_response(result: Dict, execution_time_ms: float) -> Dict:
    """Success response"""
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type',
            'X-Execution-Time': str(execution_time_ms),
            'X-Traffic-Confidence': str(result.get('traffic_confidence', 0))
        },
        'body': json.dumps({
            'success': True, 'execution_time_ms': execution_time_ms,
            'result': result, 'timestamp': datetime.now().isoformat()
        }, ensure_ascii=False, indent=2)
    }


def create_error_response(status_code: int, error: str, details: Any = None) -> Dict:
    """Error response"""
    return {
        'statusCode': status_code,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'success': False, 'error': error, 'details': details}, ensure_ascii=False, indent=2)
    }


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda Handler: Traffic-Optimized Routing
    """
    start_time = time.time()
    
    # --- ADDED: Get Request ID ---
    request_id = context.request_id if hasattr(context, 'request_id') else "local"
    
    try:
        if 'body' in event:
            body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        else:
            body = event
        
        stores = body.get('stores')
        start_idx = body.get('start_index', 0)
        use_real_api = body.get('use_real_api', False)
        
        if not stores: raise ValueError('กรุณาระบุ stores')
        if len(stores) < 2: raise ValueError('ต้องมีร้านอย่างน้อย 2 ร้าน')
        if len(stores) > 20: raise ValueError('จำนวนร้านต้องไม่เกิน 20 ร้าน (traffic API rate limit)')
        start_idx = int(start_idx)
        if not (0 <= start_idx < len(stores)):
            raise ValueError(f'start_index ต้องอยู่ระหว่าง 0-{len(stores)-1}')
        
        for i, store in enumerate(stores):
            if 'lat' not in store or 'lon' not in store:
                raise ValueError(f'Store {i} ขาดข้อมูล lat/lon')
            store['lat'] = float(store['lat'])
            store['lon'] = float(store['lon'])
        
        print(f"Optimizing route with traffic for {len(stores)} stops...")
        result = optimize_route_with_traffic(stores, start_idx, use_real_api)
        
        execution_time = round((time.time() - start_time) * 1000, 2)
        
        # --- ADDED: Log SUCCESS to Database ---
        log_details = {
            "input_body": body,
            "result": result,
            "execution_time_ms": execution_time
        }
        log_to_system_logs("INFO", "RouteTraffic", "Traffic-Aware calculation successful", log_details, request_id)
        # --------------------------------------
        
        return create_success_response(result, execution_time)
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        
        execution_time = round((time.time() - start_time) * 1000, 2)
        
        # --- ADDED: Log ERROR to Database ---
        error_details = {
            "input_body": event.get('body') or event,
            "error": str(e),
            "error_type": type(e).__name__,
            "execution_time_ms": execution_time
        }
        log_to_system_logs("ERROR", "RouteTraffic", "Traffic-Aware calculation failed", error_details, request_id)
        # ------------------------------------
        
        return create_error_response(500, 'เกิดข้อผิดพลาดในการคำนวณเส้นทาง', {
            'message': str(e),
            'execution_time_ms': execution_time
        })

# ... (ส่วน test_lambda() ไม่ได้ถูกเรียกใน Lambda) ...