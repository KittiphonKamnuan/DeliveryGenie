import json
import math
import os
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Any, Tuple
import requests

# --- Database Imports ---
import sqlalchemy
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError

# ==================== Configuration ====================
EARTH_RADIUS_KM = 6371
ROUTING_API_URL = os.environ.get("ROUTING_API_URL", "https://smof4e355txf7oz7sck4jn5rhy0fjpre.lambda-url.ap-southeast-1.on.aws/")

# 🔥 ปรับน้ำหนักใหม่ให้สมดุล CS (66%) + DE/FS (34%)
# เพิ่ม Weight Factor (12%) เพื่อคำนึงถึงต้นทุนน้ำมันและความเร็วในการจัดส่ง
WEIGHTS = {
    'temp': 0.22,           # CS: ความสดใจสินค้า (22%)
    'exp': 0.18,            # CS: อายุสินค้า (18%)
    'cust': 0.13,           # CS: ลูกค่า VIP (13%)
    'window': 0.13,         # CS: ความตรงต่อเวลา (13%)
    'distance': 0.09,       # DE/FS: เส้นทางสั้น (9%)
    'value': 0.09,          # DE: มูลค่าออเดอร์ (9%)
    'fragile': 0.04,        # DE: การจัดการพิเศษ (4%)
    'weight': 0.12          # DE/FS: น้ำหนักสินค้า (12%) - NEW
}

TEMP_SCORES = {
    'hot_food': 100,
    'frozen': 90,
    'chilled': 75,
    'medicine': 60,
    'beverage': 40,
    'snack': 20,
    'daily_goods': 20
}

TEMP_DB_MAP = {
    'frozen': 'frozen',
    'chilled': 'chilled',
    'ambient': 'daily_goods',
    'hot': 'hot_food'
}

EXP_THRESHOLDS = {
    3: 100,        # < 3 ชม. = 100 คะแนน (วิกฤต)
    8: 90,         # 3-8 ชม. = 90 คะแนน (ด่วนมาก)
    24: 70,        # 8-24 ชม. = 70 คะแนน (ด่วน)
    168: 50,       # 1-7 วัน = 50 คะแนน (ปกติ)
    99999: 30      # > 7 วัน = 30 คะแนน (ไม่รีบ)
}

CUST_SCORES = {
    'urgent': 100,
    'high': 75,
    'standard': 50,
    'economy': 25
}

VALUE_THRESHOLDS = {
    500: 100,
    200: 80,
    100: 60,
    50: 40,
    0: 20
}

DISTANCE_THRESHOLDS = {
    5: 100,
    15: 80,
    30: 60,
    60: 40,
    99999: 20
}

WINDOW_THRESHOLDS = {
    15: 100,
    30: 90,
    60: 70,
    120: 50,
    99999: 30
}

WEIGHT_THRESHOLDS = {
    2: 100,      # < 2 kg = Very Light (ส่งเร็ว, ประหยัดน้ำมัน)
    5: 80,       # < 5 kg = Light
    10: 60,      # < 10 kg = Medium
    20: 40,      # < 20 kg = Heavy (ส่งช้า, น้ำมันแพง)
    99999: 20    # >= 20 kg = Very Heavy
}

# --- Database Configuration ---
# เอา URL จาก Environment Variable เท่านั้น ไม่ควร hardcode credentials
DATABASE_URL = os.environ.get("DATABASE_URL")

db_engine = None
if DATABASE_URL:
    try:
        db_engine = create_engine(DATABASE_URL.split("?")[0])
        print("✅ Database engine created successfully.")
    except Exception as e:
        print(f"❌ Failed to create database engine: {e}")
        db_engine = None

# ==================== Helper Functions ====================
def calculate_haversine_distance(lat1, lon1, lat2, lon2):
    """คำนวณระยะทางระหว่างสองจุดด้วยสูตร Haversine"""
    try:
        lat1, lon1, lat2, lon2 = map(float, [lat1, lon1, lat2, lon2])
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
        return EARTH_RADIUS_KM * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    except:
        return 999.0

