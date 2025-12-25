import type { Metadata } from 'next';
import './globals.css';
import PageLoader from '@/components/PageLoader';

export const metadata: Metadata = {
  title: 'Gestión de Cámaras - Mapa',
  description: 'Sistema de gestión de cámaras en mapa interactivo',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased">
        <PageLoader />
        {children}
      </body>
    </html>
  );
}
