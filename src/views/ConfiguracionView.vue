<script setup>
import { onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { supabase } from '../lib/supabaseClient'
import { cargarPreguntas, slug } from '../lib/preguntas'
import { usuarioActual } from '../lib/usuario'

const preguntas = ref([])
const eliminadas = ref([])
const cargando = ref(true)
const errorMsg = ref('')
const mostrarEliminadas = ref(false)

// ---------- Modal crear/editar ----------
const modalAbierto = ref(false)
const editando = ref(null) // null = nueva pregunta
const guardando = ref(false)
const formError = ref('')
const claveManual = ref(false) // true si el usuario editó la clave a mano
const nuevaOpcion = ref('')
const form = reactive({ titulo: '', etiqueta: '', clave: '', tipo: 'unica', opciones: [] })

// ---------- Estado de acciones ----------
const confirmandoEliminar = ref(null)
const eliminando = ref(null)
const restaurando = ref(null)
const moviendo = ref(false)

async function cargar() {
  cargando.value = true
  errorMsg.value = ''
  try {
    ;[preguntas.value, eliminadas.value] = await Promise.all([
      cargarPreguntas(false),
      cargarPreguntas(true),
    ])
  } catch (e) {
    errorMsg.value = 'No se pudieron cargar las preguntas: ' + (e.message ?? e)
  }
  cargando.value = false
}

function cerrarModal() {
  modalAbierto.value = false
  formError.value = ''
}

function abrirNueva() {
  editando.value = null
  Object.assign(form, { titulo: '', etiqueta: '', clave: '', tipo: 'unica', opciones: [] })
  claveManual.value = false
  nuevaOpcion.value = ''
  formError.value = ''
  modalAbierto.value = true
}

function abrirEditar(p) {
  editando.value = p
  Object.assign(form, {
    titulo: p.titulo,
    etiqueta: p.etiqueta ?? '',
    clave: p.clave,
    tipo: p.tipo,
    opciones: [...p.opciones],
  })
  formError.value = ''
  modalAbierto.value = true
}

// Al escribir el título se sugiere la clave (slug) automáticamente,
// salvo que el usuario la haya editado a mano
watch(
  () => form.titulo,
  (titulo) => {
    if (!editando.value && !claveManual.value) form.clave = slug(titulo)
  }
)

function marcarClaveManual() {
  claveManual.value = true
}

function agregarOpcion() {
  const opcion = nuevaOpcion.value.trim()
  if (!opcion) return
  if (!form.opciones.includes(opcion)) form.opciones.push(opcion)
  nuevaOpcion.value = ''
}

function quitarOpcion(opcion) {
  form.opciones = form.opciones.filter((o) => o !== opcion)
}

function siguienteOrden() {
  const max = [...preguntas.value, ...eliminadas.value].reduce(
    (m, p) => Math.max(m, p.orden ?? 0),
    0
  )
  return max + 1
}

async function guardar() {
  formError.value = ''
  const titulo = form.titulo.trim()
  const clave = form.clave.trim()
  const etiqueta = form.etiqueta.trim()

  if (!titulo) {
    formError.value = 'Escribe el título de la pregunta'
    return
  }
  if (!clave) {
    formError.value = 'La clave es obligatoria (se genera automáticamente a partir del título)'
    return
  }
  const duplicada = [...preguntas.value, ...eliminadas.value].some(
    (p) => p.clave === clave && p.id !== editando.value?.id
  )
  if (duplicada) {
    formError.value =
      'Ya existe una pregunta con la clave «' + clave + '»: las respuestas guardadas se identifican por la clave'
    return
  }
  if (form.opciones.length < 2) {
    formError.value = 'Agrega al menos 2 opciones'
    return
  }

  guardando.value = true
  const cambios = {
    titulo,
    etiqueta: etiqueta || null,
    tipo: form.tipo,
    opciones: [...form.opciones],
    updated_at: new Date().toISOString(),
  }

  let error
  if (editando.value) {
    ;({ error } = await supabase.from('preguntas').update(cambios).eq('id', editando.value.id))
  } else {
    ;({ error } = await supabase
      .from('preguntas')
      .insert({ ...cambios, clave, orden: siguienteOrden() }))
  }
  guardando.value = false

  if (error) {
    formError.value = 'No se pudo guardar: ' + error.message
    return
  }
  modalAbierto.value = false
  await cargar()
}

// ---------- Orden ----------
async function mover(indice, direccion) {
  const destino = indice + direccion
  if (destino < 0 || destino >= preguntas.value.length || moviendo.value) return

  const lista = [...preguntas.value]
  ;[lista[indice], lista[destino]] = [lista[destino], lista[indice]]
  preguntas.value = lista
  await persistirOrden()
}

async function persistirOrden() {
  moviendo.value = true
  const ahora = new Date().toISOString()
  const resultados = await Promise.all(
    preguntas.value.map((p, i) =>
      supabase.from('preguntas').update({ orden: i + 1, updated_at: ahora }).eq('id', p.id)
    )
  )
  moviendo.value = false

  const fallo = resultados.find((r) => r.error)
  if (fallo) {
    errorMsg.value = 'No se pudo guardar el orden: ' + fallo.error.message
    await cargar()
  }
}

// ---------- Borrado lógico ----------
async function eliminar(p) {
  eliminando.value = p.id
  errorMsg.value = ''
  const { nombre, matricula } = await usuarioActual()
  const { error } = await supabase
    .from('preguntas')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by_nombre: nombre,
      deleted_by_matricula: matricula,
      updated_at: new Date().toISOString(),
    })
    .eq('id', p.id)
  eliminando.value = null

  if (error) {
    errorMsg.value = 'No se pudo eliminar: ' + error.message
    return
  }
  confirmandoEliminar.value = null
  await cargar()
}

