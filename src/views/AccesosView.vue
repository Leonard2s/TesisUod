<script setup>
import { computed, onMounted, ref } from 'vue'
import { supabase } from '../lib/supabaseClient'

const sesiones = ref([])
const acciones = ref([])
const usuarios = ref([])
const cargando = ref(true)
const errorMsg = ref('')
const pestana = ref('actividad') // actividad | sesiones | usuarios
const filtroCorreo = ref('')

// Etiquetas y colores de cada tipo de acción para la pestaña Actividad
const ETIQUETAS_ACCION = {
  login: { texto: 'Sesión', clase: 'bg-slate-100 text-slate-500' },
  logout: { texto: 'Sesión', clase: 'bg-slate-100 text-slate-500' },
  encuesta_creada: { texto: 'Encuesta', clase: 'bg-teal-50 text-teal-700' },
  encuesta_eliminada: { texto: 'Encuesta', clase: 'bg-rose-50 text-rose-600' },
  encuesta_restaurada: { texto: 'Encuesta', clase: 'bg-teal-50 text-teal-700' },
  pregunta_creada: { texto: 'Pregunta', clase: 'bg-sky-50 text-sky-700' },
  pregunta_editada: { texto: 'Pregunta', clase: 'bg-sky-50 text-sky-700' },
  pregunta_eliminada: { texto: 'Pregunta', clase: 'bg-rose-50 text-rose-600' },
  pregunta_restaurada: { texto: 'Pregunta', clase: 'bg-sky-50 text-sky-700' },
  preguntas_reordenadas: { texto: 'Orden', clase: 'bg-amber-50 text-amber-700' },
  exportacion: { texto: 'Exportación', clase: 'bg-emerald-50 text-emerald-600' },
  importacion: { texto: 'Importación', clase: 'bg-cyan-50 text-cyan-700' },
}

async function cargar() {
  cargando.value = true
  errorMsg.value = ''
  const [resSesiones, resAcciones, resUsuarios] = await Promise.all([
    supabase.from('sesiones').select('*').order('inicio', { ascending: false }),
    supabase.from('auditoria').select('*').order('created_at', { ascending: false }).limit(200),
    supabase.from('usuarios').select('*').order('created_at', { ascending: false }),
  ])
  cargando.value = false

  if (resSesiones.error) {
    errorMsg.value = 'No se pudieron cargar los accesos: ' + resSesiones.error.message
    return
  }
  if (resAcciones.error) {
    errorMsg.value = 'No se pudo cargar la actividad: ' + resAcciones.error.message
    return
  }
  if (resUsuarios.error) {
    errorMsg.value = 'No se pudieron cargar los usuarios: ' + resUsuarios.error.message
    return
  }
  sesiones.value = resSesiones.data ?? []
  acciones.value = resAcciones.data ?? []
  usuarios.value = resUsuarios.data ?? []
}

// ---------- Resumen ----------
const resumen = computed(() => ({
  accesos: sesiones.value.length,
  usuarios: new Set(sesiones.value.map((s) => s.correo)).size,
  activas: sesiones.value.filter((s) => !s.fin).length,
  registrados: usuarios.value.length,
}))

// ---------- Filtro por usuario ----------
const correosDisponibles = computed(() => {
  const set = new Set([
    ...usuarios.value.map((u) => u.correo),
    ...sesiones.value.map((s) => s.correo),
    ...acciones.value.map((a) => a.correo),
  ])
  return [...set].filter(Boolean).sort()
})

const sesionesFiltradas = computed(() =>
  filtroCorreo.value
    ? sesiones.value.filter((s) => s.correo === filtroCorreo.value)
    : sesiones.value
)

// ---------- Actividad (auditoría + inicios/cierres de sesión) ----------
const actividad = computed(() => {
  const entradas = []

  for (const s of sesiones.value) {
    entradas.push({
      correo: s.correo,
      nombre: s.nombre,
      cuando: s.inicio,
      accion: 'login',
      detalle: 'Inició sesión',
    })
    if (s.fin) {
      entradas.push({
        correo: s.correo,
        nombre: s.nombre,
        cuando: s.fin,
        accion: 'logout',
        detalle: 'Cerró sesión',
      })
    }
  }

  for (const a of acciones.value) {
    entradas.push({
      correo: a.correo,
      nombre: a.nombre,
      cuando: a.created_at,
      accion: a.accion,
      detalle: a.detalle,
    })
  }

  return entradas
    .filter((e) => !filtroCorreo.value || e.correo === filtroCorreo.value)
    .sort((a, b) => new Date(b.cuando) - new Date(a.cuando))
    .slice(0, 200)
})

// ---------- Usuarios registrados ----------
// Última vez que cada usuario inició sesión (desde el historial)
const ultimoAcceso = computed(() => {
  const mapa = {}
  for (const s of sesiones.value) {
    if (!mapa[s.correo] || new Date(s.inicio) > new Date(mapa[s.correo])) {
      mapa[s.correo] = s.inicio
    }
  }
  return mapa
})

