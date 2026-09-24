<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { supabase } from '../lib/supabaseClient'
import {
  FRECUENCIAS,
  RANGOS_EDAD,
  GENEROS,
  ANTIBIOTICOS,
  SINTOMAS,
  GRADOS_EDUCACION,
  LUGARES_RESIDENCIA,
  MOTIVOS,
} from '../lib/opciones'

const encuestas = ref([])
const cargando = ref(true)
const guardando = ref(false)
const errorMsg = ref('')
const mostrarFormulario = ref(false)
const guardado = ref(false)

const pasos = [
  { campo: 'frecuencia_automedicacion', titulo: '¿Con qué frecuencia se automedica?', tipo: 'unica', opciones: FRECUENCIAS },
  { campo: 'rango_edad', titulo: '¿Qué edad tienes?', tipo: 'unica', opciones: RANGOS_EDAD },
  { campo: 'genero', titulo: 'Género', tipo: 'unica', opciones: GENEROS },
  { campo: 'antibioticos', titulo: '¿Con cuál o cuáles antibióticos se ha automedicado?', tipo: 'multiple', opciones: ANTIBIOTICOS },
  { campo: 'sintomas', titulo: '¿Cuáles de los siguientes síntomas ha notado?', tipo: 'multiple', opciones: SINTOMAS },
  { campo: 'grado_educacion', titulo: '¿Cuál es su grado de educación?', tipo: 'unica', opciones: GRADOS_EDUCACION },
  { campo: 'lugar_residencia', titulo: '¿Cuál es su lugar de residencia?', tipo: 'unica', opciones: LUGARES_RESIDENCIA },
  { campo: 'motivo_automedicacion', titulo: '¿Por qué se automedica?', tipo: 'unica', opciones: MOTIVOS },
]

const paso = ref(0)
const direccion = ref('slide-izq')
const pasoActual = computed(() => pasos[paso.value])
const esUltimo = computed(() => paso.value === pasos.length - 1)
const progreso = computed(() => ((paso.value + 1) / pasos.length) * 100)

const formularioVacio = {
  frecuencia_automedicacion: '',
  rango_edad: '',
  genero: '',
  antibioticos: [],
  sintomas: [],
  grado_educacion: '',
  lugar_residencia: '',
  motivo_automedicacion: '',
}

const formulario = reactive({ ...formularioVacio })

const respondido = computed(() => {
  const valor = formulario[pasoActual.value.campo]
  return Array.isArray(valor) ? true : !!valor
})

// Bloquea el scroll de fondo mientras la encuesta está a pantalla completa
watch(mostrarFormulario, (abierto) => {
  document.body.style.overflow = abierto ? 'hidden' : ''
  if (abierto) {
    paso.value = 0
    direccion.value = 'slide-izq'
    guardado.value = false
  }
})

onUnmounted(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', alPresionarTecla)
})

function seleccionar(opcion) {
  const actual = paso.value
  formulario[pasos[actual].campo] = opcion
  if (esUltimo.value) return
  // Auto-avanza tras una pausa breve para que se vea la selección
  setTimeout(() => {
    if (paso.value === actual) {
      direccion.value = 'slide-izq'
      paso.value++
    }
  }, 220)
}

function siguiente() {
  if (!respondido.value) return
  if (esUltimo.value) {
    guardar()
    return
  }
  direccion.value = 'slide-izq'
  paso.value++
}

function anterior() {
  if (paso.value === 0) return
  direccion.value = 'slide-der'
  paso.value--
}

function otraRespuesta() {
  guardado.value = false
  paso.value = 0
  direccion.value = 'slide-izq'
}

function cerrarEncuesta() {
  mostrarFormulario.value = false
  guardado.value = false
}

// ---------- Modal de detalle ----------
const detalle = ref(null)

