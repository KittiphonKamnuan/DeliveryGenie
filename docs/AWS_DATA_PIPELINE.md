# DeliveryGenie: AWS Big Data Architecture & ML Pipeline

## 📋 Table of Contents
- [Overview](#overview)
- [Data Volume Analysis (5Vs)](#data-volume-analysis-5vs)
- [AWS Architecture Design](#aws-architecture-design)
- [Data Ingestion Layer](#data-ingestion-layer)
- [Data Storage Layer](#data-storage-layer)
- [Data Processing Layer](#data-processing-layer)
- [ML Training Pipeline](#ml-training-pipeline)
- [Analytics & Visualization](#analytics--visualization)
- [Security & Governance](#security--governance)
- [Automation & Monitoring](#automation--monitoring)

---

## 🎯 Overview

DeliveryGenie ใช้ **AWS Modern Data Architecture** ตาม **Data Analytics Lens of Well-Architected Framework** เพื่อจัดการข้อมูล Big Data จากระบบ Last-Mile Delivery และ Train AI Models สำหรับ Route Optimization

### **Business Objectives**
1. 📊 **Analyze** - วิเคราะห์ประสิทธิภาพการส่งแบบ Real-time
2. 🤖 **Predict** - ทำนายเวลาส่ง และเส้นทางที่ดีที่สุด
3. 💰 **Optimize** - ลดต้นทุนน้ำมัน และเพิ่มความพึงพอใจลูกค้า
4. 📈 **Scale** - รองรับ 120K-300K orders/day

---

## 📊 Data Volume Analysis (5Vs)

### **1. Volume (ปริมาณข้อมูล)**

```
Daily Data Generation:
┌─────────────────────────────────────────────────┐
│ Data Source          │ Volume/Day  │ Size/Day  │
├─────────────────────────────────────────────────┤
│ Orders               │ 120K-300K   │ ~2 GB     │
│ GPS Tracking         │ 22M points  │ ~10 GB    │
│ Traffic API          │ 2.5K calls  │ ~100 MB   │
│ Weather API          │ ~1K calls   │ ~50 MB    │
│ Delivery Histories   │ 120K-300K   │ ~5 GB     │
│ System Logs          │ ~1M entries │ ~3 GB     │
├─────────────────────────────────────────────────┤
│ TOTAL                │             │ ~20-25 GB │
└─────────────────────────────────────────────────┘

Monthly: ~600-750 GB
Yearly: ~7-9 TB
3-Year Historical: ~21-27 TB
```

### **2. Velocity (ความเร็ว)**

```
Real-time Streams:
- GPS Updates: Every 10-15 seconds (~6K events/minute)
- Order Creation: Peak 5K orders/hour
- Traffic Updates: Every 2-5 minutes
- Weather Updates: Every 10-15 minutes

Batch Processing:
- Priority Calculation: Every 5-10 minutes
- Performance Metrics: Hourly aggregation
- ML Model Training: Daily/Weekly
```

### **3. Variety (ความหลากหลาย)**

```
Structured:
✅ PostgreSQL Tables (orders, deliveries, drivers, etc.)
✅ DynamoDB (real-time tracking, caching)

Semi-Structured:
✅ JSON Logs (Lambda execution logs)
✅ GPS Coordinates (GeoJSON)
✅ API Responses (Traffic, Weather)

Unstructured:
✅ Delivery Photos (S3)
✅ Customer Feedback (Text)
✅ Route Polylines (Encoded strings)
```

### **4. Veracity (ความน่าเชื่อถือ)**

```
Data Quality Issues:
⚠️ GPS Outliers (coordinates outside Thailand)
⚠️ Traffic API Delays (2-5 min lag)
⚠️ Missing Weather Data
⚠️ Incomplete Order Information

Solutions:
✅ Data Validation Rules
✅ Quarantine Invalid Data
✅ Fallback Mechanisms
```

### **5. Value (คุณค่าทางธุรกิจ)**

```
Business Impact:
💰 Cost Savings: -25% fuel costs
⏱️ Faster Delivery: -30% delivery time
😊 Customer Satisfaction: +35% NPS
📈 Revenue Growth: +20% from faster service
```

---

## 🏗️ AWS Architecture Design

### **Modern Data Architecture (AWS Well-Architected)**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          DATA SOURCES (Ingestion)                        │
└─────────────────────────────────────────────────────────────────────────┘
         │
         ├─ Mobile Apps (GPS Tracking) ────→ Amazon Kinesis Data Streams
         ├─ Web App (Orders) ──────────────→ AWS Lambda → RDS PostgreSQL
         ├─ External APIs (Traffic/Weather)→ AWS Lambda → DynamoDB
         └─ IoT Devices (Vehicle Sensors)──→ AWS IoT Core
                                                   │
                                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      INGESTION & BUFFERING LAYER                         │
├─────────────────────────────────────────────────────────────────────────┤
│ • Amazon Kinesis Data Streams (GPS Real-time)                           │
│ • Amazon Kinesis Data Firehose (Stream to S3)                          │
│ • AWS Lambda (API Gateway endpoints)                                    │
│ • AWS Glue (ETL Jobs)                                                   │
│ • AWS DMS (Database Migration Service) - From RDS to S3                │
└─────────────────────────────────────────────────────────────────────────┘
                                                   │
                                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        STORAGE LAYER (Data Lake)                         │
├─────────────────────────────────────────────────────────────────────────┤
│ Amazon S3 (Data Lake)                                                    │
│ ├─ Raw Zone (s3://deliverygenie-raw/)                                   │
│ │  ├─ gps-tracking/year=2025/month=11/day=22/                          │
│ │  ├─ orders/year=2025/month=11/day=22/                                │
│ │  └─ logs/year=2025/month=11/day=22/                                  │
│ │                                                                         │
│ ├─ Processed Zone (s3://deliverygenie-processed/)                       │
│ │  ├─ deliveries-parquet/year=2025/month=11/                           │
│ │  ├─ routes-optimized/year=2025/month=11/                             │
│ │  └─ performance-metrics/year=2025/month=11/                          │
│ │                                                                         │
│ └─ ML Training Zone (s3://deliverygenie-ml/)                            │
│    ├─ training-data/                                                     │
│    ├─ models/route-optimization/                                         │
│    └─ inference-results/                                                 │
│                                                                            │
│ AWS Lake Formation (Data Governance)                                     │
│ AWS Glue Data Catalog (Metadata)                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                                   │
                                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        PROCESSING LAYER                                  │
├─────────────────────────────────────────────────────────────────────────┤
│ Batch Processing:                                                        │
│ • AWS Glue ETL Jobs (Spark on EMR)                                      │
│ • Amazon EMR (Hadoop/Spark for large datasets)                          │
│ • AWS Lambda (Serverless compute)                                       │
│                                                                           │
│ Stream Processing:                                                       │
│ • Amazon Kinesis Data Analytics (Real-time analytics)                   │
│ • AWS Lambda (Kinesis trigger)                                          │
│                                                                           │
│ ML Processing:                                                           │
│ • Amazon SageMaker (Training & Inference)                               │
│ • SageMaker Processing Jobs (Data preprocessing)                        │
│ • SageMaker Pipelines (MLOps automation)                                │
└─────────────────────────────────────────────────────────────────────────┘
                                                   │
                                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   ANALYTICS & SERVING LAYER                              │
├─────────────────────────────────────────────────────────────────────────┤
│ • Amazon Athena (SQL queries on S3)                                      │
│ • Amazon Redshift (Data Warehouse for BI)                               │
│ • Amazon OpenSearch (Search & Log analytics)                            │
│ • Amazon QuickSight (Dashboards & Visualization)                        │
└─────────────────────────────────────────────────────────────────────────┘
                                                   │
                                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   CONSUMPTION LAYER (End Users)                          │
├─────────────────────────────────────────────────────────────────────────┤
│ • Admin Dashboard (QuickSight Embedded)                                  │
│ • API Gateway (Real-time queries via Athena/Lambda)                     │
│ • Mobile Apps (SageMaker Inference Endpoints)                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📥 Data Ingestion Layer

### **1. Streaming Data (Kinesis Data Streams)**

**Use Case:** GPS Tracking ทุก 10-15 วินาที

```python
# Lambda Producer (จาก realtimeTracking.py)
import boto3
import json

kinesis = boto3.client('kinesis', region_name='ap-southeast-1')

def send_gps_to_kinesis(rider_id, lat, lon, timestamp):
    """ส่ง GPS data เข้า Kinesis Stream"""
    data = {
        'rider_id': rider_id,
        'latitude': lat,
        'longitude': lon,
        'timestamp': timestamp,
        'speed': 25.5,
        'heading': 45.0,
        'battery_level': 85
    }

    response = kinesis.put_record(
        StreamName='deliverygenie-gps-stream',
        Data=json.dumps(data),
        PartitionKey=rider_id  # Partition by rider_id
    )

    return response

# Architecture:
# Mobile App → API Gateway → Lambda → Kinesis Data Streams
#                                          ↓
#                                   Kinesis Data Firehose
#                                          ↓
#                        S3 (s3://deliverygenie-raw/gps-tracking/)
#                                          ↓
#                                   AWS Glue Crawler
#                                          ↓
#                              Glue Data Catalog (Metadata)
#                                          ↓
#                          Amazon Athena (Query with SQL)
```

**Configuration:**
```yaml
Kinesis Stream:
  Name: deliverygenie-gps-stream
  Shards: 5 (auto-scaling)
  Retention: 24 hours
  Encryption: AWS-managed keys

Kinesis Firehose:
  Name: deliverygenie-gps-firehose
  Destination: S3
  Buffer Size: 5 MB
  Buffer Interval: 60 seconds
  Compression: GZIP
  Format: Parquet (using Glue Data Catalog)
```

### **2. Batch Data (AWS Glue ETL)**

**Use Case:** Daily Export จาก RDS PostgreSQL → S3

```python
# AWS Glue ETL Job (PySpark)
import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job

args = getResolvedOptions(sys.argv, ['JOB_NAME'])
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

# 1. Read from PostgreSQL (delivery_histories table)
delivery_histories = glueContext.create_dynamic_frame.from_catalog(
    database="deliverygenie_db",
    table_name="delivery_histories",
    transformation_ctx="delivery_histories"
)

# 2. Apply Transformations
from awsglue.transforms import ApplyMapping

mapped_data = ApplyMapping.apply(
    frame=delivery_histories,
    mappings=[
        ("delivery_date", "timestamp", "delivery_date", "timestamp"),
        ("distance_km", "double", "distance_km", "double"),
        ("duration_min", "int", "duration_min", "int"),
        ("traffic_condition", "string", "traffic_condition", "string"),
        ("weather_condition", "string", "weather_condition", "string"),
        ("on_time", "boolean", "on_time", "boolean"),
        ("priority_avg", "double", "priority_avg", "double")
    ],
    transformation_ctx="mapped_data"
)

# 3. Write to S3 (Parquet format, partitioned by date)
glueContext.write_dynamic_frame.from_options(
    frame=mapped_data,
    connection_type="s3",
    connection_options={
        "path": "s3://deliverygenie-processed/delivery-histories/",
        "partitionKeys": ["year", "month", "day"]
    },
    format="parquet",
    transformation_ctx="write_to_s3"
)

job.commit()
```

**Glue Job Schedule:**
```
Trigger: Daily at 02:00 AM (GMT+7)
Job Type: Spark ETL
Worker Type: G.1X (4 vCPU, 16 GB memory)
Max Capacity: 10 DPUs
Timeout: 60 minutes
```

### **3. API Data (Lambda + DynamoDB)**

**Use Case:** Traffic & Weather Data Caching

```python
# Lambda: Fetch Traffic Data
import boto3
import json
from datetime import datetime, timedelta

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('traffic_data_cache')

def lambda_handler(event, context):
    """
    Fetch traffic data from Google Maps API
    Cache to DynamoDB with TTL (Time-to-Live)
    """
    lat1, lon1 = event['origin']['lat'], event['origin']['lon']
    lat2, lon2 = event['destination']['lat'], event['destination']['lon']

    cache_key = f"{lat1}_{lon1}_{lat2}_{lon2}"

    # 1. Check DynamoDB Cache
    response = table.get_item(Key={'route_id': cache_key})

    if 'Item' in response:
        # Cache Hit
        cached_data = response['Item']
        if cached_data['expires_at'] > int(datetime.now().timestamp()):
            print("✅ Cache HIT")
            return cached_data['traffic_data']

    # 2. Cache Miss → Call Google Maps API
    print("⚠️ Cache MISS - Calling API")
    traffic_data = call_google_maps_api(lat1, lon1, lat2, lon2)

    # 3. Save to DynamoDB with TTL (5 minutes)
    ttl = int((datetime.now() + timedelta(minutes=5)).timestamp())

    table.put_item(Item={
        'route_id': cache_key,
        'traffic_data': traffic_data,
        'created_at': datetime.now().isoformat(),
        'expires_at': ttl,
        'ttl': ttl  # DynamoDB TTL attribute
    })

    return traffic_data
```

**DynamoDB Configuration:**
```yaml
Table: traffic_data_cache
Partition Key: route_id (String)
Sort Key: None
Capacity Mode: On-Demand (Pay per request)
TTL: Enabled on 'ttl' attribute (auto-delete expired items)
Encryption: AWS-managed
```

---

## 💾 Data Storage Layer

### **S3 Data Lake Structure**

```
s3://deliverygenie-raw/
├── gps-tracking/
│   └── year=2025/
│       └── month=11/
│           └── day=22/
│               ├── 00-00.parquet
│               ├── 00-01.parquet
│               └── ...
│
├── orders/
│   └── year=2025/month=11/day=22/
│       └── orders.json.gz
│
├── traffic-api/
│   └── year=2025/month=11/day=22/
│       └── traffic.json.gz
│
└── weather-api/
    └── year=2025/month=11/day=22/
        └── weather.json.gz

s3://deliverygenie-processed/
├── delivery-histories/
│   └── year=2025/month=11/day=22/
│       └── deliveries.parquet
│
├── routes-optimized/
│   └── year=2025/month=11/
│       └── routes.parquet
│
└── performance-metrics/
    ├── daily/
    ├── weekly/
    └── monthly/

s3://deliverygenie-ml/
├── training-data/
│   ├── route-optimization/
│   │   ├── train/
│   │   ├── validation/
│   │   └── test/
│   └── eta-prediction/
│
├── models/
│   ├── route-lstm/
│   │   ├── model.tar.gz
│   │   └── metadata.json
│   └── eta-regression/
│
└── inference-results/
    └── predictions.parquet
```

### **AWS Glue Data Catalog**

```python
# Glue Crawler Configuration
crawler_config = {
    'Name': 'deliverygenie-gps-crawler',
    'Role': 'AWSGlueServiceRole-DeliveryGenie',
    'DatabaseName': 'deliverygenie_data_lake',
    'Targets': {
        'S3Targets': [
            {'Path': 's3://deliverygenie-raw/gps-tracking/'},
            {'Path': 's3://deliverygenie-processed/delivery-histories/'}
        ]
    },
    'Schedule': 'cron(0 */6 * * ? *)',  # Every 6 hours
    'SchemaChangePolicy': {
        'UpdateBehavior': 'UPDATE_IN_DATABASE',
        'DeleteBehavior': 'LOG'
    }
}

# Result: Auto-create Athena tables
"""
CREATE EXTERNAL TABLE deliverygenie_data_lake.gps_tracking (
  rider_id STRING,
  latitude DOUBLE,
  longitude DOUBLE,
  speed DOUBLE,
  heading DOUBLE,
  battery_level INT,
  timestamp TIMESTAMP
)
PARTITIONED BY (year INT, month INT, day INT)
STORED AS PARQUET
LOCATION 's3://deliverygenie-raw/gps-tracking/'
"""
```

---

## ⚙️ Data Processing Layer

### **AWS Glue ETL Job: Aggregate Performance Metrics**

```python
# Glue Job: Calculate Daily Performance Metrics
from awsglue.transforms import *
from awsglue.dynamicframe import DynamicFrame
from pyspark.sql import functions as F

# Read delivery histories (Parquet)
deliveries_df = spark.read.parquet(
    "s3://deliverygenie-processed/delivery-histories/year=2025/month=11/"
)

# Aggregations
daily_metrics = deliveries_df.groupBy(
    F.date_trunc('day', 'delivery_date').alias('date'),
    'district'
).agg(
    F.count('*').alias('total_deliveries'),
    F.sum(F.when(F.col('on_time') == True, 1).otherwise(0)).alias('on_time_count'),
    F.avg('delay_minutes').alias('avg_delay_min'),
    F.avg('distance_km').alias('avg_distance_km'),
    F.avg('duration_min').alias('avg_duration_min'),
    F.sum('distance_km').alias('total_distance_km'),
    F.avg('priority_avg').alias('avg_priority_score')
)

# Calculate on_time_rate
daily_metrics = daily_metrics.withColumn(
    'on_time_rate',
    F.col('on_time_count') / F.col('total_deliveries')
)

# Write to S3
daily_metrics.write.mode('overwrite').parquet(
    "s3://deliverygenie-processed/performance-metrics/daily/"
)

# Also write to Redshift for BI
daily_metrics.write \
    .format("com.databricks.spark.redshift") \
    .option("url", "jdbc:redshift://deliverygenie.redshift.amazonaws.com:5439/analytics") \
    .option("dbtable", "public.daily_performance_metrics") \
    .option("tempdir", "s3://deliverygenie-temp/redshift/") \
    .option("aws_iam_role", "arn:aws:iam::123456789:role/RedshiftCopyRole") \
    .mode("append") \
    .save()
```

### **Amazon EMR: Large-scale Spark Processing**

```python
# EMR Cluster for Monthly Route Optimization Analysis
# Instance: m5.xlarge × 5 nodes

from pyspark.sql import SparkSession
from pyspark.ml.feature import VectorAssembler
from pyspark.ml.regression import GBTRegressor

spark = SparkSession.builder \
    .appName("RouteOptimizationTraining") \
    .getOrCreate()

# Read 1 month of delivery data
df = spark.read.parquet(
    "s3://deliverygenie-ml/training-data/route-optimization/month=11/"
)

# Feature Engineering
assembler = VectorAssembler(
    inputCols=[
        'distance_km',
        'traffic_condition_encoded',
        'weather_condition_encoded',
        'time_of_day_hour',
        'day_of_week',
        'priority_score',
        'total_weight_kg'
    ],
    outputCol='features'
)

df_features = assembler.transform(df)

# Train Model (Gradient Boosted Trees)
gbt = GBTRegressor(
    featuresCol='features',
    labelCol='actual_duration_min',
    maxIter=100
)

model = gbt.fit(df_features)

# Save model to S3
model.write().overwrite().save(
    "s3://deliverygenie-ml/models/route-duration-gbt/"
)

spark.stop()
```

---

## 🤖 ML Training Pipeline

### **Amazon SageMaker: Route Optimization Model**

```python
# SageMaker Training Job
import sagemaker
from sagemaker.sklearn import SKLearn

role = 'arn:aws:iam::123456789:role/SageMakerRole'
session = sagemaker.Session()

# Training Script (train.py)
sklearn_estimator = SKLearn(
    entry_point='train.py',
    role=role,
    instance_type='ml.m5.xlarge',
    framework_version='1.0-1',
    hyperparameters={
        'epochs': 100,
        'batch_size': 256,
        'learning_rate': 0.001
    }
)

sklearn_estimator.fit({
    'train': 's3://deliverygenie-ml/training-data/route-optimization/train/',
    'validation': 's3://deliverygenie-ml/training-data/route-optimization/validation/'
})

# Deploy Model
predictor = sklearn_estimator.deploy(
    initial_instance_count=1,
    instance_type='ml.t2.medium',
    endpoint_name='route-optimization-endpoint'
)
```

### **SageMaker Training Script (train.py)**

```python
import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
import joblib
import os

def train():
    # Load data from S3
    train_data = pd.read_parquet('/opt/ml/input/data/train/')

    X_train = train_data[['distance_km', 'traffic_condition',
                          'weather_condition', 'priority_score',
                          'total_weight_kg']]
    y_train = train_data['actual_duration_min']

    # Train model
    model = GradientBoostingRegressor(
        n_estimators=100,
        learning_rate=0.1,
        max_depth=5
    )

    model.fit(X_train, y_train)

    # Save model
    joblib.dump(model, os.path.join('/opt/ml/model', 'model.joblib'))
    print("Model saved successfully")

if __name__ == '__main__':
    train()
```

---

## 📊 Analytics & Visualization

### **Amazon Athena: Ad-hoc SQL Queries**

```sql
-- Query delivery performance by district
SELECT
    district,
    DATE_TRUNC('day', delivery_date) as date,
    COUNT(*) as total_deliveries,
    AVG(duration_min) as avg_duration,
    AVG(distance_km) as avg_distance,
    SUM(CASE WHEN on_time = true THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as on_time_rate,
    AVG(priority_avg) as avg_priority
FROM deliverygenie_data_lake.delivery_histories
WHERE year = 2025 AND month = 11
GROUP BY district, DATE_TRUNC('day', delivery_date)
ORDER BY date DESC, on_time_rate ASC
LIMIT 100;

-- Cost: ~$5 per TB scanned
-- Performance: Partition pruning reduces scan size
```

### **Amazon QuickSight: Dashboard**

```yaml
Dashboard: DeliveryGenie Analytics
Data Source: Athena (deliverygenie_data_lake)

Visualizations:
  1. KPI Cards:
     - Total Deliveries Today
     - On-Time Rate (%)
     - Avg Delivery Time
     - Fuel Saved (Liters)

  2. Line Chart:
     - X: Hour of Day
     - Y: Delivery Count
     - Series: Priority Class

  3. Geo Map:
     - Location: GPS coordinates
     - Color: Traffic Condition
     - Size: Number of deliveries

  4. Bar Chart:
     - X: District
     - Y: On-Time Rate (%)
     - Sort: DESC

  5. Heatmap:
     - X: Day of Week
     - Y: Hour of Day
     - Color: Avg Delay (minutes)
```

---

## 🔐 Security & Governance

### **AWS Lake Formation**

```python
# Grant Permissions (Fine-grained access control)
import boto3

lakeformation = boto3.client('lakeformation')

# Grant Data Analyst access to processed data only
lakeformation.grant_permissions(
    Principal={'DataLakePrincipalIdentifier': 'arn:aws:iam::123:role/DataAnalyst'},
    Resource={
        'Table': {
            'DatabaseName': 'deliverygenie_data_lake',
            'Name': 'delivery_histories'
        }
    },
    Permissions=['SELECT']
)

# Grant ML Engineer access to ML training data
lakeformation.grant_permissions(
    Principal={'DataLakePrincipalIdentifier': 'arn:aws:iam::123:role/MLEngineer'},
    Resource={
        'DataLocation': {
            'ResourceArn': 'arn:aws:s3:::deliverygenie-ml/'
        }
    },
    Permissions=['DATA_LOCATION_ACCESS']
)
```

### **Data Classification & Encryption**

```
S3 Bucket Encryption:
✅ AES-256 (SSE-S3) for raw data
✅ AWS KMS for sensitive data (customer PII)

RDS PostgreSQL:
✅ Encryption at rest (AWS-managed keys)
✅ SSL/TLS for connections

DynamoDB:
✅ Encryption at rest (AWS-managed keys)

Athena:
✅ Query results encrypted in S3
```

---

## 🔄 Automation & Monitoring

### **AWS Step Functions: ETL Orchestration**

```json
{
  "Comment": "Daily ETL Pipeline for DeliveryGenie",
  "StartAt": "ExtractFromRDS",
  "States": {
    "ExtractFromRDS": {
      "Type": "Task",
      "Resource": "arn:aws:states:::glue:startJobRun.sync",
      "Parameters": {
        "JobName": "extract-delivery-histories"
      },
      "Next": "TransformData"
    },
    "TransformData": {
      "Type": "Task",
      "Resource": "arn:aws:states:::glue:startJobRun.sync",
      "Parameters": {
        "JobName": "transform-delivery-metrics"
      },
      "Next": "LoadToRedshift"
    },
    "LoadToRedshift": {
      "Type": "Task",
      "Resource": "arn:aws:states:::glue:startJobRun.sync",
      "Parameters": {
        "JobName": "load-to-redshift"
      },
      "Next": "TrainMLModel"
    },
    "TrainMLModel": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sagemaker:createTrainingJob.sync",
      "Parameters": {
        "TrainingJobName.$": "$.TrainingJobName",
        "RoleArn": "arn:aws:iam::123:role/SageMakerRole",
        "AlgorithmSpecification": {
          "TrainingImage": "382416733822.dkr.ecr.ap-southeast-1.amazonaws.com/xgboost:latest",
          "TrainingInputMode": "File"
        },
        "InputDataConfig": [{
          "ChannelName": "train",
          "DataSource": {
            "S3DataSource": {
              "S3Uri": "s3://deliverygenie-ml/training-data/route-optimization/train/"
            }
          }
        }]
      },
      "End": true
    }
  }
}
```

### **CloudWatch Monitoring**

```python
# Lambda: Send Custom Metrics to CloudWatch
import boto3
from datetime import datetime

cloudwatch = boto3.client('cloudwatch')

def send_custom_metric(metric_name, value, unit='Count'):
    """Send custom metric to CloudWatch"""
    cloudwatch.put_metric_data(
        Namespace='DeliveryGenie/Operations',
        MetricData=[{
            'MetricName': metric_name,
            'Value': value,
            'Unit': unit,
            'Timestamp': datetime.now(),
            'Dimensions': [{
                'Name': 'Environment',
                'Value': 'Production'
            }]
        }]
    )

# Example usage:
send_custom_metric('OrdersCreated', 1500, 'Count')
send_custom_metric('AvgPriorityScore', 75.3, 'None')
send_custom_metric('GPSPointsIngested', 22000000, 'Count')
```

**CloudWatch Alarms:**
```yaml
Alarms:
  - Name: HighGPSIngestFailure
    Metric: GPSIngestErrors
    Threshold: > 100 errors/minute
    Action: SNS → Email/SMS to DevOps

  - Name: LowOnTimeRate
    Metric: OnTimeDeliveryRate
    Threshold: < 80%
    Action: SNS → Alert Operations Manager

  - Name: HighLambdaErrors
    Metric: Lambda Errors
    Threshold: > 50 errors/5min
    Action: Auto-scale + Alert
```

---

## 📈 Cost Optimization

### **Estimated Monthly Costs**

```
Service                    | Usage              | Cost/Month
---------------------------|--------------------|-----------
S3 Storage (750 GB)       | Standard Tier      | $17
Kinesis Data Streams      | 5 shards           | $75
AWS Glue ETL              | 50 DPU-hours/day   | $220
Amazon Athena             | 1 TB scanned/day   | $150
Amazon EMR                | 5 nodes, 8h/week   | $320
SageMaker Training        | ml.m5.xlarge, 24h  | $115
SageMaker Endpoint        | ml.t2.medium 24/7  | $35
Redshift (dc2.large×2)    | BI Warehouse       | $360
QuickSight                | 10 users           | $180
Lambda (1M invocations)   | 512MB, 3s avg      | $20
DynamoDB On-Demand        | 10M reads/writes   | $12.50
-------------------------------------------------------------
TOTAL                                          | ~$1,504.50
```

**Optimization Strategies:**
- ✅ Use S3 Intelligent-Tiering (save 68% on infrequent access)
- ✅ Spot Instances for EMR (save 70%)
- ✅ Compress data (Parquet + GZIP)
- ✅ Partition data by date
- ✅ Query only necessary columns in Athena

---

## 🎯 Success Metrics

```
Data Pipeline Performance:
✅ Latency: GPS tracking → S3 < 60 seconds
✅ Throughput: 22M GPS points/day
✅ Availability: 99.9% uptime
✅ Data Quality: >99% valid records

ML Model Performance:
✅ Route Duration Prediction MAE: < 5 minutes
✅ ETA Accuracy: ±10% error
✅ Model Training Time: < 2 hours
✅ Inference Latency: < 100ms

Business Impact:
✅ Fuel Cost Savings: -25%
✅ Delivery Time Reduction: -30%
✅ Customer Satisfaction: +35%
```

---

**Last Updated:** 2025-11-22
**Version:** 1.0
**Based on:** AWS Data Engineering Modules 1-12
