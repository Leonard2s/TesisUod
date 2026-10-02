# Tesis UOD

Aplicación web para la tesis de la Universidad Odontológica Dominicana:
encuesta sobre **automedicación con antibióticos en pacientes con
periodontitis crónica**.

- **Frontend:** Vue 3 + Vite + Vue Router + Chart.js
- **Backend / DB:** Supabase (PostgreSQL + Auth)
- **Deploy:** Vercel o Render (sitio estático)

## Pantallas

| Ruta | Descripción |
|---|---|
| `/login` | Inicio de sesión con correo y contraseña (Supabase Auth, sin roles) |
| `/datos` | Tabla de respuestas de la encuesta + formulario para registrar nuevas + exportación a Excel, PDF y Word |
| `/estadisticas` | Resumen, medidas estadísticas, gráficas de pie y barras, y tablas de frecuencia por pregunta |
| `/papelera` | Encuestas eliminadas (borrado lógico) con opción de restaurar |
| `/configuracion` | CRUD de las preguntas del cuestionario: crear, editar, reordenar, eliminar (borrado lógico) y restaurar |

## Modo demo (desarrollo)

Si no hay credenciales reales de Supabase (o `VITE_MODO_DEMO=true`), la app
arranca en **modo demo**: puedes iniciar sesión con cualquier correo y
contraseña, y las vistas muestran datos de ejemplo. Las respuestas que
agregues se guardan en `localStorage` del navegador. En cuanto configures
un `.env` con las claves reales, la app usa Supabase automáticamente.

## Configuración local

1. **Crear el proyecto en Supabase** (https://supabase.com).
2. **Crear las tablas:** en el dashboard ve a *SQL Editor* y ejecuta todo el
   contenido de `supabase/schema.sql` (crea las tablas `encuestas` y
   `preguntas`, las políticas RLS y siembra las 8 preguntas del cuestionario).
3. **Si ya tenías datos con el esquema anterior:** ejecuta también
   `supabase/migracion-preguntas.sql`. Copia tus encuestas existentes al
   nuevo formato (columna `respuestas` jsonb) **sin borrar nada**: las
   columnas originales se mantienen y los datos quedan intactos.
4. **Crear un usuario:** en *Authentication → Users → Add user*, registra el
   correo y contraseña con los que entrarás a la app.
4. **Variables de entorno:**

   ```bash
   cp .env.example .env
   ```

   Completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
   (están en *Project Settings → API* del dashboard).

5. **Instalar y correr:**

   ```bash
   npm install
   npm run dev
   ```

## Deploy

### Vercel

1. Sube el repo a GitHub e impórtalo en Vercel.
2. Framework: **Vite** (se detecta solo). Build: `npm run build`, output: `dist`.
3. Agrega las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. `vercel.json` ya incluye el rewrite para que el router funcione.

### Render

1. Crea un **Static Site** apuntando al repo (o usa el `render.yaml` incluido
   como Blueprint).
2. Build command: `npm ci && npm run build`. Publish directory: `dist`.
3. Agrega las mismas variables de entorno.
4. El rewrite `/* → /index.html` ya está en `render.yaml`.

## Estructura

```
src/
  lib/supabaseClient.js   Cliente de Supabase (con modo demo)
  lib/demo.js             Backend de demostración (localStorage)
  lib/preguntas.js        Servicio de preguntas del cuestionario
  lib/usuario.js          Usuario autenticado (auditoría)
  lib/exportar.js         Exportación a Excel, PDF y Word
  router/index.js         Rutas + guard de autenticación
  components/             Navbar, PieChart, BarChart
  views/                  Login, Registro, Datos, Estadísticas, Papelera, Configuración
supabase/schema.sql       Tablas, políticas RLS y seed de preguntas
supabase/migracion-preguntas.sql  Migra datos existentes al formato nuevo (sin perder nada)
supabase/seed.sql         Datos de prueba para encuestas
```
