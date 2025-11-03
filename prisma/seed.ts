// ===================================
// File: prisma/seed.ts
// Database Seeding Script
// ===================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...\n');

  // ============================================
  // 1. SEED USERS
  // ============================================
  console.log('👥 Seeding Users...');

  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@deliverygenie.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@deliverygenie.com',
      password: adminPassword,
      role: 'admin',
      isActive: true
    }
  });

  const normalUser = await prisma.user.upsert({
    where: { email: 'user@deliverygenie.com' },
    update: {},
    create: {
      name: 'Normal User',
      email: 'user@deliverygenie.com',
      password: userPassword,
      role: 'user',
      isActive: true
    }
  });

  console.log(`✅ Created users: ${adminUser.email} (${adminUser.role}), ${normalUser.email} (${normalUser.role})\n`);

  // ============================================
  // 2. SEED PRIORITY CONFIGURATIONS
  // ============================================
  console.log('📊 Seeding Priority Configurations...');

  const defaultConfig = await prisma.priorityConfig.upsert({
    where: { config_name: 'default' },
    update: {},
    create: {
      config_name: 'default',
      description: 'Standard priority calculation weights',
      weight_temperature: 0.30,
      weight_expiration: 0.25,
      weight_customer: 0.15,
      weight_value: 0.10,
      weight_time_window: 0.15,
      weight_fragility: 0.05,
      thresholds: {
        critical: 75,
        high: 60,
        medium: 40,
        low: 0
      },
      is_active: true
    }
  });

  const rushHourConfig = await prisma.priorityConfig.upsert({
    where: { config_name: 'rush_hour' },
    update: {},
    create: {
      config_name: 'rush_hour',
      description: 'Higher time window weight during rush hours',
      weight_temperature: 0.25,
      weight_expiration: 0.20,
      weight_customer: 0.15,
      weight_value: 0.10,
      weight_time_window: 0.25, // Increased!
      weight_fragility: 0.05,
      thresholds: {
        critical: 75,
        high: 60,
        medium: 40,
        low: 0
      },
      is_active: false
    }
  });

  console.log(`✅ Created configs: ${defaultConfig.config_name}, ${rushHourConfig.config_name}\n`);

  // ============================================
  // 2. SEED PRODUCTS
  // ============================================
  console.log('🛍️  Seeding Products...');

  const products = [
    // Hot Food
    {
      sku: 'HOT-001',
      name: 'ข้าวกล่องหมูกระเพรา',
      description: 'ข้าวราดหมูกระเพรา พร้อมไข่ดาว',
      category: 'hot_food',
      base_price: 65,
      temperature_requirement: 'hot',
      temp_min_celsius: 60,
      temp_max_celsius: 70,
      typical_expiration_hours: 3,
      is_fragile: false,
      weight_kg: 0.5,
      dimensions: { width: 15, height: 5, depth: 20 }
    },
    {
      sku: 'HOT-002',
      name: 'เกี๊ยวน้ำ',
      description: 'เกี๊ยวน้ำหมู 10 ชิ้น',
      category: 'hot_food',
      base_price: 55,
      temperature_requirement: 'hot',
      temp_min_celsius: 60,
      temp_max_celsius: 70,
      typical_expiration_hours: 3,
      is_fragile: false,
      weight_kg: 0.4
    },

    // Frozen
    {
      sku: 'FRZ-001',
      name: 'ไอศกรีมวานิลลา',
      description: 'ไอศกรีม Wall\'s 1 ลิตร',
      category: 'frozen',
      base_price: 178,
      temperature_requirement: 'frozen',
      temp_min_celsius: -18,
      temp_max_celsius: -15,
      typical_expiration_hours: 720, // 30 days
      is_fragile: false,
      weight_kg: 1.1
    },
    {
      sku: 'FRZ-002',
      name: 'พิซซ่าแช่แข็ง',
      description: 'พิซซ่าชีสเดนมาร์ก',
      category: 'frozen',
      base_price: 149,
      temperature_requirement: 'frozen',
      temp_min_celsius: -18,
      temp_max_celsius: -15,
      typical_expiration_hours: 2160, // 90 days
      is_fragile: false,
      weight_kg: 0.6
    },

    // Chilled
    {
      sku: 'CHL-001',
      name: 'แซนด์วิชไข่ทูน่า',
      description: 'แซนด์วิชไข่ผสมทูน่า',
      category: 'chilled',
      base_price: 90,
      temperature_requirement: 'chilled',
      temp_min_celsius: 0,
      temp_max_celsius: 4,
      typical_expiration_hours: 8,
      is_fragile: false,
      weight_kg: 0.2
    },
    {
      sku: 'CHL-002',
      name: 'นมสดเดนมาร์ก',
      description: 'นมสดพาสเจอร์ไรส์ 1 ลิตร',
      category: 'chilled',
      base_price: 65,
      temperature_requirement: 'chilled',
      temp_min_celsius: 0,
      temp_max_celsius: 4,
      typical_expiration_hours: 168, // 7 days
      is_fragile: false,
      weight_kg: 1.0
    },

    // Beverage
    {
      sku: 'BEV-001',
      name: 'น้ำดื่มสิงห์',
      description: 'น้ำดื่ม 600ml',
      category: 'beverage',
      base_price: 10,
      temperature_requirement: 'cool',
      temp_min_celsius: 15,
      temp_max_celsius: 20,
      typical_expiration_hours: 8760, // 1 year
      is_fragile: false,
      weight_kg: 0.6
    },
    {
      sku: 'BEV-002',
      name: 'โค้กกระป๋อง',
      description: 'Coca-Cola 325ml',
      category: 'beverage',
      base_price: 15,
      temperature_requirement: 'cool',
      temp_min_celsius: 15,
      temp_max_celsius: 20,
      typical_expiration_hours: 8760,
      is_fragile: false,
      weight_kg: 0.35
    },

    // Snack
    {
      sku: 'SNK-001',
      name: 'มาม่า 5 ห่อ',
      description: 'บะหมี่กึ่งสำเร็จรูป หมูสับ',
      category: 'snack',
      base_price: 125,
      temperature_requirement: 'ambient',
      typical_expiration_hours: 4320, // 6 months
      is_fragile: false,
      weight_kg: 0.3
    },
    {
      sku: 'SNK-002',
      name: 'เลย์ รสต้มยำกุ้ง',
      description: 'มันฝรั่งทอด 48g',
      category: 'snack',
      base_price: 20,
      temperature_requirement: 'ambient',
      typical_expiration_hours: 4320,
      is_fragile: true, // Chips can break!
      weight_kg: 0.05
    },

    // Medicine
    {
      sku: 'MED-001',
      name: 'พาราเซตามอล',
      description: 'ยาแก้ปวด ลดไข้ 10 เม็ด',
      category: 'medicine',
      base_price: 165,
      temperature_requirement: 'ambient',
      typical_expiration_hours: 17520, // 2 years
      is_fragile: true,
      weight_kg: 0.02
    },
    {
      sku: 'MED-002',
      name: 'ครีมทาแผล',
      description: 'ครีมปฏิชีวนะทาแผล 5g',
      category: 'medicine',
      base_price: 85,
      temperature_requirement: 'ambient',
      typical_expiration_hours: 17520,
      is_fragile: false,
      weight_kg: 0.01
    }
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {},
      create: product
    });
  }

  console.log(`✅ Created ${products.length} products\n`);

  // ============================================
  // 3. SEED STORES (Sample Bangkok locations)
  // ============================================
  console.log('🏪 Seeding Stores...');

  const stores = [
    {
      store_code: '7ELV-BKK-001',
      name: '7-Eleven',
      branch_name: 'สาขามหาวิทยาลัยธรรมศาสตร์ ศูนย์รังสิต',
      address: '99 ม.18 ถ.พหลโยธิน ต.คลองหนึ่ง อ.คลองหลวง',
      district: 'คลองหนึ่ง',
      city: 'ปทุมธานี',
      province: 'ปทุมธานี',
      postal_code: '12120',
      latitude: 13.9650,
      longitude: 100.5950,
      phone: '02-123-4567',
      is_24_hours: true,
      has_parking: true
    },
    {
      store_code: '7ELV-BKK-002',
      name: '7-Eleven',
      branch_name: 'สาขาสยามพารากอน',
      address: '991 ถ.พระราม 1 แขวงปทุมวัน',
      district: 'ปทุมวัน',
      city: 'กรุงเทพมหานคร',
      province: 'กรุงเทพมหานคร',
      postal_code: '10330',
      latitude: 13.7465,
      longitude: 100.5349,
      phone: '02-234-5678',
      is_24_hours: true,
      has_parking: true
    },
    {
      store_code: '7ELV-BKK-003',
      name: '7-Eleven',
      branch_name: 'สาขาเซ็นทรัลเวิลด์',
      address: '999/9 ถ.พระราม 1 แขวงปทุมวัน',
      district: 'ปทุมวัน',
      city: 'กรุงเทพมหานคร',
      province: 'กรุงเทพมหานคร',
      postal_code: '10330',
      latitude: 13.7467,
      longitude: 100.5395,
      phone: '02-345-6789',
      is_24_hours: true,
      has_parking: false
    },
    {
      store_code: '7ELV-BKK-004',
      name: '7-Eleven',
      branch_name: 'สาขาสนามบินสุวรรณภูมิ',
      address: '888 ม.1 ถ.บางนา-ตราด กม.45',
      district: 'ราชาเทวะ',
      city: 'บางพลี',
      province: 'สมุทรปราการ',
      postal_code: '10540',
      latitude: 13.6900,
      longitude: 100.7501,
      phone: '02-456-7890',
      is_24_hours: true,
      has_parking: true
    },
    {
      store_code: '7ELV-BKK-005',
      name: '7-Eleven',
      branch_name: 'สาขาเมกาบางนา',
      address: '39 ถ.บางนา-ตราด กม.8 แขวงบางนา',
      district: 'บางนา',
      city: 'กรุงเทพมหานคร',
      province: 'กรุงเทพมหานคร',
      postal_code: '10260',
      latitude: 13.6686,
      longitude: 100.6429,
      phone: '02-567-8901',
      is_24_hours: true,
      has_parking: true
    }
  ];

  for (const store of stores) {
    await prisma.store.upsert({
      where: { store_code: store.store_code },
      update: {},
      create: store
    });
  }

  console.log(`✅ Created ${stores.length} stores\n`);

  // ============================================
  // 4. SEED DRIVERS
  // ============================================
  console.log('🚗 Seeding Drivers...');

  const drivers = [
    {
      employee_id: 'DRV-001',
      first_name: 'สมชาย',
      last_name: 'ใจดี',
      phone: '0812345678',
      email: 'somchai@deliverygenie.com',
      license_number: 'LIC-12345678',
      license_type: 'B',
      rating: 4.8,
      total_deliveries: 1250,
      on_time_rate: 0.92
    },
    {
      employee_id: 'DRV-002',
      first_name: 'สมหญิง',
      last_name: 'รักงาน',
      phone: '0823456789',
      email: 'somying@deliverygenie.com',
      license_number: 'LIC-23456789',
      license_type: 'B',
      rating: 4.9,
      total_deliveries: 2100,
      on_time_rate: 0.95
    },
    {
      employee_id: 'DRV-003',
      first_name: 'วิชัย',
      last_name: 'มานะ',
      phone: '0834567890',
      email: 'wichai@deliverygenie.com',
      license_number: 'LIC-34567890',
      license_type: 'A',
      rating: 4.7,
      total_deliveries: 890,
      on_time_rate: 0.89
    }
  ];

  for (const driver of drivers) {
    await prisma.driver.upsert({
      where: { employee_id: driver.employee_id },
      update: {},
      create: driver
    });
  }

  console.log(`✅ Created ${drivers.length} drivers\n`);

  // ============================================
  // 5. SEED VEHICLES
  // ============================================
  console.log('🚛 Seeding Vehicles...');

  const vehicles = [
    {
      vehicle_number: 'VEH-001',
      vehicle_type: 'motorcycle',
      license_plate: 'กข-1234',
      temperature_zones: [
        { zone: 'hot', capacity: 20 },
        { zone: 'ambient', capacity: 30 }
      ],
      capacity_weight_kg: 50,
      capacity_volume_m3: 0.3,
      fuel_type: 'gasoline',
      fuel_efficiency: 35 // km/liter
    },
    {
      vehicle_number: 'VEH-002',
      vehicle_type: 'van',
      license_plate: 'คง-5678',
      temperature_zones: [
        { zone: 'frozen', capacity: 100 },
        { zone: 'chilled', capacity: 150 },
        { zone: 'ambient', capacity: 200 }
      ],
      capacity_weight_kg: 450,
      capacity_volume_m3: 2.5,
      fuel_type: 'diesel',
      fuel_efficiency: 12
    },
    {
      vehicle_number: 'VEH-003',
      vehicle_type: 'van',
      license_plate: 'จฉ-9012',
      temperature_zones: [
        { zone: 'hot', capacity: 80 },
        { zone: 'chilled', capacity: 120 },
        { zone: 'ambient', capacity: 150 }
      ],
      capacity_weight_kg: 400,
      capacity_volume_m3: 2.3,
      fuel_type: 'gasoline',
      fuel_efficiency: 10
    }
  ];

  for (const vehicle of vehicles) {
    await prisma.vehicle.upsert({
      where: { vehicle_number: vehicle.vehicle_number },
      update: {},
      create: vehicle
    });
  }

  console.log(`✅ Created ${vehicles.length} vehicles\n`);

  // ============================================
  // 6. SEED CUSTOMERS
  // ============================================
  console.log('👥 Seeding Customers...');

  const customers = [
    {
      name: 'บริษัท ABC จำกัด',
      phone: '0912345678',
      email: 'contact@abc.com',
      address_line1: '123 ถ.สุขุมวิท',
      district: 'คลองเตย',
      city: 'กรุงเทพมหานคร',
      postal_code: '10110',
      latitude: 13.7307,
      longitude: 100.5418,
      priority_level: 'high'
    },
    {
      name: 'คุณสมศรี ใจดี',
      phone: '0923456789',
      email: 'somsri@email.com',
      address_line1: '456 ถ.รัชดาภิเษก',
      district: 'ห้วยขวาง',
      city: 'กรุงเทพมหานคร',
      postal_code: '10310',
      latitude: 13.7631,
      longitude: 100.5749,
      priority_level: 'standard'
    },
    {
      name: 'โรงพยาบาล XYZ',
      phone: '0934567890',
      email: 'urgent@xyz-hospital.com',
      address_line1: '789 ถ.พระราม 9',
      district: 'ห้วยขวาง',
      city: 'กรุงเทพมหานคร',
      postal_code: '10310',
      latitude: 13.7596,
      longitude: 100.5686,
      priority_level: 'urgent',
      delivery_notes: 'ส่งที่แผนกฉุกเฉิน โทรหาเจ้าหน้าที่ก่อนส่ง'
    }
  ];

  for (const customer of customers) {
    await prisma.customer.upsert({
      where: { phone: customer.phone },
      update: {},
      create: customer
    });
  }

  console.log(`✅ Created ${customers.length} customers\n`);

  // ============================================
  // 7. SEED SAMPLE ORDERS
  // ============================================
  console.log('📦 Seeding Sample Orders...');

  // Get all products, customers, and stores
  const allProducts = await prisma.product.findMany();
  const allCustomers = await prisma.customer.findMany();
  const allStores = await prisma.store.findMany();

  if (allProducts.length === 0 || allCustomers.length === 0 || allStores.length === 0) {
    console.log('⚠️  Skipping orders - missing required data');
  } else {
    const now = new Date();

    // Order 1: Hot food - Critical priority
    const customer1 = allCustomers.find(c => c.priority_level === 'urgent') || allCustomers[0];
    const hotFood = allProducts.find(p => p.category === 'hot_food');
    const beverage = allProducts.find(p => p.category === 'beverage');

    const order1Total = (hotFood ? hotFood.base_price * 1 : 0) + (beverage ? beverage.base_price * 2 : 0);

    const order1 = await prisma.order.create({
      data: {
        order_number: `ORD-${Date.now()}-001`,
        customer_id: customer1.id,
        order_date: now,
        delivery_date: now,
        delivery_window_start: new Date(now.getTime() + 10 * 60000), // 10 min from now
        delivery_window_end: new Date(now.getTime() + 25 * 60000), // 25 min from now
        customer_priority: customer1.priority_level || 'standard',
        order_status: 'pending',
        delivery_address: customer1.address_line1,
        delivery_latitude: customer1.latitude,
        delivery_longitude: customer1.longitude,
        delivery_notes: 'อาหารร้อน ส่งด่วน',
        subtotal: order1Total,
        total_amount: order1Total,
      },
    });

    if (hotFood) {
      await prisma.orderItem.create({
        data: {
          order_id: order1.id,
          product_id: hotFood.id,
          quantity: 1,
          unit_price: hotFood.base_price,
          subtotal: hotFood.base_price * 1,
          expiration_datetime: new Date(now.getTime() + (hotFood.typical_expiration_hours || 24) * 3600000),
        },
      });
    }
    if (beverage) {
      await prisma.orderItem.create({
        data: {
          order_id: order1.id,
          product_id: beverage.id,
          quantity: 2,
          unit_price: beverage.base_price,
          subtotal: beverage.base_price * 2,
          expiration_datetime: new Date(now.getTime() + (beverage.typical_expiration_hours || 24) * 3600000),
        },
      });
    }

    // Order 2: Frozen items - High priority
    const customer2 = allCustomers.find(c => c.priority_level === 'high') || allCustomers[1];
    const frozen = allProducts.find(p => p.category === 'frozen');
    const order2Total = frozen ? frozen.base_price * 2 : 0;

    const order2 = await prisma.order.create({
      data: {
        order_number: `ORD-${Date.now()}-002`,
        customer_id: customer2.id,
        order_date: now,
        delivery_date: now,
        delivery_window_start: new Date(now.getTime() + 15 * 60000), // 15 min
        delivery_window_end: new Date(now.getTime() + 30 * 60000), // 30 min
        customer_priority: customer2.priority_level || 'standard',
        order_status: 'pending',
        delivery_address: customer2.address_line1,
        delivery_latitude: customer2.latitude,
        delivery_longitude: customer2.longitude,
        delivery_notes: 'มีไอศกรีม ระวังละลาย',
        subtotal: order2Total,
        total_amount: order2Total,
      },
    });

    if (frozen) {
      await prisma.orderItem.create({
        data: {
          order_id: order2.id,
          product_id: frozen.id,
          quantity: 2,
          unit_price: frozen.base_price,
          subtotal: frozen.base_price * 2,
          expiration_datetime: new Date(now.getTime() + (frozen.typical_expiration_hours || 24) * 3600000),
        },
      });
    }

    // Order 3: Chilled items - Medium priority
    const customer3 = allCustomers.find(c => c.priority_level === 'standard') || allCustomers[2];
    const chilled = allProducts.find(p => p.category === 'chilled');
    const order3Total = chilled ? chilled.base_price * 2 : 0;

    const order3 = await prisma.order.create({
      data: {
        order_number: `ORD-${Date.now()}-003`,
        customer_id: customer3.id,
        order_date: now,
        delivery_date: now,
        delivery_window_start: new Date(now.getTime() + 30 * 60000), // 30 min
        delivery_window_end: new Date(now.getTime() + 60 * 60000), // 60 min
        customer_priority: customer3.priority_level || 'standard',
        order_status: 'pending',
        delivery_address: customer3.address_line1,
        delivery_latitude: customer3.latitude,
        delivery_longitude: customer3.longitude,
        subtotal: order3Total,
        total_amount: order3Total,
      },
    });

    if (chilled) {
      await prisma.orderItem.create({
        data: {
          order_id: order3.id,
          product_id: chilled.id,
          quantity: 2,
          unit_price: chilled.base_price,
          subtotal: chilled.base_price * 2,
          expiration_datetime: new Date(now.getTime() + (chilled.typical_expiration_hours || 24) * 3600000),
        },
      });
    }

    // Order 4: Medicine - High priority (fragile)
    const medicine = allProducts.find(p => p.category === 'medicine');
    const order4Total = medicine ? medicine.base_price * 1 : 0;

    const order4 = await prisma.order.create({
      data: {
        order_number: `ORD-${Date.now()}-004`,
        customer_id: customer1.id,
        order_date: now,
        delivery_date: now,
        delivery_window_start: new Date(now.getTime() + 20 * 60000), // 20 min
        delivery_window_end: new Date(now.getTime() + 45 * 60000), // 45 min
        customer_priority: customer1.priority_level || 'standard',
        order_status: 'pending',
        delivery_address: customer1.address_line1,
        delivery_latitude: customer1.latitude,
        delivery_longitude: customer1.longitude,
        delivery_notes: 'ยา - ห้ามโยน',
        subtotal: order4Total,
        total_amount: order4Total,
      },
    });

    if (medicine) {
      await prisma.orderItem.create({
        data: {
          order_id: order4.id,
          product_id: medicine.id,
          quantity: 1,
          unit_price: medicine.base_price,
          subtotal: medicine.base_price * 1,
          expiration_datetime: new Date(now.getTime() + (medicine.typical_expiration_hours || 24) * 3600000),
        },
      });
    }

    // Order 5: Snacks - Low priority
    const snack = allProducts.find(p => p.category === 'snack');
    const order5Total = snack ? snack.base_price * 5 : 0;

    const order5 = await prisma.order.create({
      data: {
        order_number: `ORD-${Date.now()}-005`,
        customer_id: customer3.id,
        order_date: now,
        delivery_date: now,
        delivery_window_start: new Date(now.getTime() + 60 * 60000), // 60 min
        delivery_window_end: new Date(now.getTime() + 120 * 60000), // 120 min
        customer_priority: customer3.priority_level || 'standard',
        order_status: 'pending',
        delivery_address: customer3.address_line1,
        delivery_latitude: customer3.latitude,
        delivery_longitude: customer3.longitude,
        subtotal: order5Total,
        total_amount: order5Total,
      },
    });

    if (snack) {
      await prisma.orderItem.create({
        data: {
          order_id: order5.id,
          product_id: snack.id,
          quantity: 5,
          unit_price: snack.base_price,
          subtotal: snack.base_price * 5,
          expiration_datetime: new Date(now.getTime() + (snack.typical_expiration_hours || 24) * 3600000),
        },
      });
    }

    console.log(`✅ Created 5 sample orders\n`);

    // ===================================
    // Create Sample Deliveries
    // ===================================
    console.log('📦 Creating sample deliveries...');

    // Fetch drivers and vehicles from database
    const dbDrivers = await prisma.driver.findMany();
    const dbVehicles = await prisma.vehicle.findMany();
    const dbStores = await prisma.store.findMany();

    const allOrders = [order1, order2, order3, order4, order5];
    const deliveries = [];

    for (let i = 0; i < allOrders.length; i++) {
      const order = allOrders[i];
      const driver = dbDrivers[i % dbDrivers.length]; // Rotate through drivers
      const vehicle = dbVehicles[i % dbVehicles.length]; // Rotate through vehicles
      const store = dbStores[0]; // Use first store

      // Create delivery with varied statuses and timings
      const statuses = ['delivered', 'in_transit', 'delivered', 'delivered', 'pending'];
      const status = statuses[i];

      const pickupTime = new Date(order.order_date.getTime() + 5 * 60000); // 5 min after order
      const estimatedDuration = 15 + Math.floor(Math.random() * 15); // 15-30 min
      const actualDuration = status === 'delivered' ? estimatedDuration + Math.floor(Math.random() * 10) - 5 : null;
      const deliveryTime = status === 'delivered' && actualDuration
        ? new Date(pickupTime.getTime() + actualDuration * 60000)
        : null;

      const delay = status === 'delivered' && deliveryTime && order.delivery_window_end
        ? Math.max(0, Math.floor((deliveryTime.getTime() - order.delivery_window_end.getTime()) / 60000))
        : null;

      const delivery = await prisma.delivery.create({
        data: {
          delivery_number: `DEL-${Date.now()}-${String(i + 1).padStart(3, '0')}`,
          order_id: order.id,
          driver_id: driver.id,
          vehicle_id: vehicle.id,
          delivery_status: status,
          pickup_location: store.address,
          pickup_latitude: store.latitude,
          pickup_longitude: store.longitude,
          pickup_time: pickupTime,
          delivery_location: order.delivery_address,
          delivery_latitude: order.delivery_latitude,
          delivery_longitude: order.delivery_longitude,
          delivery_time: deliveryTime,
          estimated_distance_km: 5 + Math.random() * 10,
          actual_distance_km: status === 'delivered' ? 5 + Math.random() * 10 : null,
          estimated_duration_min: estimatedDuration,
          actual_duration_min: actualDuration,
          planned_arrival: new Date(pickupTime.getTime() + estimatedDuration * 60000),
          actual_arrival: deliveryTime,
          delay_minutes: delay,
        },
      });

      deliveries.push(delivery);
    }

    console.log(`✅ Created ${deliveries.length} sample deliveries\n`);
  }

  console.log('✨ Seeding completed successfully!\n');
  console.log('📊 Summary:');
  console.log(`   - ${products.length} Products`);
  console.log(`   - ${stores.length} Stores`);
  console.log(`   - ${drivers.length} Drivers`);
  console.log(`   - ${vehicles.length} Vehicles`);
  console.log(`   - ${customers.length} Customers`);
  console.log(`   - 5 Sample Orders`);
  console.log(`   - 5 Sample Deliveries`);
  console.log(`   - 2 Priority Configs\n`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
