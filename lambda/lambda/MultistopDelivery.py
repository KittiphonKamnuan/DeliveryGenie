import json
import math
import time
import heapq
import os
import uuid
from typing import Dict, List, Tuple, Any, Optional
import itertools

# --- Database Imports ---
import sqlalchemy
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
# -------------------------------

# Configuration
MAX_STOPS = 25
EARTH_RADIUS_KM = 6371

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
        print("✅ Database engine for logging created successfully.")
    except Exception as e:
        print(f"❌ Failed to create logging database engine: {e}")
        import traceback
        traceback.print_exc()
        db_engine = None
else:
    print("⚠️ DATABASE_URL not set. Logging will be disabled.")


# ==================== Math / Logic Functions ====================

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance calculation"""
    lat1_rad, lon1_rad = math.radians(lat1), math.radians(lon1)
    lat2_rad, lon2_rad = math.radians(lat2), math.radians(lon2)
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    a = (math.sin(dlat / 2) ** 2 + 
         math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return EARTH_RADIUS_KM * c


def create_distance_matrix(locations: List[Dict]) -> List[List[float]]:
    """สร้าง Matrix ระยะทางระหว่างทุกจุด (รวม Origin แล้ว)"""
    n = len(locations)
    matrix = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1, n):
            dist = calculate_distance(
                locations[i]['lat'], locations[i]['lon'],
                locations[j]['lat'], locations[j]['lon']
            )
            matrix[i][j] = dist
            matrix[j][i] = dist
    return matrix


def calculate_route_distance(route: List[int], distance_matrix: List[List[float]]) -> float:
    total = 0
    for i in range(len(route) - 1):
        total += distance_matrix[route[i]][route[i + 1]]
    return total


def nearest_neighbor_tsp(distance_matrix: List[List[float]], start_idx: int = 0) -> Tuple[List[int], float]:
    n = len(distance_matrix)
    unvisited = set(range(n))
    route = [start_idx]
    unvisited.remove(start_idx)
    current = start_idx
    while unvisited:
        nearest = min(unvisited, key=lambda x: distance_matrix[current][x])
        route.append(nearest)
        unvisited.remove(nearest)
        current = nearest
    distance = calculate_route_distance(route, distance_matrix)
    return route, distance


def two_opt_improvement(route: List[int], distance_matrix: List[List[float]], max_iterations: int = 1000) -> Tuple[List[int], float]:
    best_route = route[:]
    best_distance = calculate_route_distance(best_route, distance_matrix)
    improved = True
    iteration = 0
    while improved and iteration < max_iterations:
        improved = False
        iteration += 1
        for i in range(1, len(route) - 1):
            for j in range(i + 1, len(route)):
                new_route = best_route[:i] + best_route[i:j][::-1] + best_route[j:]
                new_distance = calculate_route_distance(new_route, distance_matrix)
                if new_distance < best_distance:
                    best_route = new_route
                    best_distance = new_distance
                    improved = True
                    break
            if improved: break
    return best_route, best_distance


def brute_force_tsp(distance_matrix: List[List[float]], start_idx: int = 0) -> Tuple[List[int], float]:
    n = len(distance_matrix)
    other_indices = [i for i in range(n) if i != start_idx]
    best_route = None
    best_distance = float('inf')
    for perm in itertools.permutations(other_indices):
        route = [start_idx] + list(perm)
        distance = calculate_route_distance(route, distance_matrix)
        if distance < best_distance:
            best_distance = distance
            best_route = route
    return best_route, best_distance


def apply_priority_scoring(locations: List[Dict]) -> List[int]:
    """
    Priority Scoring: 
    Index 0 คือ Origin (ไม่นำมาคิด)
    Index 1..N คือ Stores (นำมาเรียงตาม Priority)
    """
    # แยก Stores ออกมา (พร้อม index เดิม)
    store_indices = []
    for i in range(1, len(locations)):
        store = locations[i]
        score = store.get('priority', 5)
        if store.get('is_urgent', False): score += 3
        if store.get('is_perishable', False): score += 2
        store_indices.append((i, score))
    
    # เรียงตามคะแนนมาก -> น้อย
    store_indices.sort(key=lambda x: x[1], reverse=True)
    
    # สร้าง Route: Origin (0) -> เรียงตาม Priority
    route = [0] + [x[0] for x in store_indices]
    return route


def optimize_multi_stop(all_locations: List[Dict], use_priority: bool = False) -> Dict:
    """
    Main Optimization Logic
    all_locations[0] คือ Origin เสมอ
    """
    n = len(all_locations)
    distance_matrix = create_distance_matrix(all_locations)
    start_idx = 0 # เริ่มที่ Origin เสมอ
    
    # 1. คำนวณแบบ TSP (ระยะทางสั้นสุด)
    if n <= 10:
        print(f"Using Brute Force for {n} stops...")
        route, distance = brute_force_tsp(distance_matrix, start_idx)
        algorithm_used = "Brute Force (Optimal)"
    else:
        print(f"Using Nearest Neighbor + 2-opt for {n} stops...")
        route, distance = nearest_neighbor_tsp(distance_matrix, start_idx)
        route, distance = two_opt_improvement(route, distance_matrix)
        algorithm_used = "Nearest Neighbor + 2-opt"
    
    # 2. คำนวณแบบ Priority (ถ้าเลือก)
    if use_priority:
        print("Applying priority scoring...")
        priority_route = apply_priority_scoring(all_locations)
        priority_distance = calculate_route_distance(priority_route, distance_matrix)
        
        # ถ้าระยะทาง Priority ไม่แย่กว่า 20% ให้ใช้ Priority
        if priority_distance <= distance * 1.2:
            route = priority_route
            distance = priority_distance
            algorithm_used += " + Priority Scoring"
        else:
            algorithm_used += " (Priority Ignored: Too far)"
    
    # 3. สร้าง Output Segments
    segments = []
    for i in range(len(route) - 1):
        from_idx = route[i]
        to_idx = route[i + 1]
        seg_distance = distance_matrix[from_idx][to_idx]
        
        # ดึงข้อมูล Location
        from_loc = all_locations[from_idx]
        to_loc = all_locations[to_idx]
        
        segments.append({
            'step': i + 1,
            'from': {
                'type': 'Origin' if from_idx == 0 else 'Store',
                'name': from_loc.get('name', f"Stop {from_idx}"),
                'lat': from_loc['lat'], 'lon': from_loc['lon']
            },
            'to': {
                'type': 'Store', # ปลายทางจะเป็น Store เสมอ (ยกเว้นวนกลับ)
                'name': to_loc.get('name', f"Stop {to_idx}"),
                'lat': to_loc['lat'], 'lon': to_loc['lon'],
                'priority': to_loc.get('priority', 5)
            },
            'distance_km': round(seg_distance, 3),
            'cumulative_distance_km': round(sum(distance_matrix[route[j]][route[j+1]] for j in range(i+1)), 3),
            'estimated_time_min': round(seg_distance / 0.5, 1) # สมมติ 30km/h
        })
    
    return {
        'algorithm': algorithm_used,
        'total_stops': n - 1, # ไม่นับ Origin
        'total_distance_km': round(distance, 3),
        'segments': segments
    }


# --- Database Logging ---
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
                    "user_id": "lambda:RouteTSP", "ip_address": request_id
                })
        print(f"✅ Logged to DB: {log_type}")
    except Exception as e: print(f"❌ Log Error: {e}")

# --- Response Helpers ---
def create_success_response(result: Dict, execution_time_ms: float) -> Dict:
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'success': True, 'execution_time_ms': execution_time_ms, 'result': result}, ensure_ascii=False, indent=2)
    }

def create_error_response(status_code: int, error: str) -> Dict:
    return {
        'statusCode': status_code,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'success': False, 'error': error}, ensure_ascii=False, indent=2)
    }


# ==================== Lambda Handler ====================
def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    start_time = time.time()
    request_id = context.request_id if hasattr(context, 'request_id') else "local"
    
    try:
        body = json.loads(event['body']) if 'body' in event else event
        
        # 1. Parse New Input Structure
        origin = body.get('origin')
        stores = body.get('stores')
        use_priority = body.get('use_priority', False)

        # 2. Validation
        if not origin or 'lat' not in origin or 'lon' not in origin:
            return create_error_response(400, "Missing 'origin' with lat/lon")

        # Validate origin coordinates
        try:
            origin_lat = float(origin['lat'])
            origin_lon = float(origin['lon'])
            if not (-90 <= origin_lat <= 90) or not (-180 <= origin_lon <= 180):
                return create_error_response(400, "Invalid origin coordinates range")
            origin['lat'] = origin_lat
            origin['lon'] = origin_lon
        except (ValueError, TypeError):
            return create_error_response(400, "Origin lat/lon must be valid numbers")

        if not stores or not isinstance(stores, list) or len(stores) < 1:
            return create_error_response(400, "Missing 'stores' list (at least 1 store)")

        if len(stores) > MAX_STOPS:
            return create_error_response(400, f"Maximum {MAX_STOPS} stores allowed")
        
        # 3. Combine Data: [Origin, Store1, Store2, ...]
        # Origin จะอยู่ที่ Index 0 เสมอ
        all_locations = [origin] + stores
        
        # Convert Lat/Lon to float
        for i, loc in enumerate(all_locations):
            if 'lat' not in loc or 'lon' not in loc:
                return create_error_response(400, f"Location at index {i} missing lat/lon")
            loc['lat'] = float(loc['lat'])
            loc['lon'] = float(loc['lon'])
            
        print(f"🚀 Optimizing route for {len(stores)} stores starting from Origin...")
        
        # 4. Run TSP Optimization
        result = optimize_multi_stop(all_locations, use_priority)
        
        execution_time = round((time.time() - start_time) * 1000, 2)
        
        # 5. Log & Response
        log_to_system_logs("INFO", "RouteTSP", "TSP Calculation Success", 
                          {"stops": len(stores), "total_km": result['total_distance_km']}, request_id)
        
        return create_success_response(result, execution_time)
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return create_error_response(500, str(e))