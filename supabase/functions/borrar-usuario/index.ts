// Función Edge: borra-usuario
// Elimina un usuario de Supabase Auth desde la app. Solo administradores.
//
// Cómo desplegarla (una sola vez):
//   Supabase Dashboard -> Edge Functions -> New function ->
//   nombre: borra-usuario -> pegar TODO este archivo -> Deploy
//
// La clave de servicio (SUPABASE_SERVICE_ROLE_KEY) vive solo en el
// servidor de la función: nunca se expone al navegador. La app la llama
// con supabase.functions.invoke('borrar-usuario', { body: { id } }),
// enviando el JWT del usuario autenticado.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  try {
    const url = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !anonKey || !serviceKey) {
      return json({ error: 'La función no está configurada en este proyecto' }, 500)
    }

    // Cliente con el JWT de quien llama: respeta el RLS
    const cliente = createClient(url, anonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })
    const {
      data: { user },
    } = await cliente.auth.getUser()
    if (!user) return json({ error: 'No autenticado' }, 401)

    // Solo un administrador puede eliminar usuarios
    const { data: fila } = await cliente
      .from('usuarios')
      .select('es_admin')
      .eq('id', user.id)
      .maybeSingle()
    if (!fila?.es_admin) {
      return json({ error: 'Solo un administrador puede eliminar usuarios' }, 403)
    }

    const { id } = await req.json()
    if (!id || typeof id !== 'string') return json({ error: 'Falta el id del usuario' }, 400)
    if (id === user.id) {
      return json({ error: 'No puedes eliminar tu propia cuenta' }, 400)
    }

    // Eliminación con la clave de servicio (bypass del RLS)
    const adminClient = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { error } = await adminClient.auth.admin.deleteUser(id)
    if (error) return json({ error: error.message }, 500)

    return json({ ok: true })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Error inesperado' }, 500)
  }
})
