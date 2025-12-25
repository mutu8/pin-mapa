'use client';

import { useState, useEffect, useRef } from 'react';
import { debounce } from 'lodash';

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface StreetSearchProps {
  onSelectLocation: (lat: number, lng: number, address: string) => void;
  onInteraction?: () => void; // Callback para notificar interacción
}

export default function StreetSearch({ onSelectLocation, onInteraction }: StreetSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Bounding box de Trujillo (área de trabajo)
  const TRUJILLO_BBOX = '-79.0405,-8.1129,-78.9904,-8.0869';

  const searchStreets = async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setResults([]);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(searchQuery)},Trujillo,La Libertad,Peru` +
        `&format=json` +
        `&limit=8` +
        `&viewbox=${TRUJILLO_BBOX}` +
        `&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'CameraManagementApp/1.0'
          }
        }
      );

      const data = await response.json();
      setResults(data);
      setShowResults(true);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounce para evitar muchas peticiones
  const debouncedSearch = useRef(
    debounce((query: string) => searchStreets(query), 500)
  ).current;

  useEffect(() => {
    debouncedSearch(query);
    
    // Cleanup: cancelar debounce pendiente al desmontar
    return () => {
      debouncedSearch.cancel();
    };
  }, [query, debouncedSearch]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    onSelectLocation(lat, lng, result.display_name);
    setQuery(result.display_name.split(',')[0]); // Solo el nombre de la calle
    setShowResults(false);
  };

  return (
    <div ref={searchRef} className="relative w-full">
      {/* Input de búsqueda mejorado */}
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-600 group-focus-within:text-indigo-700 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onInteraction?.();
          }}
          onFocus={() => {
            results.length > 0 && setShowResults(true);
            onInteraction?.();
          }}
          onKeyDown={() => onInteraction?.()}
          onClick={() => onInteraction?.()}
          placeholder="Buscar calle en Trujillo..."
          className="w-full pl-12 pr-12 py-3.5 bg-white/95 backdrop-blur-sm border-2 border-indigo-100 rounded-2xl
                   shadow-lg hover:shadow-xl
                   focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100
                   outline-none transition-all duration-300
                   text-gray-800 placeholder-gray-400
                   font-medium text-[15px]"
        />
        
        {isLoading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="widget-spinner" style={{ 
              width: '24px', 
              height: '24px', 
              borderWidth: '2px' 
            }}></div>
          </div>
        )}

        {!isLoading && query.length >= 3 && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )}
      </div>

      {/* Resultados mejorados */}
      {showResults && results.length > 0 && (
        <div 
          className="absolute z-50 w-full mt-3 bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl 
                      border-2 border-indigo-100 max-h-96 overflow-y-auto animate-slideInTop"
          onScroll={() => onInteraction?.()}
          onMouseEnter={() => onInteraction?.()}
          onMouseMove={() => onInteraction?.()}
        >
          {results.map((result, index) => (
            <button
              key={result.place_id}
              onClick={() => {
                handleSelect(result);
                onInteraction?.();
              }}
              onMouseEnter={() => onInteraction?.()}
              onMouseMove={() => onInteraction?.()}
              style={{ animationDelay: `${index * 40}ms` }}
              className="w-full text-left px-5 py-4 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50
                       border-b-2 border-indigo-50 last:border-b-0 
                       transition-all duration-200 group
                       first:rounded-t-2xl last:rounded-b-2xl
                       relative overflow-hidden animate-fadeIn"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 to-purple-500/0 group-hover:from-indigo-500/5 group-hover:to-purple-500/5 transition-all duration-300"></div>
              <div className="flex items-start gap-3 relative z-10">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 group-hover:bg-indigo-200 flex items-center justify-center transition-colors">
                  <span className="text-indigo-600 text-lg">📍</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 group-hover:text-indigo-700 
                              transition-colors truncate text-[15px] leading-snug">
                    {result.display_name.split(',')[0]}
                  </p>
                  <p className="text-xs text-gray-500 group-hover:text-gray-600 truncate mt-1 leading-relaxed">
                    {result.display_name.split(',').slice(1, 3).join(', ')}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Sin resultados mejorado */}
      {showResults && !isLoading && query.length >= 3 && results.length === 0 && (
        <div className="absolute z-50 w-full mt-3 bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl 
                      border-2 border-indigo-100 p-8 text-center animate-scaleIn">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-gray-700 font-semibold text-base mb-2">
            No se encontraron resultados
          </p>
          <p className="text-sm text-gray-500">
            Intenta con otro nombre de calle en Trujillo
          </p>
        </div>
      )}
    </div>
  );
}
