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
| `/datos` | Tabla de respuestas de la encuesta + formulario para registrar nuevas |
| `/estadisticas` | Cuadro 1 (bacterias antes/después), gráfica de pie y barras, más diagramas por cada pregunta de la encuesta |

## Modo demo (desarrollo)

Si no hay credenciales reales de Supabase (o `VITE_MODO_DEMO=true`), la app
arranca en **modo demo**: puedes iniciar sesión con cualquier correo y
contraseña, y las vistas muestran datos de ejemplo. Las respuestas que
agregues se guardan en `localStorage` del navegador. En cuanto configures
un `.env` con las claves reales, la app usa Supabase automáticamente.

## Configuración local

1. **Crear el proyecto en Supabase** (https://supabase.com).
2. **Crear las tablas:** en el dashboard ve a *SQL Editor* y ejecuta todo el
   contenido de `supabase/schema.sql` (crea las tablas, las políticas y carga
   los datos del Cuadro 1).
3. **Crear un usuario:** en *Authentication → Users → Add user*, registra el
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
  lib/supabaseClient.js   Cliente de Supabase
  lib/opciones.js         Opciones del cuestionario
  router/index.js         Rutas + guard de autenticación
  components/             Navbar, PieChart, BarChart
  views/                  LoginView, DatosView, EstadisticasView
supabase/schema.sql       Tablas, políticas RLS y datos iniciales
```
