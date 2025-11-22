import json
import os
import uuid
import time
import urllib.request
import urllib.parse
from datetime import datetime
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
    """ตรวจสอบว่า Customer มีอยู่จริงและ Active"""
    sql = text("""
        SELECT id, name, email, phone, address, latitude, longitude, tier
        FROM customers
        WHERE id = :customer_id AND is_active = TRUE
    """)
    result = conn.execute(sql, {"customer_id": customer_id}).fetchone()
    if result:
        return {
            "id": result[0], "name": result[1], "email": result[2],
            "phone": result[3], "address": result[4],
            "lat": float(result[5]) if result[5] else None,
            "lon": float(result[6]) if result[6] else None,
            "tier": result[7]
        }
    return None


def validate_store(store_id: str, conn) -> Optional[Dict]:
    """ตรวจสอบว่า Store มีอยู่จริงและเปิดทำการ"""
    sql = text("""
        SELECT id, name, address, latitude, longitude, is_open, store_type
        FROM stores
        WHERE id = :store_id AND is_active = TRUE
    """)
    result = conn.execute(sql, {"store_id": store_id}).fetchone()
    if result:
        return {
            "id": result[0], "name": result[1], "address": result[2],
            "lat": float(result[3]) if result[3] else None,
            "lon": float(result[4]) if result[4] else None,
            "is_open": result[5], "store_type": result[6]
        }
    return None


def validate_products(product_ids: List[str], conn) -> Dict[str, Dict]:
    """ตรวจสอบว่า Products มีอยู่จริง"""
    if not product_ids:
        return {}

    placeholders = ','.join([f':pid_{i}' for i in range(len(product_ids))])
    sql = text(f"""
        SELECT id, name, price, weight_kg, volume_m3, category,
               requires_cold_chain, is_fragile, shelf_life_hours
        FROM products
        WHERE id IN ({placeholders}) AND is_active = TRUE
    """)

    params = {f"pid_{i}": pid for i, pid in enumerate(product_ids)}
    results = conn.execute(sql, params).fetchall()

    products_dict = {}
    for row in results:
        products_dict[row[0]] = {
            "id": row[0], "name": row[1], "price": float(row[2]),
            "weight_kg": float(row[3]) if row[3] else 0,
            "volume_m3": float(row[4]) if row[4] else 0,
            "category": row[5],
            "requires_cold_chain": row[6],
            "is_fragile": row[7],
            "shelf_life_hours": row[8]
        }
    return products_dict


def check_inventory(store_id: str, product_id: str, quantity: int, conn) -> bool:
    """ตรวจสอบ Stock ว่าเพียงพอหรือไม่"""
    sql = text("""
        SELECT available_quantity
        FROM store_inventories
        WHERE store_id = :store_id AND product_id = :product_id
    """)
    result = conn.execute(sql, {"store_id": store_id, "product_id": product_id}).fetchone()

    if result and result[0] >= quantity:
        return True
    return False


def update_inventory(store_id: str, product_id: str, quantity: int, conn):
    """ลด Stock หลังจากสร้าง Order"""
    sql = text("""
        UPDATE store_inventories
        SET available_quantity = available_quantity - :quantity,
            updated_at = NOW()
        WHERE store_id = :store_id AND product_id = :product_id
    """)
    conn.execute(sql, {"store_id": store_id, "product_id": product_id, "quantity": quantity})


def calculate_priority(order_data: Dict) -> Dict:
    """เรียก priority.py Lambda เพื่อคำนวณ Priority Score"""
    if not PRIORITY_API_URL:
        print("⚠️ PRIORITY_API_URL not set. Using default priority 50")
        return {"priority_score": 50, "breakdown": {}}

    try:
        req = urllib.request.Request(
            PRIORITY_API_URL,
            data=json.dumps(order_data).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )

        with urllib.request.urlopen(req, timeout=3) as response:
            result = json.loads(response.read().decode('utf-8'))
            if result.get('success'):
                return result.get('result', {"priority_score": 50})
    except Exception as e:
        print(f"⚠️ Priority API Error: {e}. Using default priority 50")

    return {"priority_score": 50, "breakdown": {}}


