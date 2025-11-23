// Seed mock rider accounts into database
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const mockRiders = [
  {
    id: 'DRIVER-001',
    employee_id: 'EMP-R-001',
    first_name: 'สมชาย',
    last_name: 'ใจดี',
    phone: '0991234567',
    email: 'rider1@deliverygenie.com',
    license_number: 'DL-12345678',
    license_type: 'motorcycle',
    status: 'active',
    rating: 4.8,
    total_deliveries: 150,
    on_time_rate: 0.95,
  },
  {
    id: 'DRIVER-002',
    employee_id: 'EMP-R-002',
    first_name: 'สมหญิง',
    last_name: 'รักงาน',
    phone: '0992345678',
    email: 'rider2@deliverygenie.com',
    license_number: 'DL-23456789',
    license_type: 'motorcycle',
    status: 'active',
    rating: 4.9,
    total_deliveries: 200,
    on_time_rate: 0.97,
  },
  {
    id: 'DRIVER-003',
    employee_id: 'EMP-R-003',
    first_name: 'สมศักดิ์',
    last_name: 'ขยัน',
    phone: '0993456789',
    email: 'rider3@deliverygenie.com',
    license_number: 'DL-34567890',
    license_type: 'car',
    status: 'active',
    rating: 4.7,
    total_deliveries: 120,
    on_time_rate: 0.92,
  },
];

const mockUsers = [
  {
    id: 'USER-RIDER-001',
    email: 'rider1@deliverygenie.com',
    name: 'สมชาย ใจดี',
    password: 'password123', // Will be hashed
    role: 'rider',
    isActive: true,
  },
  {
    id: 'USER-RIDER-002',
    email: 'rider2@deliverygenie.com',
    name: 'สมหญิง รักงาน',
    password: 'password123',
    role: 'rider',
    isActive: true,
  },
  {
    id: 'USER-RIDER-003',
    email: 'rider3@deliverygenie.com',
    name: 'สมศักดิ์ ขยัน',
    password: 'password123',
    role: 'rider',
    isActive: true,
  },
  {
    id: 'USER-ADMIN-001',
    email: 'admin@deliverygenie.com',
    name: 'Admin User',
    password: 'admin123',
    role: 'admin',
    isActive: true,
  },
];

async function main() {
  console.log('🌱 Seeding Rider accounts...');

  // Seed Users (for authentication)
  for (const user of mockUsers) {
    const hashedPassword = await bcrypt.hash(user.password, 10);

    await prisma.users.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        password: hashedPassword,
        role: user.role,
        isActive: user.isActive,
        updated_at: new Date(),
      },
      create: {
        id: user.id,
        email: user.email,
        name: user.name,
        password: hashedPassword,
        role: user.role,
        isActive: user.isActive,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    console.log(`✅ Created/Updated user: ${user.email} (${user.role})`);
  }

  // Seed Drivers
  for (const rider of mockRiders) {
    await prisma.drivers.upsert({
      where: { id: rider.id },
      update: {
        employee_id: rider.employee_id,
        first_name: rider.first_name,
        last_name: rider.last_name,
        phone: rider.phone,
        email: rider.email,
        license_number: rider.license_number,
        license_type: rider.license_type,
        status: rider.status,
        rating: rider.rating,
        total_deliveries: rider.total_deliveries,
        on_time_rate: rider.on_time_rate,
        updated_at: new Date(),
      },
      create: {
        id: rider.id,
        employee_id: rider.employee_id,
        first_name: rider.first_name,
        last_name: rider.last_name,
        phone: rider.phone,
        email: rider.email,
        license_number: rider.license_number,
        license_type: rider.license_type,
        status: rider.status,
        rating: rider.rating,
        total_deliveries: rider.total_deliveries,
        on_time_rate: rider.on_time_rate,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    console.log(`✅ Created/Updated rider: ${rider.first_name} ${rider.last_name}`);
  }

  console.log('✨ Seeding completed!');
  console.log('\n📋 Login credentials:');
  console.log('Admin: admin@deliverygenie.com / admin123');
  console.log('Rider 1: rider1@deliverygenie.com / password123');
  console.log('Rider 2: rider2@deliverygenie.com / password123');
  console.log('Rider 3: rider3@deliverygenie.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
