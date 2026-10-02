import { supabase } from './supabaseClient'

// Servicio de preguntas del cuestionario (tabla public.preguntas).
// Se administran desde la pantalla de Configuración.

// Preguntas activas (no borradas), ordenadas según `orden` (orden en
// que salen en el cuestionario). Con incluirEliminadas trae también
// las que están en la papelera.
export async function cargarPreguntas(incluirEliminadas = false) {
  let consulta = supabase.from('preguntas').select('*')
  consulta = incluirEliminadas
    ? consulta.not('deleted_at', 'is', null)
    : consulta.is('deleted_at', null)

  const { data, error } = await consulta
    .order('orden', { ascending: true })
    .order('id', { ascending: true })

  if (error) throw error
  return data ?? []
}

// Genera una clave tipo slug a partir del título de la pregunta.
// Ej: '¿Con qué frecuencia se automedica?' -> 'con_que_frecuencia_se_automedica'
export function slug(titulo) {
  return (titulo || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita tildes
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60)
}

// Etiqueta corta para gráficas, tablas y exportaciones
export function etiquetaDe(pregunta) {
  return pregunta?.etiqueta || pregunta?.titulo || ''
}

// Respuestas de una encuesta (jsonb) para una pregunta dada.
// Siempre devuelve un arreglo (las de opción única traen un elemento).
export function valoresDe(encuesta, clave) {
  const valor = encuesta?.respuestas?.[clave]
  return Array.isArray(valor) ? valor : []
}
