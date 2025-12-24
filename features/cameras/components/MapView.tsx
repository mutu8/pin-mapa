'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Camera, CameraStatus, CameraType, getLocationColor } from '../types/camera.types';
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
  const markersMapRef = useRef<Map<string, L.Marker>>(new Map()); // Mapa de ID -> Marker
  
  const [filters, setFilters] = useState<{ type?: CameraType; status?: CameraStatus; location?: string }>({});
  const { cameras, allCameras, loading, createCamera, updateCamera, deleteCamera } = useCameras(filters);
  
  // Extraer ubicaciones únicas para autocompletado (de todas las cámaras)
  const availableLocations = Array.from(new Set(
    allCameras.map(c => c.location).filter(Boolean) as string[]
  )).sort();
  
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newMarkerPosition, setNewMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true); // Abierto por defecto
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showAutoHideNotice, setShowAutoHideNotice] = useState(false);
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Límites calculados exactamente desde los 8 puntos proporcionados
    // lat: -8.085936 (norte) a -8.112493 (sur)
    // lng: -79.040500 (oeste) a -78.990426 (este)
    const bounds = L.latLngBounds(
      [-8.113, -79.041],  // Suroeste más ajustado
      [-8.085, -78.990]   // Noreste más ajustado
    );

    // Crear el mapa con vista inicial en el centro del área
    const center = bounds.getCenter();
    const map = L.map(mapContainerRef.current).setView(center, 15);

    // Configuración optimizada para zoom out
    map.options.zoomAnimation = true;
    map.options.zoomAnimationThreshold = 4;
    map.options.fadeAnimation = true;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors | Zona Centro, Trujillo',
      maxZoom: 19,
      updateWhenIdle: true, // Solo actualizar cuando el mapa esté quieto
      updateWhenZooming: false, // No actualizar durante zoom
      keepBuffer: 1, // Reducido a 1 para mejor performance en zoom out
      noWrap: true, // Evitar tiles duplicados
      tileSize: 256,
    }).addTo(map);

    // Primero ajustar vista para ver todos los puntos
    map.fitBounds(bounds, { padding: [30, 30] });
    
    // Obtener el zoom que calcula fitBounds (el mínimo para ver todo)
    const calculatedZoom = map.getZoom();

    // Hacer zoom in a un nivel más cercano para iniciar
    map.setZoom(calculatedZoom + 1);

    // Aplicar límites
    map.setMaxBounds(bounds);
    map.setMinZoom(calculatedZoom); // El zoom mínimo es el que muestra todos los puntos
    map.options.maxBoundsViscosity = 1.0;
    map.options.maxBoundsViscosity = 1.0; // Límites "duros"

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
      
      // Si el formulario no está abierto, abrirlo en modo edición
      if (!isFormOpen) {
        setIsFormOpen(true);
        setIsPanelOpen(true);
        setIsViewMode(false); // Modo edición para agregar
      }
      
      // Desactivar modo agregar solo después del primer click
      setIsAddMode(false);
    });

    // Ocultar panel cuando se navega por el mapa
    map.on('dragstart', () => {
      if (isPanelOpen && !isFormOpen) {
        setIsPanelOpen(false);
      }
    });

    map.on('zoomstart', () => {
      if (isPanelOpen && !isFormOpen) {
        setIsPanelOpen(false);
      }
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

  // Memoizar función de creación de iconos
  const createMarkerIcon = useCallback((camera: Camera) => {
    const locationColors = getLocationColor(camera.location);
    const statusIcons = {
      [CameraStatus.ACTIVE]: '✓',
      [CameraStatus.INACTIVE]: '○',
      [CameraStatus.MAINTENANCE]: '⚙',
      [CameraStatus.OFFLINE]: '✕',
    };
    const icon = statusIcons[camera.status];
    const shadow = `0 2px 8px rgba(0, 0, 0, 0.4)`;

    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="position: relative; width: 28px; height: 38px;">
          <svg width="28" height="38" viewBox="0 0 28 38" 
               style="filter: drop-shadow(${shadow}); transition: all 0.3s ease;"
               class="marker-pin">
            <path d="M14 0C8.5 0 4 4.5 4 10c0 8 10 24 10 24s10-16 10-24c0-5.5-4.5-10-10-10z" 
                  fill="${locationColors.primary}" 
                  stroke="white" 
                  stroke-width="2.5"/>
            <circle cx="14" cy="10" r="6" fill="${locationColors.secondary}"/>
            <text x="14" y="14" 
                  text-anchor="middle" 
                  fill="white" 
                  font-size="10" 
                  font-weight="bold">${icon}</text>
          </svg>
          <style>
            .marker-pin:hover {
              filter: drop-shadow(0 4px 16px rgba(59, 130, 246, 0.8)) brightness(1.2);
              transform: scale(1.15);
            }
          </style>
        </div>
      `,
      iconSize: [28, 38],
      iconAnchor: [14, 38],
      popupAnchor: [0, -38],
    });
  }, []);

  // Actualizar marcadores cuando cambien las cámaras
  useEffect(() => {
    if (!markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    markersMapRef.current.clear();

    // Renderizar marcadores de forma progresiva para mejorar rendimiento
    const renderMarkers = () => {
      cameras.forEach((camera, index) => {
        // Usar requestIdleCallback para no bloquear el UI
        const scheduleRender = () => {
          const markerIcon = createMarkerIcon(camera);
          const marker = L.marker([camera.lat, camera.lng], { icon: markerIcon });
          
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

          const locationColors = getLocationColor(camera.location);

          marker.bindPopup(`
            <div class="p-3 min-w-[200px]">
              <h3 class="font-bold text-lg mb-2 text-gray-800">${camera.name}</h3>
              <div class="space-y-1 text-sm">
                ${camera.location ? `
                <div class="flex items-center gap-2">
                  <span class="font-semibold">Ubicación:</span>
                  <span style="color: ${locationColors.primary}; font-weight: 600;">📍 ${camera.location}</span>
                </div>
                ` : ''}
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

          marker.on('mouseover', () => marker.openPopup());
          marker.on('mouseout', () => marker.closePopup());
          marker.on('click', () => {
            if (mapRef.current) {
              mapRef.current.setView([camera.lat, camera.lng], 19);
            }
            marker.openPopup();
          });
          marker.on('contextmenu', (e) => {
            L.DomEvent.stopPropagation(e);
            if (confirm(`¿ Estás seguro de eliminar "${camera.name}"?\n\nEsta acción no se puede deshacer.`)) {
              deleteCamera(camera.id);
            }
          });

          markersMapRef.current.set(camera.id, marker);
          markersLayerRef.current!.addLayer(marker);
        };

        // Renderizar primeros 10 inmediatamente, resto de forma diferida
        if (index < 10) {
          scheduleRender();
        } else {
          setTimeout(scheduleRender, index * 5); // 5ms entre cada marcador
        }
      });
    };

    renderMarkers();
  }, [cameras, createMarkerIcon, deleteCamera]);

  const handleCameraSelect = (camera: Camera) => {
    // Hacer zoom a la cámara con animación suave
    if (mapRef.current) {
      mapRef.current.flyTo([camera.lat, camera.lng], 19, {
        duration: 1.0,
        easeLinearity: 0.25
      });
    }
    
    // Abrir el popup del marcador después de un pequeño delay para que termine la animación
    setTimeout(() => {
      const marker = markersMapRef.current.get(camera.id);
      if (marker) {
        marker.openPopup();
      }
    }, 1100); // Esperar a que termine la animación de flyTo
    
    // Resetear timer de auto-hide
    resetAutoHideTimer();
  };

  const handleCameraDelete = (camera: Camera) => {
    deleteCamera(camera.id);
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

  // Auto-ocultar panel después de 15 segundos de inactividad
  const resetAutoHideTimer = () => {
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
    }
    
    if (isPanelOpen && !isFormOpen) {
      autoHideTimerRef.current = setTimeout(() => {
        setShowAutoHideNotice(true);
        setTimeout(() => {
          setIsPanelOpen(false);
          setShowAutoHideNotice(false);
        }, 2000); // Mostrar notificación 2 segundos antes de ocultar
      }, 15000); // 15 segundos de inactividad
    }
  };

  // Resetear timer cuando hay interacción con el panel
  useEffect(() => {
    resetAutoHideTimer();
    return () => {
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
      }
    };
  }, [isPanelOpen, isFormOpen, cameras, filters]);

  // Reajustar tamaño del mapa cuando el panel se abre/cierra
  useEffect(() => {
    if (!mapRef.current) return;
    
    // Esperar a que termine la animación CSS (300ms) antes de reajustar
    const timer = setTimeout(() => {
      mapRef.current?.invalidateSize({ animate: false, pan: false });
    }, 350);

    return () => clearTimeout(timer);
  }, [isPanelOpen]);

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
      <div 
        className={`bg-white shadow-lg overflow-y-auto flex flex-col transition-all duration-300 ease-out ${
          isPanelOpen ? 'w-96' : 'w-0'
        }`}
        style={{ 
          willChange: isPanelOpen ? 'auto' : 'width',
          transform: 'translateZ(0)' // Force GPU acceleration
        }}
        onMouseEnter={resetAutoHideTimer}
        onMouseMove={resetAutoHideTimer}
        onClick={resetAutoHideTimer}
      >
        {isPanelOpen && (
          <>
            {/* Notificación sutil de auto-ocultado */}
            {showAutoHideNotice && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1100] animate-fade-in">
                <div className="bg-indigo-600 text-white px-4 py-2 rounded-full shadow-2xl text-sm flex items-center gap-2">
                  <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  Panel ocultándose...
                </div>
              </div>
            )}
            
            <div className="p-4 border-b bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white shadow-lg">
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
                      className="text-white hover:bg-white/20 p-2 rounded-lg transition-all"
                      title="Volver a la lista"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <span className="text-2xl">📹</span>
                    {isFormOpen ? 'Nueva Cámara' : 'Cámaras'}
                  </h2>
                </div>
                <button
                  onClick={handlePanelClose}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-all hover:rotate-90 duration-300"
                  title="Cerrar panel"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {!isFormOpen && (
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-sm text-indigo-100 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    {cameras.length} cámara{cameras.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>

            <FilterPanel filters={filters} cameras={cameras} allCameras={allCameras} onChange={setFilters} />

            {/* Formulario solo para agregar nuevas cámaras */}
            {isFormOpen && !selectedCamera && newMarkerPosition && (
              <div className="p-4 border-b bg-blue-50">
                <CameraForm
                  camera={null}
                  initialPosition={newMarkerPosition}
                  isViewOnly={false}
                  availableLocations={availableLocations}
                  onSubmit={async (data) => {
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
                  }}
                  onCancel={handleFormClose}
                />
              </div>
            )}

            <CameraList
              cameras={cameras}
              selectedCamera={selectedCamera}
              onSelectCamera={handleCameraSelect}
              onDeleteCamera={handleCameraDelete}
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
