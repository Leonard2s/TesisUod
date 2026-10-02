<script setup>
import { computed, onMounted, ref } from 'vue'
import { supabase } from '../lib/supabaseClient'
import { cargarPreguntas, etiquetaDe, valoresDe } from '../lib/preguntas'
import PieChart from '../components/PieChart.vue'
import BarChart from '../components/BarChart.vue'

const preguntas = ref([])
const encuestas = ref([])
const cargando = ref(true)
const errorMsg = ref('')

async function cargar() {
  cargando.value = true
  errorMsg.value = ''
  try {
    preguntas.value = await cargarPreguntas(false)
  } catch (e) {
    errorMsg.value = 'No se pudieron cargar las preguntas: ' + (e.message ?? e)
  }

  const { data, error } = await supabase
    .from('encuestas')
    .select('*')
    .is('deleted_at', null)
  cargando.value = false

  if (error) {
    errorMsg.value = 'No se pudieron cargar los datos: ' + error.message
    return
  }
  encuestas.value = data ?? []
}

// Cuenta ocurrencias de una pregunta; las de selección múltiple cuentan
// cada valor. Con `orden` las etiquetas siguen el orden del cuestionario;
// sin él se ordenan de mayor a menor frecuencia.
function contarPor(items, clave, orden = null) {
  const conteo = {}
  for (const item of items) {
    for (const v of valoresDe(item, clave)) {
      if (v) conteo[v] = (conteo[v] ?? 0) + 1
    }
  }
  let entradas = Object.entries(conteo)
  if (orden) {
    entradas.sort((a, b) => {
      const ia = orden.indexOf(a[0])
      const ib = orden.indexOf(b[0])
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
    })
  } else {
    entradas.sort((a, b) => b[1] - a[1])
  }
  return {
    labels: entradas.map(([k]) => k),
    values: entradas.map(([, v]) => v),
  }
}

function topDe(clave) {
  const { labels, values } = contarPor(encuestas.value, clave)
  return labels.length ? { nombre: labels[0], cantidad: values[0] } : null
}

// Preguntas clave de la tesis que tienen tarjetas/gráficas destacadas.
// Si se eliminan desde Configuración, su sección desaparece con gracia.
const pFrecuencia = computed(() => preguntas.value.find((p) => p.clave === 'frecuencia_automedicacion'))
const pGenero = computed(() => preguntas.value.find((p) => p.clave === 'genero'))
const pAntibioticos = computed(() => preguntas.value.find((p) => p.clave === 'antibioticos'))
const pSintomas = computed(() => preguntas.value.find((p) => p.clave === 'sintomas'))
const pEdad = computed(() => preguntas.value.find((p) => p.clave === 'rango_edad'))

const stats = computed(() => {
  const n = encuestas.value.length
  const tarjetas = [
    { titulo: 'Respuestas', valor: n, detalle: 'encuestas registradas' },
  ]

  if (pFrecuencia.value) {
    const nunca = encuestas.value.filter((e) =>
      valoresDe(e, 'frecuencia_automedicacion').includes('Nunca')
    ).length
    const pctAutomedican = n ? Math.round(((n - nunca) / n) * 100) + ' %' : '—'
    tarjetas.push({
      titulo: 'Se automedican',
      valor: pctAutomedican,
      detalle: 'rara vez o frecuentemente',
    })
  }

  if (pAntibioticos.value) {
    const antibiotico = topDe('antibioticos')
    tarjetas.push({
      titulo: 'Antibiótico más usado',
      valor: antibiotico?.nombre ?? '—',
      detalle: antibiotico ? antibiotico.cantidad + ' menciones' : 'sin datos',
    })
  }

  if (pSintomas.value) {
    const sintoma = topDe('sintomas')
    tarjetas.push({
      titulo: 'Síntoma más frecuente',
      valor: sintoma?.nombre ?? '—',
      detalle: sintoma ? sintoma.cantidad + ' menciones' : 'sin datos',
    })
  }

  return tarjetas
})

