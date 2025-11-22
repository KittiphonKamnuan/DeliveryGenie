import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getTestIDs() {
  // Get first driver
  const driver = await prisma.drivers.findFirst();
  
  // Get first customer  
  const customer = await prisma.customers.findFirst();
  
  // Get pending order
  const order = await prisma.orders.findFirst({
    where: { order_status: 'pending' }
  });
  
  // Get in-transit delivery
  const delivery = await prisma.deliveries.findFirst({
    where: { delivery_status: 'in_transit' }
  });
  
  console.log('\n📋 TEST IDS FOR API TESTING:\n');
  console.log(`DRIVER_ID="${driver?.id}"`);
  console.log(`CUSTOMER_ID="${customer?.id}"`);
  console.log(`ORDER_ID="${order?.id}"`);
  console.log(`DELIVERY_ID="${delivery?.id}"`);
  
  console.log('\n✅ Test Payloads:\n');
  
  console.log('# Tracking (with delivery):');
  console.log(`{
  "driver_id": "${driver?.id}",
  "delivery_id": "${delivery?.id}",
  "lat": 13.7563,
  "lon": 100.5018,
  "speed_kmh": 25.0
}`);
  
  console.log('\n# Assign:');
  console.log(`{
  "order_id": "${order?.id}"
}`);
  
  await prisma.$disconnect();
}

getTestIDs();
