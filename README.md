# 📹 Sistema de Gestión de Cámaras en Mapa

Sistema web para marcar, gestionar y visualizar cámaras de vigilancia en un mapa interactivo. MVP funcional para pruebas locales sin dependencias externas de Google Maps.

## 🎯 Características

- ✅ Mapa interactivo con OpenStreetMap (sin API keys)
- ✅ Agregar cámaras haciendo click en el mapa
- ✅ Editar y eliminar cámaras existentes
- ✅ Filtros por tipo y estado de cámara
- ✅ Clustering automático de marcadores cercanos
- ✅ Persistencia en localStorage (sin backend)
- ✅ 100% funcional en localhost
- ✅ Arquitectura preparada para escalar

## 🚀 Quick Start

### Prerrequisitos

- Node.js 18+ (recomendado 20+)
- npm o yarn

### Instalación y ejecución

```bash
# Instalar dependencias
npm install

# Modo desarrollo
npm run dev

# Abrir en navegador
# http://localhost:3000
```

La aplicación estará disponible en `http://localhost:3000`

## 📁 Estructura del Proyecto

```
proyecto-mapas/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Layout principal
│   ├── page.tsx                 # Página principal (contiene MapView)
│   └── globals.css              # Estilos globales (Tailwind)
│
├── features/                     # Módulos por feature
│   └── cameras/                 # Feature de cámaras
│       ├── types/               # Tipos TypeScript
│       │   └── camera.types.ts  # Camera, CameraType, CameraStatus, DTOs
│       │
│       ├── repositories/        # Capa de datos (patrón adapter)
│       │   ├── camera.repository.interface.ts
│       │   └── localStorage.repository.ts
│       │
│       ├── hooks/               # Custom hooks de React
│       │   └── useCameras.ts    # Hook para gestión de cámaras
│       │
│       └── components/          # Componentes de UI
│           ├── MapView.tsx      # Componente principal del mapa
│           ├── CameraForm.tsx   # Formulario crear/editar
│           ├── CameraList.tsx   # Lista lateral de cámaras
│           └── FilterPanel.tsx  # Panel de filtros
│
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

## 🏗️ Arquitectura y Decisiones Técnicas

### Stack Tecnológico

| Componente | Tecnología | Justificación |
|------------|-----------|---------------|
| **Framework** | Next.js 15 + React 19 | App Router, Server Components, SSR ready |
| **Lenguaje** | TypeScript | Type safety, mejor DX, escalabilidad |
| **Estilos** | Tailwind CSS | Rapidez de desarrollo, utility-first |
| **Mapa** | Leaflet + OSM tiles | Simple, sin API keys, maduro y estable |
| **Clustering** | Leaflet.markercluster | Rendimiento con muchos puntos |
| **Persistencia MVP** | localStorage | Cero configuración, datos en cliente |
| **IDs** | uuid v4 | Estándar para identificadores únicos |

### ¿Por qué Leaflet y no MapLibre GL JS?

**Decisión: Leaflet**

**Ventajas:**
- ✅ Simplicidad: API más sencilla para MVP
- ✅ Ecosistema maduro: plugins abundantes y bien mantenidos
- ✅ Documentación extensa
- ✅ Menor curva de aprendizaje
- ✅ Compatible con cualquier fuente de tiles

**MapLibre sería mejor si:**
- Necesitas renderizado 3D/2.5D
- Manejo de millones de puntos con vector tiles
- Animaciones complejas y mapas estilizados

Para este MVP enfocado en funcionalidad, Leaflet es la elección óptima.

### Patrón Repository

```typescript
// Interface agnóstica al storage
interface ICameraRepository {
  getAll(filters?: CameraFilters): Promise<Camera[]>;
  create(data: CreateCameraDto): Promise<Camera>;
  // ...
}

// Implementación actual: localStorage
class LocalStorageCameraRepository implements ICameraRepository { }

// Implementación futura: API
class ApiCameraRepository implements ICameraRepository { }
```

**Beneficios:**
- Cambiar de localStorage a API requiere solo cambiar la instancia del repo
- Lógica de negocio desacoplada del almacenamiento
- Fácil testing con mocks

## 🔧 Modelo de Datos

### Camera

```typescript
interface Camera {
  id: string;                    // UUID v4
  name: string;                  // "Cámara Principal"
  type: CameraType;              // fixed | ptz | dome | bullet
  status: CameraStatus;          // active | inactive | maintenance | offline
  notes?: string;                // Texto opcional
  lat: number;                   // Latitud
  lng: number;                   // Longitud
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601
}
```

## 🎨 Interfaz de Usuario

### Flujo de uso

1. **Ver mapa inicial**: Se carga centrado en Madrid con zoom nacional
2. **Agregar cámara**: Click en cualquier punto del mapa → se abre formulario
3. **Editar cámara**: Click en marcador → se abre formulario con datos
4. **Filtrar**: Panel lateral con selectores de tipo y estado
5. **Navegar**: Click en lista de cámaras → mapa se centra en esa cámara

### Características visuales

- Marcadores con colores según estado:
  - 🟢 Verde: Activa
  - ⚫ Gris: Inactiva
  - 🟡 Amarillo: Mantenimiento
  - 🔴 Rojo: Fuera de línea
- Clustering automático cuando hay muchas cámaras cercanas
- Popups informativos al hacer hover/click en marcadores

## 🔄 Roadmap de Evolución

### Fase 1: MVP Local ✅ (actual)

- [x] Mapa con OpenStreetMap
- [x] CRUD de cámaras
- [x] Filtros básicos
- [x] Clustering
- [x] Persistencia en localStorage

### Fase 2: Backend + Base de Datos Geoespacial

**Stack propuesto:**
- **Backend**: Node.js + NestJS (o Python FastAPI)
- **Base de datos**: PostgreSQL + PostGIS
- **API**: REST o GraphQL

**Endpoints mínimos:**
```
GET    /api/cameras?bbox=...&type=...&status=...
POST   /api/cameras
PUT    /api/cameras/:id
DELETE /api/cameras/:id
GET    /api/cameras/:id
```

**Esquema PostGIS:**
```sql
CREATE TABLE cameras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  notes TEXT,
  location GEOMETRY(Point, 4326) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cameras_location ON cameras USING GIST (location);
