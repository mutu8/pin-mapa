import { Camera, CreateCameraDto, UpdateCameraDto, CameraFilters } from '../types/camera.types';

/**
 * Interface del repositorio de cámaras (patrón adapter)
 * Permite cambiar fácilmente entre localStorage, API, etc.
 */
export interface ICameraRepository {
  getAll(filters?: CameraFilters): Promise<Camera[]>;
  getById(id: string): Promise<Camera | null>;
  create(data: CreateCameraDto): Promise<Camera>;
  update(id: string, data: UpdateCameraDto): Promise<Camera>;
  delete(id: string): Promise<void>;
}
