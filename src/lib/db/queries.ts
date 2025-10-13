// ===================================
// File: src/lib/db/queries.ts
// Database Queries
// ===================================

import { prisma } from './prisma';

// ===================================
// Order Queries
// ===================================

export async function getPendingOrders() {
  return await prisma.order.findMany({
    where: {
      order_status: 'pending',
      delivery_date: {
        gte: new Date()
      }
    },
    include: {
      customer: true,
      order_items: {
        include: {
          product: true
        }
      }
    },
    orderBy: {
      priority_score: 'desc'
    }
  });
}

export async function getOrderById(orderId: string) {
  return await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      order_items: {
        include: {
          product: true
        }
      },
      deliveries: {
        include: {
          driver: true,
          vehicle: true
        }
      }
    }
  });
}

export async function getOrdersByDeliveryDate(deliveryDate: Date) {
  return await prisma.order.findMany({
    where: {
      delivery_date: deliveryDate,
      order_status: {
        in: ['pending', 'assigned']
      }
    },
    include: {
      customer: true,
      order_items: {
        include: {
          product: true
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
  priorityBreakdown: any
) {
  return await prisma.order.update({
    where: { id: orderId },
    data: {
      priority_score: priorityScore,
      priority_class: priorityClass,
      priority_breakdown: priorityBreakdown
    }
  });
}

export async function updateOrderStatus(orderId: string, status: string) {
  return await prisma.order.update({
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
  return await prisma.customer.findUnique({
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
  return await prisma.customer.create({
    data
  });
}

// ===================================
// Product Queries
// ===================================

export async function getActiveProducts() {
  return await prisma.product.findMany({
    where: {
      is_active: true
    },
    orderBy: {
      name: 'asc'
    }
  });
}

export async function getProductsByCategory(category: string) {
  return await prisma.product.findMany({
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
  return await prisma.driver.findMany({
    where: {
      status: 'active'
    },
    orderBy: {
      rating: 'desc'
    }
  });
}

export async function getAvailableVehicles() {
  return await prisma.vehicle.findMany({
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
  return await prisma.delivery.create({
    data: {
      ...data,
      delivery_status: 'pending'
    },
    include: {
      order: {
        include: {
          customer: true,
          order_items: {
            include: {
              product: true
            }
          }
        }
      },
      driver: true,
      vehicle: true
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
  return await prisma.delivery.update({
    where: { id: deliveryId },
    data: {
      delivery_status: status,
      ...timestamps
    }
  });
}

export async function getDeliveriesByDriver(driverId: string, date?: Date) {
  const whereClause: any = {
    driver_id: driverId
  };

  if (date) {
    whereClause.created_at = {
      gte: new Date(date.setHours(0, 0, 0, 0)),
      lt: new Date(date.setHours(23, 59, 59, 999))
    };
  }

  return await prisma.delivery.findMany({
    where: whereClause,
    include: {
      order: {
        include: {
          customer: true,
          order_items: {
            include: {
              product: true
            }
          }
        }
      },
      vehicle: true
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
  const orders = await prisma.order.findMany({
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

  const ordersByStatus = orders.reduce((acc: any, order) => {
    acc[order.order_status] = (acc[order.order_status] || 0) + 1;
    return acc;
  }, {});

  const ordersByPriority = orders.reduce((acc: any, order) => {
    const priority = order.priority_class || 'unknown';
    acc[priority] = (acc[priority] || 0) + 1;
    return acc;
  }, {});

  return {
    totalOrders,
    totalRevenue,
    ordersByStatus,
    ordersByPriority,
    averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
  };
}
