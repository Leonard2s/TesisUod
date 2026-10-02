<script setup>
import { computed, onMounted, ref } from 'vue'
import { supabase } from '../lib/supabaseClient'

const sesiones = ref([])
const cargando = ref(true)
const errorMsg = ref('')

const resumen = computed(() => ({
  accesos: sesiones.value.length,
  usuarios: new Set(sesiones.value.map((s) => s.correo)).size,
  activas: sesiones.value.filter((s) => !s.fin).length,
}))

async function cargar() {
  cargando.value = true
  const { data, error } = await supabase
    .from('sesiones')
    .select('*')
    .order('inicio', { ascending: false })
  cargando.value = false

  if (error) {
    errorMsg.value = 'No se pudieron cargar los accesos: ' + error.message
    return
  }
  sesiones.value = data ?? []
}

function fechaHora(iso) {
  return new Date(iso).toLocaleString('es-DO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function duracion(s) {
  if (!s.fin) return null
  const minutos = Math.round((new Date(s.fin) - new Date(s.inicio)) / 60000)
  if (minutos < 1) return '< 1 min'
  if (minutos < 60) return `${minutos} min`
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  return resto ? `${horas} h ${resto} min` : `${horas} h`
}

onMounted(cargar)
</script>

<template>
  <main class="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6">
    <div class="anim-aparecer mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-800">Accesos de usuarios</h1>
        <p class="mt-1 max-w-2xl text-sm text-slate-500">
          Historial de inicios de sesión para auditoría: quién entró, cuándo
          y cuánto duró cada sesión.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <span class="rounded-full bg-teal-50 px-3 py-1 text-[11px] font-semibold text-teal-700">
          {{ resumen.accesos }} acceso(s)
        </span>
        <span class="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700">
          {{ resumen.usuarios }} usuario(s)
        </span>
        <span class="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
          {{ resumen.activas }} activa(s)
        </span>
      </div>
    </div>

    <p class="anim-aparecer mb-4 text-xs text-slate-400" style="animation-delay: 40ms">
      Una sesión queda como <span class="font-semibold text-amber-600">activa</span> hasta que el
      usuario cierra sesión con «Salir»; si cierra el navegador sin salir, aparecerá como activa
      hasta su próximo acceso.
    </p>

    <p
      v-if="errorMsg"
      class="mb-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-600"
    >
      {{ errorMsg }}
    </p>

    <div
      v-if="cargando"
      class="card flex items-center justify-center gap-3 py-16 text-sm text-slate-400"
    >
      <svg class="h-5 w-5 animate-spin text-teal-600" viewBox="0 0 24 24" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
      </svg>
      Cargando accesos…
    </div>

    <div v-else-if="sesiones.length === 0" class="card anim-aparecer py-16 text-center">
      <div class="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
        <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>
      <p class="text-sm font-medium text-slate-500">Todavía no hay accesos registrados</p>
      <p class="mt-1 text-xs text-slate-400">
        Los inicios de sesión se registran automáticamente desde que existe esta pantalla
      </p>
    </div>

    <template v-else>
      <!-- Vista escritorio: tabla -->
      <div
        class="anim-aparecer hidden overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-900/[0.03] md:block"
      >
        <div class="overflow-x-auto">
          <table class="w-full min-w-[720px]">
            <thead>
              <tr class="border-b border-slate-100 bg-slate-50/80">
                <th class="th">Usuario</th>
                <th class="th">Matrícula</th>
                <th class="th">Inicio de sesión</th>
                <th class="th">Fin</th>
                <th class="th">Duración</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="s in sesiones" :key="s.id" class="transition-colors hover:bg-teal-50/40">
                <td class="td">
                  <p class="text-[13px] font-medium text-slate-700">{{ s.nombre ?? '—' }}</p>
                  <p class="text-[11px] text-slate-400">{{ s.correo }}</p>
                </td>
                <td class="td whitespace-nowrap">{{ s.matricula ?? '—' }}</td>
                <td class="td whitespace-nowrap">{{ fechaHora(s.inicio) }}</td>
                <td class="td whitespace-nowrap">
                  <span
                    v-if="!s.fin"
                    class="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700"
                  >
                    Activa
                  </span>
                  <span v-else class="text-slate-400">{{ fechaHora(s.fin) }}</span>
                </td>
                <td class="td whitespace-nowrap tabular-nums">{{ duracion(s) ?? '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Vista móvil: tarjetas -->
      <div class="space-y-3 md:hidden">
        <div
          v-for="(s, i) in sesiones"
          :key="s.id"
          class="card anim-aparecer !p-4"
          :style="{ animationDelay: i * 50 + 'ms' }"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex min-w-0 items-center gap-2.5">
              <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-600/10 text-[13px] font-bold text-teal-700">
                {{ (s.nombre || s.correo || '?').trim().charAt(0).toUpperCase() }}
              </span>
              <div class="min-w-0">
                <p class="truncate text-[14px] font-semibold text-slate-700">
                  {{ s.nombre ?? '—' }}
                </p>
                <p class="truncate text-[11px] text-slate-400">{{ s.correo }}</p>
              </div>
            </div>
            <span
              v-if="!s.fin"
              class="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700"
            >
              Activa
            </span>
          </div>

          <div class="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-slate-100 pt-3 text-[11px]">
            <div>
              <p class="font-semibold uppercase tracking-wider text-slate-400">Matrícula</p>
              <p class="mt-0.5 text-[13px] font-medium text-slate-700">{{ s.matricula ?? '—' }}</p>
            </div>
            <div>
              <p class="font-semibold uppercase tracking-wider text-slate-400">Duración</p>
              <p class="mt-0.5 text-[13px] font-medium text-slate-700">{{ duracion(s) ?? '—' }}</p>
            </div>
            <div>
              <p class="font-semibold uppercase tracking-wider text-slate-400">Inicio</p>
              <p class="mt-0.5 text-[13px] font-medium text-slate-700">{{ fechaHora(s.inicio) }}</p>
            </div>
            <div>
              <p class="font-semibold uppercase tracking-wider text-slate-400">Fin</p>
              <p class="mt-0.5 text-[13px] font-medium text-slate-700">
                {{ s.fin ? fechaHora(s.fin) : '—' }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </main>
</template>
