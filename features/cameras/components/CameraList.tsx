'use client';

import { useState, memo } from 'react';
import { Camera, CameraStatus, CameraType, getLocationColor } from '../types/camera.types';

interface CameraListProps {
  cameras: Camera[];
  selectedCamera: Camera | null;
  onSelectCamera: (camera: Camera) => void;
  onDeleteCamera: (camera: Camera) => void;
}

const statusConfig = {
  [CameraStatus.ACTIVE]: { emoji: '🟢', label: 'Activa', color: 'text-emerald-600' },
  [CameraStatus.INACTIVE]: { emoji: '⚫', label: 'Inactiva', color: 'text-slate-600' },
  [CameraStatus.MAINTENANCE]: { emoji: '🟡', label: 'Mantenimiento', color: 'text-amber-600' },
  [CameraStatus.OFFLINE]: { emoji: '🔴', label: 'Fuera de línea', color: 'text-rose-600' },
};

const typeConfig = {
  [CameraType.FIXED]: '📹',
  [CameraType.PTZ]: '🔄',
  [CameraType.DOME]: '⚫',
  [CameraType.BULLET]: '🔫',
};

function CameraList({ cameras, selectedCamera, onSelectCamera, onDeleteCamera }: CameraListProps) {
  const [cameraToDelete, setCameraToDelete] = useState<Camera | null>(null);
  
  const handleDelete = (e: React.MouseEvent, camera: Camera) => {
    e.stopPropagation(); // Evitar que se seleccione la cámara al eliminar
    setCameraToDelete(camera);
  };

  const confirmDelete = () => {
    if (cameraToDelete) {
      onDeleteCamera(cameraToDelete);
      setCameraToDelete(null);
    }
  };

  const cancelDelete = () => {
    setCameraToDelete(null);
  };
  if (cameras.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <div className="text-5xl mb-3">📹</div>
        <p className="font-medium">No hay cámaras aún</p>
        <p className="text-sm mt-1">Haz click en el mapa para agregar</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Modal de confirmación de eliminación */}
      {cameraToDelete && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] animate-fadeIn backdrop-blur-sm"
          onClick={cancelDelete}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icono de advertencia */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg 
                  className="w-8 h-8 text-red-600" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                  />
                </svg>
              </div>
            </div>

            {/* Título */}
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
              ¿Eliminar cámara?
            </h3>

            {/* Mensaje */}
            <p className="text-gray-600 text-center mb-2">
              Estás a punto de eliminar la cámara
            </p>
            <p className="font-semibold text-gray-900 text-center mb-6">
              "{cameraToDelete.name}"
            </p>

            {/* Información adicional */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-amber-800 text-center">
                ⚠️ Esta acción no se puede deshacer
              </p>
            </div>

            {/* Botones */}
            <div className="flex gap-3">
              <button
                onClick={cancelDelete}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium
                         hover:bg-gray-200 transition-colors duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium
                         hover:bg-red-700 transition-colors duration-200 shadow-lg shadow-red-500/30"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          Cámaras ({cameras.length})
        </h3>
        <div className="space-y-2">
          {cameras.map(camera => {
            const status = statusConfig[camera.status];
            const typeEmoji = typeConfig[camera.type];
            
            return (
              <div
                key={camera.id}
                onClick={() => onSelectCamera(camera)}
                className={`w-full text-left p-3 rounded-lg border-2 transition-all relative group cursor-pointer ${
                  selectedCamera?.id === camera.id
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50 hover:shadow'
                }`}
              >
                {/* Botón de eliminar */}
                <button
                  onClick={(e) => handleDelete(e, camera)}
                  className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full 
                           bg-white border-2 border-gray-200 text-gray-400 
                           opacity-0 group-hover:opacity-100 
                           hover:border-red-400 hover:bg-red-50 hover:text-red-600 
                           transition-all duration-200 shadow-sm hover:shadow-md z-10"
                  title="Eliminar cámara"
                  aria-label={`Eliminar ${camera.name}`}
                >
                  <svg 
                    className="w-4 h-4" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                    />
                  </svg>
                </button>
                
                <div className="flex items-start justify-between pr-8">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <span className="text-xl">{typeEmoji}</span>
                      {camera.name}
                    </h4>
                    <div className="text-xs text-gray-600 mt-2 space-y-1">
                      {camera.location && (
                        <div 
                          className="flex items-center gap-1.5 font-medium"
                          style={{ color: getLocationColor(camera.location).primary }}
                        >
                          <span>📍</span>
                          <span>{camera.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span className={`font-medium ${status.color}`}>{status.emoji}</span>
                        <span>{status.label}</span>
                      </div>
                      <div className="text-gray-500">
                        📍 {camera.lat.toFixed(4)}, {camera.lng.toFixed(4)}
                      </div>
                    </div>
                  </div>
                </div>
                {camera.notes && (
                  <p className="text-xs text-gray-600 mt-2 pt-2 border-t line-clamp-2 italic">
                    "{camera.notes}"
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default memo(CameraList);
