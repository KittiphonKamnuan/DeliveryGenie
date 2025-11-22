import json
import math
import urllib.request
import urllib.parse
import time
import os
import uuid
from typing import Dict, List, Any
import requests


# --- Database Imports ---
import sqlalchemy
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError, IntegrityError


DATABASE_URL = os.environ.get("DATABASE_URL")
OVERPASS_API_URL = os.environ.get("OVERPASS_API_URL", "https://overpass-api.de/api/interpreter")
SEARCH_RADIUS_KM = float(os.environ.get("SEARCH_RADIUS_KM", "3"))  # ค่าเริ่มต้น 3 กม.
ROUTING_API_URL = os.environ.get("ROUTING_API_URL", "https://smof4e355txf7oz7sck4jn5rhy0fjpre.lambda-url.ap-southeast-1.on.aws/")


db_engine = None
if DATABASE_URL:
    try:
        clean_url = DATABASE_URL.split("?")[0]
        db_engine = create_engine(clean_url, pool_pre_ping=True)
        print("Database engine created successfully.")
    except Exception as e:
        print(f"Failed to create database engine: {e}")
        db_engine = None
else:
    print("DATABASE_URL not set. Caching disabled.")



# ==================== Helper Functions ====================
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



def create_bounding_box(latitude: float, longitude: float, radius_km: float) -> tuple:
    lat_offset = radius_km / 111.0
    lon_offset = radius_km / (111.0 * math.cos(math.radians(latitude)))
    return (
        latitude - lat_offset,   # min_lat
        longitude - lon_offset,  # min_lon
        latitude + lat_offset,   # max_lat
        longitude + lon_offset   # max_lon
    )



