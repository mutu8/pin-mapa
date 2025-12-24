'use client';

import { CameraType, CameraStatus, Camera, getLocationColor } from '../types/camera.types';

interface FilterPanelProps {
  filters: {
    type?: CameraType;
    status?: CameraStatus;
    location?: string;
  };
  cameras: Camera[]; // Cámaras filtradas (para el contador)
  allCameras: Camera[]; // Todas las cámaras sin filtrar (para la leyenda)
  onChange: (filters: { type?: CameraType; status?: CameraStatus; location?: string }) => void;
}

export default function FilterPanel({ filters, cameras, allCameras, onChange }: FilterPanelProps) {
  // Extraer ubicaciones únicas de TODAS las cámaras
  const uniqueLocations = Array.from(new Set(
    allCameras.map(c => c.location).filter(Boolean)
  )).sort();

  return (
    <div className="p-4 border-b bg-gray-50">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Filtros</h3>
      
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Tipo
          </label>
          <select
            value={filters.type || ''}
            onChange={(e) => onChange({ 
              ...filters, 
              type: e.target.value ? e.target.value as CameraType : undefined 
            })}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            <option value={CameraType.FIXED}>Fija</option>
            <option value={CameraType.PTZ}>PTZ</option>
            <option value={CameraType.DOME}>Domo</option>
            <option value={CameraType.BULLET}>Bullet</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Estado
          </label>
          <select
            value={filters.status || ''}
            onChange={(e) => onChange({ 
              ...filters, 
              status: e.target.value ? e.target.value as CameraStatus : undefined 
            })}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            <option value={CameraStatus.ACTIVE}>Activa</option>
            <option value={CameraStatus.INACTIVE}>Inactiva</option>
            <option value={CameraStatus.MAINTENANCE}>Mantenimiento</option>
            <option value={CameraStatus.OFFLINE}>Fuera de línea</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            📍 Ubicación
          </label>
          <select
            value={filters.location || ''}
            onChange={(e) => onChange({ 
              ...filters, 
              location: e.target.value || undefined 
            })}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas</option>
            {uniqueLocations.map(location => {
              const colors = getLocationColor(location);
              return (
                <option key={location} value={location}>
                  {location}
                </option>
              );
            })}
          </select>
          
          {/* Leyenda de colores de ubicaciones */}
          {uniqueLocations.length > 0 && (
            <div className="mt-2 p-2 bg-white rounded border border-gray-200">
              <p className="text-xs font-semibold text-gray-600 mb-2">Colores por ubicación:</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {uniqueLocations.map(location => {
                  const colors = getLocationColor(location);
                  const count = allCameras.filter(c => c.location === location).length;
                  return (
                    <div key={location} className="flex items-center gap-2 text-xs">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: colors.primary }}
                      />
                      <span className="truncate flex-1" title={location}>{location}</span>
                      <span className="text-gray-500">({count})</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {(filters.type || filters.status || filters.location) && (
          <button
            onClick={() => onChange({})}
            className="w-full text-xs text-blue-600 hover:text-blue-800 underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}
