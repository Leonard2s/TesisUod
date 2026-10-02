-- ============================================================
-- Tesis UOD - Historial de accesos (auditoría de sesiones)
-- Ejecutar en: Supabase Dashboard -> SQL Editor
--
-- Qué hace este script (es idempotente: se puede re-ejecutar):
--   1. Crea la tabla `sesiones`: una fila por cada inicio de sesión,
--      con la hora de entrada y (si cerró sesión) la de salida.
--   2. Habilita RLS: solo usuarios autenticados pueden consultar el
--      historial, y cada usuario solo puede insertar/actualizar
--      sesiones de su propio correo (para que la auditoría no se
--      pueda falsificar desde otro usuario).
--
-- La app registra los accesos automáticamente al iniciar y cerrar
-- sesión; se ven en la pantalla "Accesos" de la app.
--
-- Nota: si el usuario cierra el navegador sin pulsar «Salir», su
-- sesión queda con fin = null (aparece como activa).
-- ============================================================

create table if not exists public.sesiones (
  id          bigint generated always as identity primary key,
  correo      text not null,
  nombre      text,                    -- nombre completo (de los datos del usuario)
  matricula   text,                    -- matrícula (de los datos del usuario)
  inicio      timestamptz not null default now(),
  fin         timestamptz,             -- null = sesión sin cerrar
  created_at  timestamptz not null default now()
);

alter table public.sesiones enable row level security;

-- DROP IF EXISTS permite re-ejecutar este script sin errores
drop policy if exists "lectura sesiones autenticados" on public.sesiones;
drop policy if exists "insercion sesiones propias" on public.sesiones;
drop policy if exists "actualizacion sesiones propias" on public.sesiones;

-- El historial de accesos es visible para cualquier usuario autenticado
create policy "lectura sesiones autenticados"
  on public.sesiones for select
  to authenticated using (true);

-- Cada usuario solo puede registrar sesiones de su propio correo
create policy "insercion sesiones propias"
  on public.sesiones for insert
  to authenticated
  with check (auth.jwt() ->> 'email' = correo);

-- Y solo puede actualizar (cerrar) sus propias sesiones
create policy "actualizacion sesiones propias"
  on public.sesiones for update
  to authenticated
  using (auth.jwt() ->> 'email' = correo)
  with check (auth.jwt() ->> 'email' = correo);

-- ---------- Verificación opcional ----------
-- select correo, nombre, matricula, inicio, fin
-- from public.sesiones order by inicio desc limit 10;
