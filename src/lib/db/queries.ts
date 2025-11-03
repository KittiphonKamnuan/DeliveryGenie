// ===================================
// File: src/lib/db/queries.ts
// Database Queries
// ===================================

import { prisma } from '../db';
import type { Prisma } from '@prisma/client';

// ===================================
// Order Queries
// ===================================

export async function getPendingOrders() {
  return await prisma.orders.findMany({
    where: {
      order_status: 'pending',
      delivery_date: {
        gte: new Date()
      }
    },
    include: {
      customers: true,
      order_items: {
        include: {
          products: true
        }
      }
    },
    orderBy: {
      priority_score: 'desc'
    }
  });
}

export async function getOrderById(orderId: string) {
  return await prisma.orders.findUnique({
    where: { id: orderId },
    include: {
      customers: true,
      order_items: {
        include: {
          products: true
        }
      },
      deliveries: {
        include: {
          drivers: true,
          vehicles: true
        }
      }
    }
  });
}

export async function getOrdersByDeliveryDate(deliveryDate: Date) {
  return await prisma.orders.findMany({
    where: {
      delivery_date: deliveryDate,
      order_status: {
        in: ['pending', 'assigned']
      }
    },
    include: {
      customers: true,
      order_items: {
        include: {
          products: true
        }
      }
    },
    orderBy: [
      { priority_score: 'desc' },
      { delivery_window_end: 'asc' }
    ]
  });
}

export async function updateOrderPriority(
  orderId: string,
  priorityScore: number,
  priorityClass: string,
  priorityBreakdown: Prisma.InputJsonValue
) {
  return await prisma.orders.update({
    where: { id: orderId },
    data: {
      priority_score: priorityScore,
      priority_class: priorityClass,
      priority_breakdown: priorityBreakdown
    }
  });
}

export async function updateOrderStatus(orderId: string, status: string) {
  return await prisma.orders.update({
    where: { id: orderId },
    data: {
      order_status: status,
      updated_at: new Date()
    }
  });
}

// ===================================
// Customer Queries
// ===================================

export async function getCustomerByPhone(phone: string) {
  return await prisma.customers.findUnique({
    where: { phone },
    include: {
      orders: {
        orderBy: {
          created_at: 'desc'
        },
        take: 10
      }
    }
  });
}

export async function createCustomer(data: {
  name: string;
  phone: string;
  email?: string;
  address_line1: string;
  address_line2?: string;
  district: string;
  city: string;
  postal_code?: string;
  latitude: number;
  longitude: number;
  delivery_notes?: string;
}) {
  return await prisma.customers.create({
    data
  });
}

// ===================================
// Product Queries
// ===================================

export async function getActiveProducts() {
  return await prisma.products.findMany({
    where: {
      is_active: true
    },
    orderBy: {
      name: 'asc'
    }
  });
}

export async function getProductsByCategory(category: string) {
  return await prisma.products.findMany({
    where: {
      category,
      is_active: true
    },
    orderBy: {
      name: 'asc'
    }
  });
}

// ===================================
// Driver & Vehicle Queries
// ===================================

export async function getAvailableDrivers() {
  return await prisma.drivers.findMany({
    where: {
      status: 'active'
    },
    orderBy: {
      rating: 'desc'
    }
  });
}

export async function getAvailableVehicles() {
  return await prisma.vehicles.findMany({
    where: {
      current_status: 'available'
    },
    orderBy: {
      vehicle_type: 'asc'
    }
  });
}

// ===================================
// Delivery Queries
// ===================================

export async function createDelivery(data: {
  order_id: string;
  driver_id: string;
  vehicle_id: string;
  planned_arrival?: Date;
}) {
  // Generate unique delivery number
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const deliveryNumber = `DEL-${dateStr}-${randomNum}`;

  return await prisma.deliveries.create({
    data: {
      ...data,
      delivery_number: deliveryNumber,
      delivery_status: 'pending'
    },
    include: {
      orders: {
        include: {
          customers: true,
          order_items: {
            include: {
              products: true
            }
          }
        }
      },
      drivers: true,
      vehicles: true
    }
  });
}

export async function updateDeliveryStatus(
  deliveryId: string,
  status: string,
  timestamps?: {
    pickup_time?: Date;
    delivery_time?: Date;
    actual_arrival?: Date;
  }
) {
  return await prisma.deliveries.update({
    where: { id: deliveryId },
    data: {
      delivery_status: status,
      ...timestamps
    }
  });
}

export async function getDeliveriesByDriver(driverId: string, date?: Date) {
  const whereClause: {
    driver_id: string;
    created_at?: {
      gte: Date;
      lt: Date;
    };
  } = {
    driver_id: driverId
  };

  if (date) {
    whereClause.created_at = {
      gte: new Date(date.setHours(0, 0, 0, 0)),
      lt: new Date(date.setHours(23, 59, 59, 999))
    };
  }

  return await prisma.deliveries.findMany({
    where: whereClause,
    include: {
      orders: {
        include: {
          customers: true,
          order_items: {
            include: {
              products: true
            }
          }
        }
      },
      vehicles: true
    },
    orderBy: {
      created_at: 'desc'
    }
  });
}

// ===================================
// Statistics Queries
// ===================================

export async function getOrderStatistics(startDate: Date, endDate: Date) {
  const orders = await prisma.orders.findMany({
    where: {
      created_at: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      order_items: true
    }
  });

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => {
    return sum + order.order_items.reduce((itemSum, item) => {
      return itemSum + (item.unit_price * item.quantity);
    }, 0);
  }, 0);

  const ordersByStatus = orders.reduce((acc: Record<string, number>, order) => {
    acc[order.order_status] = (acc[order.order_status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const ordersByPriority = orders.reduce((acc: Record<string, number>, order) => {
    const priority = order.priority_class || 'unknown';
    acc[priority] = (acc[priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalOrders,
    totalRevenue,
    ordersByStatus,
    ordersByPriority,
    averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
  };
}
