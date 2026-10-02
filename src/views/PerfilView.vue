<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { supabase } from '../lib/supabaseClient'

const cargando = ref(true)
const guardandoDatos = ref(false)
const guardandoClave = ref(false)
const errorMsg = ref('')
const datosOk = ref('')
const claveOk = ref('')

const sesion = ref(null)
const perfil = reactive({ nombre: '', apellido: '', matricula: '' })
const clave = reactive({ nueva: '', confirmar: '' })

const inicial = computed(() =>
  (perfil.nombre?.trim()?.[0] ?? sesion.value?.user?.email?.[0] ?? 'U').toUpperCase()
)

onMounted(async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  sesion.value = session
  const meta = session?.user?.user_metadata ?? {}
  perfil.nombre = meta.nombre ?? ''
  perfil.apellido = meta.apellido ?? ''
  perfil.matricula = meta.matricula ?? ''
  cargando.value = false
})

async function guardarPerfil() {
  errorMsg.value = ''
  datosOk.value = ''
  if (!perfil.nombre.trim() || !perfil.apellido.trim() || !perfil.matricula.trim()) {
    errorMsg.value = 'Completa nombre, apellido y matrícula'
    return
  }

  guardandoDatos.value = true
  const { data, error } = await supabase.auth.updateUser({
    data: {
      nombre: perfil.nombre.trim(),
      apellido: perfil.apellido.trim(),
      matricula: perfil.matricula.trim(),
    },
  })
  guardandoDatos.value = false

  if (error) {
    errorMsg.value = 'No se pudo actualizar el perfil: ' + error.message
    return
  }
  sesion.value.user = data.user
  datosOk.value = 'Datos actualizados correctamente'
}

async function cambiarClave() {
  errorMsg.value = ''
  claveOk.value = ''

  if (clave.nueva.length < 6) {
    errorMsg.value = 'La contraseña debe tener al menos 6 caracteres'
    return
  }
  if (clave.nueva !== clave.confirmar) {
    errorMsg.value = 'Las contraseñas nuevas no coinciden'
    return
  }

  guardandoClave.value = true
  const { error } = await supabase.auth.updateUser({ password: clave.nueva })
  guardandoClave.value = false

  if (error) {
    errorMsg.value = 'No se pudo cambiar la contraseña: ' + error.message
    return
  }
  clave.nueva = ''
  clave.confirmar = ''
  claveOk.value = 'Contraseña actualizada correctamente'
}
</script>

<template>
  <main class="mx-auto w-full max-w-2xl px-4 pb-16 pt-8 sm:px-6">
    <div class="anim-aparecer mb-6">
      <h1 class="text-2xl font-bold tracking-tight text-slate-800">Mi perfil</h1>
      <p class="mt-1 text-sm text-slate-500">
        Actualiza tus datos o cambia tu contraseña
      </p>
    </div>

    <div v-if="cargando" class="card flex items-center justify-center gap-3 py-16 text-sm text-slate-400">
      <svg class="h-5 w-5 animate-spin text-teal-600" viewBox="0 0 24 24" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
      </svg>
      Cargando…
    </div>

    <template v-else>
      <!-- Tarjeta de identidad -->
      <div class="card anim-aparecer mb-5 flex items-center gap-4" style="animation-delay: 40ms">
        <span class="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-xl font-bold text-white shadow-md shadow-teal-600/25">
          {{ inicial }}
        </span>
        <div class="min-w-0">
          <p class="truncate text-[15px] font-bold tracking-tight text-slate-800">
            {{ [perfil.nombre, perfil.apellido].filter(Boolean).join(' ') || 'Sin nombre' }}
          </p>
          <p class="truncate text-[13px] text-slate-400">{{ sesion?.user?.email ?? '—' }}</p>
        </div>
      </div>

      <p
        v-if="errorMsg"
        class="mb-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-600"
      >
        {{ errorMsg }}
      </p>

      <!-- Mis datos -->
      <div class="card anim-aparecer" style="animation-delay: 80ms">
        <h2 class="mb-4 text-base font-bold tracking-tight text-slate-800">Mis datos</h2>
        <div class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="label" for="f-nombre">Nombre</label>
              <input id="f-nombre" v-model="perfil.nombre" class="input" type="text" placeholder="Ej: Ana" />
            </div>
            <div>
              <label class="label" for="f-apellido">Apellido</label>
              <input id="f-apellido" v-model="perfil.apellido" class="input" type="text" placeholder="Ej: Pérez" />
            </div>
          </div>
          <div>
            <label class="label" for="f-matricula">Matrícula</label>
            <input
              id="f-matricula"
              v-model="perfil.matricula"
              class="input font-mono"
              type="text"
              placeholder="Ej: 1-20-1234"
            />
            <p class="mt-1 text-[11px] text-slate-400">
              La matrícula es tu nombre de usuario para iniciar sesión
            </p>
          </div>
        </div>

        <p
          v-if="datosOk"
          class="mt-4 rounded-xl bg-teal-50 px-3.5 py-2.5 text-xs font-medium text-teal-700"
        >
          {{ datosOk }}
        </p>

        <div class="mt-5 flex justify-end border-t border-slate-100 pt-4">
          <button
            type="button"
            class="btn-primary"
            :disabled="guardandoDatos"
            @click="guardarPerfil"
          >
            <svg v-if="guardandoDatos" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
            </svg>
            <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            {{ guardandoDatos ? 'Guardando…' : 'Guardar datos' }}
          </button>
        </div>
      </div>

      <!-- Cambiar contraseña -->
      <div class="card anim-aparecer mt-5" style="animation-delay: 120ms">
        <h2 class="mb-4 text-base font-bold tracking-tight text-slate-800">Cambiar contraseña</h2>
        <div class="space-y-4">
          <div>
            <label class="label" for="f-clave">Contraseña nueva</label>
            <input id="f-clave" v-model="clave.nueva" class="input" type="password" placeholder="Mínimo 6 caracteres" />
          </div>
          <div>
            <label class="label" for="f-clave2">Confirmar contraseña nueva</label>
            <input id="f-clave2" v-model="clave.confirmar" class="input" type="password" placeholder="Repite la contraseña" />
          </div>
        </div>

        <p
          v-if="claveOk"
          class="mt-4 rounded-xl bg-teal-50 px-3.5 py-2.5 text-xs font-medium text-teal-700"
        >
          {{ claveOk }}
        </p>

        <div class="mt-5 flex justify-end border-t border-slate-100 pt-4">
          <button
            type="button"
            class="btn-outline"
            :disabled="guardandoClave || !clave.nueva"
            @click="cambiarClave"
          >
            <svg v-if="guardandoClave" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
            </svg>
            <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            {{ guardandoClave ? 'Actualizando…' : 'Actualizar contraseña' }}
          </button>
        </div>
      </div>
    </template>
  </main>
</template>
