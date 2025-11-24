import json
import os
import uuid
import time
import urllib.request
import urllib.parse
import math
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from decimal import Decimal

# --- Database Imports ---
import sqlalchemy
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError

# Configuration
DATABASE_URL = os.environ.get("DATABASE_URL")
PRIORITY_API_URL = os.environ.get("PRIORITY_API_URL")
ETA_API_URL = os.environ.get("ETA_API_URL")

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
    print("⚠️ DATABASE_URL not set. Database operations will fail.")


# ==================== Helper Functions ====================

def validate_customer(customer_id: str, conn) -> Optional[Dict]:
    """ตรวจสอบว่า Customer มีอยู่จริง"""
    sql = text("""
        SELECT id, name, email, phone,
               address_line1, address_line2, district, city, postal_code,
               latitude, longitude, priority_level
        FROM customers
        WHERE id = :customer_id
    """)
    result = conn.execute(sql, {"customer_id": customer_id}).fetchone()
    if result:
        address_parts = [result[4]]  # address_line1
        if result[5]:  # address_line2
            address_parts.append(result[5])
        address_parts.append(result[6])  # district
        address_parts.append(result[7])  # city
        if result[8]:  # postal_code
            address_parts.append(result[8])

        return {
            "id": result[0],
            "name": result[1],
            "email": result[2],
            "phone": result[3],
            "address": ", ".join(address_parts),
            "lat": float(result[9]) if result[9] else None,
            "lon": float(result[10]) if result[10] else None,
            "tier": result[11] or "standard"
        }
    return None


def get_store_details(store_id: Optional[str], conn) -> Optional[Dict]:
    """
    ดึง Store ตาม ID ที่ระบุ หรือดึง Store ที่ active ตัวแรกหากไม่ได้ระบุ ID
    (แทนที่ get_default_store)
    """
    if store_id:
        # ดึง Store ตาม ID ที่ระบุ
        sql = text("""
            SELECT id, name, address, latitude, longitude
            FROM stores
            WHERE id = :store_id AND is_active = true
        """)
        params = {"store_id": store_id}
    else:
        # ดึง Store ที่ active ตัวแรก (Default)
        sql = text("""
            SELECT id, name, address, latitude, longitude
            FROM stores
            WHERE is_active = true
            ORDER BY created_at
            LIMIT 1
        """)
        params = {}
        
    result = conn.execute(sql, params).fetchone()
    if result:
        return {
            "id": result[0],
            "name": result[1],
            "address": result[2],
            "lat": float(result[3]) if result[3] else None,
            "lon": float(result[4]) if result[4] else None
        }
    return None

# NOTE: Original get_default_store is now replaced by get_store_details
# The original function is commented out for completeness but is not used
# def get_default_store(conn) -> Optional[Dict]:
#     """ดึง Store ที่ active ตัวแรก"""
#     sql = text("""
#         SELECT id, name, address, latitude, longitude
#         FROM stores
#         WHERE is_active = true
#         ORDER BY created_at
#         LIMIT 1
#     """)
#     result = conn.execute(sql).fetchone()
#     if result:
#         return {
#             "id": result[0],
#             "name": result[1],
#             "address": result[2],
#             "lat": float(result[3]) if result[3] else None,
#             "lon": float(result[4]) if result[4] else None
#         }
#     return None


def validate_products(product_ids: List[str], store_id: str, conn) -> Dict[str, Dict]:
    """ตรวจสอบว่า Products มีอยู่จริงและมี stock ที่ store"""
    if not product_ids:
        return {}

    placeholders = ','.join([f':pid_{i}' for i in range(len(product_ids))])

    sql = text(f"""
        SELECT
            p.id, p.name, p.base_price, p.category, p.is_active,
            p.temperature_requirement, p.is_fragile, p.typical_expiration_hours,
            si.quantity as stock
        FROM products p
        LEFT JOIN store_inventories si ON si.product_id = p.id AND si.store_id = :store_id
        WHERE p.id IN ({placeholders})
    """)

    params = {f"pid_{i}": pid for i, pid in enumerate(product_ids)}
    params['store_id'] = store_id

    results = conn.execute(sql, params).fetchall()

    products_dict = {}
    for row in results:
        products_dict[row[0]] = {
            "id": row[0],
            "name": row[1],
            "price": float(row[2]),
            "category": row[3],
            "is_active": row[4],
            "temperature_requirement": row[5],
            "is_fragile": row[6] or False,
            "typical_expiration_hours": row[7],
            "stock": int(row[8]) if row[8] else 0
        }
    return products_dict


