-- ============================================================
-- Tesis UOD - Esquema de base de datos (Supabase / PostgreSQL)
-- Ejecutar en: Supabase Dashboard -> SQL Editor
-- ============================================================

-- Preguntas del cuestionario (se administran desde la pantalla
-- Configuración de la app; borrado lógico + orden)
create table if not exists public.preguntas (
  id                    bigint generated always as identity primary key,
  clave                 text not null unique,     -- identificador estable (slug), lo usan las respuestas
  titulo                text not null,            -- texto de la pregunta
  etiqueta             text,                     -- etiqueta corta para gráficas/tablas (opcional)
  tipo                  text not null default 'unica' check (tipo in ('unica', 'multiple')),
  opciones              text[] not null default '{}',
  orden                 int not null default 0,   -- posición en el cuestionario
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz,              -- borrado lógico (null = activa)
  deleted_by_nombre     text,                     -- auditoría: quién eliminó
  deleted_by_matricula  text
);

-- Respuestas del cuestionario sobre automedicación con antibióticos.
-- Las respuestas viven en la columna `respuestas` (jsonb) con la forma
-- { clave_pregunta: ["valor", ...] }. Las columnas originales se mantienen
-- por compatibilidad con datos migrados desde versiones anteriores.
create table if not exists public.encuestas (
  id                        bigint generated always as identity primary key,
  created_at                timestamptz not null default now(),
  frecuencia_automedicacion text,          -- (legacy) 1. Rara vez / Frecuentemente / Nunca
  rango_edad                text,          -- (legacy) 2. Rango de edad
  genero                    text,          -- (legacy) 3. Mujer / Hombre
  antibioticos              text[] default '{}',  -- (legacy) 4. Selección múltiple
  sintomas                  text[] default '{}',  -- (legacy) 5. Selección múltiple
  grado_educacion           text,          -- (legacy) 6. Nivel de educación
  lugar_residencia          text,          -- (legacy) 7. Lugar de residencia
  motivo_automedicacion     text,          -- (legacy) 8. Por qué se automedica
  respuestas                jsonb not null default '{}',  -- respuestas actuales
  registrado_nombre         text,                   -- Nombre de quien registró
  registrado_matricula      text,                   -- Matrícula de quien registró
  deleted_at                timestamptz,            -- Borrado lógico (null = activo)
  deleted_by_nombre         text,                   -- Auditoría: nombre de quien eliminó
  deleted_by_matricula      text                    -- Auditoría: matrícula de quien eliminó
);

-- Si la tabla ya existía sin estas columnas:
alter table public.encuestas add column if not exists registrado_nombre text;
alter table public.encuestas add column if not exists registrado_matricula text;
alter table public.encuestas add column if not exists deleted_at timestamptz;
alter table public.encuestas add column if not exists deleted_by_nombre text;
alter table public.encuestas add column if not exists deleted_by_matricula text;
alter table public.encuestas add column if not exists respuestas jsonb not null default '{}'::jsonb;

-- Si ya tenías datos con el formato anterior (columnas legacy), ejecuta
-- también supabase/migracion-preguntas.sql: siembra las 8 preguntas
-- iniciales y copia los datos ya existentes a la columna `respuestas`
-- sin borrar nada.

-- Si venías de la versión con la tabla de bacterias (datos informativos,
-- ya no se usan en la app), puedes borrarla con:
-- drop table if exists public.resultados_bacterias;

-- ---------- Seguridad (RLS) ----------
-- Solo usuarios autenticados pueden leer, insertar y actualizar. No hay roles.
alter table public.encuestas enable row level security;

-- DROP IF EXISTS permite re-ejecutar este script sin errores
drop policy if exists "lectura usuarios autenticados" on public.encuestas;
drop policy if exists "insercion usuarios autenticados" on public.encuestas;
drop policy if exists "actualizacion usuarios autenticados" on public.encuestas;

create policy "lectura usuarios autenticados"
  on public.encuestas for select
  to authenticated using (true);

create policy "insercion usuarios autenticados"
  on public.encuestas for insert
  to authenticated with check (true);

-- Permite el borrado lógico (update de deleted_at)
create policy "actualizacion usuarios autenticados"
  on public.encuestas for update
  to authenticated using (true) with check (true);

-- RLS de preguntas: mismo criterio que encuestas
alter table public.preguntas enable row level security;

drop policy if exists "lectura preguntas autenticados" on public.preguntas;
drop policy if exists "insercion preguntas autenticados" on public.preguntas;
drop policy if exists "actualizacion preguntas autenticados" on public.preguntas;

create policy "lectura preguntas autenticados"
  on public.preguntas for select
  to authenticated using (true);

create policy "insercion preguntas autenticados"
  on public.preguntas for insert
  to authenticated with check (true);

-- Permite crear/editar, reordenar y hacer el borrado lógico
create policy "actualizacion preguntas autenticados"
  on public.preguntas for update
  to authenticated using (true) with check (true);

-- Historial de accesos (auditoría): una fila por inicio de sesión.
-- Si ya tenías datos, ejecuta supabase/migracion-sesiones.sql (idempotente).
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

-- Auditoría de actividad: qué hace cada usuario y cuándo. Si ya tenías
-- datos, ejecuta supabase/migracion-auditoria.sql (idempotente).
create table if not exists public.auditoria (
  id          bigint generated always as identity primary key,
  correo      text not null,
  nombre      text,
  matricula   text,
  accion      text not null,
  detalle     text not null,
  created_at  timestamptz not null default now()
);

