// Seed mock products into database
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const mockProducts = [
  {
    id: 'prod-001',
    sku: 'FOOD-001',
    name: 'ข้าวผัดกุ้ง',
    description: 'ข้าวผัดกุ้งสด อร่อย',
    category: 'hot_food',
    base_price: 45,
    temperature_requirement: 'hot',
    typical_expiration_hours: 4,
    is_fragile: false,
    is_active: true,
  },
  {
    id: 'prod-002',
    sku: 'FOOD-002',
    name: 'ข้าวกะเพราหมูกรอบ',
    description: 'ข้าวกะเพราหมูกรอบ รสจัดจ้าน',
    category: 'hot_food',
    base_price: 49,
    temperature_requirement: 'hot',
    typical_expiration_hours: 4,
    is_fragile: false,
    is_active: true,
  },
  {
    id: 'prod-003',
    sku: 'FROZEN-001',
    name: 'ไอศกรีมวานิลลา',
    description: 'ไอศกรีมรสวานิลลา',
    category: 'frozen',
    base_price: 35,
    temperature_requirement: 'frozen',
    typical_expiration_hours: 720,
    is_fragile: false,
    is_active: true,
  },
  {
    id: 'prod-004',
    sku: 'DAIRY-001',
    name: 'นมสดพาสเจอไรส์',
    description: 'นมสดพาสเจอไรส์ สด สะอาด',
    category: 'chilled',
    base_price: 25,
    temperature_requirement: 'chilled',
    typical_expiration_hours: 168,
    is_fragile: false,
    is_active: true,
  },
  {
    id: 'prod-006',
    sku: 'BEV-006',
    name: 'น้ำดื่มเซเว่น 1.5L',
    description: 'น้ำดื่มบริสุทธิ์',
    category: 'beverage',
    base_price: 15,
    temperature_requirement: 'ambient',
    typical_expiration_hours: 8760,
    is_fragile: false,
    is_active: true,
  },
  {
    id: 'prod-008',
    sku: 'SNACK-008',
    name: "มันฝรั่งทอด Lay's",
    description: 'มันฝรั่งทอด กรอบอร่อย',
    category: 'snack',
    base_price: 22,
    temperature_requirement: 'ambient',
    typical_expiration_hours: 2160,
    is_fragile: true,
    is_active: true,
  },
  {
    id: 'prod-009',
    sku: 'MED-009',
    name: 'พาราเซตามอล',
    description: 'ยาแก้ปวด ลดไข้',
    category: 'medicine',
    base_price: 35,
    temperature_requirement: 'ambient',
    typical_expiration_hours: 17520,
    is_fragile: false,
    is_active: true,
  },
];

async function main() {
  console.log('🌱 Seeding mock products...');

  for (const product of mockProducts) {
    await prisma.products.upsert({
      where: { id: product.id },
      update: product,
      create: {
        ...product,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    console.log(`✅ Created/Updated: ${product.name}`);
  }

  console.log('✨ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
