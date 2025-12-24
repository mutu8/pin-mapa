import { supabase } from '@/lib/supabase';
import { Camera, CameraType, CameraStatus, CreateCameraDto, UpdateCameraDto } from '../types/camera.types';
import type { ICameraRepository, CameraFilters } from './camera.repository.interface';

export class SupabaseCameraRepository implements ICameraRepository {
  async getAll(filters?: CameraFilters): Promise<Camera[]> {
    try {
      if (!supabase) throw new Error('Supabase not configured');
      
      let query = supabase.from('cameras').select('*');

      // Aplicar filtros
      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.location) {
        query = query.eq('location', filters.location);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      
      // Convertir created_at/updated_at a createdAt/updatedAt
      return (data || []).map(item => ({
        ...item,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
    } catch (error) {
      console.error('Error fetching cameras:', error);
      return [];
    }
  }

  async getById(id: string): Promise<Camera | null> {
    try {
      if (!supabase) throw new Error('Supabase not configured');
      
      const { data, error } = await supabase
        .from('cameras')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      if (!data) return null;
      
      return {
        ...data,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error fetching camera:', error);
      return null;
    }
  }

  async create(camera: CreateCameraDto): Promise<Camera> {
    try {
      if (!supabase) throw new Error('Supabase not configured');
      
      const { data, error } = await supabase
        .from('cameras')
        .insert([camera])
        .select()
        .single();

      if (error) throw error;
      
      return {
        ...data,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error creating camera:', error);
      throw error;
    }
  }

  async update(id: string, camera: UpdateCameraDto): Promise<Camera> {
    try {
      if (!supabase) throw new Error('Supabase not configured');
      
      const { data, error } = await supabase
        .from('cameras')
        .update(camera)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      return {
        ...data,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error updating camera:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      if (!supabase) throw new Error('Supabase not configured');
      
      const { error } = await supabase
        .from('cameras')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting camera:', error);
      throw error;
    }
  }

  async getUniqueLocations(): Promise<string[]> {
    try {
      if (!supabase) throw new Error('Supabase not configured');
      
      const { data, error } = await supabase
        .from('cameras')
        .select('location')
        .not('location', 'is', null);

      if (error) throw error;

      // Extraer ubicaciones únicas
      const locations = data
        .map(item => item.location)
        .filter((value, index, self) => value && self.indexOf(value) === index)
        .sort();

      return locations;
    } catch (error) {
      console.error('Error fetching locations:', error);
      return [];
    }
  }
}