def get_factor_score(thresholds, value, is_min_value=False):
    """
    ✅ Final Logic: ดึงคะแนนจาก thresholds โดยใช้การเรียงลำดับ Threshold (กุญแจ)
    """
    
    # แปลง Dictionary เป็น Tuple List: [(threshold, score)]
    threshold_list = list(thresholds.items())
    
    if is_min_value:
        # สำหรับค่าที่มากขึ้น = คะแนนสูง (Value)
        # เรียงตาม Threshold จากมากไปน้อย (500, 200...) และเลือกค่าแรกที่ value >= threshold
        sorted_list = sorted(threshold_list, key=lambda item: item[0], reverse=True)
        for threshold, score in sorted_list:
            if value >= threshold:
                return score
    else:
        # 🔥 แก้ไข Logic สำหรับค่าที่น้อยลง = คะแนนสูง (Exp, Window, Distance)
        
        # 1. เรียงตาม Threshold จากน้อยไปมาก (15, 30, 60...)
        # นี่คือการหาช่วงที่ "แคบที่สุด" ก่อน
        sorted_list = sorted(threshold_list, key=lambda item: item[0], reverse=False)
        
        # 2. วนลูปและเลือก Threshold แรกที่ value ผ่านเงื่อนไข (value <= t)
        for threshold, score in sorted_list:
            if value <= threshold:
                return score
    
    return 20 # ค่า default

# ==================== Routing API Functions ====================
def call_routing_api(start_loc: Dict, orders: List[Dict]) -> Dict[str, Any]:
    if not orders:
        return {}
    
    try:
        payload = {
            "origin": {
                "lat": float(start_loc.get('lat', 0)),
                "lon": float(start_loc.get('lon', 0))
            },
            "stores": [
                {
                    "id": order.get('order_id', str(i)),
                    "name": order.get('order_number', f"Order {i}"),
                    "lat": float(order.get('delivery_latitude', 0)),
                    "lon": float(order.get('delivery_longitude', 0))
                }
                for i, order in enumerate(orders[:10])
            ]
        }
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                          "AppleWebKit/537.36 (KHTML, like Gecko) "
                          "Chrome/91.0.4472.124 Safari/537.36",
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
        
        response = requests.post(
            ROUTING_API_URL, 
            json=payload,
            headers=headers,
            timeout=30
        )
        response.raise_for_status()
        
        api_response = response.json()
        
        routing_data = {}
        if 'result' in api_response:
            body = api_response
        elif 'body' in api_response:
            body = api_response.get('body')
            if isinstance(body, str):
                body = json.loads(body)
        else:
            body = api_response
        
        result = body.get('result', {})
        sorted_stores = result.get('sorted_stores', [])
        
        for i, store in enumerate(sorted_stores):
            routing_data[store.get('id')] = {
                'distance_km': float(store.get('distance_km', 0)),
                'duration_min': float(store.get('duration_min', 0)),
                'route_order': i
            }
        
        return routing_data
        
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 403:
            print(f"⚠️ 403 Forbidden - Server rejected request")
            print(f"Response headers: {e.response.headers}")
            print(f"Response body: {e.response.text}")
            return {}
        else:
            raise
    except Exception as e:
        print(f"❌ Unexpected error in routing API: {e}")
        import traceback
        traceback.print_exc()
        return {}

