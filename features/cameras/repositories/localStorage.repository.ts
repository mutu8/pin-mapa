import { v4 as uuidv4 } from 'uuid';
import { Camera, CreateCameraDto, UpdateCameraDto, CameraFilters } from '../types/camera.types';
import { ICameraRepository } from './camera.repository.interface';

const STORAGE_KEY = 'cameras';

/**
 * Implementación del repositorio usando localStorage
 * Se puede reemplazar fácilmente por una implementación con API
 */
export class LocalStorageCameraRepository implements ICameraRepository {
  private loadFromStorage(): Camera[] {
    if (typeof window === 'undefined') return [];
    
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('Error parsing cameras from localStorage:', error);
      return [];
    }
  }

  private saveToStorage(cameras: Camera[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cameras));
  }

  async getAll(filters?: CameraFilters): Promise<Camera[]> {
    let cameras = this.loadFromStorage();

    if (filters) {
      if (filters.type) {
        cameras = cameras.filter(c => c.type === filters.type);
      }
      if (filters.status) {
        cameras = cameras.filter(c => c.status === filters.status);
      }
      if (filters.location) {
        cameras = cameras.filter(c => c.location === filters.location);
      }
      if (filters.searchText) {
        const search = filters.searchText.toLowerCase();
        cameras = cameras.filter(c => 
          c.name.toLowerCase().includes(search) ||
          c.location?.toLowerCase().includes(search) ||
          c.notes?.toLowerCase().includes(search)
        );
      }
    }

    return cameras;
  }

  async getById(id: string): Promise<Camera | null> {
    const cameras = this.loadFromStorage();
    return cameras.find(c => c.id === id) || null;
  }

  async create(data: CreateCameraDto): Promise<Camera> {
    const cameras = this.loadFromStorage();
    
    const newCamera: Camera = {
      ...data,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    cameras.push(newCamera);
    this.saveToStorage(cameras);
    
    return newCamera;
  }

  async update(id: string, data: UpdateCameraDto): Promise<Camera> {
    const cameras = this.loadFromStorage();
    const index = cameras.findIndex(c => c.id === id);
    
    if (index === -1) {
      throw new Error(`Camera with id ${id} not found`);
    }

    const updatedCamera: Camera = {
      ...cameras[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    cameras[index] = updatedCamera;
    this.saveToStorage(cameras);
    
    return updatedCamera;
  }

  async delete(id: string): Promise<void> {
    const cameras = this.loadFromStorage();
    const filtered = cameras.filter(c => c.id !== id);
    
    if (filtered.length === cameras.length) {
      throw new Error(`Camera with id ${id} not found`);
    }

    this.saveToStorage(filtered);
  }
}

// Singleton instance
export const cameraRepository = new LocalStorageCameraRepository();
