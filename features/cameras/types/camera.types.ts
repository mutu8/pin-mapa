/**
 * Camera model - Representa una cámara en el mapa
 */
export interface Camera {
  id: string;
  name: string;
  type: CameraType;
  status: CameraStatus;
  notes?: string;
  lat: number;
  lng: number;
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
  notes?: string;
  lat: number;
  lng: number;
}

/**
 * DTO para actualizar una cámara (campos opcionales)
 */
export interface UpdateCameraDto {
  name?: string;
  type?: CameraType;
  status?: CameraStatus;
  notes?: string;
  lat?: number;
  lng?: number;
}

/**
 * Filtros para búsqueda de cámaras
 */
export interface CameraFilters {
  type?: CameraType;
  status?: CameraStatus;
  searchText?: string;
}
