<script setup>
import { computed, onMounted, ref } from 'vue'
import { supabase } from '../lib/supabaseClient'
import PieChart from '../components/PieChart.vue'
import BarChart from '../components/BarChart.vue'

const bacterias = ref([])
const encuestas = ref([])
const cargando = ref(true)
const errorMsg = ref('')

async function cargar() {
  cargando.value = true
  const [{ data: b, error: eb }, { data: e, error: ee }] = await Promise.all([
    supabase.from('resultados_bacterias').select('*').order('id'),
    supabase.from('encuestas').select('*').is('deleted_at', null),
  ])
  cargando.value = false

  if (eb || ee) {
    errorMsg.value = 'No se pudieron cargar los datos: ' + (eb ?? ee).message
    return
  }
  bacterias.value = b ?? []
  encuestas.value = e ?? []
}

// Cuenta ocurrencias de un campo; si el campo es un arreglo cuenta cada elemento.
function contarPor(items, clave) {
  const conteo = {}
  for (const item of items) {
    const valor = item[clave]
    for (const v of Array.isArray(valor) ? valor : [valor]) {
      if (v) conteo[v] = (conteo[v] ?? 0) + 1
    }
  }
  const entradas = Object.entries(conteo).sort((a, b) => b[1] - a[1])
  return {
    labels: entradas.map(([k]) => k),
    values: entradas.map(([, v]) => v),
  }
}

const stats = computed(() => {
  const bs = bacterias.value
  const reduccionProm = bs.length
    ? (
        bs.reduce((acc, b) => acc + (Number(b.antes_tratamiento) - Number(b.despues_tratamiento)), 0) /
        bs.length
      ).toFixed(1)
    : '0'
  const top = bs.length
    ? [...bs].sort((a, b) => Number(b.despues_tratamiento) - Number(a.despues_tratamiento))[0]
    : null
  return [
    { titulo: 'Respuestas', valor: encuestas.value.length, detalle: 'encuestas registradas' },
    { titulo: 'Bacterias', valor: bs.length, detalle: 'especies monitoreadas' },
    { titulo: 'Reducción prom.', valor: reduccionProm + ' %', detalle: 'tras el tratamiento' },
    { titulo: 'Mayor presencia', valor: top ? top.despues_tratamiento + ' %' : '—', detalle: top?.bacteria ?? 'sin datos' },
  ]
})

const pieDespues = computed(() => ({
  labels: bacterias.value.map((b) => b.bacteria),
  values: bacterias.value.map((b) => Number(b.despues_tratamiento)),
}))

const barrasComparativo = computed(() => ({
  labels: bacterias.value.map((b) => b.bacteria),
  datasets: [
    {
      label: 'Antes del tratamiento',
      data: bacterias.value.map((b) => Number(b.antes_tratamiento)),
      color: '#cbd5e1',
    },
    {
      label: 'Después del tratamiento',
      data: bacterias.value.map((b) => Number(b.despues_tratamiento)),
      color: '#0d9488',
    },
  ],
}))

const preguntasEncuesta = [
  { titulo: '1. Frecuencia de automedicación', clave: 'frecuencia_automedicacion' },
  { titulo: '2. Rango de edad', clave: 'rango_edad' },
  { titulo: '3. Género', clave: 'genero' },
  { titulo: '4. Antibióticos usados', clave: 'antibioticos' },
  { titulo: '5. Síntomas notados', clave: 'sintomas' },
  { titulo: '6. Grado de educación', clave: 'grado_educacion' },
  { titulo: '7. Lugar de residencia', clave: 'lugar_residencia' },
  { titulo: '8. Motivo de automedicación', clave: 'motivo_automedicacion' },
]

const graficasEncuesta = computed(() =>
  preguntasEncuesta.map((p) => ({ ...p, ...contarPor(encuestas.value, p.clave) }))
)

onMounted(cargar)
</script>

