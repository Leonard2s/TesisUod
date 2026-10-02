// Guía paso a paso para administrar las preguntas del cuestionario
// (pantalla Configuración). Usa driver.js para resaltar los elementos
// reales de la pantalla; cada uno está marcado con data-guia="..." en
// ConfiguracionView.vue.

import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

export function iniciarGuiaConfiguracion() {
  // Solo se incluyen los pasos cuyo elemento existe en la pantalla
  // (p. ej. si no hay preguntas eliminadas, ese paso se omite)
  const existe = (selector) => !!document.querySelector(selector)

  const pasos = [
    {
      popover: {
        title: 'Cómo configurar las preguntas',
        description:
          'Una guía de 6 pasos para administrar el cuestionario de la tesis: crear, editar, ordenar y eliminar preguntas. Pulsa «Siguiente» para avanzar.',
      },
    },
  ]

  if (existe('[data-guia="nueva"]')) {
    pasos.push({
      element: '[data-guia="nueva"]',
      popover: {
        title: 'Paso 1 · Crear una pregunta',
        description:
          'Pulsa «Nueva pregunta»: escribe el título, elige el tipo de respuesta (única o múltiple) y agrega al menos 2 opciones. La clave se genera sola a partir del título.',
      },
    })
  }

  if (existe('[data-guia="pregunta"]')) {
    pasos.push({
      element: '[data-guia="pregunta"]',
      popover: {
        title: 'Paso 2 · Las preguntas del cuestionario',
        description:
          'Esta lista muestra las preguntas activas en el orden en que se le presentan al paciente, con su tipo, clave, etiqueta corta y opciones.',
      },
    })
  }

  if (existe('[data-guia="editar"]')) {
    pasos.push({
      element: '[data-guia="editar"]',
      popover: {
        title: 'Paso 3 · Editar una pregunta',
        description:
          'Con el lápiz cambias el título, la etiqueta corta (usada en gráficas y exportaciones), el tipo y las opciones. La clave no se puede cambiar: las respuestas guardadas la usan como identificador.',
      },
    })
  }

  if (existe('[data-guia="orden"]')) {
    pasos.push({
      element: '[data-guia="orden"]',
      popover: {
        title: 'Paso 4 · Definir el orden',
        description:
          'Arrastra la tarjeta a su posición o usa las flechas para subir o bajar la pregunta. El orden se guarda al instante y define la secuencia del cuestionario, las estadísticas y las exportaciones.',
      },
    })
  }

  if (existe('[data-guia="eliminar"]')) {
    pasos.push({
      element: '[data-guia="eliminar"]',
      popover: {
        title: 'Paso 5 · Eliminar (borrado lógico)',
        description:
          'Al eliminar, la pregunta queda desactivada con la fecha y quién la eliminó, pero no se borra nada de la base de datos: sus respuestas anteriores se conservan.',
      },
    })
  }

  if (existe('[data-guia="eliminadas"]')) {
    pasos.push({
      element: '[data-guia="eliminadas"]',
      popover: {
        title: 'Paso 6 · Restaurar preguntas',
        description:
          'Las preguntas eliminadas se guardan aquí con su auditoría. Pulsa «Restaurar» para activarlas de nuevo.',
      },
    })
  }

  pasos.push({
    popover: {
      title: '¡Listo!',
      description:
        'Ya puedes administrar el cuestionario con confianza. Si olvidas algo, vuelve a abrir esta guía con el botón «?» de arriba.',
    },
  })

  const guia = driver({
    allowClose: true,
    overlayColor: 'rgba(15, 23, 42, 0.6)',
    popoverClass: 'guia-popover',
    showProgress: true,
    progressText: '{{current}} de {{total}}',
    prevBtnText: 'Atrás',
    nextBtnText: 'Siguiente',
    doneBtnText: '¡Listo!',
  })

  guia.setSteps(pasos)
  guia.drive()
}