def calculate_eta(origin: Dict, destination: Dict) -> Dict:
    """เรียก etaCalculation.py Lambda เพื่อคำนวณ ETA"""
    if not ETA_API_URL:
        print("⚠️ ETA_API_URL not set. Using default ETA 30 min")
        return {"eta_minutes": 30, "distance_km": 5}

    try:
        eta_data = {"origin": origin, "destination": destination}
        req = urllib.request.Request(
            ETA_API_URL,
            data=json.dumps(eta_data).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )

        with urllib.request.urlopen(req, timeout=3) as response:
            result = json.loads(response.read().decode('utf-8'))
            if result.get('success'):
                return result.get('result', {"eta_minutes": 30, "distance_km": 5})
    except Exception as e:
        print(f"⚠️ ETA API Error: {e}. Using default ETA 30 min")

    return {"eta_minutes": 30, "distance_km": 5}


# ==================== Main Order Creation Logic ====================

def create_order(order_request: Dict, conn) -> Dict:
    """สร้าง Order ใหม่"""

    # 1. Validate Customer
    customer = validate_customer(order_request['customer_id'], conn)
    if not customer:
        raise ValueError("Customer not found or inactive")

    if not customer['lat'] or not customer['lon']:
        raise ValueError("Customer location not set")

    # 2. Validate Store
    store = validate_store(order_request['store_id'], conn)
    if not store:
        raise ValueError("Store not found or inactive")

    if not store['is_open']:
        raise ValueError("Store is currently closed")

    if not store['lat'] or not store['lon']:
        raise ValueError("Store location not set")

    # 3. Validate Products
    items = order_request.get('items', [])
    if not items:
        raise ValueError("Order must contain at least one item")

    product_ids = [item['product_id'] for item in items]
    products = validate_products(product_ids, conn)

    if len(products) != len(product_ids):
        missing = set(product_ids) - set(products.keys())
        raise ValueError(f"Products not found: {missing}")

    # 4. Check Inventory
    for item in items:
        if not check_inventory(store['id'], item['product_id'], item['quantity'], conn):
            product_name = products[item['product_id']]['name']
            raise ValueError(f"Insufficient stock for {product_name}")

    # 5. Calculate Totals
    total_price = 0
    total_weight = 0
    total_volume = 0
    requires_cold_chain = False
    is_fragile = False
    min_shelf_life = None

    enriched_items = []
    for item in items:
        product = products[item['product_id']]
        quantity = item['quantity']

        item_price = product['price'] * quantity
        item_weight = product['weight_kg'] * quantity
        item_volume = product['volume_m3'] * quantity

        total_price += item_price
        total_weight += item_weight
        total_volume += item_volume

        if product['requires_cold_chain']:
            requires_cold_chain = True
        if product['is_fragile']:
            is_fragile = True

        if product['shelf_life_hours']:
            if min_shelf_life is None or product['shelf_life_hours'] < min_shelf_life:
                min_shelf_life = product['shelf_life_hours']

        enriched_items.append({
            "product_id": product['id'],
            "name": product['name'],
            "quantity": quantity,
            "price": product['price'],
            "weight_kg": product['weight_kg'],
            "volume_m3": product['volume_m3'],
            "category": product['category'],
            "requires_cold_chain": product['requires_cold_chain'],
            "is_fragile": product['is_fragile'],
            "shelf_life_hours": product['shelf_life_hours']
        })

    # 6. Calculate Priority Score
    priority_request = {
        "customer_id": customer['id'],
        "customer_tier": customer['tier'],
        "store_lat": store['lat'],
        "store_lon": store['lon'],
        "customer_lat": customer['lat'],
        "customer_lon": customer['lon'],
        "products": enriched_items,
        "delivery_window_start": order_request.get('delivery_window_start'),
        "delivery_window_end": order_request.get('delivery_window_end')
    }

    priority_result = calculate_priority(priority_request)
    priority_score = priority_result.get('priority_score', 50)

    # 7. Calculate ETA
    eta_result = calculate_eta(
        {"lat": store['lat'], "lon": store['lon']},
        {"lat": customer['lat'], "lon": customer['lon']}
    )

    # 8. Create Order in Database
    order_id = str(uuid.uuid4())

    sql_order = text("""
        INSERT INTO orders (
            id, customer_id, store_id, status, total_price,
            delivery_lat, delivery_lon, delivery_address,
            priority_score, estimated_delivery_time,
            delivery_window_start, delivery_window_end,
            requires_cold_chain, is_fragile,
            total_weight_kg, total_volume_m3,
            created_at, updated_at
        ) VALUES (
            :id, :customer_id, :store_id, :status, :total_price,
            :delivery_lat, :delivery_lon, :delivery_address,
            :priority_score, :estimated_delivery_time,
            :delivery_window_start, :delivery_window_end,
            :requires_cold_chain, :is_fragile,
            :total_weight_kg, :total_volume_m3,
            NOW(), NOW()
        )
    """)

    conn.execute(sql_order, {
        "id": order_id,
        "customer_id": customer['id'],
        "store_id": store['id'],
        "status": "pending",
        "total_price": total_price,
        "delivery_lat": customer['lat'],
        "delivery_lon": customer['lon'],
        "delivery_address": customer['address'],
        "priority_score": priority_score,
        "estimated_delivery_time": eta_result['eta_minutes'],
        "delivery_window_start": order_request.get('delivery_window_start'),
        "delivery_window_end": order_request.get('delivery_window_end'),
        "requires_cold_chain": requires_cold_chain,
        "is_fragile": is_fragile,
        "total_weight_kg": total_weight,
        "total_volume_m3": total_volume
    })

    # 9. Create Order Items
    sql_item = text("""
        INSERT INTO order_items (
            id, order_id, product_id, quantity, unit_price, total_price,
            created_at, updated_at
        ) VALUES (
            :id, :order_id, :product_id, :quantity, :unit_price, :total_price,
            NOW(), NOW()
        )
    """)

    for item in items:
        product = products[item['product_id']]
        conn.execute(sql_item, {
            "id": str(uuid.uuid4()),
            "order_id": order_id,
            "product_id": item['product_id'],
            "quantity": item['quantity'],
            "unit_price": product['price'],
            "total_price": product['price'] * item['quantity']
        })

    # 10. Update Inventory
    for item in items:
        update_inventory(store['id'], item['product_id'], item['quantity'], conn)

    # 11. Log to system_logs
    log_to_system_logs(
        "INFO", "OrderCreation", f"Order {order_id} created successfully",
        {
            "order_id": order_id,
            "customer_id": customer['id'],
            "store_id": store['id'],
            "total_price": total_price,
            "priority_score": priority_score
        },
        conn
    )

    return {
        "order_id": order_id,
        "customer": customer,
        "store": store,
        "items": enriched_items,
        "total_price": round(total_price, 2),
        "total_weight_kg": round(total_weight, 3),
        "total_volume_m3": round(total_volume, 3),
        "priority_score": round(priority_score, 2),
        "priority_breakdown": priority_result.get('breakdown', {}),
        "estimated_delivery_time_min": eta_result['eta_minutes'],
        "distance_km": eta_result.get('distance_km', 0),
        "status": "pending",
        "requires_cold_chain": requires_cold_chain,
        "is_fragile": is_fragile,
        "created_at": datetime.now().isoformat()
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
            "user_id": "lambda:OrderManagement",
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
        }, ensure_ascii=False, indent=2, default=str)
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

    if not db_engine:
        return create_error_response(500, "Database connection not available")

    try:
        # Parse Input
        body = json.loads(event['body']) if 'body' in event else event

        # Validation
        required_fields = ['customer_id', 'store_id', 'items']
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

        print(f"🛒 Creating order for customer {body['customer_id']} from store {body['store_id']}")

        # Create Order
        with db_engine.connect() as conn:
            with conn.begin():
                result = create_order(body, conn)

        execution_time = round((time.time() - start_time) * 1000, 2)

        print(f"✅ Order {result['order_id']} created successfully")
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
