'use client';

import { CameraType, CameraStatus } from '../types/camera.types';

interface FilterPanelProps {
  filters: {
    type?: CameraType;
    status?: CameraStatus;
  };
  onChange: (filters: { type?: CameraType; status?: CameraStatus }) => void;
}

export default function FilterPanel({ filters, onChange }: FilterPanelProps) {
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

        {(filters.type || filters.status) && (
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
