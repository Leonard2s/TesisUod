-- ============================================================
-- Tesis UOD - Auditoría de actividad y usuarios registrados
-- Ejecutar en: Supabase Dashboard -> SQL Editor
--
-- Qué hace este script (es idempotente: se puede re-ejecutar):
--   1. Crea la tabla `auditoria`: una fila por cada acción que hace
--      un usuario (crear/editar/eliminar encuestas y preguntas,
--      reordenar, exportar…), con quién, qué y cuándo.
--   2. Crea la tabla `usuarios`: espejo de los usuarios registrados
--      en Supabase Auth, con un trigger que la mantiene sincronizada
--      al crear o actualizar un usuario. Permite ver cuántos hay,
--      quiénes son y desde cuándo.
--   3. Backfill: agrega a `usuarios` las cuentas que ya existían
--      antes de este script.
--
-- La tabla `sesiones` (inicios/cierres de sesión) se creó con
-- migracion-sesiones.sql y no se toca aquí.
--
-- Cómo ELIMINAR un usuario (no es posible desde la app por diseño:
-- requiere la clave de administración): Supabase Dashboard ->
-- Authentication -> Users -> menú ⋯ del usuario -> Delete user.
-- Al borrarlo, su fila en `usuarios` desaparece, pero el historial
-- de `sesiones` y `auditoria` se conserva como evidencia.
-- ============================================================

-- ---------- 1) Auditoría de actividad ----------
create table if not exists public.auditoria (
  id          bigint generated always as identity primary key,
  correo      text not null,
  nombre      text,
  matricula   text,
  accion      text not null,   -- código: encuesta_creada, pregunta_editada, exportacion…
  detalle     text not null,   -- descripción legible: "Editó la pregunta «Género»"
  created_at  timestamptz not null default now()
);

alter table public.auditoria enable row level security;

drop policy if exists "lectura auditoria autenticados" on public.auditoria;
drop policy if exists "insercion auditoria propia" on public.auditoria;

-- El historial de actividad es visible para cualquier usuario autenticado
create policy "lectura auditoria autenticados"
  on public.auditoria for select
  to authenticated using (true);

-- Cada usuario solo puede registrar acciones de su propio correo
-- (nadie puede falsificar actividad de otro)
create policy "insercion auditoria propia"
  on public.auditoria for insert
  to authenticated
  with check (auth.jwt() ->> 'email' = correo);

-- ---------- 2) Usuarios registrados (espejo de Auth) ----------
create table if not exists public.usuarios (
  id          uuid primary key references auth.users(id) on delete cascade,
  correo      text not null,
  nombre      text,
  matricula   text,
  es_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Si la tabla ya existía sin la columna (script anterior):
alter table public.usuarios
  add column if not exists es_admin boolean not null default false;

alter table public.usuarios enable row level security;

drop policy if exists "lectura usuarios autenticados" on public.usuarios;

create policy "lectura usuarios autenticados"
  on public.usuarios for select
  to authenticated using (true);

-- Trigger que mantiene la tabla sincronizada con Supabase Auth
-- (corre como postgres y no le afecta el RLS). El primer usuario
-- registrado queda como administrador.
create or replace function public.sincronizar_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, correo, nombre, matricula, es_admin)
  values (
    new.id,
    new.email,
    nullif(concat_ws(' ', new.raw_user_meta_data->>'nombre', new.raw_user_meta_data->>'apellido'), ''),
    nullif(new.raw_user_meta_data->>'matricula', ''),
    not exists (select 1 from public.usuarios)
  )
  on conflict (id) do update
    set correo = excluded.correo,
        nombre = excluded.nombre,
        matricula = excluded.matricula;
  return new;
end;
$$;

drop trigger if exists on_usuario_creado on auth.users;
create trigger on_usuario_creado
  after insert on auth.users
  for each row execute function public.sincronizar_usuario();

drop trigger if exists on_usuario_actualizado on auth.users;
create trigger on_usuario_actualizado
  after update on auth.users
  for each row execute function public.sincronizar_usuario();

-- ---------- 3) Backfill: cuentas que ya existían ----------
insert into public.usuarios (id, correo, nombre, matricula)
select
  u.id,
  u.email,
  nullif(concat_ws(' ', u.raw_user_meta_data->>'nombre', u.raw_user_meta_data->>'apellido'), ''),
  nullif(u.raw_user_meta_data->>'matricula', '')
from auth.users u
on conflict (id) do nothing;

-- ---------- Verificación opcional ----------
-- select correo, nombre, matricula from public.usuarios order by created_at;
-- select count(*) as usuarios_registrados from public.usuarios;
-- select correo, accion, detalle, created_at from public.auditoria order by created_at desc limit 20;
