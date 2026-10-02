// Exportación de los datos de la encuesta a Excel (.xlsx), PDF y Word (.docx).
// Las columnas se generan a partir de las preguntas activas (ordenadas),
// así que la exportación siempre refleja el cuestionario configurado.
//
// Las librerías (exceljs, jspdf, docx) se cargan de forma diferida: solo
// se descargan cuando el usuario exporta por primera vez.

import { etiquetaDe } from './preguntas'

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

export async function exportarExcel(encuestas, preguntas) {
  const { default: ExcelJS } = await import('exceljs')
  const libro = new ExcelJS.Workbook()
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
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })

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

  autoTable(doc, {
    head: [encabezados(preguntas)],
    body: filas(encuestas, preguntas),
    startY: 68,
    styles: { fontSize: 7, cellPadding: 4, overflow: 'linebreak' },
    headStyles: { fillColor: [13, 148, 136], textColor: 255, fontSize: 7 },
    alternateRowStyles: { fillColor: [240, 250, 249] },
  })

  descargar(doc.output('blob'), nombreArchivo('pdf'))
}

export async function exportarWord(encuestas, preguntas) {
  const {
    Document,
    HeadingLevel,
    Packer,
    Paragraph,
    ShadingType,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType,
  } = await import('docx')

  const cabecera = new TableRow({
    tableHeader: true,
    children: encabezados(preguntas).map(
      (texto) =>
        new TableCell({
          shading: { fill: '0D9488', type: ShadingType.CLEAR, color: 'auto' },
          children: [
            new Paragraph({
              children: [new TextRun({ text: texto, bold: true, color: 'FFFFFF', size: 18 })],
            }),
          ],
        })
    ),
  })

  const cuerpo = filas(encuestas, preguntas).map(
    (fila) =>
      new TableRow({
        children: fila.map(
          (texto) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: String(texto), size: 16 })],
                }),
              ],
            })
        ),
      })
  )

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
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [cabecera, ...cuerpo],
          }),
        ],
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  descargar(blob, nombreArchivo('docx'))
}
