-- Agregar columna station_id a la tabla cameras
ALTER TABLE cameras 
ADD COLUMN station_id TEXT NOT NULL DEFAULT 'nsp';

-- Crear índice para filtrado por estación
CREATE INDEX IF NOT EXISTS cameras_station_id_idx ON cameras (station_id);

-- Agregar constraint para validar station_id
ALTER TABLE cameras
ADD CONSTRAINT cameras_station_id_check 
CHECK (station_id IN ('nsp', 'sc'));

-- Comentario explicativo
COMMENT ON COLUMN cameras.station_id IS 'ID de la estación a la que pertenece la cámara (nsp = Nuestra Señora de la Paz, sc = Santos Chocano)';
