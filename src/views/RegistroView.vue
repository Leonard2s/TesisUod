<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase, MODO_DEMO, correoDesdeMatricula } from '../lib/supabaseClient'

const nombre = ref('')
const apellido = ref('')
const matricula = ref('')
const password = ref('')
const confirmar = ref('')
const cargando = ref(false)
const errorMsg = ref('')
const exitoMsg = ref('')
const router = useRouter()

async function registrar() {
  errorMsg.value = ''
  exitoMsg.value = ''

  if (password.value !== confirmar.value) {
    errorMsg.value = 'Las contraseñas no coinciden.'
    return
  }

  cargando.value = true
  const { data, error } = await supabase.auth.signUp({
    email: correoDesdeMatricula(matricula.value),
    password: password.value,
    options: {
      data: {
        nombre: nombre.value.trim(),
        apellido: apellido.value.trim(),
        matricula: matricula.value.trim(),
      },
    },
  })
  cargando.value = false

  if (error) {
    errorMsg.value =
      error.message === 'User already registered'
        ? 'Ya existe una cuenta registrada con esa matrícula.'
        : 'No se pudo crear la cuenta. Inténtalo de nuevo.'
    return
  }

  // Si Supabase devuelve sesión (confirmación de correo desactivada),
  // el usuario ya quedó dentro; si no, lo mandamos al login.
  if (data.session) {
    router.push({ name: 'datos' })
    return
  }

  exitoMsg.value = 'Cuenta creada. Ya puedes iniciar sesión.'
  setTimeout(() => router.push({ name: 'login' }), 1500)
}
</script>

<template>
  <div
    class="relative grid min-h-screen place-items-center overflow-hidden bg-gradient-to-br from-teal-50 via-slate-50 to-cyan-100 px-4 py-10"
  >
    <!-- Blobs decorativos -->
    <div class="anim-flotar pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-teal-300/30 blur-3xl"></div>
    <div class="anim-flotar pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-cyan-300/40 blur-3xl" style="animation-delay: -4s"></div>
    <div class="anim-flotar pointer-events-none absolute right-1/4 top-1/4 h-40 w-40 rounded-full bg-teal-200/30 blur-2xl" style="animation-delay: -7s"></div>

    <div class="anim-aparecer relative w-full max-w-md">
      <div class="rounded-3xl border border-white/70 bg-white/90 p-8 shadow-2xl shadow-teal-900/10 backdrop-blur">
        <div class="mb-6 flex flex-col items-center text-center">
          <span
            class="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-600/30"
          >
            <svg class="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z" />
            </svg>
          </span>
          <h1 class="text-2xl font-bold tracking-tight text-slate-800">Crear cuenta</h1>
          <p class="mt-1 text-sm text-slate-500">Regístrate con tu matrícula</p>
        </div>

        <p
          v-if="MODO_DEMO"
          class="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-700"
        >
          Modo demo (sin Supabase): los usuarios se guardan solo en este navegador.
        </p>

        <form @submit.prevent="registrar" class="space-y-4">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label for="nombre" class="label">Nombre</label>
              <input
                id="nombre"
                v-model="nombre"
                type="text"
                required
                autocomplete="given-name"
                placeholder="María"
                class="input"
              />
            </div>
            <div>
              <label for="apellido" class="label">Apellido</label>
              <input
                id="apellido"
                v-model="apellido"
                type="text"
                required
                autocomplete="family-name"
                placeholder="Pérez"
                class="input"
              />
            </div>
          </div>

          <div>
            <label for="matricula" class="label">Matrícula</label>
            <input
              id="matricula"
              v-model="matricula"
              type="text"
              required
              autocomplete="username"
              placeholder="Ej. 2023-0456"
              class="input"
            />
          </div>

          <div>
            <label for="password" class="label">Contraseña</label>
            <input
              id="password"
              v-model="password"
              type="password"
              required
              minlength="6"
              autocomplete="new-password"
              placeholder="Mínimo 6 caracteres"
              class="input"
            />
          </div>

          <div>
            <label for="confirmar" class="label">Confirmar contraseña</label>
            <input
              id="confirmar"
              v-model="confirmar"
              type="password"
              required
              minlength="6"
              autocomplete="new-password"
              placeholder="Repite la contraseña"
              class="input"
            />
          </div>

          <p
            v-if="errorMsg"
            class="rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-600"
          >
            {{ errorMsg }}
          </p>

          <p
            v-if="exitoMsg"
            class="rounded-xl bg-teal-50 px-3.5 py-2.5 text-xs font-medium text-teal-700"
          >
            {{ exitoMsg }}
          </p>

          <button type="submit" :disabled="cargando" class="btn-primary w-full">
            <svg
              v-if="cargando"
              class="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
            </svg>
            {{ cargando ? 'Registrando…' : 'Registrarme' }}
          </button>
        </form>

        <p class="mt-5 text-center text-sm text-slate-500">
          ¿Ya tienes cuenta?
          <RouterLink :to="{ name: 'login' }" class="font-semibold text-teal-600 hover:text-teal-700">
            Inicia sesión
          </RouterLink>
        </p>
      </div>

      <p class="mt-6 text-center text-xs text-slate-400">
        Universidad Odontológica Dominicana · Investigación en periodontitis crónica
      </p>
    </div>
  </div>
</template>