const camposDetalle = [
  { titulo: '1. ¿Con qué frecuencia se automedica?', clave: 'frecuencia_automedicacion' },
  { titulo: '2. ¿Qué edad tienes?', clave: 'rango_edad' },
  { titulo: '3. Género', clave: 'genero' },
  { titulo: '4. ¿Con cuál o cuáles antibióticos se ha automedicado?', clave: 'antibioticos', multiple: true },
  { titulo: '5. ¿Cuáles de los siguientes síntomas ha notado?', clave: 'sintomas', multiple: true },
  { titulo: '6. ¿Cuál es su grado de educación?', clave: 'grado_educacion' },
  { titulo: '7. ¿Cuál es su lugar de residencia?', clave: 'lugar_residencia' },
  { titulo: '8. ¿Por qué se automedica?', clave: 'motivo_automedicacion' },
]

function colorFrecuencia(f) {
  if (f === 'Frecuentemente') return 'bg-amber-50 text-amber-700'
  if (f === 'Nunca') return 'bg-slate-100 text-slate-500'
  return 'bg-teal-50 text-teal-700'
}

watch(detalle, (abierto) => {
  document.body.style.overflow = abierto || mostrarFormulario.value ? 'hidden' : ''
  if (!abierto) confirmandoEliminar.value = false
})

// ---------- Borrado lógico ----------
const eliminando = ref(false)
const confirmandoEliminar = ref(false)

async function eliminarRegistro() {
  if (!detalle.value) return
  eliminando.value = true

  // Auditoría: quién eliminó el registro
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const meta = session?.user?.user_metadata ?? {}
  const deleted_by_nombre = [meta.nombre, meta.apellido].filter(Boolean).join(' ') || '—'
  const deleted_by_matricula = meta.matricula || session?.user?.email?.split('@')[0] || '—'

  const { error } = await supabase
    .from('encuestas')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by_nombre,
      deleted_by_matricula,
    })
    .eq('id', detalle.value.id)
  eliminando.value = false

  if (error) {
    errorMsg.value = 'No se pudo eliminar: ' + error.message
    return
  }
  detalle.value = null
  await cargar()
}

function alPresionarTecla(ev) {
  if (ev.key === 'Escape') detalle.value = null
}

async function cargar() {
  cargando.value = true
  const { data, error } = await supabase
    .from('encuestas')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  cargando.value = false
  if (error) {
    errorMsg.value = 'No se pudieron cargar los datos: ' + error.message
    return
  }
  encuestas.value = data ?? []
}

async function guardar() {
  errorMsg.value = ''
  guardando.value = true

  // Quién registra el dato (matrícula + nombre del usuario autenticado)
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const meta = session?.user?.user_metadata ?? {}
  const registrado_nombre = [meta.nombre, meta.apellido].filter(Boolean).join(' ') || '—'
  const registrado_matricula = meta.matricula || session?.user?.email?.split('@')[0] || '—'

  const { error } = await supabase
    .from('encuestas')
    .insert({ ...formulario, registrado_nombre, registrado_matricula })
  guardando.value = false

  if (error) {
    errorMsg.value = 'No se pudo guardar: ' + error.message
    return
  }

  Object.assign(formulario, { ...formularioVacio, antibioticos: [], sintomas: [] })
  paso.value = 0
  direccion.value = 'slide-izq'
  guardado.value = true
  await cargar()
}

