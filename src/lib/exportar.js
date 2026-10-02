// Exportación de los datos de la encuesta a Excel (.xlsx), PDF y Word (.docx).
// Las columnas se generan a partir de las preguntas activas (ordenadas),
// así que la exportación siempre refleja el cuestionario configurado.
//
// Además de la tabla de respuestas, incluye las tablas de frecuencia y
// las gráficas de la tesis (pie de frecuencia y género, barras por
// pregunta y tendencia mensual).
//
// El Excel incluye una hoja "Metadatos" con el mapeo de columnas a la
// clave de cada pregunta; la usa el método de importación (lib/importar.js)
// para poder cargar el archivo de vuelta a la app.
//
// Las librerías (exceljs, jspdf, docx) se cargan de forma diferida: solo
// se descargan cuando el usuario exporta por primera vez.

import { etiquetaDe, contarPor } from './preguntas'
import { renderizarGraficas } from './graficas'

function encabezados(preguntas) {
  return [
    'Fecha',
    ...preguntas.map((p, i) => `${i + 1}. ${etiquetaDe(p)}`),
    'Registrado por',
    'Matrícula',
  ]
}

function filas(encuestas, preguntas) {
  return encuestas.map((e) => [
    new Date(e.created_at).toLocaleDateString('es-DO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }),
    ...preguntas.map((p) => (e.respuestas?.[p.clave] ?? []).join(', ')),
    e.registrado_nombre ?? '—',
    e.registrado_matricula ?? '—',
  ])
}

// Tablas de frecuencia por pregunta (opción, n, %)
function tablasFrecuencia(encuestas, preguntas) {
  return preguntas.map((p, i) => {
    const { labels, values } = contarPor(encuestas, p.clave, p.opciones)
    const total = values.reduce((a, b) => a + b, 0)
    return {
      titulo: `${i + 1}. ${etiquetaDe(p)}`,
      filas: labels.map((label, j) => [
        label,
        values[j],
        total ? Math.round((values[j] / total) * 100) + '%' : '0%',
      ]),
    }
  })
}

function nombreArchivo(extension) {
  const hoy = new Date().toISOString().slice(0, 10)
  return `encuestas-tesis-uod-${hoy}.${extension}`
}

function fechaLarga() {
  return new Date().toLocaleDateString('es-DO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function descargar(blob, nombre) {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}

const TAM_W = 480
const TAM_H = 288 // mismo aspecto que el render (640x384)

export async function exportarExcel(encuestas, preguntas) {
  const { default: ExcelJS } = await import('exceljs')
  const graficas = await renderizarGraficas(encuestas, preguntas)
  const libro = new ExcelJS.Workbook()

  // ---------- Hoja 1: tabla de respuestas ----------
  const hoja = libro.addWorksheet('Encuestas')
  const cabecera = encabezados(preguntas)
  const cuerpo = filas(encuestas, preguntas)
  const celdas = [cabecera, ...cuerpo]

  hoja.addRow(cabecera)
  const fila1 = hoja.getRow(1)
  fila1.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  fila1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } }
  hoja.views = [{ state: 'frozen', ySplit: 1 }]

  for (const fila of cuerpo) hoja.addRow(fila)

  // Ancho de columnas aproximado según el contenido más largo
  hoja.columns.forEach((columna, i) => {
    const max = Math.max(...celdas.map((fila) => String(fila[i] ?? '').length))
    columna.width = Math.min(Math.max(max + 2, 10), 45)
  })

  // ---------- Hoja 2: tablas de frecuencia ----------
  const hojaFrec = libro.addWorksheet('Frecuencias')
  hojaFrec.columns = [
    { header: 'Pregunta', key: 'pregunta' },
    { header: 'Opción', key: 'opcion' },
    { header: 'n', key: 'n' },
    { header: '%', key: 'pct' },
  ]
  const filaFrec1 = hojaFrec.getRow(1)
  filaFrec1.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  filaFrec1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } }
  for (const t of tablasFrecuencia(encuestas, preguntas)) {
    for (const [opcion, n, pct] of t.filas) {
      hojaFrec.addRow({ pregunta: t.titulo, opcion, n, pct })
    }
  }
  hojaFrec.columns.forEach((c) => (c.width = 26))

  // ---------- Hoja 3: gráficas ----------
  const hojaGraf = libro.addWorksheet('Gráficas')
  let fila = 1
  for (const g of graficas) {
    const celdaTitulo = hojaGraf.getCell(`A${fila}`)
    celdaTitulo.value = g.titulo
    celdaTitulo.font = { bold: true, size: 12 }
    const id = libro.addImage({
      base64: g.imagen.split(',')[1],
      extension: 'png',
    })
    // tl usa filas base 0: ancla la imagen justo debajo del título
    hojaGraf.addImage(id, {
      tl: { col: 0, row: fila },
      ext: { width: 640, height: 384 },
    })
    // 384px ≈ 26 filas de alto; se deja aire entre gráficas
    fila += 29
  }

  // ---------- Hoja 4: metadatos (para la importación) ----------
  const hojaMeta = libro.addWorksheet('Metadatos')
  hojaMeta.columns = [
    { header: 'Columna', key: 'col' },
    { header: 'Clave', key: 'clave' },
    { header: 'Título', key: 'titulo' },
    { header: 'Tipo', key: 'tipo' },
  ]
  const filaMeta1 = hojaMeta.getRow(1)
  filaMeta1.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  filaMeta1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } }
  preguntas.forEach((p, i) =>
    hojaMeta.addRow({ col: 2 + i, clave: p.clave, titulo: p.titulo, tipo: p.tipo })
  )
  hojaMeta.columns.forEach((c) => (c.width = 28))

  const buffer = await libro.xlsx.writeBuffer()
  descargar(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    nombreArchivo('xlsx')
  )
}

