// ===================================
// NextAuth Type Definitions
// ===================================

import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      customer_id?: string;
      customer_phone?: string;
      driver_id?: string;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    image?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    customer_id?: string;
    customer_phone?: string;
    driver_id?: string;
  }
}