<template>
  <main class="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6">
    <div class="anim-aparecer mb-6">
      <h1 class="text-2xl font-bold tracking-tight text-slate-800">Estadísticas</h1>
      <p class="mt-1 max-w-3xl text-sm text-slate-500">
        Distribución de frecuencia de pacientes con periodontitis crónica, área de
        periodoncia de la Universidad Odontológica Dominicana (enero–agosto 2019)
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

    <template v-else>
      <!-- Tarjetas resumen -->
      <div class="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div
          v-for="(s, i) in stats"
          :key="s.titulo"
          class="card anim-aparecer !p-4"
          :style="{ animationDelay: i * 70 + 'ms' }"
        >
          <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{{ s.titulo }}</p>
          <p class="mt-1 text-2xl font-bold tracking-tight text-slate-800">{{ s.valor }}</p>
          <p class="mt-0.5 truncate text-[11px] text-slate-400">{{ s.detalle }}</p>
        </div>
      </div>

      <!-- Cuadro 1 -->
      <div class="anim-aparecer card mb-6" style="animation-delay: 120ms">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 class="text-lg font-bold tracking-tight text-slate-800">
            Cuadro 1. Bacterias antes y después del tratamiento
          </h2>
          <span class="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-500">
            Fuente: Laboratorio Franjas
          </span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[560px]">
            <thead>
              <tr class="border-b border-slate-100 bg-slate-50/80">
                <th class="th rounded-tl-lg">Bacterias</th>
                <th class="th text-right">Antes del tratamiento</th>
                <th class="th rounded-tr-lg text-right">Después del tratamiento</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="b in bacterias" :key="b.id" class="transition-colors hover:bg-teal-50/40">
                <td class="td font-medium italic text-slate-700">{{ b.bacteria }}</td>
                <td class="td">
                  <div class="ml-auto w-40">
                    <span class="block text-right font-semibold tabular-nums text-slate-700">
                      {{ b.antes_tratamiento }}%
                    </span>
                    <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        class="h-full rounded-full bg-slate-400 transition-all duration-700"
                        :style="{ width: Number(b.antes_tratamiento) * 8 + '%' }"
                      ></div>
                    </div>
                  </div>
                </td>
                <td class="td">
                  <div class="ml-auto w-40">
                    <span class="block text-right font-semibold tabular-nums text-teal-700">
                      {{ b.despues_tratamiento }}%
                    </span>
                    <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        class="h-full rounded-full bg-teal-500 transition-all duration-700"
                        :style="{ width: Number(b.despues_tratamiento) * 8 + '%' }"
                      ></div>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Gráficas principales -->
      <div class="mb-8 grid gap-5 lg:grid-cols-2">
        <div class="card anim-aparecer" style="animation-delay: 160ms">
          <h2 class="mb-4 text-lg font-bold tracking-tight text-slate-800">
            Gráfica 1. Resultados después del tratamiento
          </h2>
          <PieChart :labels="pieDespues.labels" :values="pieDespues.values" />
        </div>
        <div class="card anim-aparecer" style="animation-delay: 220ms">
          <h2 class="mb-4 text-lg font-bold tracking-tight text-slate-800">
            Comparativo antes / después
          </h2>
          <BarChart
            :labels="barrasComparativo.labels"
            :datasets="barrasComparativo.datasets"
            sufijo="%"
          />
        </div>
      </div>

      <!-- Resultados de la encuesta -->
      <div class="anim-aparecer mb-4 flex flex-wrap items-end justify-between gap-2" style="animation-delay: 260ms">
        <h2 class="text-lg font-bold tracking-tight text-slate-800">Resultados de la encuesta</h2>
        <span class="rounded-full bg-teal-50 px-3 py-1 text-[11px] font-semibold text-teal-700">
          {{ encuestas.length }} respuesta(s)
        </span>
      </div>

      <div v-if="encuestas.length === 0" class="card py-14 text-center">
        <p class="text-sm font-medium text-slate-500">Todavía no hay respuestas registradas</p>
        <p class="mt-1 text-xs text-slate-400">
          Agrega datos desde la pestaña «Datos» para ver estos diagramas
        </p>
      </div>

      <div v-else class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <div
          v-for="(g, i) in graficasEncuesta"
          :key="g.clave"
          class="card anim-aparecer"
          :style="{ animationDelay: 280 + i * 60 + 'ms' }"
        >
          <h3 class="mb-3 text-[13px] font-bold text-slate-600">{{ g.titulo }}</h3>
          <BarChart :labels="g.labels" :datasets="[{ label: 'Respuestas', data: g.values }]" />
        </div>
      </div>
    </template>
  </main>
</template>