# ==================== Database Fetching Logic ====================
def fetch_order_from_db(order_id: str) -> Dict:
    """ดึงข้อมูลออเดอร์เดียว พร้อมสินค้าทั้งหมดในออเดอร์นั้น"""
    if not db_engine:
        return {}
    
    sql = text("""
        SELECT 
            o.id as order_id, 
            o.order_number, 
            o.delivery_window_end,
            o.subtotal,
            o.tax,
            o.shipping_fee,
            o.total_amount,
            c.priority_level as customer_priority, 
            c.latitude as delivery_latitude, 
            c.longitude as delivery_longitude,
            p.id as product_id,
            p.category, 
            p.temperature_requirement, 
            p.is_fragile,
            oi.quantity, 
            oi.unit_price, 
            oi.expiration_datetime
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        WHERE o.id = :order_id OR o.order_number = :order_id
        ORDER BY oi.id
    """)

    try:
        with db_engine.connect() as conn:
            result = conn.execute(sql, {"order_id": order_id})
            rows = result.fetchall()
            
            if not rows:
                print(f"❌ Order not found: {order_id}")
                return {}
            
            # สร้าง order dict จากแถวแรก
            first_row = rows[0]._asdict()
            order_data = {
                'order_id': first_row['order_id'],
                'order_number': first_row['order_number'],
                'customer_priority': first_row['customer_priority'] or 'standard',
                'delivery_window_end': str(first_row['delivery_window_end']),
                'delivery_latitude': float(first_row['delivery_latitude']),
                'delivery_longitude': float(first_row['delivery_longitude']),
                'subtotal': float(first_row['subtotal']),
                'tax': float(first_row['tax']),
                'shipping_fee': float(first_row['shipping_fee']),
                'total_amount': float(first_row['total_amount']),
                'products': []
            }
            
            # รวบรวมสินค้าทั้งหมด
            for row in rows:
                row = row._asdict()
                
                exp_hours = 99999
                if row['expiration_datetime']:
                    exp_dt = row['expiration_datetime']
                    if exp_dt.tzinfo is None:
                        exp_dt = exp_dt.replace(tzinfo=timezone.utc)
                    diff = exp_dt - datetime.now(timezone.utc)
                    exp_hours = max(0, int(diff.total_seconds() / 3600))

                order_data['products'].append({
                    'product_id': row['product_id'],
                    'category': row['category'],
                    'temp_req': row['temperature_requirement'],
                    'price': float(row['unit_price']),
                    'quantity': row['quantity'],
                    'expiration_hours': exp_hours,
                    'is_fragile': row['is_fragile'],
                    'line_total': float(row['unit_price']) * row['quantity']
                })
            
            print(f"✅ Fetched order {order_id} with {len(order_data['products'])} products")
            return order_data
            
    except Exception as e:
        print(f"❌ DB Fetch Error: {e}")
        import traceback
        traceback.print_exc()
        return {}

# ==================== Scoring Logic ====================
def calculate_product_priority_score(product: Dict, order: Dict, start_loc: Dict, routing_info: Dict = None) -> Dict:
    """
    🔥 คำนวณ Priority Score สำหรับแต่ละสินค้า (Product Level)

    ปัจจัยที่คิดต่อสินค้า:
    - Temperature: ประเภทสินค้า
    - Expiration: อายุสินค้า
    - Fragility: ความเปราะบาง
    - Weight: น้ำหนักสินค้า (NEW)

    ปัจจัยที่คิดต่อออเดอร์ (ใช้ร่วม):
    - Customer: ลำดับความสำคัญของลูกค้า
    - Window: ระยะเวลาจนถึงเวลาส่ง
    - Distance: ระยะทาง
    - Value: มูลค่าออเดอร์
    """
    order_id = order.get('order_id', '')

    # ==================== 1. Temperature Score (0.22 = 22%) ====================
    cat = product.get('category', '').lower()
    req = product.get('temp_req', '').lower()
    temp_score = TEMP_SCORES.get(cat, TEMP_SCORES.get(TEMP_DB_MAP.get(req, 'daily_goods'), 20))

    # ==================== 2. Expiration Score (0.20 = 20%) ====================
    exp_hours = product.get('expiration_hours', 99999)
    exp_score = get_factor_score(EXP_THRESHOLDS, exp_hours, is_min_value=False)

    # ==================== 3. Fragility Score (0.05 = 5%) ====================
    fragile_score = 100 if product.get('is_fragile', False) else 30

    # ==================== 4. Customer Priority Score (0.15 = 15%) ====================
    cust_tier = order.get('customer_priority', 'standard').lower()
    cust_score = CUST_SCORES.get(cust_tier, 50)

