<script setup>
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const PALETA = ['#14b8a6', '#f59e0b', '#0ea5e9', '#818cf8', '#34d399', '#fb7185']

const props = defineProps({
  labels: { type: Array, required: true },
  // datasets: [{ label: string, data: number[], color?: string }]
  datasets: { type: Array, required: true },
  titulo: { type: String, default: '' },
  sufijo: { type: String, default: '' },
  // Si es true, cada barra toma un color distinto de la paleta
  multicolor: { type: Boolean, default: false },
})

const chartData = computed(() => ({
  labels: props.labels,
  datasets: props.datasets.map((d, i) => ({
    label: d.label,
    data: d.data,
    backgroundColor: props.multicolor
      ? props.labels.map((_, j) => PALETA[j % PALETA.length])
      : d.color ?? PALETA[i % PALETA.length],
    borderRadius: 6,
    maxBarThickness: 38,
  })),
}))

const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 10 } } },
    y: {
      beginAtZero: true,
      ticks: { precision: 0, font: { size: 10 } },
      grid: { color: '#f1f5f9' },
      border: { display: false },
    },
  },
  plugins: {
    legend: {
      display: props.datasets.length > 1,
      position: 'bottom',
      labels: { usePointStyle: true, pointStyle: 'circle', padding: 16, font: { size: 11 } },
    },
    title: { display: !!props.titulo, text: props.titulo },
    tooltip: {
      backgroundColor: '#0f172a',
      padding: 10,
      cornerRadius: 8,
      callbacks: {
        label: (ctx) =>
          ` ${ctx.dataset.label ? ctx.dataset.label + ': ' : ''}${ctx.parsed.y}${props.sufijo}`,
      },
    },
  },
}))
</script>

<template>
  <div class="relative h-64 sm:h-72">
    <Bar :data="chartData" :options="options" />
  </div>
</template>
