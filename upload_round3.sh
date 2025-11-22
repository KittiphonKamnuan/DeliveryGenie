#!/bin/bash

echo "======================================"
echo "Uploading Lambda Functions - Round 3"
echo "======================================"

cd lambda/

echo -e "\n1. Uploading realtimeTracking..."
zip -q -j realtimeTracking.zip realtimeTracking.py
aws lambda update-function-code \
  --function-name realtimeTracking \
  --zip-file fileb://realtimeTracking.zip \
  --region ap-southeast-1 > /dev/null
echo "   ✅ realtimeTracking uploaded"

echo -e "\n2. Uploading riderAssignment..."
zip -q -j riderAssignment.zip riderAssignment.py
aws lambda update-function-code \
  --function-name riderAssignment \
  --zip-file fileb://riderAssignment.zip \
  --region ap-southeast-1 > /dev/null
echo "   ✅ riderAssignment uploaded"

echo -e "\n3. Uploading deliveryCompletion..."
zip -q -j deliveryCompletion.zip deliveryCompletion.py
aws lambda update-function-code \
  --function-name deliveryCompletion \
  --zip-file fileb://deliveryCompletion.zip \
  --region ap-southeast-1 > /dev/null
echo "   ✅ deliveryCompletion uploaded"

echo -e "\n======================================"
echo "✅ All 3 Lambdas uploaded successfully!"
echo "Waiting 5 seconds for deployment..."
echo "======================================"

sleep 5

echo -e "\nReady to test!"