# ==================== 5. Delivery Window Score (0.15 = 15%) ====================
    window_score = 30 # Default Fallback Score
    try:
        deadline_str = order.get('delivery_window_end', '').replace(' ', 'T')
        deadline = datetime.fromisoformat(deadline_str)
        
        # ✅ แก้ไข Timezone #1: ทำให้ deadline เป็น Timezone Aware (UTC) หากยังไม่มี
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)

        # ✅ แก้ไข Timezone #2: สร้างเวลาปัจจุบันให้เป็น Timezone Aware (UTC)
        now = datetime.now(timezone.utc) 
        
        # คำนวณนาทีที่เหลือ (จะเป็น 0 ถ้าเลยกำหนดไปแล้ว)
        minutes = max(0, int((deadline - now).total_seconds() / 60))
        
        # DEBUG: ถ้าต้องการดูค่า
        # print(f"DEBUG: Window Minutes Left={minutes}") 
        
        # ✅ ใช้ Logic get_factor_score ที่ถูกแก้ไขแล้ว
        window_score = get_factor_score(WINDOW_THRESHOLDS, minutes, is_min_value=False)
        
    except Exception as e:
        # หากเกิด Exception ใดๆ (เช่น format error) ให้ใช้ fallback 30
        print(f"ERROR calculating window score: {e}")
        # window_score = 30 (ถูกกำหนดไว้แล้วด้านบน)

    # ==================== 6. Distance Score (0.10 = 10%) ====================
    dist_km = 999
    duration_min = 999
    route_order = 999
    
    if routing_info and order_id in routing_info:
        route_data = routing_info[order_id]
        dist_km = route_data.get('distance_km', 999)
        duration_min = route_data.get('duration_min', 999)
        route_order = route_data.get('route_order', 999)
        print(f"✅ Using OSRM routing: distance={dist_km}km, duration={duration_min}min")
    else:
        dist_km = calculate_haversine_distance(
            start_loc.get('lat', 0),
            start_loc.get('lon', 0),
            order.get('delivery_latitude', 0),
            order.get('delivery_longitude', 0)
        )
        duration_min = dist_km * 2
        print(f"⚠️ Using Haversine fallback: distance={dist_km}km, duration={duration_min}min")
    
    distance_score = get_factor_score(DISTANCE_THRESHOLDS, duration_min, is_min_value=False)

    # ==================== 7. Order Value Score (0.09 = 9%) ====================
    total_value = order.get('total_amount', 0)
    value_score = get_factor_score(VALUE_THRESHOLDS, total_value, is_min_value=True)

    # ==================== 8. Weight Score (0.12 = 12%) ====================
    # น้ำหนักต่ำ = Priority สูง (ส่งเร็ว + ประหยัดน้ำมัน)
    product_weight = product.get('weight_kg', 0) * product.get('quantity', 1)
    weight_score = get_factor_score(WEIGHT_THRESHOLDS, product_weight, is_min_value=False)

    # ==================== คำนวณ Total Priority Score ====================
    scores = {
        'temp': temp_score,
        'exp': exp_score,
        'cust': cust_score,
        'window': window_score,
        'distance': distance_score,
        'value': value_score,
        'fragile': fragile_score,
        'weight': weight_score  # NEW
    }
    
    total_score = sum(scores[k] * WEIGHTS[k] for k in WEIGHTS)

    # ==================== จำแนกระดับ Priority ====================
    if total_score >= 75:
        p_class = "critical"
    elif 60 <= total_score < 75:
        p_class = "high"
    elif 40 <= total_score < 60:
        p_class = "medium"
    else:
        p_class = "low"

    return {
        'product_id': product.get('product_id'),
        'category': product.get('category'),
        'quantity': product.get('quantity'),
        'priority_score': round(total_score, 2),
        'priority_class': p_class,
        'breakdown': {
            'temperature': round(temp_score * WEIGHTS['temp'], 2),
            'expiration': round(exp_score * WEIGHTS['exp'], 2),
            'customer': round(cust_score * WEIGHTS['cust'], 2),
            'window': round(window_score * WEIGHTS['window'], 2),
            'distance': round(distance_score * WEIGHTS['distance'], 2),
            'value': round(value_score * WEIGHTS['value'], 2),
            'fragility': round(fragile_score * WEIGHTS['fragile'], 2),
            'weight': round(weight_score * WEIGHTS['weight'], 2)  # NEW
        },
        'raw_scores': scores,
        'metadata': {
            'expiration_hours': exp_hours,
            'is_fragile': product.get('is_fragile', False),
            'product_line_total': product.get('line_total', 0),
            'product_weight_kg': product_weight  # NEW
        }
    }