def check_inventory(product_id: str, quantity: int, products: Dict) -> bool:
    """ตรวจสอบ Stock ว่าเพียงพอหรือไม่"""
    product = products.get(product_id)
    if not product:
        return False
    return product['stock'] >= quantity


def update_inventory(store_id: str, product_id: str, quantity: int, conn):
    """ลด Stock หลังจากสร้าง Order"""
    sql = text("""
        UPDATE store_inventories
        SET quantity = quantity - :quantity,
            last_updated = NOW()
        WHERE store_id = :store_id AND product_id = :product_id
    """)
    conn.execute(sql, {
        "store_id": store_id,
        "product_id": product_id,
        "quantity": quantity
    })


def calculate_priority(order_data: Dict) -> Dict:
    """เรียก priority.py Lambda เพื่อคำนวณ Priority Score"""
    if not PRIORITY_API_URL:
        print("⚠️ PRIORITY_API_URL not set. Using default priority 50")
        return {"priority_score": 50, "priority_class": "medium", "breakdown": {}}

    try:
        api_data = {
            "order_id": order_data['order_id'],
            "start_location": {
                "lat": order_data['delivery_latitude'], 
                "lon": order_data['delivery_longitude']
            },
            "use_routing_api": True
        }
        
        req = urllib.request.Request(
            PRIORITY_API_URL,
            data=json.dumps(api_data).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )

        with urllib.request.urlopen(req, timeout=3) as response:
            result = json.loads(response.read().decode('utf-8'))
            
            if result.get('success'):
                # FIX: ดึงข้อมูลจาก 'order_result' แทน 'result'
                order_result = result.get('order_result')
                if order_result:
                    return {
                        "priority_score": order_result.get('priority_score', 50),
                        "priority_class": order_result.get('priority_class', 'medium'),
                        "breakdown": order_result.get('priority_breakdown', {})
                    }
                
    except Exception as e:
        print(f"⚠️ Priority API Error: {e}. Using default priority 50")
        # NOTE: หาก HTTP 400 เกิดขึ้นที่นี่ โค้ดจะใช้ค่า default 50

    return {"priority_score": 50, "priority_class": "medium", "breakdown": {}}


def generate_order_number() -> str:
    """สร้าง Order Number แบบ ORD-YYYYMMDD-XXXX"""
    now = datetime.now()
    date_part = now.strftime("%Y%m%d")
    random_part = str(uuid.uuid4())[:4].upper()
    return f"ORD-{date_part}-{random_part}"


def generate_delivery_number() -> str:
    """สร้าง Delivery Number แบบ DEL-YYYYMMDD-XXXX"""
    now = datetime.now()
    date_part = now.strftime("%Y%m%d")
    random_part = str(uuid.uuid4())[:4].upper()
    return f"DEL-{date_part}-{random_part}"


def get_available_driver(conn) -> Optional[str]:
    """หา Driver ที่ active และไม่ได้มีงาน"""
    sql = text("""
        SELECT id FROM drivers
        WHERE status = 'active'
        ORDER BY total_deliveries ASC
        LIMIT 1
    """)
    result = conn.execute(sql).fetchone()
    return result[0] if result else None


def get_available_vehicle(conn) -> Optional[str]:
    """หา Vehicle ที่ available"""
    sql = text("""
        SELECT id FROM vehicles
        WHERE current_status = 'available'
        ORDER BY created_at
        LIMIT 1
    """)
    result = conn.execute(sql).fetchone()
    return result[0] if result else None


# ==================== Main Order Creation Logic ====================

