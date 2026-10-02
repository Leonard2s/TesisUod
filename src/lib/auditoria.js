import { supabase } from './supabaseClient'
import { usuarioActual } from './usuario'

// Auditoría de accesos: cada inicio de sesión deja una fila en la tabla
// `sesiones` (correo, nombre, matrícula, hora de entrada) y al cerrar
// sesión se completa la hora de salida. Se ve en la pantalla "Accesos".
//
// Además, registrarAccion deja constancia en la tabla `auditoria` de qué
// hace cada usuario y cuándo lo hace (crear/editar/eliminar encuestas y
// preguntas, reordenar, exportar…).

// Evita registrar un acceso duplicado si el evento de inicio de sesión
// se repite en menos de un minuto (p. ej. recargas de la página)
const UMBRAL_REPETIDO_MS = 60 * 1000

function datosDe(user) {
  const meta = user?.user_metadata ?? {}
  return {
    correo: user?.email ?? '—',
    nombre: [meta.nombre, meta.apellido].filter(Boolean).join(' ') || null,
    matricula: meta.matricula || null,
  }
}

// Se llama con el evento SIGNED_IN de onAuthStateChange
export async function registrarAcceso(user) {
  try {
    const { correo } = datosDe(user)

    // Si ya hay un acceso suyo sin cerrar de hace menos de un minuto,
    // se omite para no duplicar filas
    const { data, error } = await supabase
      .from('sesiones')
      .select('id, inicio, fin')
      .eq('correo', correo)
      .is('fin', null)
      .order('inicio', { ascending: false })
    if (error) throw error

    const ultimo = data?.[0]
    if (ultimo && Date.now() - new Date(ultimo.inicio).getTime() < UMBRAL_REPETIDO_MS) {
      return
    }

    const { error: errorInsert } = await supabase
      .from('sesiones')
      .insert({ ...datosDe(user), inicio: new Date().toISOString(), fin: null })
    if (errorInsert) throw errorInsert
  } catch (e) {
    // La auditoría nunca debe bloquear el inicio de sesión
    console.warn('No se pudo registrar el acceso:', e)
  }
}

// Se llama con el evento SIGNED_OUT (recibe el usuario de la sesión que
// acaba de cerrarse). Cierra su última sesión abierta.
export async function registrarSalida(user) {
  try {
    const { correo } = datosDe(user)

    const { data, error } = await supabase
      .from('sesiones')
      .select('id')
      .eq('correo', correo)
      .is('fin', null)
      .order('inicio', { ascending: false })
    if (error) throw error

    if (data?.length) {
      const { error: errorUpdate } = await supabase
        .from('sesiones')
        .update({ fin: new Date().toISOString() })
        .eq('id', data[0].id)
      if (errorUpdate) throw errorUpdate
    }
  } catch (e) {
    console.warn('No se pudo registrar la salida:', e)
  }
}

// Registra una acción en la auditoría de actividad (tabla `auditoria`):
// qué hizo el usuario y cuándo. Se llama tras completar la acción; si
// falla no interrumpe la operación, solo deja constancia en consola.
// Códigos usados: encuesta_creada, encuesta_eliminada, encuesta_restaurada,
// pregunta_creada, pregunta_editada, pregunta_eliminada,
// pregunta_restaurada, preguntas_reordenadas, exportacion.
export async function registrarAccion(accion, detalle) {
  try {
    const { correo, nombre, matricula } = await usuarioActual()
    const { error } = await supabase
      .from('auditoria')
      .insert({ correo, nombre, matricula, accion, detalle })
    if (error) throw error
  } catch (e) {
    console.warn('No se pudo registrar la acción en la auditoría:', e)
  }
}