def calculate_order_priority_score(order: Dict, start_loc: Dict, routing_info: Dict = None) -> Dict:
    """
    🔥 คำนวณ Priority Score สำหรับออเดอร์
    
    - คำนวณ priority สำหรับแต่ละสินค้าในออเดอร์
    - ใช้สินค้าที่มี priority สูงสุดเป็น priority ของออเดอร์
    - บันทึกรายละเอียดของทุกสินค้า
    """
    
    products = order.get('products', [])
    product_scores = []
    
    # เก็บ routing info ต่อ order เพื่อใช้ร่วมกับทุก product
    order_routing_data = {}
    if routing_info and order.get('order_id') in routing_info:
        order_routing_data = routing_info[order.get('order_id')]

    # คำนวณ priority สำหรับแต่ละสินค้า
    print(f"\n📦 Calculating priority for {len(products)} products in order {order.get('order_id')}...")
    for product in products:
        prod_score = calculate_product_priority_score(product, order, start_loc, routing_info)
        product_scores.append(prod_score)
        print(f"  - Product {product.get('product_id')}: {prod_score['priority_score']} ({prod_score['priority_class']})")

    # 🔥 ใช้สินค้าที่มี priority สูงสุดเป็น priority ของออเดอร์
    if not product_scores:
        return {}
    
    max_product = max(product_scores, key=lambda x: x['priority_score'])
    max_score = max_product['priority_score']
    max_class = max_product['priority_class']

    # ==================== 📦 คำนวณน้ำหนักรวมของ Order ====================
    total_order_weight = sum(
        p.get('weight_kg', 0) * p.get('quantity', 1)
        for p in products
    )

    print(f"\n🎯 Order Priority: {max_score} ({max_class}) from product {max_product['product_id']}")
    print(f"📦 Total Order Weight: {total_order_weight:.2f} kg")

    # ==================== 📍 คำนวณ Distance อย่างถูกต้อง ====================
    distance_km = 0
    duration_min = 0
    route_order = 999
    
    if order_routing_data:
        distance_km = order_routing_data.get('distance_km', 0)
        duration_min = order_routing_data.get('duration_min', 0)
        route_order = order_routing_data.get('route_order', 999)
        print(f"✅ Using OSRM routing data: {distance_km}km, {duration_min}min")
    else:
        # Fallback: คำนวณ Haversine
        distance_km = calculate_haversine_distance(
            start_loc.get('lat', 0),
            start_loc.get('lon', 0),
            order.get('delivery_latitude', 0),
            order.get('delivery_longitude', 0)
        )
        duration_min = distance_km * 2  # ✅ แก้: คำนวณ duration จาก distance
        print(f"⚠️ Using Haversine fallback: {distance_km}km, ~{duration_min}min")

    return {
        'order_id': order.get('order_id'),
        'order_number': order.get('order_number'),
        'priority_score': max_score,
        'priority_class': max_class,
        'priority_rank': 1,  # จะอัปเดตหลังจัดเรียง
        'priority_breakdown': max_product['breakdown'],
        'highest_priority_product': {
            'product_id': max_product['product_id'],
            'category': max_product['category'],
            'priority_score': max_product['priority_score'],
            'priority_class': max_product['priority_class']
        },
        'all_products': product_scores,
        'order_metadata': {
            'total_products': len(products),
            'total_amount': round(order.get('total_amount', 0), 2),
            'total_weight_kg': round(total_order_weight, 3),  # NEW
            'delivery_window_end': order.get('delivery_window_end'),
            'customer_priority': order.get('customer_priority'),
            'distance_km': round(distance_km, 3),
            'duration_min': round(duration_min, 2),
            'route_order': route_order,
            'subtotal': round(order.get('subtotal', 0), 2),
            'tax': round(order.get('tax', 0), 2),
            'shipping_fee': round(order.get('shipping_fee', 0), 2),
            'cs_score_portion': round(
                (max_product['raw_scores']['temp'] * WEIGHTS['temp'] +
                 max_product['raw_scores']['exp'] * WEIGHTS['exp'] +
                 max_product['raw_scores']['cust'] * WEIGHTS['cust'] +
                 max_product['raw_scores']['window'] * WEIGHTS['window']), 2
            ),
            'de_score_portion': round(
                (max_product['raw_scores']['distance'] * WEIGHTS['distance'] +
                 max_product['raw_scores']['value'] * WEIGHTS['value'] +
                 max_product['raw_scores']['fragile'] * WEIGHTS['fragile'] +
                 max_product['raw_scores']['weight'] * WEIGHTS['weight']), 2  # UPDATED
            )
        }
    }

