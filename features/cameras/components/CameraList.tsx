'use client';

import { Camera, CameraStatus, CameraType, getLocationColor } from '../types/camera.types';

interface CameraListProps {
  cameras: Camera[];
  selectedCamera: Camera | null;
  onSelectCamera: (camera: Camera) => void;
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

export default function CameraList({ cameras, selectedCamera, onSelectCamera }: CameraListProps) {
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
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          Cámaras ({cameras.length})
        </h3>
        <div className="space-y-2">
          {cameras.map(camera => {
            const status = statusConfig[camera.status];
            const typeEmoji = typeConfig[camera.type];
            
            return (
              <button
                key={camera.id}
                onClick={() => onSelectCamera(camera)}
                className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                  selectedCamera?.id === camera.id
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50 hover:shadow'
                }`}
              >
                <div className="flex items-start justify-between">
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
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