```

**Consulta por viewport:**
```sql
SELECT * FROM cameras
WHERE ST_Contains(
  ST_MakeEnvelope($minLng, $minLat, $maxLng, $maxLat, 4326),
  location
);
```

**Cambios en frontend:**
```typescript
// Cambiar de:
import { cameraRepository } from './repositories/localStorage.repository';

// A:
import { cameraRepository } from './repositories/api.repository';
```

### Fase 3: Autenticación y Multiusuario

- Implementar login (JWT, OAuth, etc.)
- Roles de usuario (admin, viewer, editor)
- Cámaras privadas por organización
- Logs de auditoría

### Fase 4: Migración a Google Maps (opcional)

**¿Cuándo migrar a Google Maps?**
- Necesitas geocoding de alta precisión
- Quieres Street View integrado
- Requieres rutas/navegación
- Necesitas estilos de mapa personalizados

**Pasos para migrar:**

1. **Obtener API Key de Google Maps**
   ```
   https://console.cloud.google.com/google/maps-apis/
   ```
   Activar APIs: Maps JavaScript API, Geocoding API (opcional)

2. **Instalar SDK**
   ```bash
   npm install @googlemaps/js-api-loader
   ```

3. **Reemplazar componente de mapa**

   **Antes (Leaflet):**
   ```typescript
   import L from 'leaflet';
   const map = L.map('map').setView([lat, lng], zoom);
   L.tileLayer('https://{s}.tile.openstreetmap.org/...').addTo(map);
   ```

   **Después (Google Maps):**
   ```typescript
   import { Loader } from '@googlemaps/js-api-loader';
   
   const loader = new Loader({
     apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
     version: 'weekly',
   });
   
   const google = await loader.load();
   const map = new google.maps.Map(mapElement, {
     center: { lat, lng },
     zoom,
   });
   ```

4. **Adaptar marcadores**
   ```typescript
   // Leaflet
   L.marker([lat, lng]).addTo(map);
   
   // Google Maps
   new google.maps.Marker({
     position: { lat, lng },
     map,
   });
   ```

5. **Clustering con Google Maps**
   ```bash
   npm install @googlemaps/markerclusterer
   ```

6. **Geocoding (búsqueda por dirección)**
   ```typescript
   const geocoder = new google.maps.Geocoder();
   geocoder.geocode({ address: 'Calle Mayor, Madrid' }, (results, status) => {
     // results[0].geometry.location.lat()
   });
   ```

**Estimación de costos Google Maps:**
- Map loads: $7 por 1000 cargas (hasta 100K gratis/mes)
- Geocoding: $5 por 1000 requests (incluye crédito mensual)

## 🧪 Testing (futuro)

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

Áreas de testing:
- Unit tests: repositories, hooks
- Component tests: formularios, filtros
- Integration tests: flujo completo CRUD

## 📦 Build y Despliegue

```bash
# Build de producción
npm run build

# Ejecutar build
npm start

# Desplegar en Vercel/Netlify
npx vercel deploy
```

**Requisitos para producción:**
- Variable de entorno para API endpoint (cuando se implemente backend)
- Considerar servicio de tiles propio o proveedor comercial (Mapbox, Maptiler) para evitar límites de uso de OSM público

## 🐛 Troubleshooting

### Los iconos de Leaflet no aparecen

Ya está solucionado en `MapView.tsx` con:
```typescript
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ ... });
```

### El mapa no se renderiza

Asegúrate de que los estilos CSS de Leaflet estén importados:
```typescript
import 'leaflet/dist/leaflet.css';
```

### localStorage no funciona en SSR

El repositorio valida `typeof window === 'undefined'` antes de acceder a localStorage.

## 📝 Comandos Útiles

```bash
# Desarrollo
npm run dev

# Lint
npm run lint

# Build
npm run build

# Producción
npm start

# Limpiar node_modules
rm -rf node_modules package-lock.json
npm install
```

## 🤝 Contribución

Este es un proyecto base. Áreas para mejorar:

- [ ] Búsqueda por dirección (geocoding con Nominatim)
- [ ] Exportar datos a CSV/JSON
- [ ] Importar cámaras desde archivo
- [ ] Modo de edición de posición (drag & drop)
- [ ] Undo/redo de acciones
- [ ] Capa de calor (heatmap) por densidad
- [ ] Temas claro/oscuro
- [ ] Modo offline (Service Worker + IndexedDB)

## 📄 Licencia

MIT License

---

**Autor:** Sistema de Gestión de Cámaras
**Fecha:** Diciembre 2025
**Versión:** 1.0.0-MVP
