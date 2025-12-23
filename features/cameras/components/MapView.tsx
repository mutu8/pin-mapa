'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Camera, CameraStatus, CameraType } from '../types/camera.types';
import { useCameras } from '../hooks/useCameras';
import CameraForm from './CameraForm';
import CameraList from './CameraList';
import FilterPanel from './FilterPanel';

// Fix para iconos de Leaflet en Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function MapView() {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const tempMarkerRef = useRef<L.Marker | null>(null);
  const isAddModeRef = useRef(false);
  
  const [filters, setFilters] = useState<{ type?: CameraType; status?: CameraStatus }>({});
  const { cameras, loading, createCamera, updateCamera, deleteCamera } = useCameras(filters);
  
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newMarkerPosition, setNewMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Trujillo ciudad, La Libertad, Perú
    const map = L.map(mapContainerRef.current).setView([-8.1116, -79.0288], 13);

    // Límites de Trujillo metropolitano
    const bounds = L.latLngBounds(
      [-8.20, -79.10],  // Suroeste
      [-8.00, -78.95]   // Noreste
    );
    map.setMaxBounds(bounds);
    map.setMinZoom(12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors | Trujillo, La Libertad',
      maxZoom: 19,
    }).addTo(map);

    // Capa de marcadores sin clustering
    const markers = L.layerGroup();
    map.addLayer(markers);

    markersLayerRef.current = markers;
    mapRef.current = map;

    // Click en el mapa para agregar cámara (solo en modo agregar)
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (!isAddModeRef.current) {
        // Si no está en modo agregar, solo cerrar formulario (no todo el panel)
        setIsFormOpen(false);
        setSelectedCamera(null);
        setNewMarkerPosition(null);
        
        // Remover marcador temporal si existe
        if (tempMarkerRef.current) {
          map.removeLayer(tempMarkerRef.current);
          tempMarkerRef.current = null;
        }
        return;
      }

      // Remover marcador temporal anterior si existe (permitir cambiar de posición)
      if (tempMarkerRef.current) {
        map.removeLayer(tempMarkerRef.current);
        tempMarkerRef.current = null;
      }

      // Crear marcador temporal con animación (más pequeño y distintivo)
      const tempIcon = L.divIcon({
        className: 'custom-temp-marker',
        html: `
          <div style="position: relative; width: 28px; height: 38px;">
            <svg width="28" height="38" viewBox="0 0 28 38" class="animate-pulse">
              <path d="M14 0C8.5 0 4 4.5 4 10c0 8 10 24 10 24s10-16 10-24c0-5.5-4.5-10-10-10z" 
                    fill="#3b82f6" 
                    stroke="white" 
                    stroke-width="3"/>
              <circle cx="14" cy="10" r="6" fill="#1d4ed8"/>
              <text x="14" y="14" 
                    text-anchor="middle" 
                    fill="white" 
                    font-size="12" 
                    font-weight="bold">+</text>
            </svg>
          </div>
        `,
        iconSize: [28, 38],
        iconAnchor: [14, 38],
      });

      const tempMarker = L.marker(e.latlng, { icon: tempIcon }).addTo(map);
      tempMarkerRef.current = tempMarker;

      // Actualizar posición (incluso si el formulario ya está abierto)
      setNewMarkerPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
      setSelectedCamera(null);
      
      // Si el formulario no está abierto, abrirlo
      if (!isFormOpen) {
        setIsFormOpen(true);
        setIsPanelOpen(true);
      }
      
      // Desactivar modo agregar solo después del primer click
      setIsAddMode(false);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Cambiar cursor según el modo
  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    isAddModeRef.current = isAddMode; // Actualizar ref
    
    if (isAddMode) {
      mapContainerRef.current.style.cursor = 'crosshair';
    } else {
      mapContainerRef.current.style.cursor = '';
    }
  }, [isAddMode]);

  // Actualizar marcadores cuando cambien las cámaras
  useEffect(() => {
    if (!markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    cameras.forEach(camera => {
      // Determinar color y estilo según estado con colores más distintivos
      const statusConfig = {
        [CameraStatus.ACTIVE]: { 
          bg: '#10b981', // Verde brillante
          border: '#059669',
          shadow: '0 2px 8px rgba(16, 185, 129, 0.6)',
          icon: '✓'
        },
        [CameraStatus.INACTIVE]: { 
          bg: '#6b7280', // Gris
          border: '#4b5563',
          shadow: '0 2px 8px rgba(107, 114, 128, 0.6)',
          icon: '○'
        },
        [CameraStatus.MAINTENANCE]: { 
          bg: '#f59e0b', // Naranja brillante
          border: '#d97706',
          shadow: '0 2px 8px rgba(245, 158, 11, 0.6)',
          icon: '⚙'
        },
        [CameraStatus.OFFLINE]: { 
          bg: '#ef4444', // Rojo brillante
          border: '#dc2626',
          shadow: '0 2px 8px rgba(239, 68, 68, 0.6)',
          icon: '✕'
        },
      };

      const config = statusConfig[camera.status];

      // Pin estilo lágrima invertida más compacto
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="position: relative; width: 28px; height: 38px;">
            <svg width="28" height="38" viewBox="0 0 28 38" style="filter: drop-shadow(${config.shadow})">
              <path d="M14 0C8.5 0 4 4.5 4 10c0 8 10 24 10 24s10-16 10-24c0-5.5-4.5-10-10-10z" 
                    fill="${config.bg}" 
                    stroke="white" 
                    stroke-width="2.5"/>
              <circle cx="14" cy="10" r="6" fill="${config.border}"/>
              <text x="14" y="14" 
                    text-anchor="middle" 
                    fill="white" 
                    font-size="10" 
                    font-weight="bold">${config.icon}</text>
            </svg>
          </div>
        `,
        iconSize: [28, 38],
        iconAnchor: [14, 38],
        popupAnchor: [0, -38],
      });

      const marker = L.marker([camera.lat, camera.lng], { icon });
      
      const statusLabels = {
        [CameraStatus.ACTIVE]: '🟢 Activa',
        [CameraStatus.INACTIVE]: '⚫ Inactiva',
        [CameraStatus.MAINTENANCE]: '🟡 Mantenimiento',
        [CameraStatus.OFFLINE]: '🔴 Fuera de línea',
      };

      const typeLabels = {
        [CameraType.FIXED]: '📹 Fija',
        [CameraType.PTZ]: '🔄 PTZ',
        [CameraType.DOME]: '⚫ Domo',
        [CameraType.BULLET]: '🔫 Bullet',
      };

      marker.bindPopup(`
        <div class="p-3 min-w-[200px]">
          <h3 class="font-bold text-lg mb-2 text-gray-800">${camera.name}</h3>
          <div class="space-y-1 text-sm">
            <div class="flex items-center gap-2">
              <span class="font-semibold">Tipo:</span>
              <span>${typeLabels[camera.type]}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="font-semibold">Estado:</span>
              <span>${statusLabels[camera.status]}</span>
            </div>
          </div>
          ${camera.notes ? `<p class="text-xs text-gray-600 mt-2 pt-2 border-t">${camera.notes}</p>` : ''}
        </div>
      `);

      marker.on('click', () => {
        // Siempre modo visualización al hacer click en marcador
        setSelectedCamera(camera);
        setNewMarkerPosition(null);
        setIsFormOpen(true);
        setIsViewMode(true);
        setIsPanelOpen(true);
        
        // Zoom máximo a la cámara
        if (mapRef.current) {
          mapRef.current.setView([camera.lat, camera.lng], 19);
        }
      });

      markersLayerRef.current!.addLayer(marker);
    });
  }, [cameras]);

  const handleCameraSelect = (camera: Camera) => {
    setSelectedCamera(camera);
    setNewMarkerPosition(null);
    setIsFormOpen(true);
    setIsViewMode(true); // Modo visualización desde la lista
    setIsPanelOpen(true); // Abrir panel
    
    if (mapRef.current) {
      mapRef.current.setView([camera.lat, camera.lng], 19); // Zoom máximo
    }
  };

  const handleFormClose = () => {
    // Guardar estado actual antes de limpiar
    const wasAddingNew = !selectedCamera && newMarkerPosition !== null;
    
    setIsFormOpen(false);
    setSelectedCamera(null);
    setNewMarkerPosition(null);
    setIsViewMode(false);
    
    // Si estaba agregando una nueva cámara, desactivar modo agregar y cerrar panel
    if (wasAddingNew) {
      setIsAddMode(false);
      isAddModeRef.current = false;
      setIsPanelOpen(false);
    }
    // Si estaba editando/viendo una cámara existente, mantener panel abierto
    
    // Remover marcador temporal
    if (tempMarkerRef.current && mapRef.current) {
      mapRef.current.removeLayer(tempMarkerRef.current);
      tempMarkerRef.current = null;
    }
  };

  const handlePanelClose = () => {
    // Si está agregando una cámara, pedir confirmación
    if (isFormOpen && newMarkerPosition !== null && !selectedCamera) {
      setShowCloseConfirm(true);
    } else {
      // Cerrar normalmente
      setIsPanelOpen(false);
      setIsFormOpen(false);
    }
  };

  const confirmClose = () => {
    // Cancelar todo el proceso de agregar
    setIsFormOpen(false);
    setSelectedCamera(null);
    setNewMarkerPosition(null);
    setIsAddMode(false);
    isAddModeRef.current = false;
    setIsViewMode(false);
    setIsPanelOpen(false);
    setShowCloseConfirm(false);
    
    // Remover marcador temporal
    if (tempMarkerRef.current && mapRef.current) {
      mapRef.current.removeLayer(tempMarkerRef.current);
      tempMarkerRef.current = null;
    }
  };

  return (
    <div className="flex h-full">
      {/* Mapa */}
      <div ref={mapContainerRef} className="flex-1 relative">
        {loading && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded shadow z-[1000]">
            Cargando cámaras...
          </div>
        )}
        
        {/* Botón para activar modo agregar */}
        <button
          onClick={() => setIsAddMode(!isAddMode)}
          disabled={isFormOpen}
          className={`absolute top-4 right-4 z-[1000] px-6 py-3 rounded-lg font-semibold shadow-lg transition-all transform ${
            isFormOpen 
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
              : isAddMode 
                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white animate-pulse hover:scale-105' 
                : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 hover:scale-105'
          }`}
        >
          {isAddMode ? '❌ Cancelar' : '➕ Agregar Cámara'}
        </button>

        {/* Indicador de modo agregar */}
        {isAddMode && (
          <div className="absolute top-20 right-4 z-[1000] bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg animate-bounce">
            📍 Haz click en el mapa
          </div>
        )}
      </div>

      {/* Panel lateral */}
      <div className={`bg-white shadow-lg overflow-y-auto flex flex-col transition-all duration-300 ${
        isPanelOpen ? 'w-96' : 'w-0'
      }`}>
        {isPanelOpen && (
          <>
            <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isFormOpen && (
                    <button
                      onClick={() => {
                        setIsFormOpen(false);
                        setSelectedCamera(null);
                        setNewMarkerPosition(null);
                        setIsViewMode(false);
                        
                        // Remover marcador temporal
                        if (tempMarkerRef.current && mapRef.current) {
                          mapRef.current.removeLayer(tempMarkerRef.current);
                          tempMarkerRef.current = null;
                        }
                      }}
                      className="text-gray-600 hover:text-gray-800 transition"
                      title="Volver a la lista"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}
                  <div>
                    <h1 className="text-2xl font-bold text-gray-800">🎥 Cámaras - Trujillo</h1>
                    <p className="text-sm text-gray-600 mt-1">
                      🖱️ Usa el botón "Agregar Cámara"
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      📍 Trujillo, La Libertad, Perú
                    </p>
                  </div>
                </div>
                <button
                  onClick={handlePanelClose}
                  className="text-gray-500 hover:text-gray-700 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <FilterPanel filters={filters} onChange={setFilters} />

            {isFormOpen && (
              <div className="p-4 border-b bg-blue-50">
                <CameraForm
                  camera={selectedCamera}
                  initialPosition={newMarkerPosition}
                  isViewOnly={isViewMode}
                  onSubmit={async (data) => {
                    if (selectedCamera) {
                      // Actualizar cámara existente - mantener panel abierto
                      await updateCamera(selectedCamera.id, data);
                      handleFormClose();
                    } else {
                      // Crear nueva cámara - cerrar todo
                      await createCamera(data as any);
                      setIsFormOpen(false);
                      setSelectedCamera(null);
                      setNewMarkerPosition(null);
                      setIsAddMode(false);
                      setIsViewMode(false);
                      setIsPanelOpen(false);
                      
                      if (tempMarkerRef.current && mapRef.current) {
                        mapRef.current.removeLayer(tempMarkerRef.current);
                        tempMarkerRef.current = null;
                      }
                    }
                  }}
                  onCancel={handleFormClose}
                  onDelete={selectedCamera ? async () => {
                    await deleteCamera(selectedCamera.id);
                    // Cerrar formulario pero mantener panel abierto
                    setIsFormOpen(false);
                    setSelectedCamera(null);
                    setNewMarkerPosition(null);
                    setIsAddMode(false);
                    setIsViewMode(false);
                    
                    // Remover marcador temporal
                    if (tempMarkerRef.current && mapRef.current) {
                      mapRef.current.removeLayer(tempMarkerRef.current);
                      tempMarkerRef.current = null;
                    }
                    // Panel permanece abierto para ver la lista
                  } : undefined}
                  onEdit={() => {
                    setIsViewMode(false);
                  }}
                />
              </div>
            )}

            <CameraList
              cameras={cameras}
              selectedCamera={selectedCamera}
              onSelectCamera={handleCameraSelect}
            />
          </>
        )}
      </div>

      {/* Botón flotante para abrir panel cuando está cerrado */}
      {!isPanelOpen && (
        <button
          onClick={() => setIsPanelOpen(true)}
          className="fixed right-4 bottom-4 z-[1000] bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Modal de confirmación para cerrar durante agregar */}
      {showCloseConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000]">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">⚠️ ¿Cancelar agregado?</h3>
            <p className="text-gray-600 mb-4">
              Estás agregando una nueva cámara. Si cierras ahora, se perderá el progreso.
            </p>
            <div className="flex gap-2">
              <button
                onClick={confirmClose}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium transition"
              >
                Sí, cancelar
              </button>
              <button
                onClick={() => setShowCloseConfirm(false)}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 font-medium transition"
              >
                Continuar agregando
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