function fechaCorta(iso) {
  return new Date(iso).toLocaleDateString('es-DO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

onMounted(() => {
  cargar()
  window.addEventListener('keydown', alPresionarTecla)
})
</script>

<template>
  <main class="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6">
    <div class="anim-aparecer mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-800">Datos de la encuesta</h1>
        <p class="mt-1 text-sm text-slate-500">
          Respuestas del cuestionario sobre automedicación con antibióticos
        </p>
      </div>
      <button type="button" class="btn-primary" @click="mostrarFormulario = true">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Nueva encuesta
      </button>
    </div>

    <!-- ============ Encuesta a pantalla completa (modo paciente) ============ -->
    <transition name="fade">
      <div
        v-if="mostrarFormulario"
        class="fixed inset-0 z-[60] overflow-y-auto bg-gradient-to-br from-teal-50 via-slate-50 to-cyan-100"
      >
        <!-- Blobs decorativos -->
        <div class="anim-flotar pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-teal-300/25 blur-3xl"></div>
        <div class="anim-flotar pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-cyan-300/30 blur-3xl" style="animation-delay: -4s"></div>

        <!-- Botón salir -->
        <button
          type="button"
          class="fixed right-4 top-4 z-10 flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2 text-xs font-semibold text-slate-500 shadow-sm backdrop-blur transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 active:scale-95"
          @click="cerrarEncuesta"
        >
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
          Salir
        </button>

        <div class="flex min-h-full items-center justify-center px-4 py-14">
          <div class="anim-aparecer w-full max-w-xl">
            <!-- Marca -->
            <div class="mb-6 flex items-center justify-center gap-2.5">
              <span class="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md shadow-teal-500/25">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z" />
                </svg>
              </span>
              <div class="text-left leading-tight">
                <p class="text-[15px] font-bold tracking-tight text-slate-800">Encuesta para pacientes</p>
                <p class="text-[11px] font-medium text-slate-400">Tesis UOD · Periodoncia</p>
              </div>
            </div>

            <div class="rounded-3xl border border-white/70 bg-white/95 p-6 shadow-2xl shadow-teal-900/10 backdrop-blur sm:p-8">
              <!-- ============ Stepper ============ -->
              <template v-if="!guardado">
                <div class="mb-2 flex items-center justify-between">
                  <span class="text-[11px] font-bold uppercase tracking-widest text-teal-600">
                    Pregunta {{ paso + 1 }} de {{ pasos.length }}
                  </span>
                  <span class="text-[11px] font-medium text-slate-400">{{ Math.round(progreso) }}%</span>
                </div>
                <div class="mb-7 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    class="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-500 ease-out"
                    :style="{ width: progreso + '%' }"
                  ></div>
                </div>

                <transition :name="direccion" mode="out-in">
                  <div :key="paso">
                    <h2 class="mb-1 text-xl font-bold tracking-tight text-slate-800 sm:text-2xl">
                      {{ pasoActual.titulo }}
                    </h2>
                    <p class="mb-6 text-[13px] text-slate-400">
                      {{ pasoActual.tipo === 'multiple' ? 'Puedes elegir varias opciones' : 'Elige una opción' }}
                    </p>

                    <!-- Opción única: tarjetas grandes -->
                    <div v-if="pasoActual.tipo === 'unica'" class="space-y-3">
                      <button
                        v-for="op in pasoActual.opciones"
                        :key="op"
                        type="button"
                        class="group flex w-full items-center justify-between gap-3 rounded-2xl border px-5 py-4 text-left text-[15px] font-medium transition duration-200 active:scale-[.99] sm:text-base"
                        :class="
                          formulario[pasoActual.campo] === op
                            ? 'border-teal-600 bg-teal-50 text-teal-800 shadow-md shadow-teal-600/10'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:bg-teal-50/50'
                        "
                        @click="seleccionar(op)"
                      >
                        {{ op }}
                        <span
                          class="grid h-6 w-6 shrink-0 place-items-center rounded-full border transition duration-200"
                          :class="
                            formulario[pasoActual.campo] === op
                              ? 'border-teal-600 bg-teal-600 text-white'
                              : 'border-slate-300 text-transparent group-hover:border-teal-300'
                          "
                        >
                          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        </span>
                      </button>
                    </div>

                    <!-- Selección múltiple: chips grandes -->
                    <div v-else class="flex flex-wrap gap-2.5">
                      <label v-for="op in pasoActual.opciones" :key="op" class="cursor-pointer">
                        <input
                          type="checkbox"
                          class="peer sr-only"
                          :value="op"
                          v-model="formulario[pasoActual.campo]"
                        />
                        <span
                          class="inline-block rounded-full border px-5 py-2.5 text-[15px] font-medium transition duration-200 active:scale-95 sm:text-base"
                          :class="
                            pasoActual.campo === 'antibioticos'
                              ? 'border-slate-200 bg-slate-50 text-slate-500 hover:border-teal-300 peer-checked:border-teal-600 peer-checked:bg-teal-600 peer-checked:text-white peer-checked:shadow-md peer-checked:shadow-teal-600/25'
                              : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-sky-300 peer-checked:border-sky-600 peer-checked:bg-sky-600 peer-checked:text-white peer-checked:shadow-md peer-checked:shadow-sky-600/25'
                          "
                        >
                          {{ op }}
                        </span>
                      </label>
                    </div>
                  </div>
                </transition>

                <p
                  v-if="errorMsg"
                  class="mt-5 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-600"
                >
                  {{ errorMsg }}
                </p>

                <!-- Navegación -->
                <div class="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
                  <button
                    type="button"
                    class="btn-outline px-5 py-3"
                    :disabled="paso === 0"
                    @click="anterior"
                  >
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Atrás
                  </button>

                  <button
                    v-if="!esUltimo"
                    type="button"
                    class="btn-primary px-6 py-3"
                    :disabled="!respondido"
                    @click="siguiente"
                  >
                    Siguiente
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>

                  <button
                    v-else
                    type="button"
                    class="btn-primary px-6 py-3"
                    :disabled="guardando || !respondido"
                    @click="guardar"
                  >
                    <svg v-if="guardando" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                      <path class="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
                    </svg>
                    <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    {{ guardando ? 'Guardando…' : 'Enviar respuesta' }}
                  </button>
                </div>
              </template>

              <!-- ============ Pantalla de éxito ============ -->
              <div v-else class="py-8 text-center">
                <span class="anim-zoom mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-xl shadow-teal-600/30">
                  <svg class="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                <h2 class="anim-aparecer text-2xl font-bold tracking-tight text-slate-800" style="animation-delay: 100ms">
                  ¡Gracias!
                </h2>
                <p class="anim-aparecer mt-1.5 text-sm text-slate-500" style="animation-delay: 180ms">
                  Tu respuesta fue registrada correctamente.
                </p>
                <div class="anim-aparecer mt-8 flex flex-col gap-2.5 sm:flex-row sm:justify-center" style="animation-delay: 260ms">
                  <button type="button" class="btn-primary px-6 py-3" @click="otraRespuesta">
                    Registrar otra respuesta
                  </button>
                  <button type="button" class="btn-outline px-6 py-3" @click="cerrarEncuesta">
                    Salir
                  </button>
                </div>
              </div>
            </div>

            <p class="mt-5 text-center text-xs text-slate-400">
              Tesis UOD · Universidad Odontológica Dominicana
            </p>
          </div>
        </div>
      </div>
    </transition>

    <!-- ============ Tabla de respuestas ============ -->
    <div
      class="anim-aparecer overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-900/[0.03]"
      style="animation-delay: 80ms"
    >
      <div v-if="cargando" class="flex items-center justify-center gap-3 py-16 text-sm text-slate-400">
        <svg class="h-5 w-5 animate-spin text-teal-600" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
        </svg>
        Cargando datos…
      </div>

      <div v-else-if="encuestas.length === 0" class="py-16 text-center">
        <div class="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
          <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M8 10h8M8 14h5" />
          </svg>
        </div>
        <p class="text-sm font-medium text-slate-500">Todavía no hay respuestas registradas</p>
        <p class="mt-1 text-xs text-slate-400">Inicia una nueva encuesta con el botón de arriba</p>
      </div>

      <template v-else>
      <!-- Vista móvil: tarjetas resumidas -->
      <div class="space-y-3 p-3 md:hidden">
        <button
          v-for="e in encuestas"
          :key="e.id"
          type="button"
          class="w-full rounded-2xl border border-slate-200/70 bg-white p-4 text-left shadow-sm transition duration-200 hover:border-teal-200 hover:shadow-md active:scale-[.99]"
          @click="detalle = e"
        >
          <!-- Cabecera: frecuencia + fecha -->
          <div class="flex items-center justify-between gap-3">
            <span
              class="rounded-full px-2.5 py-1 text-[11px] font-semibold"
              :class="colorFrecuencia(e.frecuencia_automedicacion)"
            >
              {{ e.frecuencia_automedicacion }}
            </span>
            <span class="text-[11px] font-medium text-slate-400">
              {{ fechaCorta(e.created_at) }}
            </span>
          </div>

          <!-- Datos del paciente en grid 2x2 -->
          <div class="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
            <div>
              <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Género</p>
              <p class="mt-0.5 text-[13px] font-medium text-slate-700">{{ e.genero }}</p>
            </div>
            <div>
              <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Edad</p>
              <p class="mt-0.5 text-[13px] font-medium text-slate-700">{{ e.rango_edad }}</p>
            </div>
            <div>
              <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Educación</p>
              <p class="mt-0.5 text-[13px] font-medium text-slate-700">{{ e.grado_educacion }}</p>
            </div>
            <div>
              <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Residencia</p>
              <p class="mt-0.5 truncate text-[13px] font-medium text-slate-700">{{ e.lugar_residencia }}</p>
            </div>
          </div>

          <!-- Antibióticos y síntomas -->
          <div class="mt-3 space-y-2 border-t border-slate-100 pt-3">
            <div class="flex items-start gap-2">
              <span class="mt-0.5 w-20 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Antibióticos
              </span>
              <div class="flex flex-wrap gap-1">
                <template v-if="e.antibioticos?.length">
                  <span v-for="a in e.antibioticos" :key="a" class="chip">{{ a }}</span>
                </template>
                <span v-else class="text-[11px] text-slate-300">—</span>
              </div>
            </div>
            <div class="flex items-start gap-2">
              <span class="mt-0.5 w-20 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Síntomas
              </span>
              <div class="flex flex-wrap gap-1">
                <template v-if="e.sintomas?.length">
                  <span
                    v-for="s in e.sintomas"
                    :key="s"
                    class="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-medium text-sky-700"
                  >
                    {{ s }}
                  </span>
                </template>
                <span v-else class="text-[11px] text-slate-300">—</span>
              </div>
            </div>
          </div>

          <!-- Motivo + ver detalle -->
          <div class="mt-3 flex items-center justify-between gap-3">
            <p class="min-w-0 truncate text-[11px] text-slate-400">
              <span class="font-semibold text-slate-500">Motivo:</span> {{ e.motivo_automedicacion }}
              <template v-if="e.registrado_matricula">
                · <span class="font-semibold text-slate-500">Reg:</span> {{ e.registrado_matricula }}
              </template>
            </p>
            <span class="flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-teal-600">
              Ver
              <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </span>
          </div>
        </button>
      </div>

      <!-- Vista escritorio: tabla resumida (clic para ver detalle) -->
      <div class="hidden overflow-x-auto md:block">
        <table class="w-full min-w-[720px]">
          <thead>
            <tr class="border-b border-slate-100 bg-slate-50/80">
              <th class="th">Fecha</th>
              <th class="th">Género</th>
              <th class="th">Edad</th>
              <th class="th">Frecuencia</th>
              <th class="th">Antibióticos</th>
              <th class="th">Registrado por</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="e in encuestas"
              :key="e.id"
              class="cursor-pointer transition-colors hover:bg-teal-50/40"
              @click="detalle = e"
            >
              <td class="td whitespace-nowrap text-slate-400">{{ fechaCorta(e.created_at) }}</td>
              <td class="td whitespace-nowrap">{{ e.genero }}</td>
              <td class="td whitespace-nowrap">{{ e.rango_edad }}</td>
              <td class="td whitespace-nowrap">
                <span
                  class="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  :class="colorFrecuencia(e.frecuencia_automedicacion)"
                >
                  {{ e.frecuencia_automedicacion }}
                </span>
              </td>
              <td class="td">
                <div class="flex max-w-[200px] flex-wrap gap-1">
                  <template v-if="e.antibioticos?.length">
                    <span v-for="a in e.antibioticos.slice(0, 2)" :key="a" class="chip">{{ a }}</span>
                    <span v-if="e.antibioticos.length > 2" class="text-[11px] font-medium text-slate-400">
                      +{{ e.antibioticos.length - 2 }}
                    </span>
                  </template>
                  <span v-else class="text-slate-300">—</span>
                </div>
              </td>
              <td class="td whitespace-nowrap">
                <template v-if="e.registrado_matricula">
                  <p class="text-[13px] font-medium text-slate-700">{{ e.registrado_nombre }}</p>
                  <p class="text-[11px] text-slate-400">Mat. {{ e.registrado_matricula }}</p>
                </template>
                <span v-else class="text-slate-300">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      </template>
    </div>

    <!-- ============ Modal de detalle ============ -->
    <transition name="modal">
      <div
        v-if="detalle"
        class="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/45 backdrop-blur-sm sm:items-center sm:p-6"
        @click.self="detalle = null"
      >
        <div
          class="modal-card max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
          role="dialog"
          aria-modal="true"
        >
          <div class="mb-5 flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <span class="grid h-10 w-10 place-items-center rounded-xl bg-teal-600/10 text-teal-700">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <path d="M8 10h8M8 14h5" />
                </svg>
              </span>
              <div>
                <h3 class="text-base font-bold tracking-tight text-slate-800">
                  Respuesta #{{ detalle.id }}
                </h3>
                <p class="text-[11px] text-slate-400">{{ fechaCorta(detalle.created_at) }}</p>
              </div>
            </div>
            <button
              type="button"
              class="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 active:scale-95"
              @click="detalle = null"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="space-y-4">
            <div v-for="c in camposDetalle" :key="c.clave">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {{ c.titulo }}
              </p>
              <div v-if="c.multiple" class="mt-1.5 flex flex-wrap gap-1.5">
                <template v-if="detalle[c.clave]?.length">
                  <span
                    v-for="v in detalle[c.clave]"
                    :key="v"
                    class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                    :class="c.clave === 'sintomas' ? 'bg-sky-50 text-sky-700' : 'bg-teal-50 text-teal-700'"
                  >
                    {{ v }}
                  </span>
                </template>
                <span v-else class="text-sm text-slate-300">—</span>
              </div>
              <p v-else class="mt-1 text-sm font-medium text-slate-700">
                {{ detalle[c.clave] }}
              </p>
            </div>
          </div>

          <div class="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <span v-if="detalle.registrado_matricula" class="flex items-center gap-2 text-xs text-slate-400">
              <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Registrado por
              <span class="font-semibold text-slate-600">{{ detalle.registrado_nombre }}</span>
              · Mat. {{ detalle.registrado_matricula }}
            </span>
            <span v-else></span>

            <!-- Eliminar con confirmación inline -->
            <div class="flex items-center gap-2">
              <button
                v-if="!confirmandoEliminar"
                type="button"
                class="flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 active:scale-95"
                @click="confirmandoEliminar = true"
              >
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                </svg>
                Eliminar
              </button>
              <template v-else>
                <span class="text-xs font-medium text-slate-500">¿Seguro?</span>
                <button
                  type="button"
                  class="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 active:scale-95 disabled:opacity-60"
                  :disabled="eliminando"
                  @click="eliminarRegistro"
                >
                  {{ eliminando ? 'Eliminando…' : 'Sí, eliminar' }}
                </button>
                <button
                  type="button"
                  class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 active:scale-95"
                  @click="confirmandoEliminar = false"
                >
                  No
                </button>
              </template>
            </div>
          </div>

          <p
            v-if="errorMsg"
            class="mt-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-600"
          >
            {{ errorMsg }}
          </p>
        </div>
      </div>
    </transition>
  </main>
</template>
