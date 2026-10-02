-- ============================================================
-- Tesis UOD - Administradores: eliminar usuarios desde la app
-- Ejecutar en: Supabase Dashboard -> SQL Editor
--
-- Qué hace este script (es idempotente: se puede re-ejecutar):
--   1. Agrega la columna `es_admin` a la tabla `usuarios`.
--   2. Actualiza el trigger de sincronización para que el PRIMER
--      usuario que se registre en una base de datos nueva quede como
--      administrador automáticamente.
--   3. Promueve como administrador al usuario más antiguo SOLO si
--      todavía no hay ningún admin (no pisa cambios deliberados).
--
-- Requiere: supabase/migracion-auditoria.sql (crea la tabla usuarios).
--
-- Para cambiar el administrador más tarde (SQL Editor):
--   update public.usuarios set es_admin = false; -- opcional: quitar todos
--   update public.usuarios set es_admin = true where correo = 'tu-correo@ejemplo.do';
-- ============================================================

-- ---------- 1) Columna es_admin ----------
alter table public.usuarios
  add column if not exists es_admin boolean not null default false;

-- ---------- 2) Trigger con auto-admin del primer usuario ----------
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
    -- el primer usuario registrado queda como administrador
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

-- ---------- 3) Promover al usuario más antiguo (solo si no hay admin) ----------
update public.usuarios
set es_admin = true
where not exists (select 1 from public.usuarios where es_admin)
  and id = (select id from public.usuarios order by created_at asc limit 1);

-- ---------- Verificación opcional ----------
-- select correo, nombre, es_admin from public.usuarios order by created_at;
