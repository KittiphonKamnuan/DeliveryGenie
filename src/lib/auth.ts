// ===================================
// NextAuth Configuration
// ===================================

import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text', placeholder: 'user@example.com or phone' },
        phone: { label: 'Phone', type: 'tel', placeholder: '0812345678' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if ((!credentials?.email && !credentials?.phone) || !credentials?.password) {
          throw new Error('กรุณากรอกข้อมูลและรหัสผ่าน');
        }

        // Support both email and phone login
        const identifier = credentials.phone || credentials.email;

        const user = await prisma.users.findFirst({
          where: { email: identifier }
        });

        if (!user) {
          throw new Error('ไม่พบผู้ใช้งานนี้ในระบบ');
        }

        if (!user.isActive) {
          throw new Error('บัญชีผู้ใช้ถูกปิดการใช้งาน');
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error('รหัสผ่านไม่ถูกต้อง');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.image
        };
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;

        // If user is a customer, fetch customer_id from customers table
        if (user.role === 'customer') {
          const customer = await prisma.customers.findFirst({
            where: { phone: user.email } // email field stores phone for customers
          });
          if (customer) {
            token.customer_id = customer.id;
            token.customer_phone = customer.phone;
          }
        }

        // If user is a driver, fetch driver_id from drivers table
        if (user.role === 'rider') {
          const driver = await prisma.drivers.findFirst({
            where: { phone: user.email }
          });
          if (driver) {
            token.driver_id = driver.id;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;

        // Add customer_id to session for customer users
        if (token.customer_id) {
          session.user.customer_id = token.customer_id as string;
          session.user.customer_phone = token.customer_phone as string;
        }

        // Add driver_id to session for rider users
        if (token.driver_id) {
          session.user.driver_id = token.driver_id as string;
        }
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};