export async function exportarPDF(encuestas, preguntas) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  const graficas = await renderizarGraficas(encuestas, preguntas)
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const anchoPagina = doc.internal.pageSize.getWidth()
  const altoPagina = doc.internal.pageSize.getHeight()

  doc.setFontSize(15)
  doc.setTextColor(15, 23, 42)
  doc.text('Datos de la encuesta — Tesis UOD', 40, 38)

  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text(
    `Automedicación con antibióticos · ${encuestas.length} respuestas · Exportado el ${fechaLarga()}`,
    40,
    54
  )

  // Tabla de respuestas
  autoTable(doc, {
    head: [encabezados(preguntas)],
    body: filas(encuestas, preguntas),
    startY: 68,
    styles: { fontSize: 7, cellPadding: 4, overflow: 'linebreak' },
    headStyles: { fillColor: [13, 148, 136], textColor: 255, fontSize: 7 },
    alternateRowStyles: { fillColor: [240, 250, 249] },
  })

  // Tablas de frecuencia
  let y = (doc.lastAutoTable?.finalY ?? 68) + 24
  doc.setFontSize(12)
  doc.setTextColor(15, 23, 42)
  doc.text('Tablas de frecuencia', 40, y)
  for (const t of tablasFrecuencia(encuestas, preguntas)) {
    autoTable(doc, {
      head: [[t.titulo, 'n', '%']],
      body: t.filas,
      startY: y + 10,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [13, 148, 136], textColor: 255, fontSize: 8 },
      alternateRowStyles: { fillColor: [240, 250, 249] },
      margin: { left: 40, right: 40 },
    })
    y = (doc.lastAutoTable?.finalY ?? y) + 18
    if (y > altoPagina - 60) {
      doc.addPage()
      y = 48
    }
  }

  // Gráficas
  doc.addPage()
  doc.setFontSize(12)
  doc.setTextColor(15, 23, 42)
  doc.text('Gráficas', 40, 48)
  y = 70
  for (const g of graficas) {
    if (y + TAM_H > altoPagina - 30) {
      doc.addPage()
      y = 48
    }
    doc.setFontSize(10)
    doc.setTextColor(71, 85, 105)
    doc.text(g.titulo, (anchoPagina - TAM_W) / 2, y - 8)
    doc.addImage(g.imagen, 'PNG', (anchoPagina - TAM_W) / 2, y, TAM_W, TAM_H)
    y += TAM_H + 36
  }

  doc.save(nombreArchivo('pdf'))
}

export async function exportarWord(encuestas, preguntas) {
  const {
    AlignmentType,
    Document,
    HeadingLevel,
    ImageRun,
    Packer,
    Paragraph,
    ShadingType,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType,
  } = await import('docx')
  const graficas = await renderizarGraficas(encuestas, preguntas)

  const celda = (texto, opts = {}) =>
    new TableCell({
      children: [
        new Paragraph({
          alignment: opts.centrar ? AlignmentType.CENTER : undefined,
          children: [new TextRun({ text: String(texto), bold: opts.negrita, size: opts.tamano ?? 18, color: opts.color })],
        }),
      ],
      shading: opts.fondo
        ? { fill: '0D9488', type: ShadingType.CLEAR, color: 'auto' }
        : undefined,
      width: opts.ancho,
    })

  const tablaDatos = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: encabezados(preguntas).map((t) => celda(t, { negrita: true, color: 'FFFFFF', fondo: true })),
      }),
      ...filas(encuestas, preguntas).map(
        (fila) => new TableRow({ children: fila.map((t) => celda(t, { tamano: 16 })) })
      ),
    ],
  })

  // Tablas de frecuencia
  const tablasFrec = []
  for (const t of tablasFrecuencia(encuestas, preguntas)) {
    tablasFrec.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 360, after: 120 },
        children: [new TextRun({ text: t.titulo, bold: true, size: 22 })],
      }),
      new Table({
        width: { size: 70, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [celda('Opción', { negrita: true, color: 'FFFFFF', fondo: true }), celda('n', { negrita: true, color: 'FFFFFF', fondo: true, centrar: true }), celda('%', { negrita: true, color: 'FFFFFF', fondo: true, centrar: true })],
          }),
          ...t.filas.map(
            (f) => new TableRow({ children: [celda(f[0], { tamano: 16 }), celda(f[1], { tamano: 16, centrar: true }), celda(f[2], { tamano: 16, centrar: true })] })
          ),
        ],
      })
    )
  }

  // Gráficas como imágenes
  const parrafosGraficas = []
  for (const g of graficas) {
    const datos = await (await fetch(g.imagen)).arrayBuffer()
    parrafosGraficas.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 360, after: 120 },
        children: [new TextRun({ text: g.titulo, bold: true, size: 22 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            data: datos,
            transformation: { width: TAM_W, height: TAM_H },
          }),
        ],
      })
    )
  }

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: 'Datos de la encuesta — Tesis UOD',
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Automedicación con antibióticos · ${encuestas.length} respuestas · Exportado el ${fechaLarga()}`,
                color: '64748B',
                size: 20,
              }),
            ],
          }),
          new Paragraph({ text: '' }),
          tablaDatos,
          new Paragraph({ text: '' }),
          new Paragraph({ text: 'Tablas de frecuencia', heading: HeadingLevel.HEADING_2 }),
          ...tablasFrec,
          new Paragraph({ text: 'Gráficas', heading: HeadingLevel.HEADING_2, spacing: { before: 480 } }),
          ...parrafosGraficas,
        ],
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  descargar(blob, nombreArchivo('docx'))
}
