<script setup>
import { computed } from 'vue'
import { Pie } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

const PALETA = [
  '#14b8a6',
  '#0ea5e9',
  '#94a3b8',
  '#fbbf24',
  '#818cf8',
  '#34d399',
  '#fb7185',
  '#f97316',
]

const props = defineProps({
  labels: { type: Array, required: true },
  values: { type: Array, required: true },
  titulo: { type: String, default: '' },
})

const chartData = computed(() => ({
  labels: props.labels,
  datasets: [
    {
      data: props.values,
      backgroundColor: props.labels.map((_, i) => PALETA[i % PALETA.length]),
      borderColor: '#ffffff',
      borderWidth: 2,
      hoverOffset: 8,
    },
  ],
}))

const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { usePointStyle: true, pointStyle: 'circle', padding: 16, font: { size: 11 } },
    },
    title: { display: !!props.titulo, text: props.titulo },
    tooltip: {
      backgroundColor: '#0f172a',
      padding: 10,
      cornerRadius: 8,
      callbacks: {
        label: (ctx) => {
          const total = ctx.dataset.data.reduce((a, b) => a + b, 0)
          const pct = total ? Math.round((ctx.parsed / total) * 100) : 0
          return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`
        },
      },
    },
  },
}))
</script>

<template>
  <div class="relative h-64 sm:h-72">
    <Pie :data="chartData" :options="options" />
  </div>
</template>
