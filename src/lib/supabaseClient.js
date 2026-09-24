import { createClient } from '@supabase/supabase-js'
import { crearSupabaseDemo } from './demo'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Modo demo: se activa solo si no hay credenciales reales (o con
// VITE_MODO_DEMO=true). Permite probar login, datos y gráficas
// sin tocar Supabase.
export const MODO_DEMO =
  import.meta.env.VITE_MODO_DEMO === 'true' ||
  !supabaseUrl ||
  !supabaseAnonKey ||
  supabaseUrl.includes('placeholder') ||
  supabaseUrl.includes('tu-proyecto') ||
  supabaseAnonKey.includes('placeholder') ||
  supabaseAnonKey.includes('tu-anon-key')

export const supabase = MODO_DEMO
  ? crearSupabaseDemo()
  : createClient(supabaseUrl, supabaseAnonKey)

// Supabase Auth exige un correo electrónico. Como la app identifica a los
// usuarios por matrícula, se genera un correo interno a partir de ella.
export function correoDesdeMatricula(matricula) {
  const limpia = matricula.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '')
  return `${limpia}@tesis-uod.local`
}
