import json
import os
import requests
import logging
import uuid
import psycopg2
import time  # <--- 1. เพิ่ม import time สำหรับการหน่วงเวลา
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Configuration
ACCESS_TOKEN = os.environ.get('TMD_ACCESS_TOKEN')
DB_HOST = os.environ.get('DB_HOST')
DB_NAME = os.environ.get('DB_NAME')
DB_USER = os.environ.get('DB_USER')
DB_PASSWORD = os.environ.get('DB_PASSWORD')
DB_PORT = os.environ.get('DB_PORT', '5432')

# Mapping สภาพอากาศตาม Document
WEATHER_CONDITIONS = {
    1: "ท้องฟ้าแจ่มใส", 2: "มีเมฆบางส่วน", 3: "เมฆเป็นส่วนมาก", 4: "มีเมฆมาก",
    5: "ฝนตกเล็กน้อย", 6: "ฝนปานกลาง", 7: "ฝนตกหนัก", 8: "ฝนฟ้าคะนอง",
    9: "อากาศหนาวจัด", 10: "อากาศหนาว", 11: "อากาศเย็น", 12: "อากาศร้อนจัด"
}

def get_db_connection():
    return psycopg2.connect(
        host=DB_HOST, database=DB_NAME, user=DB_USER, password=DB_PASSWORD, port=DB_PORT
    )

def cleanup_old_data(cursor):
    """ลบข้อมูลที่เก่ากว่า 3 วัน"""
    try:
        sql = """
            DELETE FROM "weather_data"
            WHERE "timestamp" < NOW() - INTERVAL '3 days'
        """
        cursor.execute(sql)
        logger.info(f"🧹 Cleaned up old weather data: {cursor.rowcount} rows deleted")
    except Exception as e:
        logger.error(f"❌ Cleanup failed: {str(e)}")

def get_stores_from_db(cursor) -> List[Dict]:
    sql = """
        SELECT id, name, district, city, latitude, longitude
        FROM "stores"
        WHERE "is_active" = true
        AND "latitude" IS NOT NULL AND "longitude" IS NOT NULL
    """
    cursor.execute(sql)
    rows = cursor.fetchall()
    stores = []
    for row in rows:
        stores.append({
            'id': row[0], 'name': row[1], 
            'area': f"{row[2]}, {row[3]}", 
            'lat': float(row[4]), 'lon': float(row[5])
        })
    return stores

def get_weather_forecast(lat: float, lon: float) -> Optional[Dict]:
    url = "https://data.tmd.go.th/nwpapi/v1/forecast/location/hourly/at"
    
    # เวลาปัจจุบัน (เวลาไทย GMT+7)
    now_utc = datetime.now(timezone.utc)
    now_thai = now_utc + timedelta(hours=7)
    
    params = {
        'lat': lat,
        'lon': lon,
        'date': now_thai.strftime("%Y-%m-%d"), 
        'hour': now_thai.hour,              
        'duration': 3,                      
        'fields': 'tc,rh,rain,cond'         
    }
    
    headers = {
        'accept': 'application/json', 
        'authorization': f'Bearer {ACCESS_TOKEN}'
    }
    
    try:
        # กำหนด timeout เผื่อ API ช้า
        response = requests.get(url, params=params, headers=headers, timeout=10) 
        
        if response.status_code == 200:
            return response.json()
        elif response.status_code == 429:
            logger.warning("Rate limit hit (429) - Throttled.")
            return None
        elif response.status_code == 401:
            logger.error("Unauthorized (401) - Check Access Token.")
            return None
            
        logger.error(f"API Error {response.status_code}: {response.text}")
        return None
        
    except Exception as e:
        logger.error(f"Request Failed: {str(e)}")
        return None

def save_forecast_to_postgres(cursor, store: Dict, weather_data: Dict) -> int:
    root_key = 'WeatherForcasts' if 'WeatherForcasts' in weather_data else 'WeatherForecasts'
    
    if root_key not in weather_data:
        logger.error(f"Unexpected JSON structure: {weather_data.keys()}")
        return 0
        
    # เราสนใจแค่ [0] เพราะเรายิงทีละ Location
    forecast_list = weather_data[root_key][0].get('forecasts', []) 
    
    saved_count = 0
    
    sql = """
        INSERT INTO "weather_data" (
            "id", "city", "station_id", 
            "latitude", "longitude", 
            "temperature", "humidity", "rainfall", 
            "condition", "timestamp", "forecast_date"
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    
    for item in forecast_list:
        time_str = item.get('time') 
        data = item.get('data', {})
        
        tc = float(data.get('tc', 0))     
        rh = float(data.get('rh', 0))     
        rain = float(data.get('rain', 0)) 
        cond = int(data.get('cond', 1))   
        
        cond_text = WEATHER_CONDITIONS.get(cond, "ไม่ทราบ")
        
        row_id = str(uuid.uuid4())
        
        cursor.execute(sql, (
            row_id,                 
            store['area'],          
            store['id'],            
            store['lat'],           
            store['lon'],           
            tc,                     
            rh,                     
            rain,                   
            cond_text,              
            datetime.now(timezone.utc), 
            time_str                
        ))
        saved_count += 1
        
    return saved_count


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    if not ACCESS_TOKEN:
        raise ValueError("TMD_ACCESS_TOKEN is missing")
    
    conn = None
    try:
        logger.info("Starting Forecast Collection (Hourly)")
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cleanup_old_data(cursor)
        
        stores_list = get_stores_from_db(cursor)
        logger.info(f"Processing {len(stores_list)} stores")
        
        success_count = 0
        
        for index, store in enumerate(stores_list):
            try:
                # 2. Throttling: หน่วงเวลา 1 วินาที เพื่อไม่ให้เกิน 60 requests/นาที
                if index > 0:
                    time.sleep(1) 
                
                weather_data = get_weather_forecast(store['lat'], store['lon'])
                
                if weather_data:
                    count = save_forecast_to_postgres(cursor, store, weather_data)
                    success_count += count
                    logger.info(f"✅ {store['name']}: Saved {count} forecast hours")
                else:
                    logger.warning(f"⚠️ No data for {store['name']} after throttling.")
                    
            except Exception as e:
                logger.error(f"❌ Error {store['name']}: {str(e)}")
        
        conn.commit()
        
        return {
            'statusCode': 200, 
            'body': json.dumps({
                'message': 'Forecast collection complete',
                'stores_processed': len(stores_list),
                'total_records_saved': success_count,
                'timestamp': datetime.now(timezone.utc).isoformat()
            })
        }
        
    except Exception as e:
        logger.error(f"Fatal: {str(e)}")
        if conn: conn.rollback()
        return {'statusCode': 500, 'body': json.dumps({'error': str(e)})}
    finally:
        if conn: conn.close()