'use client';

import { useState, useEffect } from 'react';
import { Camera, CameraType, CameraStatus, CreateCameraDto, UpdateCameraDto } from '../types/camera.types';

interface CameraFormProps {
  camera?: Camera | null;
  initialPosition?: { lat: number; lng: number } | null;
  isViewOnly?: boolean;
  onSubmit: (data: CreateCameraDto | UpdateCameraDto) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
  onEdit?: () => void;
}

export default function CameraForm({ 
  camera, 
  initialPosition, 
  isViewOnly = false,
  onSubmit, 
  onCancel,
  onDelete,
  onEdit
}: CameraFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<CameraType>(CameraType.FIXED);
  const [status, setStatus] = useState<CameraStatus>(CameraStatus.ACTIVE);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Determinar si está en modo solo lectura
  const isReadOnly = isViewOnly && !isEditing;

  useEffect(() => {
    if (camera) {
      setName(camera.name);
      setType(camera.type);
      setStatus(camera.status);
      setNotes(camera.notes || '');
    } else {
      setName('');
      setType(CameraType.FIXED);
      setStatus(CameraStatus.ACTIVE);
      setNotes('');
    }
    // Resetear modo edición cuando cambia la vista
    setIsEditing(false);
  }, [camera, initialPosition, isViewOnly]); // Agregar initialPosition como dependencia

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (camera) {
        await onSubmit({ name, type, status, notes: notes || undefined });
      } else if (initialPosition) {
        await onSubmit({
          name,
          type,
          status,
          notes: notes || undefined,
          lat: initialPosition.lat,
          lng: initialPosition.lng,
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
        {isReadOnly ? '👁️ Detalles de Cámara' : camera ? '✏️ Editar Cámara' : '➕ Nueva Cámara'}
      </h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nombre *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={isReadOnly}
          className={`w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
          placeholder="Cámara Principal"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tipo *
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as CameraType)}
          required
          disabled={isReadOnly}
          className={`w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
        >
          <option value={CameraType.FIXED}>📹 Fija</option>
          <option value={CameraType.PTZ}>🔄 PTZ (Pan-Tilt-Zoom)</option>
          <option value={CameraType.DOME}>⚫ Domo</option>
          <option value={CameraType.BULLET}>🔫 Bullet</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Estado *
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as CameraStatus)}
          required
          disabled={isReadOnly}
          className={`w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
        >
          <option value={CameraStatus.ACTIVE}>🟢 Activa</option>
          <option value={CameraStatus.INACTIVE}>⚫ Inactiva</option>
          <option value={CameraStatus.MAINTENANCE}>🟡 Mantenimiento</option>
          <option value={CameraStatus.OFFLINE}>🔴 Fuera de línea</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notas
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          disabled={isReadOnly}
          className={`w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
          placeholder="Información adicional..."
        />
      </div>

      {(camera || initialPosition) && (
        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
          📍 Coordenadas: {camera?.lat.toFixed(6) || initialPosition?.lat.toFixed(6)}, {camera?.lng.toFixed(6) || initialPosition?.lng.toFixed(6)}
        </div>
      )}

      {isReadOnly ? (
        <>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 text-white px-4 py-2.5 rounded-lg hover:from-gray-700 hover:to-gray-800 font-medium transition-all shadow-md hover:shadow-lg"
            >
              ← Volver
            </button>
            {camera && onDelete && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 font-medium transition-all shadow-md hover:shadow-lg"
              >
                🗑️ Eliminar
              </button>
            )}
          </div>
          
          {/* Modal de confirmación */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000]">
              <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-2xl">
                <h3 className="text-lg font-bold text-gray-900 mb-2">⚠️ ¿Eliminar cámara?</h3>
                <p className="text-gray-600 mb-4">
                  Esta acción no se puede deshacer. Se eliminará permanentemente <strong>{camera?.name}</strong>.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      if (onDelete) onDelete();
                    }}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium transition"
                  >
                    Sí, eliminar
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 font-medium transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2.5 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-400 font-medium transition-all shadow-md hover:shadow-lg"
            >
              {submitting ? '⌛ Guardando...' : camera ? '✔️ Actualizar' : '➕ Crear Cámara'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 border-2 border-gray-300 rounded-lg hover:bg-gray-100 font-medium transition-all"
            >
              ❌ Cancelar
            </button>
            {camera && onDelete && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 font-medium transition-all shadow-md hover:shadow-lg"
              >
                🗑️
              </button>
            )}
          </div>
          
          {/* Modal de confirmación */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000]">
              <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-2xl">
                <h3 className="text-lg font-bold text-gray-900 mb-2">⚠️ ¿Eliminar cámara?</h3>
                <p className="text-gray-600 mb-4">
                  Esta acción no se puede deshacer. Se eliminará permanentemente <strong>{camera?.name}</strong>.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      if (onDelete) onDelete();
                    }}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium transition"
                  >
                    Sí, eliminar
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 font-medium transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </form>
  );
}
