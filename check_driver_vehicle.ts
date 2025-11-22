import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDriverVehicle() {
  const driver = await prisma.drivers.findFirst({
    where: { id: '11fef86d-2900-4152-a48a-0c0e55b532ba' }
  });
  
  console.log('Driver:', driver);
  
  const vehicles = await prisma.vehicles.findMany();
  console.log('\nVehicles:', vehicles.map(v => ({ id: v.id, number: v.vehicle_number })));
  
  // Update driver with valid vehicle
  if (vehicles.length > 0) {
    await prisma.drivers.update({
      where: { id: '11fef86d-2900-4152-a48a-0c0e55b532ba' },
      data: { current_vehicle_id: vehicles[0].id }
    });
    console.log(`\n✅ Updated driver with vehicle: ${vehicles[0].id}`);
  }
  
  await prisma.$disconnect();
}

checkDriverVehicle();
