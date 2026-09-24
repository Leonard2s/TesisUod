-- ============================================================
-- Tesis UOD - Esquema de base de datos (Supabase / PostgreSQL)
-- Ejecutar en: Supabase Dashboard -> SQL Editor
-- ============================================================

-- Respuestas del cuestionario sobre automedicación con antibióticos
create table if not exists public.encuestas (
  id                        bigint generated always as identity primary key,
  created_at                timestamptz not null default now(),
  frecuencia_automedicacion text not null,          -- 1. Rara vez / Frecuentemente / Nunca
  rango_edad                text not null,          -- 2. Rango de edad
  genero                    text not null,          -- 3. Mujer / Hombre
  antibioticos              text[] not null default '{}',  -- 4. Selección múltiple
  sintomas                  text[] not null default '{}',  -- 5. Selección múltiple
  grado_educacion           text not null,          -- 6. Nivel de educación
  lugar_residencia          text not null,          -- 7. Lugar de residencia
  motivo_automedicacion     text not null,          -- 8. Por qué se automedica
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

-- Cuadro 1: distribución de frecuencia de bacterias antes/después del tratamiento
create table if not exists public.resultados_bacterias (
  id                   bigint generated always as identity primary key,
  bacteria             text not null unique,
  antes_tratamiento    numeric(5,2) not null,
  despues_tratamiento  numeric(5,2) not null
);

-- ---------- Seguridad (RLS) ----------
-- Solo usuarios autenticados pueden leer e insertar. No hay roles.
alter table public.encuestas enable row level security;
alter table public.resultados_bacterias enable row level security;

-- DROP IF EXISTS permite re-ejecutar este script sin errores
drop policy if exists "lectura usuarios autenticados" on public.encuestas;
drop policy if exists "insercion usuarios autenticados" on public.encuestas;
drop policy if exists "actualizacion usuarios autenticados" on public.encuestas;
drop policy if exists "lectura usuarios autenticados" on public.resultados_bacterias;

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

create policy "lectura usuarios autenticados"
  on public.resultados_bacterias for select
  to authenticated using (true);

-- ---------- Datos iniciales (Cuadro 1 de la tesis) ----------
insert into public.resultados_bacterias (bacteria, antes_tratamiento, despues_tratamiento)
values
  ('Peptostreptococos', 9, 5),
  ('Prevotella',        7, 2),
  ('Bacteroides',       8, 4),
  ('Actinomicens',      6, 4)
on conflict (bacteria) do nothing;

-- ---------- Datos de ejemplo (opcional, descomentar para probar) ----------
-- insert into public.encuestas
--   (frecuencia_automedicacion, rango_edad, genero, antibioticos, sintomas,
--    grado_educacion, lugar_residencia, motivo_automedicacion)
-- values
--   ('Rara vez', 'De 18 a 29 años', 'Mujer', '{Amoxicilina}', '{Dolor,Sarro}',
--    'Universitario', 'Ciudad de la capital', 'Falta de tiempo para ir a consulta'),
--   ('Frecuentemente', 'De 40 a 49 años', 'Hombre', '{Azitromicina,Metronidazol}', '{Inflamación,Dolor}',
--    'Nivel secundario', 'Barrio', 'Recomendación de tercera persona'),
--   ('Nunca', 'De 60 años o más', 'Mujer', '{}', '{Sangrado}',
--    'Nivel primario', 'Campo de una provincia', 'Por prevención');
