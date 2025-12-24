# 🚀 Guía de Despliegue - Sistema de Gestión de Cámaras

## 📋 Pre-requisitos
- Cuenta en [Supabase](https://supabase.com) (gratis)
- Cuenta en [Vercel](https://vercel.com) (gratis)
- Git instalado
- Repositorio en GitHub/GitLab

---

## 🗄️ Paso 1: Configurar Supabase

### 1.1 Crear Proyecto
1. Ve a [supabase.com](https://supabase.com)
2. Click en "Start your project"
3. Crea una organización y un nuevo proyecto
4. Guarda la contraseña de la base de datos

### 1.2 Ejecutar Migración
1. En Supabase Dashboard, ve a **SQL Editor**
2. Click en "New Query"
3. Copia y pega el contenido de `supabase/migrations/001_create_cameras_table.sql`
4. Click en "Run" para ejecutar

### 1.3 Obtener Credenciales
1. Ve a **Project Settings** → **API**
2. Copia:
   - `Project URL` (algo como: `https://xxx.supabase.co`)
   - `anon/public key` (clave larga que empieza con `eyJ...`)

---

## 🔑 Paso 2: Configurar Variables de Entorno Localmente

```bash
# Crear archivo .env.local en la raíz del proyecto
cp .env.example .env.local
```

Edita `.env.local` con tus credenciales:
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Probar Localmente
```bash
npm run dev
```
Abre http://localhost:3000 y verifica que puedes crear/ver cámaras

---

## 🚢 Paso 3: Deploy en Vercel

### 3.1 Preparar Repositorio Git
```bash
# Si no has inicializado Git
git init
git add .
git commit -m "Initial commit - Camera Management System"

# Crear repo en GitHub y subir
git remote add origin https://github.com/tu-usuario/tu-repo.git
git push -u origin main
```

### 3.2 Conectar con Vercel
1. Ve a [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Importa tu repositorio de GitHub
4. Configura el proyecto:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### 3.3 Agregar Variables de Entorno en Vercel
1. En la configuración del proyecto en Vercel
2. Ve a **Settings** → **Environment Variables**
3. Agrega:
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR...
   ```
4. Click "Save"

### 3.4 Desplegar
1. Click en "Deploy"
2. Espera ~2 minutos
3. Tu app estará en: `https://tu-proyecto.vercel.app`

---

## 🔄 Modo Híbrido (LocalStorage + Supabase)

La aplicación detecta automáticamente:
- ✅ **Si hay credenciales de Supabase** → Usa base de datos en la nube
- ❌ **Si NO hay credenciales** → Usa localStorage (datos locales)

Esto permite desarrollo local sin Supabase.

---

## 🎯 Próximos Pasos Opcionales

### Seguridad (Autenticación)
```sql
-- Modificar políticas RLS en Supabase
ALTER POLICY "Allow all operations on cameras" ON cameras
  USING (auth.role() = 'authenticated');
```

### Dominio Personalizado
1. En Vercel → **Settings** → **Domains**
2. Agrega tu dominio personalizado
3. Configura DNS según instrucciones

### Backup Automático
- Supabase hace backups diarios automáticos (tier gratuito: 7 días)
- Exportar datos: SQL Editor → `SELECT * FROM cameras;` → Download CSV

---

## 🐛 Troubleshooting

### Error: "Failed to fetch cameras"
- Verifica que las variables de entorno están en Vercel
- Revisa Supabase Dashboard → **Logs** para errores
- Confirma que la tabla `cameras` existe

### Error: "Failed to create camera"
- Verifica RLS policies en Supabase
- Revisa la consola del navegador (F12)

### Datos no persisten
- Si usas localhost sin .env.local, usa localStorage
- Verifica que `.env.local` existe y tiene las credenciales correctas

---

## 📊 Costos

| Servicio | Plan Gratuito | Límites |
|----------|---------------|---------|
| **Vercel** | Hobby | 100 GB bandwidth/mes |
| **Supabase** | Free | 500 MB database, 2 GB bandwidth |

Suficiente para **miles de cámaras** y **cientos de usuarios**.

---

## ✅ Checklist de Despliegue

- [ ] Proyecto Supabase creado
- [ ] Migración SQL ejecutada
- [ ] Credenciales copiadas
- [ ] `.env.local` configurado
- [ ] Probado localmente
- [ ] Repositorio Git creado
- [ ] Código subido a GitHub
- [ ] Proyecto importado en Vercel
- [ ] Variables de entorno en Vercel
- [ ] Deploy exitoso
- [ ] Probado en producción

---

**¡Listo! 🎉** Tu aplicación ahora está en la nube con datos persistentes.
