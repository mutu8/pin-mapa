export interface Station {
  id: string;
  name: string;
  code: string;
  color: string;
  description?: string;
}

export const STATIONS: Station[] = [
  {
    id: 'nsp',
    name: 'Estación Nuestra Señora de la Paz',
    code: 'NSP',
    color: '#3b82f6', // blue-500
    description: 'Comisaría Nuestra Señora de la Paz'
  },
  {
    id: 'sc',
    name: 'Estación Santos Chocano',
    code: 'SC',
    color: '#8b5cf6', // violet-500
    description: 'Comisaría Santos Chocano'
  }
];

export const getStationById = (id: string): Station | undefined => {
  return STATIONS.find(station => station.id === id);
};

export const getStationColor = (stationId: string): string => {
  return getStationById(stationId)?.color || '#6b7280'; // gray-500 por defecto
};