const pieFrecuencia = computed(() =>
  pFrecuencia.value
    ? contarPor(encuestas.value, 'frecuencia_automedicacion', pFrecuencia.value.opciones)
    : null
)

const pieGenero = computed(() =>
  pGenero.value
    ? contarPor(encuestas.value, 'genero', pGenero.value.opciones)
    : null
)

// Barras: todas las preguntas excepto las que ya tienen gráfica de pie
const CLAVES_PIE = ['frecuencia_automedicacion', 'genero']
const preguntasBarras = computed(() =>
  preguntas.value.filter((p) => !CLAVES_PIE.includes(p.clave))
)

const graficasEncuesta = computed(() =>
  preguntasBarras.value.map((p) => ({
    ...p,
    ...contarPor(encuestas.value, p.clave, p.opciones),
  }))
)

// ---------- Medidas estadísticas ----------
// La edad se captura por rangos; para la media se usa el punto medio de
// cada rango y para mediana/moda el rango correspondiente.
const PUNTOS_MEDIOS_EDAD = {
  'De 18 a 29 años': 23.5,
  'De 30 a 39 años': 34.5,
  'De 40 a 49 años': 44.5,
  'De 50 a 59 años': 54.5,
  'De 60 años o más': 65,
}

// Compara las respuestas de la mitad reciente del periodo contra la
// primera mitad para describir el ritmo de registro.
const tendencia = computed(() => {
  const fechas = encuestas.value
    .map((e) => new Date(e.created_at).getTime())
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => a - b)
  if (fechas.length < 2) {
    return { etiqueta: 'Sin datos', detalle: 'se necesitan más respuestas' }
  }

  const mitad = fechas[0] + (fechas[fechas.length - 1] - fechas[0]) / 2
  const antes = fechas.filter((t) => t < mitad).length
  const despues = fechas.length - antes
  const detalle = `${despues} de ${fechas.length} respuestas en la mitad reciente`
  if (despues > antes) return { etiqueta: '↗ Creciente', detalle }
  if (despues < antes) return { etiqueta: '↘ Decreciente', detalle }
  return { etiqueta: '→ Estable', detalle: 'mismo ritmo de respuestas' }
})

const medidas = computed(() => {
  const n = encuestas.value.length
  if (!n) return []

  const tarjetas = []

  if (pEdad.value) {
    // Media: solo sobre los rangos con punto medio conocido
    const edades = encuestas.value
      .map((e) => valoresDe(e, 'rango_edad')[0])
      .filter((v) => v in PUNTOS_MEDIOS_EDAD)
    const mediaEdad = edades.length
      ? edades.reduce((acc, v) => acc + PUNTOS_MEDIOS_EDAD[v], 0) / edades.length
      : null

    // Mediana: primer rango donde la frecuencia acumulada llega a la mitad
    const conteoEdad = contarPor(encuestas.value, 'rango_edad', pEdad.value.opciones)
    const totalEdad = conteoEdad.values.reduce((a, b) => a + b, 0)
    let acumulado = 0
    let medianaEdad = '—'
    for (let i = 0; i < conteoEdad.labels.length; i++) {
      acumulado += conteoEdad.values[i]
      if (totalEdad && acumulado >= totalEdad / 2) {
        medianaEdad = conteoEdad.labels[i]
        break
      }
    }
    const modaEdad = topDe('rango_edad')

    tarjetas.push(
      {
        titulo: 'Media de edad',
        valor: mediaEdad == null ? '—' : '~' + mediaEdad.toFixed(1) + ' años',
        detalle: 'por puntos medios de rango',
      },
      { titulo: 'Mediana de edad', valor: medianaEdad, detalle: 'rango central' },
      {
        titulo: 'Moda de edad',
        valor: modaEdad?.nombre ?? '—',
        detalle: modaEdad ? modaEdad.cantidad + ' respuestas' : 'sin datos',
      }
    )
  }

  tarjetas.push({
    titulo: 'Tendencia',
    valor: tendencia.value.etiqueta,
    detalle: tendencia.value.detalle,
  })
  return tarjetas
})

