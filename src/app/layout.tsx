import type { Metadata } from 'next';
import './globals.css';

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
        {children}
      </body>
    </html>
  );
}
