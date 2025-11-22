# 🚀 AWS Deployment Guide - DeliveryGenie Production Setup

**สำหรับ**: Deploy ทั้งระบบไปยัง AWS Production
**Prerequisites**: AWS Account, AWS CLI configured, Lambda functions ready

---

## 📋 Table of Contents

1. [สร้าง Kinesis Data Stream](#1-สร้าง-kinesis-data-stream)
2. [สร้าง S3 Buckets](#2-สร้าง-s3-buckets)
3. [Set up IAM Roles](#3-set-up-iam-roles)
4. [Upload Lambda Functions](#4-upload-lambda-functions)
5. [Create API Gateway](#5-create-api-gateway)
6. [Update Internal Lambda URLs](#6-update-internal-lambda-urls)
7. [Test End-to-End Flow](#7-test-end-to-end-flow)
8. [Set up CloudWatch Alarms](#8-set-up-cloudwatch-alarms)
9. [Deploy to Production](#9-deploy-to-production)

---

# 1. สร้าง Kinesis Data Stream

## Purpose
ใช้สำหรับรับ GPS tracking data แบบ real-time จาก drivers

## AWS CloudShell Commands

```bash
# 1. สร้าง Kinesis Data Stream
aws kinesis create-stream \
    --stream-name deliverygenie-gps-stream \
    --shard-count 2 \
    --region ap-southeast-1

# 2. รอให้ Stream พร้อมใช้งาน (ใช้เวลา ~1 นาที)
aws kinesis wait stream-exists \
    --stream-name deliverygenie-gps-stream \
    --region ap-southeast-1

# 3. เช็คสถานะ
aws kinesis describe-stream \
    --stream-name deliverygenie-gps-stream \
    --region ap-southeast-1

# Expected output:
# "StreamStatus": "ACTIVE"

# 4. Get Stream ARN (save for later)
KINESIS_ARN=$(aws kinesis describe-stream \
    --stream-name deliverygenie-gps-stream \
    --region ap-southeast-1 \
    --query 'StreamDescription.StreamARN' \
    --output text)

echo "Kinesis Stream ARN: $KINESIS_ARN"
echo $KINESIS_ARN > kinesis_arn.txt
```

## Cost Estimation
- **Shard Hour**: $0.015/hour per shard
- **2 shards**: $0.03/hour = **$21.60/month**
- **PUT Payload Units**: $0.014 per 1M units
- **Estimated**: ~$25/month for 10 drivers

## Cleanup (if needed)
```bash
aws kinesis delete-stream \
    --stream-name deliverygenie-gps-stream \
    --region ap-southeast-1
```

---

# 2. สร้าง S3 Buckets

## Purpose
- `deliverygenie-ml`: เก็บ ML training data
- `deliverygenie-proof`: เก็บ proof of delivery images
- `deliverygenie-logs`: เก็บ CloudWatch logs (optional)

## AWS CloudShell Commands

```bash
# Region
REGION=ap-southeast-1

# 1. สร้าง S3 Bucket สำหรับ ML Training Data
aws s3 mb s3://deliverygenie-ml --region $REGION

# 2. สร้าง S3 Bucket สำหรับ Proof of Delivery
aws s3 mb s3://deliverygenie-proof --region $REGION

# 3. สร้าง S3 Bucket สำหรับ Logs (optional)
aws s3 mb s3://deliverygenie-logs --region $REGION

# 4. Enable versioning (ML bucket only)
aws s3api put-bucket-versioning \
    --bucket deliverygenie-ml \
    --versioning-configuration Status=Enabled \
    --region $REGION

# 5. Enable encryption
aws s3api put-bucket-encryption \
    --bucket deliverygenie-ml \
    --server-side-encryption-configuration '{
        "Rules": [{
            "ApplyServerSideEncryptionByDefault": {
                "SSEAlgorithm": "AES256"
            }
        }]
    }' \
    --region $REGION

aws s3api put-bucket-encryption \
    --bucket deliverygenie-proof \
    --server-side-encryption-configuration '{
        "Rules": [{
            "ApplyServerSideEncryptionByDefault": {
                "SSEAlgorithm": "AES256"
            }
        }]
    }' \
    --region $REGION

# 6. Enable lifecycle policy (delete old training data after 90 days)
cat > lifecycle.json <<EOF
{
    "Rules": [
        {
            "Id": "DeleteOldTrainingData",
            "Status": "Enabled",
            "Prefix": "training-data/",
            "Expiration": {
                "Days": 90
            }
        }
    ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
    --bucket deliverygenie-ml \
    --lifecycle-configuration file://lifecycle.json \
    --region $REGION

# 7. Create folder structure
aws s3api put-object \
    --bucket deliverygenie-ml \
    --key training-data/delivery-histories/ \
    --region $REGION

# 8. List buckets
aws s3 ls
```

## Cost Estimation
- **Storage**: $0.023 per GB/month
- **Estimated 10 GB**: ~$0.23/month
- **PUT Requests**: $0.005 per 1,000 requests
- **Total**: ~$5/month (including requests)

## Cleanup (if needed)
```bash
# Empty bucket first
aws s3 rm s3://deliverygenie-ml --recursive
aws s3 rm s3://deliverygenie-proof --recursive

# Then delete
aws s3 rb s3://deliverygenie-ml
aws s3 rb s3://deliverygenie-proof
```

---

# 3. Set up IAM Roles

## Purpose
สร้าง IAM Role สำหรับ Lambda functions เพื่อให้สามารถเข้าถึง AWS services ต่างๆ ได้

## AWS CloudShell Commands

### 3.1 สร้าง Trust Policy

```bash
# Create trust policy for Lambda
cat > lambda-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
```

### 3.2 สร้าง IAM Role

```bash
# สร้าง Role
aws iam create-role \
    --role-name DeliveryGenie-Lambda-Role \
    --assume-role-policy-document file://lambda-trust-policy.json \
    --description "IAM role for DeliveryGenie Lambda functions"

# Get Role ARN
ROLE_ARN=$(aws iam get-role \
    --role-name DeliveryGenie-Lambda-Role \
    --query 'Role.Arn' \
    --output text)

echo "Lambda Role ARN: $ROLE_ARN"
echo $ROLE_ARN > lambda_role_arn.txt
```

### 3.3 Attach Managed Policies

```bash
# 1. Basic Lambda execution (CloudWatch Logs)
aws iam attach-role-policy \
    --role-name DeliveryGenie-Lambda-Role \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# 2. VPC Access (if using RDS in VPC)
aws iam attach-role-policy \
    --role-name DeliveryGenie-Lambda-Role \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole
```

### 3.4 Create Custom Policy

```bash
# Create custom policy for Kinesis, S3, and RDS access
cat > deliverygenie-custom-policy.json <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "kinesis:PutRecord",
                "kinesis:PutRecords",
                "kinesis:DescribeStream"
            ],
            "Resource": "arn:aws:kinesis:ap-southeast-1:*:stream/deliverygenie-gps-stream"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject"
            ],
            "Resource": [
                "arn:aws:s3:::deliverygenie-ml/*",
                "arn:aws:s3:::deliverygenie-proof/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::deliverygenie-ml",
                "arn:aws:s3:::deliverygenie-proof"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "rds:DescribeDBInstances",
                "rds-db:connect"
            ],
            "Resource": "*"
        }
    ]
}
EOF

# Create policy
aws iam create-policy \
    --policy-name DeliveryGenie-Lambda-Policy \
    --policy-document file://deliverygenie-custom-policy.json \
    --description "Custom policy for DeliveryGenie Lambda functions"

# Get policy ARN
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
POLICY_ARN="arn:aws:iam::${ACCOUNT_ID}:policy/DeliveryGenie-Lambda-Policy"

# Attach custom policy to role
aws iam attach-role-policy \
    --role-name DeliveryGenie-Lambda-Role \
    --policy-arn $POLICY_ARN

echo "Custom Policy ARN: $POLICY_ARN"
```

### 3.5 Verify Policies

```bash
# List attached policies
aws iam list-attached-role-policies \
    --role-name DeliveryGenie-Lambda-Role
```

---

# 4. Upload Lambda Functions

## 4.1 Create Lambda Layer

```bash
# Create layer with dependencies
mkdir -p python
cd python

# Install all dependencies
pip3 install \
    boto3 \
    requests \
    psycopg2-binary \
    sqlalchemy \
    -t . --upgrade

cd ..

# Create zip
zip -r deliverygenie-dependencies.zip python/

# Upload layer
aws lambda publish-layer-version \
    --layer-name deliverygenie-dependencies \
    --description "Python dependencies for DeliveryGenie (boto3, requests, psycopg2, sqlalchemy)" \
    --zip-file fileb://deliverygenie-dependencies.zip \
    --compatible-runtimes python3.11 python3.12 \
    --region ap-southeast-1

# Get Layer ARN
LAYER_ARN=$(aws lambda list-layer-versions \
    --layer-name deliverygenie-dependencies \
    --region ap-southeast-1 \
    --query 'LayerVersions[0].LayerVersionArn' \
    --output text)

echo "Layer ARN: $LAYER_ARN"
echo $LAYER_ARN > layer_arn.txt

# Cleanup
rm -rf python/
rm deliverygenie-dependencies.zip
```

## 4.2 Upload Each Lambda Function

```bash
# Get Role ARN
ROLE_ARN=$(cat lambda_role_arn.txt)
LAYER_ARN=$(cat layer_arn.txt)
REGION=ap-southeast-1

# Navigate to lambda directory
cd /path/to/lambda/

# List of Lambda functions to deploy
FUNCTIONS=(
    "7-11_weather"
    "coreRouteOptimize"
    "MultistopDelivery"
    "findNearby7"
    "Realtime-Traffic"
    "priority"
    "orderManagement"
    "etaCalculation"
    "riderAssignment"
    "realtimeTracking"
    "routeNavigation"
    "deliveryCompletion"
)

# Deploy each function
for FUNC in "${FUNCTIONS[@]}"; do
    echo "Deploying $FUNC..."

    # Find the Python file
    if [ -f "${FUNC}.py" ]; then
        PY_FILE="${FUNC}.py"
    elif [ -f "$(echo $FUNC | sed 's/-/_/g').py" ]; then
        PY_FILE="$(echo $FUNC | sed 's/-/_/g').py"
    else
        echo "⚠️  File not found for $FUNC"
        continue
    fi

    # Create zip
    zip "${FUNC}.zip" "$PY_FILE"

    # Create Lambda function
    aws lambda create-function \
        --function-name "$FUNC" \
        --runtime python3.11 \
        --role "$ROLE_ARN" \
        --handler "${PY_FILE%.py}.lambda_handler" \
        --zip-file "fileb://${FUNC}.zip" \
        --timeout 30 \
        --memory-size 256 \
        --region $REGION \
        --layers "$LAYER_ARN" || echo "⚠️  Function $FUNC may already exist"

    # Cleanup zip
    rm "${FUNC}.zip"

    echo "✅ Deployed $FUNC"
done
```

## 4.3 Set Environment Variables

**สร้างไฟล์ env-vars.sh**:

```bash
cat > env-vars.sh <<'EOF'
#!/bin/bash

# Get values
LAYER_ARN=$(cat layer_arn.txt)
REGION=ap-southeast-1

# Common environment variables
DATABASE_URL="postgresql+psycopg2://user:pass@your-rds-host.rds.amazonaws.com:5432/deliverygenie_db"
SERPAPI_KEY="your_serpapi_key"
WEATHER_API_KEY="your_openweathermap_key"
TMD_ACCESS_TOKEN="your_tmd_token"

# AWS Resources
KINESIS_STREAM_NAME="deliverygenie-gps-stream"
S3_BUCKET="deliverygenie-ml"
S3_TRAINING_PREFIX="training-data/delivery-histories"

# OSRM
OSRM_API_URL="http://router.project-osrm.org/route/v1/driving"
OSRM_DIRECTIONS_API="http://router.project-osrm.org/route/v1/driving"

# 1. 7-11_weather
aws lambda update-function-configuration \
    --function-name 7-11_weather \
    --environment "Variables={
        DB_HOST=your-rds-host.rds.amazonaws.com,
        DB_NAME=deliverygenie_db,
        DB_USER=postgres,
        DB_PASSWORD=your_password,
        DB_PORT=5432,
        TMD_ACCESS_TOKEN=$TMD_ACCESS_TOKEN
    }" \
    --region $REGION

# 2. coreRouteOptimize
aws lambda update-function-configuration \
    --function-name coreRouteOptimize \
    --environment "Variables={
        DATABASE_URL=$DATABASE_URL,
        OSRM_API_URL=$OSRM_API_URL
    }" \
    --region $REGION

# 3. MultistopDelivery
aws lambda update-function-configuration \
    --function-name MultistopDelivery \
    --environment "Variables={
        DATABASE_URL=$DATABASE_URL
    }" \
    --region $REGION

# 4. findNearby7
aws lambda update-function-configuration \
    --function-name findNearby7 \
    --environment "Variables={
        DATABASE_URL=$DATABASE_URL,
        OVERPASS_API_URL=https://overpass-api.de/api/interpreter,
        SEARCH_RADIUS_KM=3,
        ROUTING_API_URL=https://YOUR_API_ID.execute-api.$REGION.amazonaws.com/prod/route
    }" \
    --region $REGION

# 5. Realtime-Traffic
aws lambda update-function-configuration \
    --function-name Realtime-Traffic \
    --environment "Variables={
        DATABASE_URL=$DATABASE_URL,
        SERPAPI_KEY=$SERPAPI_KEY
    }" \
    --region $REGION

# 6. priority
aws lambda update-function-configuration \
    --function-name priority \
    --environment "Variables={
        DATABASE_URL=$DATABASE_URL
    }" \
    --region $REGION

# 7. orderManagement
aws lambda update-function-configuration \
    --function-name orderManagement \
    --environment "Variables={
        DATABASE_URL=$DATABASE_URL,
        PRIORITY_API_URL=https://YOUR_API_ID.execute-api.$REGION.amazonaws.com/prod/priority,
        ETA_API_URL=https://YOUR_API_ID.execute-api.$REGION.amazonaws.com/prod/eta
    }" \
    --region $REGION

# 8. etaCalculation
aws lambda update-function-configuration \
    --function-name etaCalculation \
    --environment "Variables={
        DATABASE_URL=$DATABASE_URL,
        WEATHER_API_KEY=$WEATHER_API_KEY,
        OSRM_API_URL=$OSRM_API_URL,
        TRAFFIC_API_URL=https://YOUR_API_ID.execute-api.$REGION.amazonaws.com/prod/traffic
    }" \
    --region $REGION

# 9. riderAssignment
aws lambda update-function-configuration \
    --function-name riderAssignment \
    --environment "Variables={
        DATABASE_URL=$DATABASE_URL
    }" \
    --region $REGION

# 10. realtimeTracking
aws lambda update-function-configuration \
    --function-name realtimeTracking \
    --environment "Variables={
        DATABASE_URL=$DATABASE_URL,
        KINESIS_STREAM_NAME=$KINESIS_STREAM_NAME,
        AWS_REGION=$REGION
    }" \
    --region $REGION

# 11. routeNavigation
aws lambda update-function-configuration \
    --function-name routeNavigation \
    --environment "Variables={
        DATABASE_URL=$DATABASE_URL,
        OSRM_DIRECTIONS_API=$OSRM_DIRECTIONS_API
    }" \
    --region $REGION

# 12. deliveryCompletion
aws lambda update-function-configuration \
    --function-name deliveryCompletion \
    --environment "Variables={
        DATABASE_URL=$DATABASE_URL,
        S3_BUCKET=$S3_BUCKET,
        S3_TRAINING_PREFIX=$S3_TRAINING_PREFIX,
        AWS_REGION=$REGION
    }" \
    --region $REGION

echo "✅ All environment variables set!"
EOF

# Make executable
chmod +x env-vars.sh

# Run script (after editing with real values)
# ./env-vars.sh
```

**⚠️ Important**: Edit `env-vars.sh` แล้วใส่ค่าจริงก่อนรัน!

---

# 5. Create API Gateway

## 5.1 Create REST API

```bash
REGION=ap-southeast-1

# Create REST API
API_ID=$(aws apigateway create-rest-api \
    --name "DeliveryGenie-API" \
    --description "API for DeliveryGenie Last-Mile Delivery System" \
    --region $REGION \
    --endpoint-configuration types=REGIONAL \
    --query 'id' \
    --output text)

echo "API Gateway ID: $API_ID"
echo $API_ID > api_gateway_id.txt

# Get root resource ID
ROOT_ID=$(aws apigateway get-resources \
    --rest-api-id $API_ID \
    --region $REGION \
    --query 'items[0].id' \
    --output text)

echo "Root Resource ID: $ROOT_ID"
```

## 5.2 Create Resources and Methods

```bash
API_ID=$(cat api_gateway_id.txt)
REGION=ap-southeast-1
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# List of endpoints
declare -A ENDPOINTS=(
    ["weather"]="7-11_weather"
    ["route"]="coreRouteOptimize"
    ["multistop"]="MultistopDelivery"
    ["nearby7"]="findNearby7"
    ["traffic"]="Realtime-Traffic"
    ["priority"]="priority"
    ["order"]="orderManagement"
    ["eta"]="etaCalculation"
    ["assign"]="riderAssignment"
    ["tracking"]="realtimeTracking"
    ["navigation"]="routeNavigation"
    ["complete"]="deliveryCompletion"
)

# Get root resource
ROOT_ID=$(aws apigateway get-resources \
    --rest-api-id $API_ID \
    --region $REGION \
    --query 'items[0].id' \
    --output text)

# Create resources and integrate with Lambda
for ENDPOINT in "${!ENDPOINTS[@]}"; do
    LAMBDA_NAME="${ENDPOINTS[$ENDPOINT]}"

    echo "Creating /$ENDPOINT → $LAMBDA_NAME"

    # Create resource
    RESOURCE_ID=$(aws apigateway create-resource \
        --rest-api-id $API_ID \
        --parent-id $ROOT_ID \
        --path-part "$ENDPOINT" \
        --region $REGION \
        --query 'id' \
        --output text)

    # Create POST method
    aws apigateway put-method \
        --rest-api-id $API_ID \
        --resource-id $RESOURCE_ID \
        --http-method POST \
        --authorization-type NONE \
        --region $REGION

    # Set up Lambda integration
    LAMBDA_ARN="arn:aws:lambda:$REGION:$ACCOUNT_ID:function:$LAMBDA_NAME"

    aws apigateway put-integration \
        --rest-api-id $API_ID \
        --resource-id $RESOURCE_ID \
        --http-method POST \
        --type AWS_PROXY \
        --integration-http-method POST \
        --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations" \
        --region $REGION

    # Grant API Gateway permission to invoke Lambda
    aws lambda add-permission \
        --function-name "$LAMBDA_NAME" \
        --statement-id "apigateway-$ENDPOINT" \
        --action lambda:InvokeFunction \
        --principal apigateway.amazonaws.com \
        --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*/*/$ENDPOINT" \
        --region $REGION || echo "Permission may already exist"

    echo "✅ Created /$ENDPOINT"
done
```

## 5.3 Deploy API

```bash
API_ID=$(cat api_gateway_id.txt)
REGION=ap-southeast-1

# Create deployment
aws apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name prod \
    --stage-description "Production stage" \
    --description "Initial deployment" \
    --region $REGION

# Get invoke URL
INVOKE_URL="https://${API_ID}.execute-api.${REGION}.amazonaws.com/prod"
echo "API Invoke URL: $INVOKE_URL"
echo $INVOKE_URL > api_invoke_url.txt

echo "✅ API Gateway deployed!"
echo ""
echo "Endpoints:"
echo "  - POST $INVOKE_URL/weather"
echo "  - POST $INVOKE_URL/route"
echo "  - POST $INVOKE_URL/traffic"
echo "  - POST $INVOKE_URL/priority"
echo "  - POST $INVOKE_URL/eta"
echo "  - etc..."
```

## 5.4 Enable CORS (Optional)

```bash
# Enable CORS for all resources
# (ทำแบบ manual ใน AWS Console จะง่ายกว่า)

# Or use this script for each endpoint:
# aws apigateway update-integration-response ...
```

---

# 6. Update Internal Lambda URLs

Now update the environment variables with the actual API Gateway URLs

```bash
API_URL=$(cat api_invoke_url.txt)
REGION=ap-southeast-1

# Update findNearby7
aws lambda update-function-configuration \
    --function-name findNearby7 \
    --environment "Variables={
        DATABASE_URL=$DATABASE_URL,
        OVERPASS_API_URL=https://overpass-api.de/api/interpreter,
        SEARCH_RADIUS_KM=3,
        ROUTING_API_URL=${API_URL}/route
    }" \
    --region $REGION

# Update orderManagement
aws lambda update-function-configuration \
    --function-name orderManagement \
    --environment "Variables={
        DATABASE_URL=$DATABASE_URL,
        PRIORITY_API_URL=${API_URL}/priority,
        ETA_API_URL=${API_URL}/eta
    }" \
    --region $REGION

# Update etaCalculation
aws lambda update-function-configuration \
    --function-name etaCalculation \
    --environment "Variables={
        DATABASE_URL=$DATABASE_URL,
        WEATHER_API_KEY=$WEATHER_API_KEY,
        OSRM_API_URL=$OSRM_API_URL,
        TRAFFIC_API_URL=${API_URL}/traffic
    }" \
    --region $REGION

echo "✅ Lambda URLs updated!"
```

---

# 7. Test End-to-End Flow

## 7.1 Test Individual Endpoints

```bash
API_URL=$(cat api_invoke_url.txt)

# Test 1: Weather API
curl -X POST "${API_URL}/weather" \
    -H "Content-Type: application/json" \
    -d '{
        "lat": 13.7563,
        "lon": 100.5018
    }'

# Test 2: Priority Calculation
curl -X POST "${API_URL}/priority" \
    -H "Content-Type: application/json" \
    -d '{
        "order_id": "test-order-123",
        "customer_priority": "premium",
        "delivery_distance_km": 5.0
    }'

# Test 3: Traffic Routing
curl -X POST "${API_URL}/traffic" \
    -H "Content-Type: application/json" \
    -d '{
        "stores": [
            {"name": "Store A", "lat": 13.7563, "lon": 100.5018},
            {"name": "Store B", "lat": 13.7465, "lon": 100.5344}
        ],
        "start_index": 0
    }'
```

## 7.2 Test Full Order Flow

```bash
# 1. Create Order
ORDER_RESPONSE=$(curl -X POST "${API_URL}/order" \
    -H "Content-Type: application/json" \
    -d '{
        "customer_id": "cust-001",
        "store_id": "store-001",
        "items": [
            {"product_id": "prod-001", "quantity": 2}
        ],
        "delivery_lat": 13.7465,
        "delivery_lon": 100.5344
    }')

echo "Order created: $ORDER_RESPONSE"

# Extract order_id (requires jq)
ORDER_ID=$(echo $ORDER_RESPONSE | jq -r '.result.order_id')

# 2. Assign Rider
ASSIGNMENT=$(curl -X POST "${API_URL}/assign" \
    -H "Content-Type: application/json" \
    -d "{
        \"order_id\": \"$ORDER_ID\",
        \"pickup_location\": {\"lat\": 13.7563, \"lon\": 100.5018}
    }")

echo "Rider assigned: $ASSIGNMENT"

# 3. Get Navigation
DELIVERY_ID=$(echo $ASSIGNMENT | jq -r '.result.delivery_id')

NAVIGATION=$(curl -X POST "${API_URL}/navigation" \
    -H "Content-Type: application/json" \
    -d "{
        \"delivery_id\": \"$DELIVERY_ID\"
    }")

echo "Navigation: $NAVIGATION"

# 4. Send GPS Tracking
curl -X POST "${API_URL}/tracking" \
    -H "Content-Type: application/json" \
    -d "{
        \"driver_id\": \"driver-001\",
        \"lat\": 13.7500,
        \"lon\": 100.5200,
        \"speed_kmh\": 25.0,
        \"heading_degrees\": 90.0
    }"

# 5. Complete Delivery
curl -X POST "${API_URL}/complete" \
    -H "Content-Type: application/json" \
    -d "{
        \"delivery_id\": \"$DELIVERY_ID\",
        \"proof_of_delivery_url\": \"s3://deliverygenie-proof/test.jpg\",
        \"customer_rating\": 5.0,
        \"was_on_time\": true
    }"

echo "✅ End-to-end test complete!"
```

---

# 8. Set up CloudWatch Alarms

## 8.1 Lambda Error Alarms

```bash
REGION=ap-southeast-1
SNS_TOPIC_ARN="arn:aws:sns:$REGION:$ACCOUNT_ID:deliverygenie-alerts"

# Create SNS topic for alerts (if not exists)
aws sns create-topic \
    --name deliverygenie-alerts \
    --region $REGION

# Subscribe email to topic
aws sns subscribe \
    --topic-arn $SNS_TOPIC_ARN \
    --protocol email \
    --notification-endpoint your-email@example.com \
    --region $REGION

# Create alarm for each Lambda
FUNCTIONS=(
    "Realtime-Traffic"
    "priority"
    "orderManagement"
    "etaCalculation"
    "riderAssignment"
    "realtimeTracking"
    "routeNavigation"
    "deliveryCompletion"
)

for FUNC in "${FUNCTIONS[@]}"; do
    # Error rate alarm
    aws cloudwatch put-metric-alarm \
        --alarm-name "${FUNC}-ErrorRate" \
        --alarm-description "Error rate for $FUNC Lambda" \
        --metric-name Errors \
        --namespace AWS/Lambda \
        --statistic Sum \
        --period 300 \
        --evaluation-periods 1 \
        --threshold 5 \
        --comparison-operator GreaterThanThreshold \
        --dimensions Name=FunctionName,Value=$FUNC \
        --alarm-actions $SNS_TOPIC_ARN \
        --region $REGION

    # Throttle alarm
    aws cloudwatch put-metric-alarm \
        --alarm-name "${FUNC}-Throttles" \
        --alarm-description "Throttle rate for $FUNC Lambda" \
        --metric-name Throttles \
        --namespace AWS/Lambda \
        --statistic Sum \
        --period 300 \
        --evaluation-periods 1 \
        --threshold 3 \
        --comparison-operator GreaterThanThreshold \
        --dimensions Name=FunctionName,Value=$FUNC \
        --alarm-actions $SNS_TOPIC_ARN \
        --region $REGION

    echo "✅ Alarms created for $FUNC"
done
```

## 8.2 Kinesis Alarms

```bash
# Kinesis iterator age alarm
aws cloudwatch put-metric-alarm \
    --alarm-name "Kinesis-IteratorAge" \
    --alarm-description "Kinesis stream falling behind" \
    --metric-name GetRecords.IteratorAgeMilliseconds \
    --namespace AWS/Kinesis \
    --statistic Maximum \
    --period 60 \
    --evaluation-periods 2 \
    --threshold 60000 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=StreamName,Value=deliverygenie-gps-stream \
    --alarm-actions $SNS_TOPIC_ARN \
    --region $REGION
```

## 8.3 API Gateway Alarms

```bash
API_ID=$(cat api_gateway_id.txt)

# 4XX error rate
aws cloudwatch put-metric-alarm \
    --alarm-name "APIGateway-4XX-Errors" \
    --alarm-description "High 4XX error rate" \
    --metric-name 4XXError \
    --namespace AWS/ApiGateway \
    --statistic Sum \
    --period 300 \
    --evaluation-periods 1 \
    --threshold 20 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=ApiName,Value=DeliveryGenie-API \
    --alarm-actions $SNS_TOPIC_ARN \
    --region $REGION

# 5XX error rate
aws cloudwatch put-metric-alarm \
    --alarm-name "APIGateway-5XX-Errors" \
    --alarm-description "High 5XX error rate" \
    --metric-name 5XXError \
    --namespace AWS/ApiGateway \
    --statistic Sum \
    --period 300 \
    --evaluation-periods 1 \
    --threshold 10 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=ApiName,Value=DeliveryGenie-API \
    --alarm-actions $SNS_TOPIC_ARN \
    --region $REGION
```

---

# 9. Deploy to Production

## 9.1 Pre-Deployment Checklist

```bash
# Create checklist script
cat > pre-deploy-check.sh <<'EOF'
#!/bin/bash

echo "🔍 Pre-Deployment Checklist"
echo ""

# 1. Check Kinesis Stream
echo "1. Kinesis Stream:"
aws kinesis describe-stream \
    --stream-name deliverygenie-gps-stream \
    --query 'StreamDescription.StreamStatus' \
    --output text

# 2. Check S3 Buckets
echo "2. S3 Buckets:"
aws s3 ls | grep deliverygenie

# 3. Check IAM Role
echo "3. IAM Role:"
aws iam get-role \
    --role-name DeliveryGenie-Lambda-Role \
    --query 'Role.RoleName' \
    --output text

# 4. Check Lambda Functions
echo "4. Lambda Functions:"
aws lambda list-functions \
    --query 'Functions[?starts_with(FunctionName, `7`) || starts_with(FunctionName, `core`) || starts_with(FunctionName, `Multi`) || starts_with(FunctionName, `find`) || starts_with(FunctionName, `Real`) || starts_with(FunctionName, `priority`) || starts_with(FunctionName, `order`) || starts_with(FunctionName, `eta`) || starts_with(FunctionName, `rider`) || starts_with(FunctionName, `realtime`) || starts_with(FunctionName, `route`) || starts_with(FunctionName, `delivery`)].FunctionName' \
    --output table

# 5. Check API Gateway
echo "5. API Gateway:"
aws apigateway get-rest-apis \
    --query 'items[?name==`DeliveryGenie-API`].[id, name]' \
    --output table

# 6. Check CloudWatch Alarms
echo "6. CloudWatch Alarms:"
aws cloudwatch describe-alarms \
    --query 'MetricAlarms[?starts_with(AlarmName, `Realtime`) || starts_with(AlarmName, `priority`) || starts_with(AlarmName, `API`)].AlarmName' \
    --output table

echo ""
echo "✅ Pre-deployment check complete!"
EOF

chmod +x pre-deploy-check.sh
./pre-deploy-check.sh
```

## 9.2 Final Deployment Steps

```bash
# 1. Tag all resources
aws lambda tag-resource \
    --resource arn:aws:lambda:ap-southeast-1:$ACCOUNT_ID:function:Realtime-Traffic \
    --tags Environment=Production,Project=DeliveryGenie,Version=1.0

# 2. Enable X-Ray tracing (optional)
aws lambda update-function-configuration \
    --function-name Realtime-Traffic \
    --tracing-config Mode=Active

# 3. Set reserved concurrency (prevent runaway costs)
aws lambda put-function-concurrency \
    --function-name Realtime-Traffic \
    --reserved-concurrent-executions 10

# 4. Create API Gateway custom domain (optional)
# aws apigateway create-domain-name ...

# 5. Final deployment
aws apigateway create-deployment \
    --rest-api-id $(cat api_gateway_id.txt) \
    --stage-name prod \
    --description "Production deployment v1.0" \
    --region ap-southeast-1
```

## 9.3 Post-Deployment Validation

```bash
cat > validate-deployment.sh <<'EOF'
#!/bin/bash

API_URL=$(cat api_invoke_url.txt)

echo "🧪 Validating Production Deployment"
echo ""

# Test each endpoint
ENDPOINTS=("weather" "priority" "eta" "traffic" "route")

for ENDPOINT in "${ENDPOINTS[@]}"; do
    echo "Testing /$ENDPOINT..."

    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "${API_URL}/${ENDPOINT}" \
        -H "Content-Type: application/json" \
        -d '{"test": true}')

    if [ $HTTP_CODE -eq 200 ] || [ $HTTP_CODE -eq 400 ]; then
        echo "  ✅ $ENDPOINT: $HTTP_CODE"
    else
        echo "  ❌ $ENDPOINT: $HTTP_CODE (FAILED)"
    fi
done

echo ""
echo "✅ Validation complete!"
EOF

chmod +x validate-deployment.sh
./validate-deployment.sh
```

---

# 📊 Cost Summary

| Service | Monthly Cost (Estimated) |
|---------|-------------------------|
| Lambda (12 functions) | ~$10 |
| Kinesis (2 shards) | ~$25 |
| S3 Storage (10 GB) | ~$5 |
| API Gateway (1M requests) | ~$3.50 |
| CloudWatch Logs | ~$5 |
| RDS PostgreSQL (db.t3.micro) | ~$15 |
| **Total** | **~$63.50/month** |

**With optimizations**:
- Use Lambda reserved concurrency
- Enable S3 lifecycle policies
- Optimize Kinesis shard count
- **Optimized Total**: **~$45/month**

---

# 🎯 Quick Commands Summary

```bash
# 1. Deploy everything
./deploy-all.sh

# 2. Check status
./pre-deploy-check.sh

# 3. Validate deployment
./validate-deployment.sh

# 4. Get API URL
cat api_invoke_url.txt

# 5. View logs
aws logs tail /aws/lambda/Realtime-Traffic --follow

# 6. Test endpoint
curl -X POST $(cat api_invoke_url.txt)/traffic -H "Content-Type: application/json" -d @test-events/5_Realtime-Traffic_direct.json
```

---

# 🔧 Troubleshooting

## Lambda Timeout
```bash
aws lambda update-function-configuration \
    --function-name Realtime-Traffic \
    --timeout 60
```

## Increase Memory
```bash
aws lambda update-function-configuration \
    --function-name Realtime-Traffic \
    --memory-size 512
```

## View Logs
```bash
aws logs tail /aws/lambda/Realtime-Traffic --follow --region ap-southeast-1
```

## Redeploy Function
```bash
zip Realtime-Traffic.zip Realtime-Traffic.py
aws lambda update-function-code \
    --function-name Realtime-Traffic \
    --zip-file fileb://Realtime-Traffic.zip
```

---

**Created**: 2025-11-22
**Status**: Ready for Production Deployment
**Next**: Run deployment scripts and validate!
