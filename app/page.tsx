'use client';

import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/features/cameras/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="h-screen w-full flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando mapa...</p>
      </div>
    </div>
  ),
});

export default function HomePage() {
  return (
    <main className="h-screen w-full">
      <MapView />
    </main>
  );
}
