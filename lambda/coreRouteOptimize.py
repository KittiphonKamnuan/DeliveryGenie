import json
import math
import time
import os
import uuid
import urllib.request
import urllib.parse
from typing import Dict, List, Tuple, Any, Optional

# --- Database Imports ---
import sqlalchemy
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
# -------------------------------

# Configuration
EARTH_RADIUS_KM = 6371
OSRM_API_URL = "http://router.project-osrm.org/route/v1/driving"

# --- Database Configuration ---
# เอา URL จาก Environment Variable เท่านั้น ไม่ควร hardcode credentials
DATABASE_URL = os.environ.get("DATABASE_URL")

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
        import traceback
        traceback.print_exc()
        db_engine = None
else:
    print("⚠️ DATABASE_URL not set. Logging will be disabled.")


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
    🚗 เรียก OSRM API หาระยะทางจริง (Real Road Distance)
    Returns: (distance_km, duration_min)
    """
    try:
        # OSRM ใช้ format: lon,lat
        coords = f"{lon1},{lat1};{lon2},{lat2}"
        url = f"{OSRM_API_URL}/{coords}?overview=false"
        
        req = urllib.request.Request(url)
        # Timeout 1.5 วิ ถ้าช้ากว่านี้ให้ตัดไปใช้ Fallback
        with urllib.request.urlopen(req, timeout=1.5) as response:
            data = json.loads(response.read().decode('utf-8'))
            
        if data.get('code') == 'Ok' and len(data.get('routes', [])) > 0:
            route = data['routes'][0]
            distance_km = route['distance'] / 1000.0
            duration_min = route['duration'] / 60.0
            return distance_km, duration_min
            
    except Exception as e:
        print(f"⚠️ OSRM API Error/Slow: {e}. Switching to Haversine.")
    
    # Fallback
    dist = calculate_haversine_distance(lat1, lon1, lat2, lon2)
    return dist * 1.3, (dist * 1.3 / 30) * 60 

# ==================== Main Logic ====================

def calculate_nearest_stores(origin: Dict, stores: List[Dict]) -> List[Dict]:
    """
    คำนวณระยะทางจาก Origin ไปยังทุก Store และเรียงลำดับ
    """
    processed_stores = []
    
    origin_lat = float(origin['lat'])
    origin_lon = float(origin['lon'])
    
    for store in stores:
        store_lat = float(store['lat'])
        store_lon = float(store['lon'])
        
        # คำนวณระยะทางจริง
        dist_km, dur_min = get_osrm_route(origin_lat, origin_lon, store_lat, store_lon)
        
        # สร้าง Object ใหม่ที่มีข้อมูลระยะทาง
        store_data = store.copy()
        store_data['distance_km'] = round(dist_km, 3)
        store_data['duration_min'] = round(dur_min, 1)
        
        processed_stores.append(store_data)
        
    # 🔥 Sorting: เรียงจากระยะทางน้อยไปมาก (ใกล้สุดขึ้นก่อน)
    processed_stores.sort(key=lambda x: x['distance_km'])
    
    return processed_stores

# ==================== Logging & Response ====================

def log_to_system_logs(level: str, log_type: str, message: str, details: Dict, request_id: str):
    if not db_engine: return
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
                    "user_id": "lambda:StoreSorter", "ip_address": request_id
                })
        print(f"✅ Logged to DB: {log_type}")
    except Exception as e: print(f"❌ Log Error: {e}")

def create_success_response(result: Dict, execution_time_ms: float) -> Dict:
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'success': True,
            'algorithm': 'Nearest Neighbor Sort (OSRM)',
            'execution_time_ms': execution_time_ms,
            'result': result
        }, ensure_ascii=False, indent=2)
    }

def create_error_response(status_code: int, error: str, details: Any = None) -> Dict:
    return {
        'statusCode': status_code,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'success': False, 'error': error, 'details': details}, ensure_ascii=False, indent=2)
    }

# ==================== Lambda Handler ====================

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    start_time = time.time()
    request_id = context.request_id if hasattr(context, 'request_id') else "local"

    try:
        # Parse Input
        body = json.loads(event['body']) if 'body' in event else event

        origin = body.get('origin')
        stores = body.get('stores')

        # Validation
        if not origin or 'lat' not in origin or 'lon' not in origin:
            return create_error_response(400, "Missing 'origin' with lat/lon")

        # Validate origin coordinates
        try:
            origin_lat = float(origin['lat'])
            origin_lon = float(origin['lon'])
            if not (-90 <= origin_lat <= 90) or not (-180 <= origin_lon <= 180):
                return create_error_response(400, "Invalid origin coordinates range")
        except (ValueError, TypeError):
            return create_error_response(400, "Origin lat/lon must be valid numbers")

        if not stores or not isinstance(stores, list):
            return create_error_response(400, "Missing 'stores' list")

        if len(stores) == 0:
            return create_error_response(400, "At least one store is required")

        if len(stores) > 50:
            return create_error_response(400, "Maximum 50 stores allowed")
            
        print(f"🔍 Calculating nearest stores for origin: {origin['lat']}, {origin['lon']}")
        
        # 🚀 Main Calculation
        sorted_stores = calculate_nearest_stores(origin, stores)
        
        execution_time = round((time.time() - start_time) * 1000, 2)
        
        result = {
            "origin": origin,
            "total_stores": len(stores),
            "nearest_store": sorted_stores[0] if sorted_stores else None,
            "sorted_stores": sorted_stores
        }
        
        # Log Success
        log_to_system_logs("INFO", "StoreSorter", "Sorting successful", 
                          {"input": body, "result_summary": "Sorted " + str(len(stores)) + " stores"}, request_id)
        
        return create_success_response(result, execution_time)
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        execution_time = round((time.time() - start_time) * 1000, 2)
        log_to_system_logs("ERROR", "StoreSorter", "Sorting failed", {"error": str(e)}, request_id)
        return create_error_response(500, 'Error processing request', str(e))