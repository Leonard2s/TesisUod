import { supabase } from './supabaseClient'

// Datos del usuario autenticado (para auditoría de registros, acciones
// y pantallas de perfil). Igual que hace DatosView.
export async function usuarioActual() {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const meta = session?.user?.user_metadata ?? {}
  return {
    nombre: [meta.nombre, meta.apellido].filter(Boolean).join(' ') || '—',
    matricula: meta.matricula || session?.user?.email?.split('@')[0] || '—',
    correo: session?.user?.email ?? '—',
  }
}