def create_order(order_request: Dict, conn) -> Dict:
    """สร้าง Order ใหม่ด้วย Real Data"""

    # 1. Validate Customer
    customer = validate_customer(order_request['customer_id'], conn)
    if not customer:
        raise ValueError("Customer not found")

    if not customer['lat'] or not customer['lon']:
        customer['lat'] = order_request.get('delivery_latitude')
        customer['lon'] = order_request.get('delivery_longitude')

        if not customer['lat'] or not customer['lon']:
            raise ValueError("Customer location not available")

    # 2. Get Store (pickup location) - **FIX APPLIED HERE**
    requested_store_id = order_request.get('store_id')
    store = get_store_details(requested_store_id, conn)
    
    if not store:
        if requested_store_id:
            # If the user requested a specific store but it wasn't found/active
            raise ValueError(f"Store ID {requested_store_id} not found or is inactive")
        else:
            # If no store was requested and no default store was found
            raise ValueError("No active store found")

    # 3. Validate Products
    items = order_request.get('items', [])
    if not items:
        raise ValueError("Order must contain at least one item")

    product_ids = [item['product_id'] for item in items]
    # Use the correctly determined store['id']
    products = validate_products(product_ids, store['id'], conn)

    if len(products) != len(product_ids):
        missing = set(product_ids) - set(products.keys())
        raise ValueError(f"Products not found: {missing}")

    # 4. Check Active & Stock
    for item in items:
        product = products[item['product_id']]
        if not product['is_active']:
            raise ValueError(f"Product {product['name']} is not available")
        # Check inventory using stock retrieved for the correct store
        if not check_inventory(item['product_id'], item['quantity'], products):
            raise ValueError(f"Insufficient stock for {product['name']} (available: {product['stock']})")

    # 5. Calculate Totals
    subtotal = 0
    total_weight = 0
    requires_cold_chain = False
    is_fragile = False

    enriched_items = []
    for item in items:
        product = products[item['product_id']]
        quantity = item['quantity']
        unit_price = product['price']
        item_total = unit_price * quantity

        subtotal += item_total
        total_weight += quantity * 0.5

        if product['temperature_requirement'] in ['cold', 'frozen', 'chilled']:
            requires_cold_chain = True
        if product['is_fragile']:
            is_fragile = True

        enriched_items.append({
            "product_id": product['id'],
            "name": product['name'],
            "quantity": quantity,
            "unit_price": unit_price,
            "category": product['category'],
            "temperature_requirement": product['temperature_requirement'],
            "is_fragile": product['is_fragile'],
            "typical_expiration_hours": product['typical_expiration_hours']
        })

    tax = subtotal * 0.07
    shipping_fee = 30.0
    total_amount = subtotal + tax + shipping_fee

    # 6. Calculate Priority Score
    priority_request = {
        "order_id": order_id,
        "customer_id": customer['id'],
        "customer_tier": customer['tier'],
        "customer_lat": customer['lat'],
        "customer_lon": customer['lon'],
        "delivery_latitude": order_request.get('delivery_latitude', customer['lat']),
        "delivery_longitude": order_request.get('delivery_longitude', customer['lon']),
        "products": enriched_items,
        "delivery_window_start": order_request.get('delivery_window_start'),
        "delivery_window_end": order_request.get('delivery_window_end'),
        "total_amount": total_amount,
        "total_weight_kg": total_weight
    }

    priority_result = calculate_priority(priority_request)
    priority_score = priority_result.get('priority_score', 50)
    priority_class = priority_result.get('priority_class', 'medium')

    # 7. Parse datetime fields
    delivery_date = order_request.get('delivery_date')
    delivery_window_start = order_request.get('delivery_window_start')
    delivery_window_end = order_request.get('delivery_window_end')

    if isinstance(delivery_date, str):
        delivery_date = datetime.fromisoformat(delivery_date.replace('Z', '+00:00'))
    elif not delivery_date:
        delivery_date = datetime.now() + timedelta(hours=2)

    if isinstance(delivery_window_start, str):
        delivery_window_start = datetime.fromisoformat(delivery_window_start.replace('Z', '+00:00'))
    elif not delivery_window_start:
        delivery_window_start = delivery_date

    if isinstance(delivery_window_end, str):
        delivery_window_end = datetime.fromisoformat(delivery_window_end.replace('Z', '+00:00'))
    elif not delivery_window_end:
        delivery_window_end = delivery_window_start + timedelta(minutes=30)

    delivery_lat = order_request.get('delivery_latitude', customer['lat'])
    delivery_lon = order_request.get('delivery_longitude', customer['lon'])
    delivery_address = order_request.get('delivery_address', customer['address'])
    delivery_notes = order_request.get('delivery_notes', '')

    # 8. Create Order in Database
    order_id = str(uuid.uuid4())
    order_number = generate_order_number()

    sql_order = text("""
        INSERT INTO orders (
            id, order_number, customer_id, store_id,
            order_date, delivery_date, delivery_window_start, delivery_window_end,
            customer_priority, order_status,
            delivery_address, delivery_latitude, delivery_longitude, delivery_notes,
            subtotal, tax, shipping_fee, total_amount,
            priority_score, priority_class, priority_breakdown,
            created_at, updated_at
        ) VALUES (
            :id, :order_number, :customer_id, :store_id,
            :order_date, :delivery_date, :delivery_window_start, :delivery_window_end,
            :customer_priority, :order_status,
            :delivery_address, :delivery_latitude, :delivery_longitude, :delivery_notes,
            :subtotal, :tax, :shipping_fee, :total_amount,
            :priority_score, :priority_class, :priority_breakdown,
            NOW(), NOW()
        )
    """)

    conn.execute(sql_order, {
        "id": order_id,
        "order_number": order_number,
        "customer_id": customer['id'],
        "store_id": store['id'],
        "order_date": datetime.now(),
        "delivery_date": delivery_date,
        "delivery_window_start": delivery_window_start,
        "delivery_window_end": delivery_window_end,
        "customer_priority": customer['tier'],
        "order_status": "pending",
        "delivery_address": delivery_address,
        "delivery_latitude": delivery_lat,
        "delivery_longitude": delivery_lon,
        "delivery_notes": delivery_notes,
        "subtotal": subtotal,
        "tax": tax,
        "shipping_fee": shipping_fee,
        "total_amount": total_amount,
        "priority_score": priority_score,
        "priority_class": priority_class,
        "priority_breakdown": json.dumps(priority_result.get('breakdown', {}))
    })

    # 9. Create Order Items
    sql_item = text("""
        INSERT INTO order_items (
            id, order_id, product_id, quantity, unit_price, subtotal,
            expiration_datetime, temperature_zone,
            created_at
        ) VALUES (
            :id, :order_id, :product_id, :quantity, :unit_price, :subtotal,
            :expiration_datetime, :temperature_zone,
            NOW()
        )
    """)

    for item in items:
        product = products[item['product_id']]
        item_subtotal = product['price'] * item['quantity']
        expiration_hours = product.get('typical_expiration_hours', 24)
        expiration_datetime = datetime.now() + timedelta(hours=expiration_hours)

        conn.execute(sql_item, {
            "id": str(uuid.uuid4()),
            "order_id": order_id,
            "product_id": item['product_id'],
            "quantity": item['quantity'],
            "unit_price": product['price'],
            "subtotal": item_subtotal,
            "expiration_datetime": expiration_datetime,
            "temperature_zone": product.get('temperature_requirement', 'ambient')
        })

    # 10. Get Driver & Vehicle
    driver_id = get_available_driver(conn)
    vehicle_id = get_available_vehicle(conn)

    if not driver_id:
        raise ValueError("No available driver found")
    if not vehicle_id:
        raise ValueError("No available vehicle found")

    # 11. Create Delivery Record
    delivery_number = generate_delivery_number()

    # Calculate Haversine Distance
    pickup_lat = store['lat']
    pickup_lon = store['lon']

    dlat = math.radians(delivery_lat - pickup_lat)
    dlon = math.radians(delivery_lon - pickup_lon)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(pickup_lat)) * math.cos(math.radians(delivery_lat)) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    estimated_distance = 6371 * c

    # Assuming 30 km/h average speed for duration estimate
    estimated_duration = int((estimated_distance / 30) * 60)

    sql_delivery = text("""
        INSERT INTO deliveries (
            id, delivery_number, order_id, driver_id, vehicle_id,
            delivery_status,
            pickup_location, pickup_latitude, pickup_longitude,
            delivery_location, delivery_latitude, delivery_longitude,
            estimated_distance_km, estimated_duration_min,
            created_at, updated_at
        ) VALUES (
            :id, :delivery_number, :order_id, :driver_id, :vehicle_id,
            :delivery_status,
            :pickup_location, :pickup_latitude, :pickup_longitude,
            :delivery_location, :delivery_latitude, :delivery_longitude,
            :estimated_distance_km, :estimated_duration_min,
            NOW(), NOW()
        )
    """)

    conn.execute(sql_delivery, {
        "id": str(uuid.uuid4()),
        "delivery_number": delivery_number,
        "order_id": order_id,
        "driver_id": driver_id,
        "vehicle_id": vehicle_id,
        "delivery_status": "pending",
        "pickup_location": store['address'],
        "pickup_latitude": pickup_lat,
        "pickup_longitude": pickup_lon,
        "delivery_location": delivery_address,
        "delivery_latitude": delivery_lat,
        "delivery_longitude": delivery_lon,
        "estimated_distance_km": round(estimated_distance, 2),
        "estimated_duration_min": estimated_duration
    })

    # 12. Update Inventory
    for item in items:
        update_inventory(store['id'], item['product_id'], item['quantity'], conn)

    print(f"✅ Order {order_number} created successfully")

    return {
        "order_id": order_id,
        "order_number": order_number,
        "delivery_number": delivery_number,
        "customer": {
            "id": customer['id'],
            "name": customer['name'],
            "phone": customer['phone']
        },
        "store": {
            "id": store['id'],
            "name": store['name'],
            "address": store['address']
        },
        "items": enriched_items,
        "subtotal": round(subtotal, 2),
        "tax": round(tax, 2),
        "shipping_fee": round(shipping_fee, 2),
        "total_amount": round(total_amount, 2),
        "total_weight_kg": round(total_weight, 2),
        "priority_score": round(priority_score, 2),
        "priority_class": priority_class,
        "priority_breakdown": priority_result.get('breakdown', {}),
        "estimated_distance_km": round(estimated_distance, 2),
        "estimated_duration_min": estimated_duration,
        "order_status": "pending",
        "delivery_status": "pending",
        "requires_cold_chain": requires_cold_chain,
        "is_fragile": is_fragile,
        "driver_id": driver_id,
        "vehicle_id": vehicle_id,
        "delivery_window_start": delivery_window_start.isoformat(),
        "delivery_window_end": delivery_window_end.isoformat(),
        "created_at": datetime.now().isoformat()
    }


