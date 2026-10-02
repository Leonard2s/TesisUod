-- ============================================================
-- Tesis UOD - Migración a preguntas dinámicas
-- Ejecutar en: Supabase Dashboard -> SQL Editor
--
-- Qué hace este script (es idempotente: se puede re-ejecutar):
--   1. Crea la tabla `preguntas` (CRUD de preguntas con borrado lógico).
--   2. Agrega la columna `respuestas` (jsonb) a `encuestas`.
--   3. Siembra las 8 preguntas que estaban harcodeadas en el frontend.
--   4. Copia los datos ya existentes de encuestas al nuevo formato
--      (las columnas originales NO se tocan ni se borran: cero pérdida
--      de datos; solo se duplican en `respuestas` con la clave de cada
--      pregunta).
-- ============================================================

-- ---------- 1) Tabla de preguntas ----------
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

-- ---------- 2) Columna de respuestas en encuestas ----------
-- Guarda un objeto { clave_pregunta: [respuestas...] }.
-- Ej: { "frecuencia_automedicacion": ["Rara vez"], "antibioticos": ["Amoxicilina"] }
alter table public.encuestas
  add column if not exists respuestas jsonb not null default '{}'::jsonb;

-- Las columnas originales dejan de ser obligatorias: las encuestas nuevas
-- ya solo escriben en `respuestas`. Esto NO borra ni modifica datos, solo
-- relaja la restricción para que los inserts nuevos funcionen.
alter table public.encuestas
  alter column frecuencia_automedicacion drop not null,
  alter column rango_edad drop not null,
  alter column genero drop not null,
  alter column antibioticos drop not null,
  alter column sintomas drop not null,
  alter column grado_educacion drop not null,
  alter column lugar_residencia drop not null,
  alter column motivo_automedicacion drop not null;

-- ---------- 3) Seed: las 8 preguntas que estaban harcodeadas ----------
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

-- ---------- 4) Migrar los datos ya existentes (sin borrar nada) ----------
-- Copia las columnas originales de cada encuesta al jsonb `respuestas`.
-- Solo toca filas que todavía no tienen respuestas, así que es seguro
-- re-ejecutarlo y no afecta encuestas nuevas.
update public.encuestas
set respuestas = jsonb_build_object(
  'frecuencia_automedicacion', to_jsonb(array[frecuencia_automedicacion]),
  'rango_edad',                 to_jsonb(array[rango_edad]),
  'genero',                     to_jsonb(array[genero]),
  'antibioticos',               to_jsonb(antibioticos),
  'sintomas',                   to_jsonb(sintomas),
  'grado_educacion',            to_jsonb(array[grado_educacion]),
  'lugar_residencia',           to_jsonb(array[lugar_residencia]),
  'motivo_automedicacion',      to_jsonb(array[motivo_automedicacion])
)
where respuestas = '{}'::jsonb
  and frecuencia_automedicacion is not null;

-- ---------- Seguridad (RLS) ----------
-- Igual que encuestas: solo usuarios autenticados. No hay política de
-- delete porque el borrado es lógico (update de deleted_at).
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

-- ---------- Verificación opcional ----------
-- Descomenta para revisar el resultado tras ejecutar:
-- select id, clave, tipo, orden, deleted_at from public.preguntas order by orden;
-- select id, respuestas from public.encuestas order by id desc limit 5;