# ==================== OpenStreetMap Functions ====================
def query_overpass_api(min_lat: float, min_lon: float, max_lat: float, max_lon: float) -> List[Dict]:
    """
    Query OpenStreetMap Overpass API with retry logic and simplified query
    """
    max_retries = 3
    retry_delay = 2  # seconds
    
    for attempt in range(max_retries):
        try:
            # ใช้ query ที่ง่ายกว่าเพื่อลดโหลด
            query = f"""[out:json][timeout:30];
(
  node["name"~"7-Eleven",i]({min_lat},{min_lon},{max_lat},{max_lon});
  way["name"~"7-Eleven",i]({min_lat},{min_lon},{max_lat},{max_lon});
);
out body center;
"""
            
            print(f"🌐 Overpass API Query (Attempt {attempt + 1}/{max_retries})")
            print(f"   Bbox: {min_lat},{min_lon},{max_lat},{max_lon}")
            
            # ใช้ POST แทน GET เพื่อให้ reliable มากขึ้น
            response = requests.post(
                OVERPASS_API_URL,
                data={'data': query},
                timeout=45,
                headers={'User-Agent': 'DeliveryGenie/1.0 (Educational Project)'}
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Overpass API query successful")
                return data.get('elements', [])
            
            elif response.status_code == 429:
                # Rate limited - wait and retry
                print(f"⚠️ Rate limited (429). Waiting {retry_delay}s before retry...")
                time.sleep(retry_delay)
                continue
            
            elif response.status_code in [503, 504]:
                # Server busy - wait and retry
                print(f"⚠️ Server busy ({response.status_code}). Waiting {retry_delay}s before retry...")
                time.sleep(retry_delay)
                continue
            
            else:
                response.raise_for_status()
        
        except requests.exceptions.Timeout:
            print(f"⚠️ Timeout on attempt {attempt + 1}/{max_retries}")
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
                continue
            else:
                raise Exception("Overpass API Timeout - Server did not respond in time")
        
        except requests.exceptions.RequestException as e:
            print(f"⚠️ Request error on attempt {attempt + 1}/{max_retries}: {e}")
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
                continue
            else:
                raise Exception(f"Overpass API Error: {str(e)}")
        
        except Exception as e:
            print(f"⚠️ Error on attempt {attempt + 1}/{max_retries}: {e}")
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
                continue
            else:
                raise
    
    raise Exception("Overpass API: Max retries exceeded")

def find_nearby_stores_osm(latitude: float, longitude: float, radius_km: float) -> List[Dict[str, Any]]:
    """
    ค้นหาร้าน 7-Eleven จาก OSM และประมวลผล
    """
    try:
        min_lat, min_lon, max_lat, max_lon = create_bounding_box(latitude, longitude, radius_km)
        elements = query_overpass_api(min_lat, min_lon, max_lat, max_lon)
        print(f"📦 Found {len(elements)} elements from OpenStreetMap")
        
        nearby_stores = []
        seen_ids = set()
        
        for element in elements:
            element_id = element.get('id')
            if element_id in seen_ids:
                continue
            
            if element.get('type') == 'node':
                store_lat, store_lon = element.get('lat'), element.get('lon')
            elif element.get('type') == 'way' and 'center' in element:
                store_lat, store_lon = element['center'].get('lat'), element['center'].get('lon')
            else:
                continue
            
            if store_lat is None or store_lon is None:
                continue
            
            distance = calculate_distance(latitude, longitude, store_lat, store_lon)
            
            if distance <= radius_km:
                tags = element.get('tags', {})
                name = tags.get('name', '7-Eleven')
                
                name_lower = name.lower()
                if any(keyword in name_lower for keyword in ['7-eleven', '7-11', 'seven eleven', 'เซเว่น']):
                    
                    # --- พยายามแยกส่วนประกอบที่อยู่ ---
                    address_parts = {
                        'housenumber': tags.get('addr:housenumber'),
                        'street': tags.get('addr:street'),
                        'subdistrict': tags.get('addr:subdistrict'),
                        'district': tags.get('addr:district'),
                        'province': tags.get('addr:province'),
                        'full': tags.get('addr:full')
                    }
                    address_list = [v for k, v in address_parts.items() if v and k != 'full']
                    full_address = ', '.join(address_list) if address_list else address_parts['full'] or 'ไม่ระบุที่อยู่'
                    # ---------------------------------


                    store_info = {
                        'id': element_id,
                        'name': name,
                        'address_full': full_address,
                        'address_parts': address_parts,
                        'lat': store_lat,
                        'lon': store_lon,
                        'distance': round(distance, 2),
                        'opening_hours': tags.get('opening_hours', '24/7'),
                        'phone': tags.get('phone', tags.get('contact:phone')),
                        'osm_type': element.get('type')
                    }
                    
                    nearby_stores.append(store_info)
                    seen_ids.add(element_id)
        
        nearby_stores.sort(key=lambda x: x['distance'])
        print(f"✅ Filtered to {len(nearby_stores)} 7-Eleven stores within {radius_km}km")
        return nearby_stores
        
    except Exception as e:
        print(f"❌ Error in find_nearby_stores_osm: {str(e)}")
        raise



# ==================== Database Functions ====================
def find_nearby_stores_db(latitude: float, longitude: float, radius_km: float) -> List[Dict[str, Any]]:
    """
    ค้นหาร้าน 7-Eleven จากตาราง 'stores' (Cache) โดยใช้ PostGIS
    """
    if not db_engine:
        return []


    stores_from_db = []
    radius_meters = radius_km * 1000
    
    # Query โดยใช้ PostGIS (ST_DWithin)
    sql_query = text("""
        SELECT 
            id, store_code, name, branch_name, address, district, city, province, 
            latitude, longitude, phone, 
            (ST_Distance(
                ST_MakePoint(longitude, latitude)::geography, 
                ST_MakePoint(:lon, :lat)::geography
            ) / 1000) AS distance
        FROM 
            stores
        WHERE 
            -- ค้นหาในรัศมี (ต้องใช้ geography)
            ST_DWithin(
                ST_MakePoint(longitude, latitude)::geography,
                ST_MakePoint(:lon, :lat)::geography,
                :radius_m
            )
            -- กรองเฉพาะ 7-Eleven
            AND (name ILIKE '%7-Eleven%' OR name ILIKE '%7-11%' OR name ILIKE '%เซเว่น%')
            AND is_active = TRUE
        ORDER BY
            distance;
    """)
    
    try:
        with db_engine.connect() as conn:
            result = conn.execute(sql_query, {
                "lon": longitude,
                "lat": latitude,
                "radius_m": radius_meters
            })
            
            for row in result:
                row_dict = row._asdict()
                store_info = {
                    'id': row_dict['store_code'].replace('osm_', '') if row_dict['store_code'] and row_dict['store_code'].startswith('osm_') else row_dict['store_code'],
                    'name': row_dict['name'],
                    'address_full': row_dict['address'],
                    'address_parts': {
                        'district': row_dict['district'],
                        'subdistrict': row_dict['city'],
                        'province': row_dict['province']
                    },
                    'lat': float(row_dict['latitude']),
                    'lon': float(row_dict['longitude']),
                    'distance': round(float(row_dict['distance']), 2),
                    'opening_hours': '24/7', # สมมติจาก schema ถ้าไม่ได้ดึงมา
                    'phone': row_dict['phone'],
                }
                stores_from_db.append(store_info)
                
        print(f"✅ Found {len(stores_from_db)} stores in database cache ('stores' table).")
        return stores_from_db
        
    except OperationalError as e:
        print(f"❌ Database query error (Did you run 'CREATE EXTENSION postgis'?): {e}")
        return []
    except Exception as e:
        print(f"❌ Error querying 'stores' database: {e}")
        return []



def save_stores_to_db(stores: List[Dict[str, Any]]):
    """
    บันทึกข้อมูลร้านค้าลง Database (Cache) ลงในตาราง 'stores'
    ใช้คำสั่ง UPSERT (INSERT ... ON CONFLICT ...)
    """
    if not db_engine:
        print("⚠️ Database engine not available. Skipping save.")
        return
    
    # ลบ ::jsonb ออกจาก :opening_hours เพื่อแก้ Syntax Error
    upsert_sql = text("""
    INSERT INTO stores (
        id, store_code, name, branch_name,
        address, district, city, province, 
        latitude, longitude, phone, opening_hours,
        is_24_hours, is_active, has_parking,
        created_at, updated_at
    )
    VALUES (
        :id, :store_code, :name, :branch_name,
        :address, :district, :city, :province, 
        :latitude, :longitude, :phone, :opening_hours, 
        :is_24_hours, :is_active, :has_parking,
        NOW(), NOW()
    )
    ON CONFLICT (store_code) DO UPDATE SET
        name = EXCLUDED.name,
        address = EXCLUDED.address,
        district = EXCLUDED.district,
        city = EXCLUDED.city,
        province = EXCLUDED.province,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        phone = EXCLUDED.phone,
        opening_hours = EXCLUDED.opening_hours,
        updated_at = NOW();
    """)
    
    inserted_count = 0
    try:
        with db_engine.connect() as conn:
            with conn.begin(): # เริ่ม Transaction
                for store in stores:
                    addr_parts = store['address_parts']
                    store_code = f"osm_{store['id']}"
                    
                    params = {
                        'id': str(uuid.uuid4()),
                        'store_code': store_code,
                        'name': store['name'],
                        'branch_name': store['name'],
                        
                        'address': store['address_full'],
                        'district': addr_parts.get('district') or 'N/A',
                        'city': addr_parts.get('subdistrict') or 'N/A',
                        'province': addr_parts.get('province') or 'N/A',
                        
                        'latitude': store['lat'],
                        'longitude': store['lon'],
                        'phone': store.get('phone'),
                        'opening_hours': json.dumps({"osm": store.get('opening_hours', '24/7')}),
                        
                        'is_24_hours': store.get('opening_hours') == '24/7',
                        'is_active': True,
                        'has_parking': False,
                    }
                    try:
                        conn.execute(upsert_sql, params)
                        inserted_count += 1
                    except IntegrityError as ie:
                        # อาจจะชน duplicate key อื่นๆ ข้ามไปก่อน
                        pass
                    
        print(f"✅ Successfully upserted {inserted_count} stores to the 'stores' table.")
    except Exception as e:
        print(f"❌ Error saving stores to 'stores' database: {e}")



# ==================== Routing API Functions ====================
def call_routing_api(user_lat: float, user_lon: float, stores: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    เรียก API routing เพื่อหาเส้นทางที่สั้นที่สุด
    """
    if not stores:
        return None
    
    try:
        # สร้าง payload สำหรับ API
        payload = {
            "origin": {
                "lat": user_lat,
                "lon": user_lon
            },
            "stores": [
                {
                    "id": store['id'],
                    "name": store['name'],
                    "lat": store['lat'],
                    "lon": store['lon']
                }
                for store in stores[:10]  # ส่ง top 10 เท่านั้น
            ]
        }
        
        print(f"📍 Calling routing API with {len(payload['stores'])} stores...")
        print(f"Payload: {json.dumps(payload, ensure_ascii=False)}")
        
        # เรียก API
        response = requests.post(ROUTING_API_URL, json=payload, timeout=30)
        response.raise_for_status()
        
        response_data = response.json()
        print(f"✅ Routing API response received")
        
        return response_data
        
    except requests.exceptions.Timeout:
        print("❌ Routing API timeout")
        return None
    except requests.exceptions.RequestException as e:
        print(f"❌ Error calling routing API: {e}")
        return None
    except Exception as e:
        print(f"❌ Unexpected error in routing API: {e}")
        return None


def extract_nearest_store_from_api(api_response: Dict[str, Any]) -> Dict[str, Any]:
    """
    ดึงข้อมูลร้านที่ใกล้ที่สุดจาก API response
    """
    try:
        if not api_response:
            return None
        
        # Parse body ถ้า response มา as string
        body = api_response.get('body')
        if isinstance(body, str):
            body = json.loads(body)
        else:
            body = api_response
        
        # ดึง nearest_store จาก result
        result = body.get('result', {})
        nearest_store = result.get('nearest_store')
        
        if nearest_store:
            return {
                'id': nearest_store.get('id'),
                'name': nearest_store.get('name'),
                'lat': nearest_store.get('lat'),
                'lon': nearest_store.get('lon'),
                'distance_km': nearest_store.get('distance_km'),
                'duration_min': nearest_store.get('duration_min')
            }
        
        return None
        
    except Exception as e:
        print(f"❌ Error extracting nearest store: {e}")
        return None


def create_nearest_store_response(user_location, nearest_store, execution_time_ms, request_id=None):
    """
    สร้าง response เฉพาะร้านที่ใกล้ที่สุด
    """
    response_body = {
        'success': True,
        'message': 'พบร้าน 7-Eleven ที่ใกล้ที่สุด',
        'query': {
            'latitude': user_location['latitude'],
            'longitude': user_location['longitude'],
            'timestamp': request_id
        },
        'nearest_store': nearest_store,
        'metadata': {
            'request_id': request_id,
            'api_version': '1.0',
            'execution_time_ms': execution_time_ms
        }
    }
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'X-Execution-Time': str(execution_time_ms)
        },
        'body': json.dumps(response_body, ensure_ascii=False, indent=2)
    }



# ==================== Response Functions ====================
def create_success_response(user_location, radius_km, stores, execution_time_ms, data_source: str, request_id=None):
    total_stores = len(stores)
    nearest_store = stores[0] if stores else None
    farthest_store = stores[-1] if stores else None
    
    stores_by_distance = {
        'under_500m': len([s for s in stores if s['distance'] < 0.5]),
        '500m_to_1km': len([s for s in stores if 0.5 <= s['distance'] < 1]),
        '1km_to_2km': len([s for s in stores if 1 <= s['distance'] < 2]),
        '2km_to_3km': len([s for s in stores if 2 <= s['distance'] < 3]),
        'over_3km': len([s for s in stores if s['distance'] >= 3])
    }
    
    response_body = {
        'summary': {
            'success': True,
            'total_stores_found': total_stores,
            'search_radius_km': radius_km,
            'execution_time_ms': execution_time_ms,
            'data_source': data_source,
            'message': f'พบร้าน 7-Eleven {total_stores} สาขาในรัศมี {radius_km} กิโลเมตร'
        },
        'query': {
            'latitude': user_location['latitude'],
            'longitude': user_location['longitude'],
            'radius_km': radius_km,
            'timestamp': request_id
        },
        'statistics': {
            'total_stores': total_stores,
            'nearest_distance_km': nearest_store['distance'] if nearest_store else None,
            'farthest_distance_km': farthest_store['distance'] if farthest_store else None,
            'stores_by_distance': stores_by_distance
        },
        'top_10_nearest': stores[:10] if stores else [],
        'all_stores': stores,
        'metadata': { 'request_id': request_id, 'api_version': '1.0' }
    }
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'X-Execution-Time': str(execution_time_ms),
            'X-Total-Results': str(total_stores),
            'X-Data-Source': data_source
        },
        'body': json.dumps(response_body, ensure_ascii=False, indent=2)
    }



def create_error_response(status_code, error, details=None):
    response_body = {
        'summary': { 'success': False, 'error': error },
        'details': details or {},
        'metadata': { 'status_code': status_code, 'api_version': '1.0' }
    }
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(response_body, ensure_ascii=False, indent=2)
    }



# ==================== Lambda Handler ====================
def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    start_time = time.time()
    print(f"Received event: {json.dumps(event)}")
    
    try:
        if 'body' in event:
            body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        else:
            body = event
        user_lat = body.get('latitude') or body.get('lat')
        user_lon = body.get('longitude') or body.get('lon')
        
        if not user_lat or not user_lon:
            return create_error_response(400, 'กรุณาระบุ latitude และ longitude')

        try:
            user_lat = float(user_lat)
            user_lon = float(user_lon)
        except (ValueError, TypeError):
            return create_error_response(400, 'latitude และ longitude ต้องเป็นตัวเลข')

        if not (-90 <= user_lat <= 90) or not (-180 <= user_lon <= 180):
            return create_error_response(400, 'พิกัด latitude/longitude ไม่ถูกต้อง')

        radius_km = SEARCH_RADIUS_KM
        print(f"Using fixed search radius: {radius_km} km")

        # 1. ค้นหาร้านจากฐานข้อมูลหรือ OSM
        print(f"🔍 Searching nearby stores...")
        stores = find_nearby_stores_db(user_lat, user_lon, radius_km)
        
        if not stores:
            print("Cache miss: Querying OpenStreetMap API.")
            stores = find_nearby_stores_osm(user_lat, user_lon, radius_km)
            
            if stores:
                print(f"Saving {len(stores)} stores to database...")
                save_stores_to_db(stores)
        
        if not stores:
            return create_error_response(404, 'ไม่พบร้าน 7-Eleven ในรัศมีที่ระบุ')
        
        # 2. เรียก Routing API เพื่อหาเส้นทางที่สั้นที่สุด
        print(f"📍 Calling routing API with top {min(10, len(stores))} stores...")
        api_response = call_routing_api(user_lat, user_lon, stores)
        
        execution_time = round((time.time() - start_time) * 1000, 2)
        
        # 3. ดึงข้อมูลร้านที่ใกล้ที่สุดจาก API response
        if api_response:
            nearest_store = extract_nearest_store_from_api(api_response)
            if nearest_store:
                print(f"✅ Found nearest store: {nearest_store['name']}")
                return create_nearest_store_response(
                    user_location={'latitude': user_lat, 'longitude': user_lon},
                    nearest_store=nearest_store,
                    execution_time_ms=execution_time,
                    request_id=getattr(context, 'aws_request_id', None)
                )
        
        # Fallback: ถ้า API ไม่ตอบสนองให้ใช้ร้านที่ใกล้ที่สุดจากผลการค้นหา
        print("⚠️ Routing API failed, using nearest store from search results")
        nearest_store_fallback = {
            'id': stores[0]['id'],
            'name': stores[0]['name'],
            'lat': stores[0]['lat'],
            'lon': stores[0]['lon'],
            'distance_km': stores[0]['distance'],
            'duration_min': None
        }
        
        return create_nearest_store_response(
            user_location={'latitude': user_lat, 'longitude': user_lon},
            nearest_store=nearest_store_fallback,
            execution_time_ms=execution_time,
            request_id=getattr(context, 'aws_request_id', None)
        )
        
    except urllib.error.HTTPError as e:
        execution_time = round((time.time() - start_time) * 1000, 2)
        return create_error_response(503, 'OpenStreetMap API ไม่สามารถใช้งานได้ชั่วคราว', {'http_code': e.code, 'execution_time_ms': execution_time})
    except urllib.error.URLError as e:
        execution_time = round((time.time() - start_time) * 1000, 2)
        return create_error_response(503, 'ไม่สามารถเชื่อมต่อกับ OpenStreetMap', {'execution_time_ms': execution_time})
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        execution_time = round((time.time() - start_time) * 1000, 2)
        return create_error_response(500, 'เกิดข้อผิดพลาดในการค้นหาร้าน', {'message': str(e), 'type': type(e).__name__, 'execution_time_ms': execution_time})