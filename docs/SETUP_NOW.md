# 🚀 Setup Database RIGHT NOW

## Step-by-Step Instructions

---

## ✅ Step 1: Fix Security Group (MUST DO FIRST!)

### Go to AWS Console

1. Open: https://console.aws.amazon.com/ec2/
2. Click **Security Groups** in left sidebar
3. Find the security group for your RDS database
   - It might be named: `deliverygenie-db-sg` or `default` or `rds-launch-wizard-X`
   - Look for one with **Inbound rules** that has port 5432

### Add Your IP to Inbound Rules

1. Click on the security group
2. Click **Edit inbound rules** button at bottom
3. Click **Add rule** button
4. Configure the new rule:
   ```
   Type: PostgreSQL
   Protocol: TCP
   Port: 5432
   Source: My IP (will auto-fill your current IP)
   Description: Allow from my laptop
   ```
5. Click **Save rules**

### Verify RDS is Running

1. Go to: https://console.aws.amazon.com/rds/
2. Click on `deliverygenie-db`
3. Check **Status**: Should be "Available"
   - If it says "Stopped", click **Actions** → **Start**
   - Wait 2-3 minutes for it to start

---

## ✅ Step 2: Install tsx Package

```bash
# Install tsx for running TypeScript
npm install tsx --save-dev
```

---

## ✅ Step 3: Try Connecting Again

```bash
# Test database connection
npx prisma db push
```

**Expected output:**
```
✔ Your database is now in sync with your Prisma schema.
```

**If you still see "Can't reach database server":**
- Double-check security group settings
- Make sure RDS status is "Available"
- Wait 1-2 minutes and try again

---

## ✅ Step 4: Seed Database

```bash
# Seed sample data using new script
npm run db:seed
```

**Expected output:**
```
🌱 Starting database seeding...

📊 Seeding Priority Configurations...
✅ Created configs: default, rush_hour

🛍️  Seeding Products...
✅ Created 12 products

🏪 Seeding Stores...
✅ Created 5 stores

🚗 Seeding Drivers...
✅ Created 3 drivers

🚛 Seeding Vehicles...
✅ Created 3 vehicles

👥 Seeding Customers...
✅ Created 3 customers

✨ Seeding completed successfully!
```

---

## ✅ Step 5: Open Prisma Studio

```bash
# Open database GUI
npm run db:studio
```

Then open: http://localhost:5555

You should see all your tables with data!

---

## ✅ Step 6: Test the App

```bash
# Start development server
npm run dev
```

Then open: http://localhost:3001 (or whichever port it uses)

---

## 🎯 Quick Commands Summary

```bash
# Fix package.json (already done ✅)
# npm install tsx --save-dev

# Deploy schema
npm run db:push

# Seed data
npm run db:seed

# View data
npm run db:studio

# Run app
npm run dev
```

---

## 🐛 Still Having Issues?

### Issue: "Can't reach database server"

**Solution:**
1. Check your IP address: `curl ifconfig.me`
2. Verify this IP is in RDS security group
3. Try allowing from anywhere temporarily:
   - Source: `0.0.0.0/0` (remove after testing!)

### Issue: Connection timeout

**Solution:**
```bash
# Test if port is accessible
nc -zv deliverygenie-db.ctakskm4uga0.us-east-1.rds.amazonaws.com 5432

# Or
telnet deliverygenie-db.ctakskm4uga0.us-east-1.rds.amazonaws.com 5432
```

If these fail, security group is definitely the issue.

### Issue: "Database does not exist"

**Solution:**
```bash
# Connect to postgres database
psql -h deliverygenie-db.ctakskm4uga0.us-east-1.rds.amazonaws.com \
     -U postgres \
     -d postgres

# Inside psql:
CREATE DATABASE deliverygenie;
\q
```

---

## 📸 Screenshots to Help

### Security Group Settings Should Look Like:

```
Inbound Rules:
┌────────────┬──────────┬──────────┬─────────────────┐
│ Type       │ Protocol │ Port     │ Source          │
├────────────┼──────────┼──────────┼─────────────────┤
│ PostgreSQL │ TCP      │ 5432     │ xxx.xxx.xxx.xxx │
│            │          │          │ (Your IP)       │
└────────────┴──────────┴──────────┴─────────────────┘
```

### RDS Status Should Show:

```
Instance: deliverygenie-db
Status: Available ✅
Endpoint: deliverygenie-db.ctakskm4uga0.us-east-1.rds.amazonaws.com
Port: 5432
```

---

## ✅ Success Checklist

- [ ] Security group allows your IP on port 5432
- [ ] RDS status is "Available"
- [ ] `npm run db:push` succeeds
- [ ] `npm run db:seed` succeeds
- [ ] Prisma Studio shows tables with data
- [ ] Development server runs without errors

---

## 🎉 When Everything Works

You should see:
- ✅ 20+ tables in Prisma Studio
- ✅ 12 products
- ✅ 5 stores
- ✅ 3 drivers
- ✅ 3 vehicles
- ✅ 3 customers
- ✅ 2 priority configs

---

**Need more help?** Check `FIX_CONNECTION.md` for detailed troubleshooting!
