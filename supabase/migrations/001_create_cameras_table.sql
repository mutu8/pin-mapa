-- Enable PostGIS extension for spatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create cameras table
CREATE TABLE IF NOT EXISTS cameras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('fixed', 'ptz', 'dome', 'bullet')),
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'maintenance', 'offline')),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create spatial index for better performance on location queries
CREATE INDEX IF NOT EXISTS cameras_lat_lng_idx ON cameras (lat, lng);

-- Create index for location filtering
CREATE INDEX IF NOT EXISTS cameras_location_idx ON cameras (location);

-- Create index for type filtering
CREATE INDEX IF NOT EXISTS cameras_type_idx ON cameras (type);

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS cameras_status_idx ON cameras (status);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cameras_updated_at
  BEFORE UPDATE ON cameras
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE cameras ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for now (you can restrict this later)
CREATE POLICY "Allow all operations on cameras" ON cameras
  FOR ALL
  USING (true)
  WITH CHECK (true);
