'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Camera, CameraStatus, CameraType, getLocationColor } from '../types/camera.types';
import { useCameras } from '../hooks/useCameras';
import CameraForm from './CameraForm';
import CameraList from './CameraList';
import FilterPanel from './FilterPanel';
import StreetSearch from '@/components/StreetSearch';

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
  const searchMarkerRef = useRef<L.Marker | null>(null);
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
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showOutOfBoundsError, setShowOutOfBoundsError] = useState(false);
  const [showMapSearch, setShowMapSearch] = useState(true);
  const [isSearchExiting, setIsSearchExiting] = useState(false);
  const [isPanelExiting, setIsPanelExiting] = useState(false);
  const [lastInteractionTime, setLastInteractionTime] = useState(Date.now());
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Límites del área de trabajo en Trujillo
  const TRUJILLO_BOUNDS = L.latLngBounds(
    [-8.113, -79.041],  // Suroeste
    [-8.085, -78.990]   // Noreste
  );

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Límites calculados exactamente desde los 8 puntos proporcionados
    // lat: -8.085936 (norte) a -8.112493 (sur)
    // lng: -79.040500 (oeste) a -78.990426 (este)
    const bounds = TRUJILLO_BOUNDS;

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
    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (!isAddModeRef.current) {
        // Si no está en modo agregar, solo cerrar formulario (no todo el panel)
        setIsFormOpen(false);
        setSelectedCamera(null);
        setNewMarkerPosition(null);
        
        // Remover marcador temporal si existe
        if (tempMarkerRef.current && map) {
          map.removeLayer(tempMarkerRef.current);
          tempMarkerRef.current = null;
        }
        return;
      }

      // Remover marcador de búsqueda si existe
      if (searchMarkerRef.current && map) {
        map.removeLayer(searchMarkerRef.current);
        searchMarkerRef.current = null;
      }

      // Remover marcador temporal anterior si existe (permitir cambiar de posición)
      if (tempMarkerRef.current && map) {
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
      
      // Abrir formulario y panel
      setIsFormOpen(true);
      setIsPanelOpen(true);
      setIsViewMode(false);
      
      // Desactivar modo agregar después del click
      setIsAddMode(false);
      isAddModeRef.current = false;
    };

    map.on('click', handleMapClick);

    return () => {
      if (map) {
        map.off('click', handleMapClick);
        map.remove();
      }
      mapRef.current = null;
    };
  }, []);

  // Manejador para cuando se selecciona una ubicación en el buscador
  const handleSelectLocation = useCallback((lat: number, lon: number) => {
    const map = mapRef.current;
    if (!map || !map.getContainer()) return;

    // Validar que la ubicación esté dentro de los límites permitidos
    if (!TRUJILLO_BOUNDS.contains([lat, lon])) {
      setShowOutOfBoundsError(true);
      // Ocultar mensaje después de 4 segundos
      setTimeout(() => {
        setShowOutOfBoundsError(false);
      }, 4000);
      return;
    }

    try {
      // Si el modal de búsqueda está abierto (modo agregar cámara potencial)
      if (showSearchModal) {
        // Cerrar modal de búsqueda PRIMERO
        setShowSearchModal(false);
        
        // Activar modo agregar AHORA (después de cerrar modal)
        setIsAddMode(true);
        isAddModeRef.current = true;
        
        // Pequeño delay para que el modal se cierre antes del flyTo
        setTimeout(() => {
          // Volar al punto
          map.flyTo([lat, lon], 17, {
            duration: 1.5,
            easeLinearity: 0.25
          });

          // Remover marcador de búsqueda anterior si existe
          if (searchMarkerRef.current) {
            map.removeLayer(searchMarkerRef.current);
            searchMarkerRef.current = null;
          }

          // Crear marcador RGB temporal
          const searchIcon = L.divIcon({
            className: 'custom-search-marker',
            html: `
              <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
                <div class="search-marker-pulse"></div>
                <svg width="24" height="24" viewBox="0 0 24 24" style="position: relative; z-index: 2; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
                  <circle cx="12" cy="12" r="10" fill="white" stroke="#4f46e5" stroke-width="2"/>
                  <circle cx="12" cy="12" r="4" fill="#4f46e5"/>
                </svg>
              </div>
              <style>
                @keyframes rgbPulse {
                  0%, 100% { 
                    box-shadow: 0 0 20px 5px rgba(79, 70, 229, 0.6),
                                0 0 40px 10px rgba(139, 92, 246, 0.4),
                                0 0 60px 15px rgba(167, 139, 250, 0.2);
                  }
                  50% { 
                    box-shadow: 0 0 30px 8px rgba(139, 92, 246, 0.8),
                                0 0 50px 15px rgba(167, 139, 250, 0.6),
                                0 0 70px 20px rgba(196, 181, 253, 0.3);
                  }
                }
                .search-marker-pulse {
                  position: absolute;
                  width: 100%;
                  height: 100%;
                  border-radius: 50%;
                  background: radial-gradient(circle, rgba(79, 70, 229, 0.3) 0%, transparent 70%);
                  animation: rgbPulse 2s ease-in-out infinite;
                }
              </style>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
          });

          const searchMarker = L.marker([lat, lon], { icon: searchIcon }).addTo(map);
          searchMarkerRef.current = searchMarker;

          // Remover marcador después de 6 segundos
          setTimeout(() => {
            if (searchMarkerRef.current) {
              map.removeLayer(searchMarkerRef.current);
              searchMarkerRef.current = null;
            }
          }, 6000);
        }, 100); // Delay de 100ms para cerrar modal primero
        
        return;
      } else {
        // Modo normal: solo volar y mostrar marcador (SIN abrir panel, SIN colocar pin)
        map.flyTo([lat, lon], 17, {
          duration: 1.5,
          easeLinearity: 0.25
        });

        // Remover marcador de búsqueda anterior si existe
        if (searchMarkerRef.current) {
          map.removeLayer(searchMarkerRef.current);
          searchMarkerRef.current = null;
        }

        // Modo normal: crear marcador visual temporal con efecto RGB
        const searchIcon = L.divIcon({
          className: 'custom-search-marker',
          html: `
            <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
              <div class="search-marker-pulse"></div>
              <svg width="24" height="24" viewBox="0 0 24 24" style="position: relative; z-index: 2; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
                <circle cx="12" cy="12" r="10" fill="white" stroke="#4f46e5" stroke-width="2"/>
                <circle cx="12" cy="12" r="4" fill="#4f46e5"/>
              </svg>
            </div>
            <style>
              @keyframes rgbPulse {
                0%, 100% { 
                  box-shadow: 0 0 20px 5px rgba(79, 70, 229, 0.6),
                              0 0 40px 10px rgba(139, 92, 246, 0.4),
                              0 0 60px 15px rgba(167, 139, 250, 0.2);
                }
                50% { 
                  box-shadow: 0 0 30px 8px rgba(139, 92, 246, 0.8),
                              0 0 50px 15px rgba(167, 139, 250, 0.6),
                              0 0 70px 20px rgba(196, 181, 253, 0.3);
                }
              }
              .search-marker-pulse {
                position: absolute;
                width: 100%;
                height: 100%;
                border-radius: 50%;
                background: radial-gradient(circle, rgba(79, 70, 229, 0.3) 0%, transparent 70%);
                animation: rgbPulse 2s ease-in-out infinite;
              }
            </style>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });

        const searchMarker = L.marker([lat, lon], { icon: searchIcon }).addTo(map);
        searchMarkerRef.current = searchMarker;

        // Remover marcador después de 4 segundos con fade
        setTimeout(() => {
          if (searchMarkerRef.current) {
            map.removeLayer(searchMarkerRef.current);
            searchMarkerRef.current = null;
          }
        }, 4000);
      }
    } catch (error) {
      console.error('Error al centrar el mapa:', error);
    }
  }, [showSearchModal]);

  // Callback para notificar interacción del usuario
  const handleSearchInteraction = useCallback(() => {
    setLastInteractionTime(Date.now());
  }, []);

  // Función para ocultar con animación
  const hideMapSearch = useCallback(() => {
    setIsSearchExiting(true);
    setTimeout(() => {
      setShowMapSearch(false);
      setIsSearchExiting(false);
    }, 250); // Duración de la animación
  }, []);

  // Función para ocultar panel con animación
  const hidePanel = useCallback(() => {
    setIsPanelExiting(true);
    setTimeout(() => {
      setIsPanelOpen(false);
      setIsPanelExiting(false);
    }, 250); // Duración de la animación
  }, []);

  // Manejar eventos de navegación del mapa (drag/zoom) para ocultar panel
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleDragStart = () => {
      // NO cerrar panel si está en modo agregar o si el modal de búsqueda está abierto
      if (isPanelOpen && !isFormOpen && !isAddMode && !showSearchModal) {
        hidePanel();
      }
    };

    const handleZoomStart = () => {
      // NO cerrar panel si está en modo agregar o si el modal de búsqueda está abierto
      if (isPanelOpen && !isFormOpen && !isAddMode && !showSearchModal) {
        hidePanel();
      }
    };

    map.on('dragstart', handleDragStart);
    map.on('zoomstart', handleZoomStart);

    return () => {
      if (map) {
        map.off('dragstart', handleDragStart);
        map.off('zoomstart', handleZoomStart);
      }
    };
  }, [isPanelOpen, isFormOpen, isAddMode, showSearchModal, hidePanel]);

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
      hidePanel();
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
      hidePanel();
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
    hidePanel();
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
          hidePanel();
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
  }, [isPanelOpen, isFormOpen, cameras, filters, hidePanel]);

  // Reajustar tamaño del mapa cuando el panel se abre/cierra
  useEffect(() => {
    if (!mapRef.current) return;
    
    // Esperar a que termine la animación CSS (300ms) antes de reajustar
    const timer = setTimeout(() => {
      mapRef.current?.invalidateSize({ animate: false, pan: false });
    }, 350);

    return () => clearTimeout(timer);
  }, [isPanelOpen]);

  // Auto-ocultar buscador del mapa después de 8 segundos de inactividad
  useEffect(() => {
    if (!showMapSearch) return;

    const checkInactivity = () => {
      const now = Date.now();
      const timeSinceLastInteraction = now - lastInteractionTime;
      
      if (timeSinceLastInteraction >= 8000) {
        hideMapSearch();
      }
    };

    // Verificar cada segundo si han pasado 8 segundos sin interacción
    const interval = setInterval(checkInactivity, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [showMapSearch, lastInteractionTime, hideMapSearch]);

  return (
    <div className="flex h-full">
      {/* Mapa */}
      <div ref={mapContainerRef} className="flex-1 relative">
        {loading && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white px-6 py-4 rounded-2xl shadow-2xl z-[1000] animate-scaleIn border-2 border-indigo-100">
            <div className="flex items-center gap-4">
              <div className="widget-spinner"></div>
              <span className="text-indigo-900 font-semibold">Cargando cámaras...</span>
            </div>
          </div>
        )}

        {/* Mensaje de error fuera de rango (en el mapa) */}
        {showOutOfBoundsError && !showSearchModal && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-[1000] animate-slideInTop">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="font-semibold">Ubicación fuera del área permitida</span>
            </div>
          </div>
        )}

        {/* Buscador flotante de navegación - centrado */}
        {showMapSearch && (
          <div className={`absolute top-4 sm:top-4 md:top-4 left-1/2 transform -translate-x-1/2 z-[1100] w-96 max-w-[calc(100vw-2rem)] ${
            isSearchExiting ? 'animate-fadeOutScale' : 'animate-slideInTop'
          }`}
            style={{ marginTop: 'max(1rem, env(safe-area-inset-top))' }}
          >
            <StreetSearch 
              onSelectLocation={handleSelectLocation}
              onInteraction={handleSearchInteraction}
            />
          </div>
        )}
        

        


        {/* Indicador de modo agregar */}
        {isAddMode && (
          <div className="fixed right-20 bottom-20 z-[1000] bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg animate-slideInRight">
            <span className="animate-bounce inline-block">📍</span> Haz click en el mapa
          </div>
        )}

        {/* Modal de búsqueda de calles */}
        {showSearchModal && (
          <div 
            className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn"
            onClick={(e) => {
              // Solo cerrar si se hace click en el backdrop
              if (e.target === e.currentTarget) {
                setShowSearchModal(false);
              }
            }}
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden animate-slideUp"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header del modal */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Buscar Ubicación</h3>
                    <p className="text-indigo-100 text-sm">Encuentra la calle para tu cámara</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSearchModal(false)}
                  className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Contenido del modal */}
              <div className="p-6">
                {/* Mensaje de error si está fuera de rango */}
                {showOutOfBoundsError && (
                  <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg animate-fadeIn">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div className="text-sm text-red-900">
                        <p className="font-semibold">Ubicación fuera del área de trabajo</p>
                        <p className="mt-1 text-red-700">La ubicación seleccionada está fuera del área permitida en Trujillo. Por favor, busca una dirección dentro de la zona Centro.</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <StreetSearch onSelectLocation={handleSelectLocation} />
                </div>

                <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r-lg">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-indigo-900">
                      <p className="font-semibold mb-1">¿Cómo funciona?</p>
                      <ol className="list-decimal list-inside space-y-1 text-indigo-700">
                        <li>Busca la calle donde quieres colocar la cámara</li>
                        <li>El mapa se centrará en esa ubicación con un marcador RGB</li>
                        <li>Luego haz <strong>click en el mapa</strong> para colocar la cámara exactamente donde quieras</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => {
                      setShowSearchModal(false);
                      // Activar modo agregar cuando cierra el modal
                      setIsAddMode(true);
                      isAddModeRef.current = true;
                    }}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
                  >
                    Continuar sin buscar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Panel lateral */}
      <div 
        className={`bg-white shadow-lg overflow-y-auto flex flex-col transition-all duration-500 ease-in-out ${
          isPanelOpen ? (isPanelExiting ? 'w-96 animate-fadeOutScale' : 'w-96 animate-slideInRight') : 'w-0'
        }`}
        style={{ 
          willChange: isPanelOpen ? 'auto' : 'width',
          transform: isPanelOpen ? 'translateX(0)' : 'translateX(100%)',
          opacity: isPanelOpen ? 1 : 0
        }}
        onMouseEnter={resetAutoHideTimer}
        onMouseMove={resetAutoHideTimer}
        onClick={resetAutoHideTimer}
      >
        {isPanelOpen && (
          <>
            {/* Notificación sutil de auto-ocultado */}
            {showAutoHideNotice && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1100] animate-slideInTop">
                <div className="bg-indigo-600 text-white px-4 py-2 rounded-full shadow-2xl text-sm flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="currentColor" viewBox="0 0 20 20">
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

      {/* Grupo de botones flotantes - esquina inferior derecha */}
      {!isPanelOpen && (
        <div className="fixed right-4 bottom-4 z-[1000] flex flex-col gap-3 items-end">
          
          {/* Botón de búsqueda */}
          {!showMapSearch && (
            <button
              onClick={() => {
                setShowMapSearch(true);
                setLastInteractionTime(Date.now());
              }}
              className="bg-white hover:bg-white w-12 h-12 rounded-full shadow-lg hover:shadow-2xl 
                         transition-all duration-300 flex items-center justify-center group 
                         border-2 border-transparent hover:border-indigo-200 relative overflow-hidden animate-scaleIn"
              title="Buscar ubicación"
            >
              <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 
                            bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 animate-pulse"></div>
              <svg className="w-6 h-6 text-indigo-600 group-hover:text-indigo-700 group-hover:scale-110 transition-all relative z-10" 
                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          )}

          {/* Botón para activar modo agregar */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!isAddMode) {
                setShowSearchModal(true);
              } else {
                setIsAddMode(false);
                isAddModeRef.current = false;
                setShowSearchModal(false);
              }
            }}
            disabled={isFormOpen}
            className={`w-12 h-12 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center 
                       relative overflow-hidden group animate-scaleIn
                       ${isFormOpen 
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : isAddMode 
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white animate-pulse hover:scale-110 hover:shadow-2xl' 
                  : 'bg-white hover:bg-white border-2 border-transparent hover:border-blue-200 hover:scale-110 hover:shadow-2xl'
            }`}
            title={isAddMode ? 'Cancelar' : 'Agregar cámara'}
          >
            {!isAddMode && (
              <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 
                            bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-teal-500/20 animate-pulse"></div>
            )}
            {isAddMode ? (
              <svg className="w-6 h-6 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-blue-600 group-hover:text-blue-700 group-hover:scale-110 transition-all relative z-10" 
                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            )}
          </button>

          {/* Botón para abrir panel si está cerrado */}
          <button
            onClick={() => setIsPanelOpen(true)}
            className="bg-white hover:bg-white w-12 h-12 rounded-full shadow-lg hover:shadow-2xl 
                       transition-all duration-300 flex items-center justify-center group 
                       border-2 border-transparent hover:border-purple-200 relative overflow-hidden hover:scale-110 animate-scaleIn"
            title="Abrir menú"
          >
            <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 
                          bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-red-500/20 animate-pulse"></div>
            <svg className="w-6 h-6 text-purple-600 group-hover:text-purple-700 group-hover:scale-110 transition-all relative z-10" 
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
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
