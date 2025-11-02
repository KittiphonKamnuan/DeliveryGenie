# 🔧 Fix RDS Connection Issue

## Problem
```
Error: P1001: Can't reach database server at `deliverygenie-db.ctakskm4uga0.us-east-1.rds.amazonaws.com:5432`
```

## Solution: Update Security Group

### Step 1: Get Your IP Address

```bash
# Check your public IP
curl ifconfig.me
# Or visit: https://whatismyipaddress.com/
```

### Step 2: Update RDS Security Group

1. **Go to AWS Console**: https://console.aws.amazon.com/ec2/

2. **Navigate to Security Groups**:
   - Click **Security Groups** in left sidebar
   - Find the security group attached to your RDS (likely `deliverygenie-db-sg` or `default`)

3. **Edit Inbound Rules**:
   - Click on the security group
   - Click **Edit inbound rules** button
   - Click **Add rule**

4. **Add PostgreSQL Rule**:
   ```yaml
   Type: PostgreSQL
   Protocol: TCP
   Port Range: 5432
   Source: My IP (it will auto-fill your current IP)
   Description: Allow from my machine
   ```

5. **Save Rules**

### Alternative: Allow from Anywhere (⚠️ For development only!)

If "My IP" doesn't work, you can temporarily allow from anywhere:

```yaml
Type: PostgreSQL
Port: 5432
Source: Anywhere-IPv4 (0.0.0.0/0)
Description: Temporary - allow all
```

⚠️ **Security Warning**: This is NOT recommended for production! Only use during development and remove after testing.

### Step 3: Test Connection

```bash
# Test if port is open
nc -zv deliverygenie-db.ctakskm4uga0.us-east-1.rds.amazonaws.com 5432

# Or use telnet
telnet deliverygenie-db.ctakskm4uga0.us-east-1.rds.amazonaws.com 5432

# If connection works, you should see:
# Connection to deliverygenie-db.ctakskm4uga0.us-east-1.rds.amazonaws.com port 5432 [tcp/postgresql] succeeded!
```

### Step 4: Verify RDS is Running

1. Go to **RDS Console**: https://console.aws.amazon.com/rds/
2. Select your database: `deliverygenie-db`
3. Check **Status**: Should be "Available" (not "Stopped")
4. If stopped, click **Actions** → **Start**

### Step 5: Retry Prisma Commands

```bash
# Test connection
npx prisma db push

# Should succeed now!
```