# ==================== Response Helpers ====================

def create_success_response(result: Dict, execution_time_ms: float) -> Dict:
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        },
        'body': json.dumps({
            'success': True,
            'execution_time_ms': execution_time_ms,
            'order': result
        }, ensure_ascii=False, indent=2, default=str)
    }


def create_error_response(status_code: int, error: str, details: Any = None) -> Dict:
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        },
        'body': json.dumps({
            'success': False,
            'error': error,
            'details': details
        }, ensure_ascii=False, indent=2)
    }


# ==================== Lambda Handler ====================

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda Handler for Order Management with Real Data

    Real Data Input:
    {
        "customer_id": "c41bc929-a148-4e92-b698-1a780f2a7eac",
        "store_id": "3256c040-99e6-45b4-8a35-bb0617147c56",
        "items": [
            {"product_id": "30d2f854-d611-4993-a2aa-9c920327435c", "quantity": 2},
            {"product_id": "35c26291-ac14-400d-ad3f-a8886f0c33dc", "quantity": 2}
        ],
        "delivery_latitude": 13.7563,
        "delivery_longitude": 100.5018
    }
    """
    start_time = time.time()

    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': ''
        }

    if not db_engine:
        return create_error_response(500, "Database connection not available")

    try:
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        elif 'body' in event:
            body = event['body']
        else:
            body = event

        print(f"📦 Received order request: {json.dumps(body, default=str)[:200]}...")

        required_fields = ['customer_id', 'items']
        for field in required_fields:
            if field not in body:
                return create_error_response(400, f"Missing required field: {field}")

        if not isinstance(body['items'], list) or len(body['items']) == 0:
            return create_error_response(400, "Items must be a non-empty list")

        for item in body['items']:
            if 'product_id' not in item or 'quantity' not in item:
                return create_error_response(400, "Each item must have product_id and quantity")
            if item['quantity'] <= 0:
                return create_error_response(400, "Quantity must be greater than 0")

        print(f"🛒 Creating order for customer {body['customer_id']}")

        with db_engine.connect() as conn:
            with conn.begin():
                result = create_order(body, conn)

        execution_time = round((time.time() - start_time) * 1000, 2)

        print(f"✅ Order {result['order_number']} created in {execution_time}ms")
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


if __name__ == "__main__":
    # Simulate a successful test case based on user's input with the fix
    test_event_success = {
        "customer_id": "c41bc929-a148-4e92-b698-1a780f2a7eac",
        "store_id": "3256c040-99e6-45b4-8a35-bb0617147c56", # This ID is now properly used
        "items": [
            {"product_id": "30d2f854-d611-4993-a2aa-9c920327435c", "quantity": 2}
        ],
        "delivery_latitude": 14.0728,
        "delivery_longitude": 100.6082
    }

    class MockContext:
        request_id = "local-test-fixed"

    # NOTE: To run this successfully, the environment variable DATABASE_URL must be set
    # and the database must contain the customer, store, product, inventory (with stock > 2
    # for product '30d2f854-d611-4993-a2aa-9c920327435c' at store '3256c040-99e6-45b4-8a35-bb0617147c56'),
    # driver, and vehicle data.

    # result = lambda_handler(test_event_success, MockContext())
    # print(json.dumps(result, indent=2, ensure_ascii=False))

    print("\n--- Code structure is updated. Execution requires live DB/Env vars ---")