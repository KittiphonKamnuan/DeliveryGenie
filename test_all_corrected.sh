#!/bin/bash

API_BASE="https://rywh91krwb.execute-api.ap-southeast-1.amazonaws.com/prod"
DRIVER_ID="11fef86d-2900-4152-a48a-0c0e55b532ba"
DELIVERY_ID="d1941658-9514-4310-ba80-47ae9787809d"
ORDER_ID="8432b4b4-d7e7-4f6b-94c6-e7e0b2403612"

echo "========================================="
echo "Testing DeliveryGenie API - After Upload"
echo "========================================="

echo -e "\n1️⃣  Testing /nearby7 (Should work)..."
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST $API_BASE/nearby7 \
  -H "Content-Type: application/json" \
  -d '{"lat":13.7563,"lon":100.5018,"limit":5}')
status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')
if [ "$status" = "200" ]; then
  echo "   ✅ Status: $status"
else
  echo "   ❌ Status: $status"
fi
echo "   Response: ${body:0:150}..."

echo -e "\n2️⃣  Testing /navigation (Should work)..."
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST $API_BASE/navigation \
  -H "Content-Type: application/json" \
  -d '{"origin_lat":13.7563,"origin_lon":100.5018,"dest_lat":13.7270,"dest_lon":100.5240,"vehicle_type":"motorcycle"}')
status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')
if [ "$status" = "200" ]; then
  echo "   ✅ Status: $status"
else
  echo "   ❌ Status: $status"
fi
echo "   Response: ${body:0:150}..."

echo -e "\n3️⃣  Testing /tracking (Fixed - should work now)..."
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST $API_BASE/tracking \
  -H "Content-Type: application/json" \
  -d "{\"driver_id\":\"$DRIVER_ID\",\"lat\":13.7563,\"lon\":100.5018,\"speed_kmh\":25.0}")
status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')
if [ "$status" = "200" ]; then
  echo "   ✅ Status: $status"
else
  echo "   ❌ Status: $status"
fi
echo "   Response: ${body:0:150}..."

echo -e "\n4️⃣  Testing /assign (Fixed - should work now)..."
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST $API_BASE/assign \
  -H "Content-Type: application/json" \
  -d "{\"order_id\":\"$ORDER_ID\"}")
status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')
if [ "$status" = "200" ]; then
  echo "   ✅ Status: $status"
else
  echo "   ❌ Status: $status"
fi
echo "   Response: ${body:0:150}..."

echo -e "\n5️⃣  Testing /complete (Fixed - should work now)..."
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST $API_BASE/complete \
  -H "Content-Type: application/json" \
  -d "{\"delivery_id\":\"$DELIVERY_ID\",\"notes\":\"Test delivery completion\"}")
status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')
if [ "$status" = "200" ]; then
  echo "   ✅ Status: $status"
else
  echo "   ❌ Status: $status"
fi
echo "   Response: ${body:0:150}..."

echo -e "\n6️⃣  Testing /priority (Corrected payload)..."
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST $API_BASE/priority \
  -H "Content-Type: application/json" \
  -d "{\"order_id\":\"$ORDER_ID\",\"start_location\":{\"lat\":13.7563,\"lon\":100.5018}}")
status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')
if [ "$status" = "200" ]; then
  echo "   ✅ Status: $status"
else
  echo "   ❌ Status: $status"
fi
echo "   Response: ${body:0:150}..."

echo -e "\n7️⃣  Testing /eta (Corrected payload)..."
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST $API_BASE/eta \
  -H "Content-Type: application/json" \
  -d '{"origin":{"lat":13.7563,"lon":100.5018},"destination":{"lat":13.7270,"lon":100.5240},"vehicle_type":"motorcycle"}')
status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')
if [ "$status" = "200" ]; then
  echo "   ✅ Status: $status"
else
  echo "   ❌ Status: $status"
fi
echo "   Response: ${body:0:150}..."

echo -e "\n8️⃣  Testing /route (Corrected payload with origin + stores)..."
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST $API_BASE/route \
  -H "Content-Type: application/json" \
  -d '{"origin":{"lat":13.7563,"lon":100.5018},"stores":[{"store_id":"STORE_7_11_001","lat":13.7270,"lon":100.5240},{"store_id":"STORE_7_11_002","lat":13.7463,"lon":100.5342}],"vehicle_type":"motorcycle"}')
status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')
if [ "$status" = "200" ]; then
  echo "   ✅ Status: $status"
else
  echo "   ❌ Status: $status"
fi
echo "   Response: ${body:0:150}..."

echo -e "\n9️⃣  Testing /multistop (Corrected payload with origin + stores)..."
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST $API_BASE/multistop \
  -H "Content-Type: application/json" \
  -d '{"origin":{"lat":13.7563,"lon":100.5018},"stores":[{"store_id":"STORE_7_11_001","lat":13.7270,"lon":100.5240,"priority":1},{"store_id":"STORE_7_11_002","lat":13.7463,"lon":100.5342,"priority":2}],"vehicle_type":"motorcycle","use_priority":true}')
status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')
if [ "$status" = "200" ]; then
  echo "   ✅ Status: $status"
else
  echo "   ❌ Status: $status"
fi
echo "   Response: ${body:0:150}..."

echo -e "\n🔟 Testing /traffic (Corrected payload with stores)..."
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST $API_BASE/traffic \
  -H "Content-Type: application/json" \
  -d '{"stores":[{"store_id":"STORE_7_11_001","lat":13.7563,"lon":100.5018},{"store_id":"STORE_7_11_002","lat":13.7270,"lon":100.5240}]}')
status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')
if [ "$status" = "200" ]; then
  echo "   ✅ Status: $status"
else
  echo "   ❌ Status: $status"
fi
echo "   Response: ${body:0:150}..."

echo -e "\n========================================="
echo "✅ Testing Complete!"
echo "========================================="
