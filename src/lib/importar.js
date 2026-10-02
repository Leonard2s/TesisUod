// Importación de respuestas desde un archivo Excel exportado por la app.
// Usa la hoja "Metadatos" (incluida en la exportación) para mapear cada
// columna a la clave de la pregunta, así el archivo se puede importar
// aunque el cuestionario haya cambiado de orden o de etiquetas.

import { etiquetaDe } from './preguntas'

// "02/10/2026" -> ISO del mediodía local (evita desfases de zona horaria)
function parsearFecha(texto) {
  const partes = String(texto ?? '').trim().split('/')
  if (partes.length === 3) {
    const [d, m, y] = partes.map(Number)
    if (d && m && y) return new Date(y, m - 1, d, 12, 0, 0).toISOString()
  }
  return new Date().toISOString()
}

function limpiar(valor) {
  const texto = String(valor ?? '').trim()
  return !texto || texto === '—' ? null : texto
}

// Lee el archivo (.xlsx) y devuelve { filas, claves, sinPregunta } donde:
//   filas        -> encuestas listas para insertar (created_at, respuestas,
//                   registrado_nombre, registrado_matricula)
//   claves       -> claves de pregunta presentes en el archivo
//   sinPregunta  -> claves del archivo que ya no existen en el cuestionario
//                   actual (sus respuestas se guardan igual, por si la
//                   pregunta se restaura)
export async function importarEncuestasDesdeExcel(archivo, preguntas) {
  const { default: ExcelJS } = await import('exceljs')
  const buffer = await archivo.arrayBuffer()
  const libro = new ExcelJS.Workbook()
  await libro.xlsx.load(buffer)

  const hoja = libro.getWorksheet('Encuestas')
  if (!hoja) {
    throw new Error('El archivo no parece un export de esta app: falta la hoja "Encuestas"')
  }
  const hojaMeta = libro.getWorksheet('Metadatos')
  if (!hojaMeta) {
    throw new Error(
      'El archivo no incluye la hoja "Metadatos" de importación: vuelve a exportarlo desde la app'
    )
  }

  // Mapa de columnas de "Encuestas" (1-based) a clave de pregunta
  const mapaColumnas = new Map()
  hojaMeta.eachRow((fila, numero) => {
    if (numero === 1) return // encabezado
    const col = Number(fila.getCell(1).value)
    const clave = String(fila.getCell(2).value ?? '').trim()
    if (col && clave) mapaColumnas.set(col, clave)
  })
  if (!mapaColumnas.size) {
    throw new Error('La hoja "Metadatos" está vacía: vuelve a exportar el archivo desde la app')
  }

  // Ubicar columnas fijas por su título en la fila 1
  const titulos = new Map()
  hoja.getRow(1).eachCell((celda, col) => {
    titulos.set(String(celda.value ?? '').trim(), col)
  })
  const colFecha = titulos.get('Fecha') ?? 1
  const colNombre = titulos.get('Registrado por')
  const colMatricula = titulos.get('Matrícula')

  // Leer las filas de respuestas
  const filas = []
  hoja.eachRow((fila, numero) => {
    if (numero === 1) return
    const respuestas = {}
    let algunaRespuesta = false
    for (const [col, clave] of mapaColumnas) {
      const texto = String(fila.getCell(col).value ?? '').trim()
      if (texto && texto !== '—') {
        const valores = texto
          .split(', ')
          .map((v) => v.trim())
          .filter(Boolean)
        if (valores.length) {
          respuestas[clave] = valores
          algunaRespuesta = true
        }
      }
    }
    if (!algunaRespuesta) return // fila vacía

    filas.push({
      created_at: parsearFecha(fila.getCell(colFecha).value),
      respuestas,
      registrado_nombre: colNombre ? limpiar(fila.getCell(colNombre).value) : null,
      registrado_matricula: colMatricula ? limpiar(fila.getCell(colMatricula).value) : null,
    })
  })

  if (!filas.length) {
    throw new Error('El archivo no tiene respuestas para importar')
  }

  const claves = [...new Set([...mapaColumnas.values()])]
  const clavesActuales = new Set(preguntas.map((p) => p.clave))
  const sinPregunta = claves.filter((c) => !clavesActuales.has(c))

  return { filas, claves, sinPregunta, totalPreguntas: preguntas.length }
}
