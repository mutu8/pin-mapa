import { useState, useEffect } from 'react';
import { Camera, CreateCameraDto, UpdateCameraDto, CameraFilters } from '../types/camera.types';
// Cambiar entre localStorage y Supabase según configuración
import { SupabaseCameraRepository } from '../repositories/supabase.repository';
import { LocalStorageCameraRepository } from '../repositories/localStorage.repository';

// Detectar si Supabase está configurado
const isSupabaseConfigured = () => {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};

// Instanciar el repositorio apropiado
const getCameraRepository = () => {
  const useSupabase = isSupabaseConfigured();
  
  return useSupabase 
    ? new SupabaseCameraRepository() 
    : new LocalStorageCameraRepository();
};

const cameraRepository = getCameraRepository();

/**
 * Hook personalizado para gestionar cámaras
 * Abstrae la lógica del repositorio y proporciona estado reactivo
 */
export function useCameras(filters?: CameraFilters) {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [allCameras, setAllCameras] = useState<Camera[]>([]); // Todas sin filtrar
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCameras = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await cameraRepository.getAll(filters);
      setCameras(data);
      
      // Cargar todas las cámaras sin filtrar para la leyenda
      const allData = await cameraRepository.getAll();
      setAllCameras(allData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading cameras');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCameras();
  }, [filters?.type, filters?.status, filters?.location, filters?.searchText]);

  const createCamera = async (data: CreateCameraDto) => {
    try {
      setError(null);
      const newCamera = await cameraRepository.create(data);
      setCameras(prev => [...prev, newCamera]);
      setAllCameras(prev => [...prev, newCamera]);
      return newCamera;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error creating camera';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const updateCamera = async (id: string, data: UpdateCameraDto) => {
    try {
      setError(null);
      const updated = await cameraRepository.update(id, data);
      setCameras(prev => prev.map(c => c.id === id ? updated : c));
      setAllCameras(prev => prev.map(c => c.id === id ? updated : c));
      return updated;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error updating camera';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const deleteCamera = async (id: string) => {
    try {
      setError(null);
      await cameraRepository.delete(id);
      setCameras(prev => prev.filter(c => c.id !== id));
      setAllCameras(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error deleting camera';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  return {
    cameras,    allCameras,    loading,
    error,
    createCamera,
    updateCamera,
    deleteCamera,
    refresh: loadCameras,
  };
}