async function restaurar(p) {
  restaurando.value = p.id
  errorMsg.value = ''
  const { error } = await supabase
    .from('preguntas')
    .update({
      deleted_at: null,
      deleted_by_nombre: null,
      deleted_by_matricula: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', p.id)
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

function alPresionarTecla(ev) {
  if (ev.key === 'Escape' && modalAbierto.value) cerrarModal()
}

watch(modalAbierto, (abierto) => {
  document.body.style.overflow = abierto ? 'hidden' : ''
  if (abierto) confirmandoEliminar.value = null
})

onUnmounted(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', alPresionarTecla)
})

onMounted(() => {
  cargar()
  window.addEventListener('keydown', alPresionarTecla)
})
</script>

<template>
  <main class="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6">
    <div class="anim-aparecer mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-800">Configuración</h1>
        <p class="mt-1 max-w-2xl text-sm text-slate-500">
          Administra las preguntas del cuestionario: créalas, edítalas, define su
          orden y elimínalas (con borrado lógico, se pueden restaurar).
        </p>
      </div>
      <button type="button" class="btn-primary" :disabled="cargando" @click="abrirNueva">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Nueva pregunta
      </button>
    </div>

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
      Cargando preguntas…
    </div>

    <template v-else>
      <!-- ============ Lista de preguntas activas ============ -->
      <div
        v-if="preguntas.length"
        class="anim-aparecer overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-900/[0.03]"
      >
        <div
          v-for="(p, i) in preguntas"
          :key="p.id"
          class="flex flex-col gap-3 border-b border-slate-100 p-4 last:border-0 sm:flex-row sm:items-center sm:gap-4"
        >
          <!-- Número + controles de orden -->
          <div class="flex items-center gap-2.5 sm:flex-col sm:gap-1.5">
            <span class="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-teal-600/10 text-sm font-bold text-teal-700">
              {{ i + 1 }}
            </span>
            <div class="flex gap-1">
              <button
                type="button"
                class="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
                :disabled="i === 0 || moviendo"
                title="Subir"
                @click="mover(i, -1)"
              >
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m18 15-6-6-6 6" />
                </svg>
              </button>
              <button
                type="button"
                class="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
                :disabled="i === preguntas.length - 1 || moviendo"
                title="Bajar"
                @click="mover(i, 1)"
              >
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Contenido -->
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <p class="text-[15px] font-semibold leading-snug text-slate-800">{{ p.titulo }}</p>
              <span
                class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                :class="p.tipo === 'multiple' ? 'bg-sky-50 text-sky-700' : 'bg-teal-50 text-teal-700'"
              >
                {{ p.tipo === 'multiple' ? 'Selección múltiple' : 'Opción única' }}
              </span>
            </div>
            <p class="mt-0.5 text-[11px] text-slate-400">
              {{ p.clave }}<template v-if="p.etiqueta && p.etiqueta !== p.titulo"> · etiqueta: {{ p.etiqueta }}</template>
            </p>
            <div class="mt-2 flex flex-wrap gap-1">
              <span v-for="op in p.opciones" :key="op" class="chip">{{ op }}</span>
            </div>
          </div>

          <!-- Acciones -->
          <div class="flex shrink-0 items-center gap-1.5">
            <template v-if="confirmandoEliminar !== p.id">
              <button
                type="button"
                class="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-600 active:scale-95"
                title="Editar"
                @click="abrirEditar(p)"
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                </svg>
              </button>
              <button
                type="button"
                class="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 active:scale-95"
                title="Eliminar"
                @click="confirmandoEliminar = p.id"
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                </svg>
              </button>
            </template>
            <template v-else>
              <span class="text-xs font-medium text-slate-500">¿Eliminar?</span>
              <button
                type="button"
                class="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 active:scale-95 disabled:opacity-60"
                :disabled="eliminando === p.id"
                @click="eliminar(p)"
              >
                {{ eliminando === p.id ? 'Eliminando…' : 'Sí' }}
              </button>
              <button
                type="button"
                class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 active:scale-95"
                @click="confirmandoEliminar = null"
              >
                No
              </button>
            </template>
          </div>
        </div>
      </div>

      <div v-else class="card anim-aparecer py-14 text-center">
        <div class="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
          <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
          </svg>
        </div>
        <p class="text-sm font-medium text-slate-500">Todavía no hay preguntas activas</p>
        <p class="mt-1 text-xs text-slate-400">
          Crea la primera pregunta del cuestionario con el botón de arriba
        </p>
      </div>

      <!-- ============ Preguntas eliminadas ============ -->
      <div v-if="eliminadas.length" class="mt-6">
        <button
          type="button"
          class="btn-outline !px-4 !py-2 text-xs"
          @click="mostrarEliminadas = !mostrarEliminadas"
        >
          <svg
            class="h-3.5 w-3.5 transition-transform"
            :class="mostrarEliminadas ? 'rotate-90' : ''"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
          {{ mostrarEliminadas ? 'Ocultar' : 'Ver' }} preguntas eliminadas ({{ eliminadas.length }})
        </button>

        <div v-if="mostrarEliminadas" class="anim-aparecer mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div
            v-for="p in eliminadas"
            :key="p.id"
            class="card !p-4 opacity-90"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="text-sm font-semibold leading-snug text-slate-600 line-through decoration-slate-300">
                  {{ p.titulo }}
                </p>
                <p class="mt-0.5 text-[11px] text-slate-400">{{ p.clave }}</p>
              </div>
              <span class="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-500">
                Eliminada
              </span>
            </div>

            <div class="mt-3 rounded-xl bg-rose-50/70 px-3 py-2.5 text-[11px] leading-relaxed">
              <p class="text-rose-700">
                <span class="font-semibold">Eliminada por:</span>
                {{ p.deleted_by_nombre ?? '—' }}
                <span class="text-rose-400">· Mat. {{ p.deleted_by_matricula ?? '—' }}</span>
              </p>
              <p class="text-slate-400">{{ fechaHora(p.deleted_at) }}</p>
            </div>

            <button
              type="button"
              class="btn-outline mt-3 w-full"
              :disabled="restaurando === p.id"
              @click="restaurar(p)"
            >
              <svg
                v-if="restaurando === p.id"
                class="h-4 w-4 animate-spin"
                viewBox="0 0 24 24" fill="none"
              >
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
              </svg>
              <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              {{ restaurando === p.id ? 'Restaurando…' : 'Restaurar' }}
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- ============ Modal crear/editar pregunta ============ -->
    <transition name="modal">
      <div
        v-if="modalAbierto"
        class="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/45 backdrop-blur-sm sm:items-center sm:p-6"
        @click.self="cerrarModal"
      >
        <div
          class="modal-card max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
          role="dialog"
          aria-modal="true"
        >
          <h3 class="mb-5 text-base font-bold tracking-tight text-slate-800">
            {{ editando ? 'Editar pregunta' : 'Nueva pregunta' }}
          </h3>

          <div class="space-y-4">
            <div>
              <label class="label" for="p-titulo">Pregunta</label>
              <input
                id="p-titulo"
                v-model="form.titulo"
                class="input"
                type="text"
                placeholder="Ej: ¿Con qué frecuencia se automedica?"
              />
            </div>

            <div>
              <label class="label" for="p-etiqueta">Etiqueta corta <span class="font-normal text-slate-400">(opcional)</span></label>
              <input
                id="p-etiqueta"
                v-model="form.etiqueta"
                class="input"
                type="text"
                placeholder="Ej: Frecuencia de automedicación"
              />
              <p class="mt-1 text-[11px] text-slate-400">
                Texto corto usado en gráficas, tablas y exportaciones
              </p>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="label" for="p-clave">Clave</label>
                <input
                  id="p-clave"
                  v-model="form.clave"
                  class="input font-mono text-[13px]"
                  type="text"
                  placeholder="se genera del título"
                  :disabled="!!editando"
                  @input="marcarClaveManual"
                />
                <p class="mt-1 text-[11px] text-slate-400">
                  {{ editando
                    ? 'La clave no se puede cambiar: las respuestas guardadas la usan como identificador'
                    : 'Identificador de la pregunta (se sugiere a partir del título)' }}
                </p>
              </div>

              <div>
                <label class="label" for="p-tipo">Tipo de respuesta</label>
                <select id="p-tipo" v-model="form.tipo" class="input">
                  <option value="unica">Opción única</option>
                  <option value="multiple">Selección múltiple</option>
                </select>
              </div>
            </div>

            <div>
              <label class="label" for="p-opcion">Opciones</label>
              <div class="flex gap-2">
                <input
                  id="p-opcion"
                  v-model="nuevaOpcion"
                  class="input"
                  type="text"
                  placeholder="Escribe una opción…"
                  @keydown.enter.prevent="agregarOpcion"
                />
                <button type="button" class="btn-outline shrink-0 !px-4" @click="agregarOpcion">
                  Agregar
                </button>
              </div>
              <div class="mt-2.5 flex flex-wrap gap-1.5">
                <span
                  v-for="op in form.opciones"
                  :key="op"
                  class="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 py-1 pl-3 pr-2 text-[13px] font-medium text-teal-700"
                >
                  {{ op }}
                  <button
                    type="button"
                    class="grid h-5 w-5 place-items-center rounded-full text-teal-500 transition hover:bg-teal-100 hover:text-teal-700 active:scale-95"
                    title="Quitar"
                    @click="quitarOpcion(op)"
                  >
                    <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              </div>
              <p v-if="!form.opciones.length" class="mt-1.5 text-[11px] text-slate-400">
                Agrega al menos 2 opciones (Enter para añadir rápido)
              </p>
            </div>
          </div>

          <p
            v-if="formError"
            class="mt-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-600"
          >
            {{ formError }}
          </p>

          <div class="mt-6 flex justify-end gap-2.5 border-t border-slate-100 pt-5">
            <button type="button" class="btn-outline" @click="cerrarModal">Cancelar</button>
            <button
              type="button"
              class="btn-primary"
              :disabled="guardando"
              @click="guardar"
            >
              <svg v-if="guardando" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
              </svg>
              {{ guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear pregunta' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </main>
</template>