// Respuestas agrupadas por mes para la gráfica de tendencia
const respuestasPorMes = computed(() => {
  const conteo = {}
  for (const e of encuestas.value) {
    const d = new Date(e.created_at)
    if (Number.isNaN(d.getTime())) continue
    const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    conteo[clave] = (conteo[clave] ?? 0) + 1
  }
  const claves = Object.keys(conteo).sort()
  return {
    labels: claves.map((c) =>
      new Date(c + '-02T00:00:00').toLocaleDateString('es-DO', {
        month: 'short',
        year: 'numeric',
      })
    ),
    values: claves.map((c) => conteo[c]),
  }
})

// ---------- Tablas de frecuencia ----------
const tablasFrecuencia = computed(() =>
  preguntas.value.map((p, i) => {
    const { labels, values } = contarPor(encuestas.value, p.clave, p.opciones)
    const total = values.reduce((a, b) => a + b, 0)
    const max = Math.max(0, ...values)
    return {
      titulo: `${i + 1}. ${etiquetaDe(p)}`,
      clave: p.clave,
      multiple: p.tipo === 'multiple',
      filas: labels.map((label, j) => ({
        opcion: label,
        n: values[j],
        pct: total ? Math.round((values[j] / total) * 100) : 0,
        esModa: values[j] === max && max > 0,
      })),
    }
  })
)

onMounted(cargar)
</script>

