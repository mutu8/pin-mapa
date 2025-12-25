import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  
  // Compresión automática
  compress: true,
  
  // Optimizar imágenes
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  
  // SWC minification está habilitado por defecto en Next.js 15+
};

export default nextConfig;
