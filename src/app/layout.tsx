import type { Metadata } from 'next';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import SessionProvider from '@/components/SessionProvider';
import { CartProvider } from '@/contexts/CartContext';

export const metadata: Metadata = {
  title: 'DeliveryGenie Priority System',
  description: 'ระบบจัดลำดับความสำคัญการจัดส่ง - 7-Eleven',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className="antialiased">
        <SessionProvider>
          <CartProvider>
            {children}
          </CartProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