function etiquetaAccion(accion) {
  return ETIQUETAS_ACCION[accion] ?? { texto: 'Acción', clase: 'bg-slate-100 text-slate-500' }
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

function fecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-DO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
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
        <h1 class="text-2xl font-bold tracking-tight text-slate-800">Accesos y auditoría</h1>
        <p class="mt-1 max-w-2xl text-sm text-slate-500">
          Quién entra, qué hace cada usuario y cuándo lo hace.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <span class="rounded-full bg-teal-50 px-3 py-1 text-[11px] font-semibold text-teal-700">
          {{ resumen.accesos }} acceso(s)
        </span>
        <span class="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700">
          {{ resumen.usuarios }} usuario(s) con acceso
        </span>
        <span class="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
          {{ resumen.activas }} sesión(es) activa(s)
        </span>
        <span class="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
          {{ resumen.registrados }} registrado(s)
        </span>
      </div>
    </div>

    <p
      v-if="errorMsg"
      class="mb-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-600"
    >
      {{ errorMsg }}
    </p>

    <!-- Pestañas + filtro -->
    <div class="anim-aparecer mb-4 flex flex-wrap items-center justify-between gap-3" style="animation-delay: 40ms">
      <div class="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        <button
          v-for="p in [
            { id: 'actividad', texto: 'Actividad' },
            { id: 'sesiones', texto: 'Sesiones' },
            { id: 'usuarios', texto: 'Usuarios' },
          ]"
          :key="p.id"
          type="button"
          class="rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition"
          :class="pestana === p.id ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'"
          @click="pestana = p.id"
        >
          {{ p.texto }}
        </button>
      </div>

      <select
        v-if="pestana !== 'usuarios' && correosDisponibles.length"
        v-model="filtroCorreo"
        class="input !w-auto !py-2 text-[13px]"
      >
        <option value="">Todos los usuarios</option>
        <option v-for="c in correosDisponibles" :key="c" :value="c">{{ c }}</option>
      </select>
    </div>

    <div
      v-if="cargando"
      class="card flex items-center justify-center gap-3 py-16 text-sm text-slate-400"
    >
      <svg class="h-5 w-5 animate-spin text-teal-600" viewBox="0 0 24 24" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
      </svg>
      Cargando…
    </div>

    <!-- ============ Pestaña Actividad ============ -->
    <template v-else-if="pestana === 'actividad'">
      <p v-if="actividad.length" class="mb-3 text-xs text-slate-400">
        Últimas {{ actividad.length }} acción(es): inicios y cierres de sesión, encuestas,
        preguntas y exportaciones.
      </p>

      <div v-if="!actividad.length" class="card anim-aparecer py-14 text-center">
        <p class="text-sm font-medium text-slate-500">Todavía no hay actividad registrada</p>
        <p class="mt-1 text-xs text-slate-400">
          Cada acción (encuestas, preguntas, exportaciones…) queda registrada aquí
        </p>
      </div>

      <!-- Escritorio -->
      <template v-else>
      <div
        class="anim-aparecer hidden overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-900/[0.03] md:block"
      >
        <div class="overflow-x-auto">
          <table class="w-full min-w-[720px]">
            <thead>
              <tr class="border-b border-slate-100 bg-slate-50/80">
                <th class="th">Usuario</th>
                <th class="th">Acción</th>
                <th class="th">Detalle</th>
                <th class="th">Cuándo</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="(a, i) in actividad" :key="i" class="transition-colors hover:bg-teal-50/40">
                <td class="td">
                  <p class="text-[13px] font-medium text-slate-700">{{ a.nombre ?? a.correo }}</p>
                  <p class="text-[11px] text-slate-400">{{ a.correo }}</p>
                </td>
                <td class="td whitespace-nowrap">
                  <span class="rounded-full px-2.5 py-1 text-[11px] font-semibold" :class="etiquetaAccion(a.accion).clase">
                    {{ etiquetaAccion(a.accion).texto }}
                  </span>
                </td>
                <td class="td">{{ a.detalle }}</td>
                <td class="td whitespace-nowrap tabular-nums text-slate-400">{{ fechaHora(a.cuando) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Móvil -->
      <div class="space-y-3 md:hidden">
        <div v-for="(a, i) in actividad" :key="i" class="card !p-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate text-[14px] font-semibold text-slate-700">{{ a.nombre ?? a.correo }}</p>
              <p class="truncate text-[11px] text-slate-400">{{ a.correo }}</p>
            </div>
            <span class="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold" :class="etiquetaAccion(a.accion).clase">
              {{ etiquetaAccion(a.accion).texto }}
            </span>
          </div>
          <p class="mt-2 text-[13px] text-slate-600">{{ a.detalle }}</p>
          <p class="mt-1.5 text-[11px] text-slate-400">{{ fechaHora(a.cuando) }}</p>
        </div>
      </div>
      </template>
    </template>

    <!-- ============ Pestaña Sesiones ============ -->
    <template v-else-if="pestana === 'sesiones'">
      <p v-if="sesionesFiltradas.length" class="mb-3 text-xs text-slate-400">
        Una sesión queda como <span class="font-semibold text-amber-600">activa</span> hasta que el
        usuario cierra sesión con «Salir»; si cierra el navegador sin salir, aparecerá como activa
        hasta su próximo acceso.
      </p>

      <div v-if="!sesionesFiltradas.length" class="card anim-aparecer py-14 text-center">
        <p class="text-sm font-medium text-slate-500">No hay sesiones para mostrar</p>
      </div>

      <!-- Escritorio -->
      <template v-else>
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
              <tr v-for="s in sesionesFiltradas" :key="s.id" class="transition-colors hover:bg-teal-50/40">
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

      <!-- Móvil -->
      <div class="space-y-3 md:hidden">
        <div v-for="s in sesionesFiltradas" :key="s.id" class="card !p-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex min-w-0 items-center gap-2.5">
              <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-600/10 text-[13px] font-bold text-teal-700">
                {{ (s.nombre || s.correo || '?').trim().charAt(0).toUpperCase() }}
              </span>
              <div class="min-w-0">
                <p class="truncate text-[14px] font-semibold text-slate-700">{{ s.nombre ?? '—' }}</p>
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
    </template>

    <!-- ============ Pestaña Usuarios ============ -->
    <template v-else>
      <div
        class="card anim-aparecer mb-4 flex flex-wrap items-center justify-between gap-3 !p-4"
        style="animation-delay: 40ms"
      >
        <p class="text-sm text-slate-600">
          Hay <span class="text-lg font-bold text-teal-700">{{ usuarios.length }}</span>
          usuario(s) registrado(s) en la app.
        </p>
      </div>

      <div
        class="card anim-aparecer mb-4 border-amber-200/70 bg-amber-50/60 !p-4"
        style="animation-delay: 60ms"
      >
        <p class="text-[13px] font-semibold text-amber-800">¿Cómo elimino un usuario?</p>
        <p class="mt-1 text-[13px] leading-relaxed text-amber-700">
          Por seguridad solo se puede hacer desde Supabase:
          <span class="font-semibold">Dashboard → Authentication → Users → menú ⋯ del usuario → Delete user</span>.
          Al borrarlo, la persona ya no podrá iniciar sesión; su fila de esta lista desaparece, pero el
          historial de accesos y actividad se conserva como evidencia de auditoría.
        </p>
      </div>

      <div v-if="!usuarios.length" class="card anim-aparecer py-14 text-center">
        <p class="text-sm font-medium text-slate-500">No hay usuarios registrados todavía</p>
        <p class="mt-1 text-xs text-slate-400">
          Se registran automáticamente al crear una cuenta (o desde Authentication → Users)
        </p>
      </div>

      <!-- Escritorio -->
      <template v-else>
      <div
        class="anim-aparecer hidden overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-900/[0.03] md:block"
      >
        <div class="overflow-x-auto">
          <table class="w-full min-w-[720px]">
            <thead>
              <tr class="border-b border-slate-100 bg-slate-50/80">
                <th class="th">Usuario</th>
                <th class="th">Matrícula</th>
                <th class="th">Registrado</th>
                <th class="th">Último acceso</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="u in usuarios" :key="u.id" class="transition-colors hover:bg-teal-50/40">
                <td class="td">
                  <p class="text-[13px] font-medium text-slate-700">{{ u.nombre ?? '—' }}</p>
                  <p class="text-[11px] text-slate-400">{{ u.correo }}</p>
                </td>
                <td class="td whitespace-nowrap">{{ u.matricula ?? '—' }}</td>
                <td class="td whitespace-nowrap">{{ fecha(u.created_at) }}</td>
                <td class="td whitespace-nowrap tabular-nums">
                  {{ fechaHora(ultimoAcceso[u.correo]) ?? 'Nunca' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Móvil -->
      <div class="space-y-3 md:hidden">
        <div v-for="u in usuarios" :key="u.id" class="card !p-4">
          <div class="flex min-w-0 items-center gap-2.5">
            <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-600/10 text-[13px] font-bold text-teal-700">
              {{ (u.nombre || u.correo || '?').trim().charAt(0).toUpperCase() }}
            </span>
            <div class="min-w-0">
              <p class="truncate text-[14px] font-semibold text-slate-700">{{ u.nombre ?? '—' }}</p>
              <p class="truncate text-[11px] text-slate-400">{{ u.correo }}</p>
            </div>
          </div>
          <div class="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-slate-100 pt-3 text-[11px]">
            <div>
              <p class="font-semibold uppercase tracking-wider text-slate-400">Matrícula</p>
              <p class="mt-0.5 text-[13px] font-medium text-slate-700">{{ u.matricula ?? '—' }}</p>
            </div>
            <div>
              <p class="font-semibold uppercase tracking-wider text-slate-400">Registrado</p>
              <p class="mt-0.5 text-[13px] font-medium text-slate-700">{{ fecha(u.created_at) }}</p>
            </div>
            <div class="col-span-2">
              <p class="font-semibold uppercase tracking-wider text-slate-400">Último acceso</p>
              <p class="mt-0.5 text-[13px] font-medium text-slate-700">
                {{ fechaHora(ultimoAcceso[u.correo]) ?? 'Nunca' }}
              </p>
            </div>
          </div>
        </div>
      </div>
      </template>
    </template>
  </main>
</template>