alter table public.auditoria enable row level security;

drop policy if exists "lectura auditoria autenticados" on public.auditoria;
drop policy if exists "insercion auditoria propia" on public.auditoria;

create policy "lectura auditoria autenticados"
  on public.auditoria for select
  to authenticated using (true);

-- Cada usuario solo puede registrar acciones de su propio correo
create policy "insercion auditoria propia"
  on public.auditoria for insert
  to authenticated
  with check (auth.jwt() ->> 'email' = correo);

-- Usuarios registrados: espejo de Supabase Auth mantenido con triggers
create table if not exists public.usuarios (
  id          uuid primary key references auth.users(id) on delete cascade,
  correo      text not null,
  nombre      text,
  matricula   text,
  created_at  timestamptz not null default now()
);

alter table public.usuarios enable row level security;

drop policy if exists "lectura usuarios autenticados" on public.usuarios;

create policy "lectura usuarios autenticados"
  on public.usuarios for select
  to authenticated using (true);

create or replace function public.sincronizar_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, correo, nombre, matricula)
  values (
    new.id,
    new.email,
    nullif(concat_ws(' ', new.raw_user_meta_data->>'nombre', new.raw_user_meta_data->>'apellido'), ''),
    nullif(new.raw_user_meta_data->>'matricula', '')
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

-- Seed inicial de preguntas: las 8 del cuestionario de la tesis
insert into public.preguntas (clave, titulo, etiqueta, tipo, opciones, orden) values
  ('frecuencia_automedicacion', '¿Con qué frecuencia se automedica?', 'Frecuencia de automedicación', 'unica',
   '{Rara vez,Frecuentemente,Nunca}', 1),
  ('rango_edad', '¿Qué edad tienes?', 'Rango de edad', 'unica',
   '{De 18 a 29 años,De 30 a 39 años,De 40 a 49 años,De 50 a 59 años,De 60 años o más}', 2),
  ('genero', 'Género', 'Género', 'unica',
   '{Mujer,Hombre}', 3),
  ('antibioticos', '¿Con cuál o cuáles antibióticos se ha automedicado?', 'Antibióticos usados', 'multiple',
   '{Azitromicina,Amoxicilina,Cefalexina,Metronidazol}', 4),
  ('sintomas', '¿Cuáles de los siguientes síntomas ha notado?', 'Síntomas notados', 'multiple',
   '{Sangrado,Inflamación,Movilidad dental,Sarro,Dolor}', 5),
  ('grado_educacion', '¿Cuál es su grado de educación?', 'Grado de educación', 'unica',
   '{Nivel primario,Nivel secundario,Universitario,Especialidad}', 6),
  ('lugar_residencia', '¿Cuál es su lugar de residencia?', 'Lugar de residencia', 'unica',
   '{Pueblo de una provincia,Campo de una provincia,Urbanización,Ciudad de la capital,Barrio,Residencial}', 7),
  ('motivo_automedicacion', '¿Por qué se automedica?', 'Motivo de automedicación', 'unica',
   '{Recomendación de tercera persona,Falta de tiempo para ir a consulta,Por prevención}', 8)
on conflict (clave) do nothing;

-- ---------- Datos de ejemplo ----------
-- Para poblar la tabla con respuestas de prueba, ejecuta supabase/seed.sql
-- o descomenta el insert de abajo.
-- insert into public.encuestas
--   (frecuencia_automedicacion, rango_edad, genero, antibioticos, sintomas,
--    grado_educacion, lugar_residencia, motivo_automedicacion, respuestas)
-- values
--   ('Rara vez', 'De 18 a 29 años', 'Mujer', '{Amoxicilina}', '{Dolor,Sarro}',
--    'Universitario', 'Ciudad de la capital', 'Falta de tiempo para ir a consulta',
--    '{"frecuencia_automedicacion":["Rara vez"],"rango_edad":["De 18 a 29 años"],"genero":["Mujer"],"antibioticos":["Amoxicilina"],"sintomas":["Dolor","Sarro"],"grado_educacion":["Universitario"],"lugar_residencia":["Ciudad de la capital"],"motivo_automedicacion":["Falta de tiempo para ir a consulta"]}'),
--   ('Frecuentemente', 'De 40 a 49 años', 'Hombre', '{Azitromicina,Metronidazol}', '{Inflamación,Dolor}',
--    'Nivel secundario', 'Barrio', 'Recomendación de tercera persona',
--    '{"frecuencia_automedicacion":["Frecuentemente"],"rango_edad":["De 40 a 49 años"],"genero":["Hombre"],"antibioticos":["Azitromicina","Metronidazol"],"sintomas":["Inflamación","Dolor"],"grado_educacion":["Nivel secundario"],"lugar_residencia":["Barrio"],"motivo_automedicacion":["Recomendación de tercera persona"]}'),
--   ('Nunca', 'De 60 años o más', 'Mujer', '{}', '{Sangrado}',
--    'Nivel primario', 'Campo de una provincia', 'Por prevención',
--    '{"frecuencia_automedicacion":["Nunca"],"rango_edad":["De 60 años o más"],"genero":["Mujer"],"antibioticos":[],"sintomas":["Sangrado"],"grado_educacion":["Nivel primario"],"lugar_residencia":["Campo de una provincia"],"motivo_automedicacion":["Por prevención"]}');
