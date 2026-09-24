<script setup>
import { onMounted, ref } from 'vue'
import { supabase } from '../lib/supabaseClient'

const eliminados = ref([])
const cargando = ref(true)
const errorMsg = ref('')
const restaurando = ref(null)

async function cargar() {
  cargando.value = true
  const { data, error } = await supabase
    .from('encuestas')
    .select('*')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })
  cargando.value = false

  if (error) {
    errorMsg.value = 'No se pudieron cargar los eliminados: ' + error.message
    return
  }
  eliminados.value = data ?? []
}

async function restaurar(e) {
  errorMsg.value = ''
  restaurando.value = e.id
  const { error } = await supabase
    .from('encuestas')
    .update({ deleted_at: null, deleted_by_nombre: null, deleted_by_matricula: null })
    .eq('id', e.id)
  restaurando.value = null

  if (error) {
    errorMsg.value = 'No se pudo restaurar: ' + error.message
    return
  }
  await cargar()
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

function colorFrecuencia(f) {
  if (f === 'Frecuentemente') return 'bg-amber-50 text-amber-700'
  if (f === 'Nunca') return 'bg-slate-100 text-slate-500'
  return 'bg-teal-50 text-teal-700'
}

onMounted(cargar)
</script>

<template>
  <main class="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6">
    <div class="anim-aparecer mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-800">Papelera</h1>
        <p class="mt-1 text-sm text-slate-500">
          Registros eliminados — se conservan en la base de datos y pueden restaurarse
        </p>
      </div>
      <span class="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
        {{ eliminados.length }} eliminado(s)
      </span>
    </div>

    <p
      v-if="errorMsg"
      class="mb-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-600"
    >
      {{ errorMsg }}
    </p>

    <div v-if="cargando" class="card flex items-center justify-center gap-3 py-16 text-sm text-slate-400">
      <svg class="h-5 w-5 animate-spin text-teal-600" viewBox="0 0 24 24" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
      </svg>
      Cargando…
    </div>

    <div v-else-if="eliminados.length === 0" class="card anim-aparecer py-16 text-center">
      <div class="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
        <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        </svg>
      </div>
      <p class="text-sm font-medium text-slate-500">La papelera está vacía</p>
      <p class="mt-1 text-xs text-slate-400">Los registros eliminados aparecerán aquí</p>
    </div>

    <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div
        v-for="(e, i) in eliminados"
        :key="e.id"
        class="card anim-aparecer !p-4"
        :style="{ animationDelay: i * 60 + 'ms' }"
      >
        <!-- Cabecera -->
        <div class="flex items-center justify-between gap-3">
          <span
            class="rounded-full px-2.5 py-1 text-[11px] font-semibold"
            :class="colorFrecuencia(e.frecuencia_automedicacion)"
          >
            {{ e.frecuencia_automedicacion }}
          </span>
          <span class="text-[11px] font-medium text-slate-400">#{{ e.id }}</span>
        </div>

        <!-- Resumen del paciente -->
        <div class="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Género</p>
            <p class="mt-0.5 text-[13px] font-medium text-slate-700">{{ e.genero }}</p>
          </div>
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Edad</p>
            <p class="mt-0.5 text-[13px] font-medium text-slate-700">{{ e.rango_edad }}</p>
          </div>
          <div class="col-span-2">
            <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Motivo</p>
            <p class="mt-0.5 text-[13px] font-medium text-slate-700">{{ e.motivo_automedicacion }}</p>
          </div>
        </div>

        <!-- Auditoría -->
        <div class="mt-3 space-y-1 rounded-xl bg-rose-50/70 px-3 py-2.5 text-[11px] leading-relaxed">
          <p class="text-rose-700">
            <span class="font-semibold">Eliminado por:</span>
            {{ e.deleted_by_nombre ?? '—' }}
            <span class="text-rose-400">· Mat. {{ e.deleted_by_matricula ?? '—' }}</span>
          </p>
          <p class="text-slate-400">{{ fechaHora(e.deleted_at) }}</p>
          <p class="border-t border-rose-100 pt-1 text-slate-400">
            Registrado por {{ e.registrado_nombre ?? '—' }}
            · Mat. {{ e.registrado_matricula ?? '—' }}
          </p>
        </div>

        <!-- Acción -->
        <button
          type="button"
          class="btn-outline mt-3 w-full"
          :disabled="restaurando === e.id"
          @click="restaurar(e)"
        >
          <svg
            v-if="restaurando === e.id"
            class="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
          </svg>
          <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          {{ restaurando === e.id ? 'Restaurando…' : 'Restaurar' }}
        </button>
      </div>
    </div>
  </main>
</template>
