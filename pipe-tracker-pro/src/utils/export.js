import * as XLSX from 'xlsx'

export function exportToExcel(documents) {
  const rows = []

  // Header
  rows.push(['Дата', 'Тип', 'Контрагент', 'Место', 'Авто', 'ГОСТ', 'Диаметр', 'Толщина', 'Марка стали', 'Длина трубы', 'Вес п/м', 'Масса', 'Примечание'])

  for (const doc of documents) {
    for (const pt of (doc.pipeTypes || [])) {
      for (const row of (pt.lengths || [])) {
        if (Number(row.length) <= 0) continue
        const D = Number(pt.diameter)
        const S = Number(pt.thickness)
        const wpm = D > S ? 0.02466 * S * (D - S) : 0
        const mass = wpm * Number(row.length)
        rows.push([
          doc.date ? new Date(doc.date).toLocaleDateString('ru-RU') : '',
          doc.type === 'shipment' ? 'Отгрузка' : 'Приём',
          doc.counterparty || '',
          doc.location || '',
          doc.vehicle || '',
          pt.gost || '',
          pt.diameter || '',
          pt.thickness || '',
          pt.steelGrade || '',
          Number(row.length),
          parseFloat(wpm.toFixed(3)),
          parseFloat(mass.toFixed(3)),
          doc.note || '',
        ])
      }
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'История')

  // Column widths
  ws['!cols'] = [
    { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 25 },
    { wch: 25 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 10 },
    { wch: 10 }, { wch: 10 }, { wch: 20 },
  ]

  XLSX.writeFile(wb, `pipe-tracker-export-${Date.now()}.xlsx`)
}
