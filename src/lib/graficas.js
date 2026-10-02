// Renderiza las gráficas de la tesis como imágenes PNG (data URL) para
// incluirlas en las exportaciones de Excel, PDF y Word. Usa Chart.js con
// las mismas paletas y estilos que las gráficas de la pantalla Estadísticas.

import {
  Chart,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js'
import { valoresDe, etiquetaDe, contarPor } from './preguntas'

Chart.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

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

// Renderiza una configuración de Chart.js en un canvas fuera de pantalla
// y la devuelve como PNG (data URL)
async function aImagen(config) {
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 384
  const chart = new Chart(canvas, { ...config, options: { ...config.options, responsive: false } })

  // Se espera un frame para asegurar que el dibujado terminó
  await new Promise((resolver) => setTimeout(resolver, 60))
  const imagen = canvas.toDataURL('image/png')
  chart.destroy()
  return imagen
}

function configPie(titulo, labels, values) {
  return {
    type: 'pie',
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: labels.map((_, i) => PALETA[i % PALETA.length]),
          borderColor: '#ffffff',
          borderWidth: 2,
        },
      ],
    },
    options: {
      animation: false,
      plugins: {
        title: { display: true, text: titulo, font: { size: 14 } },
        legend: {
          position: 'right',
          labels: { usePointStyle: true, pointStyle: 'circle', padding: 14 },
        },
      },
    },
  }
}

function configBarra(titulo, labels, values) {
  return {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Respuestas',
          data: values,
          backgroundColor: labels.map((_, i) => PALETA[i % PALETA.length]),
          borderRadius: 6,
          maxBarThickness: 38,
        },
      ],
    },
    options: {
      animation: false,
      plugins: {
        title: { display: true, text: titulo, font: { size: 14 } },
        legend: { display: false },
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#f1f5f9' } },
      },
    },
  }
}

// Respuestas agrupadas por mes (para la gráfica de tendencia)
function respuestasPorMes(encuestas) {
  const conteo = {}
  for (const e of encuestas) {
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
}

// Devuelve [{ titulo, imagen }] con: pie de frecuencia, pie de género,
// barra por cada pregunta restante y la tendencia mensual. Si alguna
// gráfica falla se omite sin romper la exportación.
export async function renderizarGraficas(encuestas, preguntas) {
  const graficas = []
  if (typeof document === 'undefined') return graficas

  const porClave = (clave) => preguntas.find((p) => p.clave === clave)

  const pies = ['frecuencia_automedicacion', 'genero']
  for (const clave of pies) {
    const p = porClave(clave)
    if (!p) continue
    try {
      const { labels, values } = contarPor(encuestas, clave, p.opciones)
      if (values.length) {
        graficas.push({ titulo: etiquetaDe(p), imagen: await aImagen(configPie(etiquetaDe(p), labels, values)) })
      }
    } catch {
      // se omite la gráfica si falla
    }
  }

  for (const p of preguntas) {
    if (pies.includes(p.clave)) continue
    try {
      const { labels, values } = contarPor(encuestas, p.clave, p.opciones)
      if (values.length) {
        graficas.push({ titulo: etiquetaDe(p), imagen: await aImagen(configBarra(etiquetaDe(p), labels, values)) })
      }
    } catch {
      // se omite la gráfica si falla
    }
  }

  try {
    const { labels, values } = respuestasPorMes(encuestas)
    if (values.length > 1) {
      graficas.push({
        titulo: 'Tendencia de registro de respuestas',
        imagen: await aImagen(configBarra('Tendencia de registro de respuestas', labels, values)),
      })
    }
  } catch {
    // se omite la gráfica si falla
  }

  return graficas
}
