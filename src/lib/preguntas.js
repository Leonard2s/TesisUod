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

// Cuenta ocurrencias de una pregunta; las de selección múltiple cuentan
// cada valor. Con `orden` las etiquetas siguen el orden del cuestionario;
// sin él se ordenan de mayor a menor frecuencia. La usan las estadísticas
// y las exportaciones.
export function contarPor(items, clave, orden = null) {
  const conteo = {}
  for (const item of items) {
    for (const v of valoresDe(item, clave)) {
      if (v) conteo[v] = (conteo[v] ?? 0) + 1
    }
  }
  let entradas = Object.entries(conteo)
  if (orden) {
    entradas.sort((a, b) => {
      const ia = orden.indexOf(a[0])
      const ib = orden.indexOf(b[0])
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
    })
  } else {
    entradas.sort((a, b) => b[1] - a[1])
  }
  return {
    labels: entradas.map(([k]) => k),
    values: entradas.map(([, v]) => v),
  }
}
