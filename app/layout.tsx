import type { Metadata } from 'next';
import DashboardLayout from '@/components/DashboardLayout';
import './globals.css';
import { Josefin_Sans } from 'next/font/google';

const josefin = Josefin_Sans({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'RKD Export PO Manager — Buyer Purchase Order System',
  description: 'Professional Export-grade Buyer Purchase Order management system for RKD Exports. Create, manage, and generate PDF purchase orders with Google Sheets integration.',
  keywords: ['Purchase Order', 'Export', 'RKD', 'Buyer PO', 'Handicrafts', 'Home Textiles'],
  authors: [{ name: 'RKD Exports' }],
  themeColor: '#0a0e1a',
  viewport: { width: 'device-width', initialScale: 1, maximumScale: 1 },
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: 'RKD Export PO Manager',
    description: 'Professional Buyer Purchase Order Management System',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={josefin.className}>
        <div className="page-wrapper">
          <DashboardLayout>
            {children}
          </DashboardLayout>
        </div>
      </body>
    </html>
  );
}