<template>
  <main class="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6">
    <div class="anim-aparecer mb-6">
      <h1 class="text-2xl font-bold tracking-tight text-slate-800">Estadísticas</h1>
      <p class="mt-1 max-w-3xl text-sm text-slate-500">
        Resultados del cuestionario sobre automedicación con antibióticos en
        pacientes con periodontitis crónica · Universidad Odontológica Dominicana
      </p>
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
      Cargando datos…
    </div>

    <div v-else-if="encuestas.length === 0" class="card py-14 text-center">
      <p class="text-sm font-medium text-slate-500">Todavía no hay respuestas registradas</p>
      <p class="mt-1 text-xs text-slate-400">
        Agrega datos desde la pestaña «Datos» para ver estas estadísticas
      </p>
    </div>

    <template v-else>
      <!-- Tarjetas resumen -->
      <div class="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div
          v-for="(s, i) in stats"
          :key="s.titulo"
          class="card anim-aparecer min-w-0 !p-3.5 sm:!p-4"
          :style="{ animationDelay: i * 70 + 'ms' }"
        >
          <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-400 sm:text-[11px]">{{ s.titulo }}</p>
          <p class="mt-1 break-words text-lg font-bold leading-tight tracking-tight text-slate-800 sm:text-2xl">{{ s.valor }}</p>
          <p class="mt-0.5 text-[11px] leading-snug text-slate-400">{{ s.detalle }}</p>
        </div>
      </div>

      <!-- Medidas estadísticas -->
      <h2 class="anim-aparecer mb-4 text-base font-bold tracking-tight text-slate-800 sm:text-lg" style="animation-delay: 100ms">
        Medidas estadísticas
      </h2>
      <div class="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div
          v-for="(m, i) in medidas"
          :key="m.titulo"
          class="card anim-aparecer min-w-0 !p-3.5 sm:!p-4"
          :style="{ animationDelay: 120 + i * 70 + 'ms' }"
        >
          <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-400 sm:text-[11px]">{{ m.titulo }}</p>
          <p class="mt-1 break-words text-lg font-bold leading-tight tracking-tight text-teal-700 sm:text-2xl">{{ m.valor }}</p>
          <p class="mt-0.5 text-[11px] leading-snug text-slate-400">{{ m.detalle }}</p>
        </div>
      </div>

      <!-- Gráficas destacadas -->
      <div v-if="pieFrecuencia || pieGenero" class="mb-8 grid gap-5 lg:grid-cols-2">
        <div v-if="pieFrecuencia" class="card anim-aparecer !p-4 sm:!p-6" style="animation-delay: 160ms">
          <h2 class="mb-4 text-base font-bold tracking-tight text-slate-800 sm:text-lg">
            {{ etiquetaDe(pFrecuencia) }}
          </h2>
          <PieChart :labels="pieFrecuencia.labels" :values="pieFrecuencia.values" />
        </div>
        <div v-if="pieGenero" class="card anim-aparecer !p-4 sm:!p-6" style="animation-delay: 220ms">
          <h2 class="mb-4 text-base font-bold tracking-tight text-slate-800 sm:text-lg">
            {{ etiquetaDe(pGenero) }}
          </h2>
          <PieChart :labels="pieGenero.labels" :values="pieGenero.values" />
        </div>
      </div>

      <!-- Tendencia de registro -->
      <div class="card anim-aparecer mb-8 !p-4 sm:!p-6" style="animation-delay: 240ms">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 class="text-base font-bold tracking-tight text-slate-800 sm:text-lg">
            Tendencia de registro de respuestas
          </h2>
          <span class="rounded-full bg-teal-50 px-3 py-1 text-[11px] font-semibold text-teal-700">
            {{ tendencia.etiqueta }}
          </span>
        </div>
        <BarChart
          :labels="respuestasPorMes.labels"
          :datasets="[{ label: 'Respuestas', data: respuestasPorMes.values }]"
        />
      </div>

      <!-- Resultados por pregunta -->
      <div class="anim-aparecer mb-4 flex flex-wrap items-end justify-between gap-2" style="animation-delay: 260ms">
        <h2 class="text-base font-bold tracking-tight text-slate-800 sm:text-lg">Resultados por pregunta</h2>
        <span class="rounded-full bg-teal-50 px-3 py-1 text-[11px] font-semibold text-teal-700">
          {{ encuestas.length }} respuesta(s)
        </span>
      </div>

      <div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <div
          v-for="(g, i) in graficasEncuesta"
          :key="g.clave"
          class="card anim-aparecer !p-4 sm:!p-6"
          :style="{ animationDelay: 280 + i * 60 + 'ms' }"
        >
          <h3 class="mb-3 text-[13px] font-bold text-slate-600">{{ etiquetaDe(g) }}</h3>
          <BarChart
            :labels="g.labels"
            :datasets="[{ label: 'Respuestas', data: g.values }]"
            multicolor
          />
        </div>
      </div>

      <!-- Tablas de frecuencia -->
      <div class="anim-aparecer mb-4 mt-10" style="animation-delay: 300ms">
        <h2 class="text-base font-bold tracking-tight text-slate-800 sm:text-lg">Tablas de frecuencia</h2>
        <p class="mt-1 text-xs text-slate-400">
          n = cantidad de respuestas · la moda de cada pregunta aparece resaltada
        </p>
      </div>

      <div class="grid gap-5 sm:grid-cols-2">
        <div
          v-for="(t, i) in tablasFrecuencia"
          :key="t.clave"
          class="card anim-aparecer !p-4 sm:!p-6"
          :style="{ animationDelay: 320 + i * 50 + 'ms' }"
        >
          <h3 class="mb-3 text-[13px] font-bold text-slate-600">{{ t.titulo }}</h3>
          <table class="w-full">
            <thead>
              <tr class="border-b border-slate-100">
                <th class="th px-0 py-2 sm:py-3">Opción</th>
                <th class="th w-14 px-0 py-2 text-right sm:py-3">n</th>
                <th class="th w-14 px-0 py-2 text-right sm:py-3">%</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="f in t.filas"
                :key="f.opcion"
                :class="f.esModa ? 'bg-teal-50/60' : ''"
              >
                <td class="td px-1 py-2 sm:py-3" :class="f.esModa ? 'font-semibold text-teal-800' : ''">
                  {{ f.opcion }}
                </td>
                <td class="td px-1 py-2 text-right tabular-nums sm:py-3">{{ f.n }}</td>
                <td class="td px-1 py-2 text-right tabular-nums sm:py-3">{{ f.pct }}%</td>
              </tr>
            </tbody>
          </table>
          <p v-if="t.multiple" class="mt-3 text-[11px] text-slate-400">
            Selección múltiple: el % se calcula sobre el total de menciones.
          </p>
        </div>
      </div>
    </template>
  </main>
</template>
