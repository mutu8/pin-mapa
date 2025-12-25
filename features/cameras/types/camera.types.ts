/**
 * Camera model - Representa una cámara en el mapa
 */
export interface Camera {
  id: string;
  name: string;
  type: CameraType;
  status: CameraStatus;
  location?: string; // Ubicación/calle personalizable (ej: "Sebastián Llorente")
  notes?: string;
  lat: number;
  lng: number;
  stationId: string; // ID de la estación a la que pertenece
  createdAt: string;
  updatedAt: string;
}

export enum CameraType {
  FIXED = 'fixed',
  PTZ = 'ptz',
  DOME = 'dome',
  BULLET = 'bullet',
}

export enum CameraStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
  OFFLINE = 'offline',
}

/**
 * DTO para crear una cámara (sin id ni timestamps)
 */
export interface CreateCameraDto {
  name: string;
  type: CameraType;
  status: CameraStatus;
  location?: string;
  notes?: string;
  lat: number;
  lng: number;
  stationId: string;
}

/**
 * DTO para actualizar una cámara (campos opcionales)
 */
export interface UpdateCameraDto {
  name?: string;
  type?: CameraType;
  status?: CameraStatus;
  location?: string;
  notes?: string;
  lat?: number;
  lng?: number;
  stationId?: string;
}

/**
 * Filtros para búsqueda de cámaras
 */
export interface CameraFilters {
  type?: CameraType;
  status?: CameraStatus;
  location?: string;
  searchText?: string;
  stationId?: string;
}

/**
 * Genera un color consistente basado en un string (para ubicaciones)
 * Mismo string = mismo color siempre
 */
export function getLocationColor(location: string | undefined): { primary: string; secondary: string } {
  if (!location) {
    return { primary: '#6b7280', secondary: '#4b5563' }; // Gris por defecto
  }

  // Paleta de colores vibrantes para ubicaciones
  const colors = [
    { primary: '#8b5cf6', secondary: '#6d28d9' }, // Púrpura
    { primary: '#3b82f6', secondary: '#1d4ed8' }, // Azul
    { primary: '#10b981', secondary: '#047857' }, // Verde
    { primary: '#f59e0b', secondary: '#d97706' }, // Ámbar
    { primary: '#ef4444', secondary: '#b91c1c' }, // Rojo
    { primary: '#06b6d4', secondary: '#0e7490' }, // Cian
    { primary: '#14b8a6', secondary: '#0f766e' }, // Teal
    { primary: '#f97316', secondary: '#c2410c' }, // Naranja
    { primary: '#ec4899', secondary: '#be185d' }, // Rosa
    { primary: '#6366f1', secondary: '#4338ca' }, // Índigo
    { primary: '#a855f7', secondary: '#7e22ce' }, // Violeta
    { primary: '#22c55e', secondary: '#15803d' }, // Verde lima
  ];

  // Hash simple pero consistente del string
  let hash = 0;
  for (let i = 0; i < location.length; i++) {
    hash = ((hash << 5) - hash) + location.charCodeAt(i);
    hash = hash & hash; // Convertir a 32-bit integer
  }

  // Usar el hash para seleccionar un color
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}
