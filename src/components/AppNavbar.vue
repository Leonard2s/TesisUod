<script setup>
import { computed } from 'vue'
import { supabase } from '../lib/supabaseClient'

const props = defineProps({ email: { type: String, default: '' } })

const inicial = computed(() => (props.email?.trim()?.[0] ?? 'U').toUpperCase())

async function cerrarSesion() {
  await supabase.auth.signOut()
}
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
    <nav class="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 sm:px-6">
      <router-link :to="{ name: 'datos' }" class="flex items-center gap-2.5">
        <span
          class="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md shadow-teal-500/25"
        >
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z" />
          </svg>
        </span>
        <span class="leading-tight">
          <span class="block text-[15px] font-bold tracking-tight text-slate-800">Tesis UOD</span>
          <span class="block text-[11px] font-medium text-slate-400">Panel de investigación</span>
        </span>
      </router-link>

      <div class="flex items-center gap-1 text-sm font-medium">
        <router-link
          :to="{ name: 'datos' }"
          active-class="bg-teal-50 text-teal-700"
          class="rounded-lg px-3 py-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
        >
          Datos
        </router-link>
        <router-link
          :to="{ name: 'estadisticas' }"
          active-class="bg-teal-50 text-teal-700"
          class="rounded-lg px-3 py-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
        >
          Estadísticas
        </router-link>
        <router-link
          :to="{ name: 'papelera' }"
          active-class="bg-teal-50 text-teal-700"
          class="rounded-lg px-3 py-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
        >
          Papelera
        </router-link>
      </div>

      <div class="ml-auto flex items-center gap-2.5">
        <span class="hidden text-xs font-medium text-slate-400 md:block">{{ email }}</span>
        <span
          class="grid h-8 w-8 place-items-center rounded-full bg-teal-600/10 text-xs font-bold text-teal-700"
        >
          {{ inicial }}
        </span>
        <button
          type="button"
          class="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 active:scale-95"
          @click="cerrarSesion"
        >
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span class="hidden sm:inline">Salir</span>
        </button>
      </div>
    </nav>
  </header>
</template>