def update_order_priority_in_db(order_result: Dict):
    """บันทึก priority score ลงฐานข้อมูล"""
    if not db_engine or not order_result:
        return False
    
    sql = text("""
        UPDATE orders
        SET 
            priority_score = :score,
            priority_class = :p_class,
            priority_breakdown = :breakdown,
            updated_at = NOW()
        WHERE id = :order_id
    """)
    
    try:
        with db_engine.connect() as conn:
            with conn.begin():
                params = {
                    'order_id': order_result['order_id'],
                    'score': order_result['priority_score'],
                    'p_class': order_result['priority_class'],
                    'breakdown': json.dumps(order_result['priority_breakdown'])
                }
                conn.execute(sql, params)
        
        print(f"✅ Updated order {order_result['order_id']} priority in database")
        return True
        
    except Exception as e:
        print(f"❌ Error updating database: {e}")
        import traceback
        traceback.print_exc()
        return False

# ==================== Lambda Handler ====================
def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler สำหรับคำนวณ Priority Score ของออเดอร์เดียว
    
    Input:
    - order_id: ID ของออเดอร์ที่ต้องการคำนวณ
    - start_location: {'lat': float, 'lon': float} (Warehouse location)
    - use_routing_api: bool (default: True)
    
    Output:
    - priority_score: คะแนนจากสินค้าที่มี priority สูงสุด
    - priority_class: critical/high/medium/low
    - all_products: รายละเอียด priority ของทุกสินค้า
    """
    print(f"📥 Input: {json.dumps(event, ensure_ascii=False)}")
    try:
        body = json.loads(event['body']) if 'body' in event else event
        order_id = body.get('order_id')
        start_location = body.get('start_location')
        use_routing_api = body.get('use_routing_api', True)
        
        if not order_id or not start_location:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'success': False,
                    'error': 'Missing required fields: order_id, start_location'
                }, ensure_ascii=False)
            }

        # ==================== ดึงข้อมูลออเดอร์ ====================
        print(f"🔍 Fetching order data: {order_id}")
        order_data = fetch_order_from_db(order_id)
        
        if not order_data:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'success': False,
                    'error': f'Order not found: {order_id}'
                }, ensure_ascii=False)
            }

        # ==================== เรียก Routing API ====================
        routing_info = {}
        if use_routing_api:
            print("🚀 Fetching routing data from OSRM API...")
            routing_info = call_routing_api(start_location, [order_data])
        else:
            print("⏭️ Skipping routing API")

        # ==================== คำนวณ Priority ====================
        print(f"\n🎯 Calculating priority score...")
        order_result = calculate_order_priority_score(order_data, start_location, routing_info)
        
        if not order_result:
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'success': False,
                    'error': 'Failed to calculate priority'
                }, ensure_ascii=False)
            }

        # ==================== บันทึกลง Database ====================
        print(f"\n💾 Saving to database...")
        update_order_priority_in_db(order_result)

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'success': True,
                'order_result': order_result
            }, ensure_ascii=False, indent=2)
        }

    except Exception as e:
        print(f"❌ Fatal Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'success': False,
                'error': str(e)
            }, ensure_ascii=False)
        }