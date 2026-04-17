import * as XLSX from 'xlsx'

function buildDocFilename(doc, ext) {
  const date = doc.date
    ? new Date(doc.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
    : ''
  const pipes = (doc.pipeTypes || [])
    .filter(pt => pt.diameter && pt.thickness)
    .map(pt => `${pt.diameter}x${pt.thickness}`)
    .slice(0, 2)
    .join('_')
  const parts = [date, pipes].filter(Boolean)
  return `${parts.join('_') || 'document'}.${ext}`
}

export function exportToExcel(documents) {
  if (!documents.length) return

  const rows = []
  const merges = []

  for (const doc of documents) {
    const dateStr = doc.date ? new Date(doc.date).toLocaleDateString('ru-RU') : '—'
    const typeLabel = doc.type === 'shipment' ? 'НАКЛАДНАЯ НА ОТГРУЗКУ' : 'ПРИЁМНЫЙ АКТ'
    const docNum = doc.id ? doc.id.slice(-8).toUpperCase() : '—'

    // === Document header ===
    let r = rows.length
    rows.push([typeLabel, '', '', '', `№ ${docNum}`, dateStr])
    merges.push({ s: { r, c: 0 }, e: { r, c: 3 } })

    r = rows.length
    rows.push([
      `Контрагент: ${doc.counterparty || '—'}`, '', '',
      `Место: ${doc.location || '—'}`, '', ''
    ])
    merges.push({ s: { r, c: 0 }, e: { r, c: 2 } })
    merges.push({ s: { r, c: 3 }, e: { r, c: 5 } })

    if (doc.vehicle) {
      r = rows.length
      rows.push([`Авто / Водитель: ${doc.vehicle}`, '', '', '', '', ''])
      merges.push({ s: { r, c: 0 }, e: { r, c: 5 } })
    }

    if (doc.note) {
      r = rows.length
      rows.push([`Примечание: ${doc.note}`, '', '', '', '', ''])
      merges.push({ s: { r, c: 0 }, e: { r, c: 5 } })
    }

    rows.push([''])

    // === Pipe type tables ===
    for (const pt of (doc.pipeTypes || [])) {
      const D = Number(pt.diameter)
      const S = Number(pt.thickness)
      const wpm = D > S ? 0.02466 * S * (D - S) : 0
      const lengths = (pt.lengths || []).filter(row => Number(row.length) > 0)
      if (!lengths.length) continue

      // Pipe type header row
      r = rows.length
      const pipeLabel = [
        pt.gost || '—',
        `Ø${pt.diameter}×${pt.thickness} мм`,
        pt.steelGrade || '',
      ].filter(Boolean).join('   ')
      rows.push([pipeLabel, '', '', '', `Вес п/м: ${wpm.toFixed(3)} кг/м`, ''])
      merges.push({ s: { r, c: 0 }, e: { r, c: 3 } })
      merges.push({ s: { r, c: 4 }, e: { r, c: 5 } })

      // Column headers
      rows.push(['№', 'Длина, м', 'Масса, кг', '', '', ''])

      // Length rows
      let subtotalLen = 0
      let subtotalWeight = 0
      lengths.forEach((row, i) => {
        const l = Number(row.length)
        const mass = wpm * l
        subtotalLen += l
        subtotalWeight += mass
        rows.push([i + 1, parseFloat(l.toFixed(3)), parseFloat(mass.toFixed(3)), '', '', ''])
      })

      // Subtotal
      r = rows.length
      rows.push([
        `Итого: ${lengths.length} шт`,
        parseFloat(subtotalLen.toFixed(3)),
        parseFloat(subtotalWeight.toFixed(3)),
        '', '', ''
      ])
      merges.push({ s: { r, c: 0 }, e: { r, c: 0 } })

      rows.push([''])
    }

    // === Document total ===
    r = rows.length
    rows.push([
      'ИТОГО:', '',
      `${doc.totalPipes || 0} труб`,
      `${(doc.totalLength || 0).toFixed(2)} м`,
      `${((doc.totalWeight || 0) / 1000).toFixed(3)} т`,
      ''
    ])
    merges.push({ s: { r, c: 0 }, e: { r, c: 1 } })

    rows.push([''])
    rows.push([''])
  }

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!merges'] = merges
  ws['!cols'] = [
    { wch: 42 },
    { wch: 12 },
    { wch: 12 },
    { wch: 22 },
    { wch: 22 },
    { wch: 14 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'История')

  const filename = documents.length === 1
    ? buildDocFilename(documents[0], 'xlsx')
    : `экспорт_${new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}.xlsx`

  try {
    XLSX.writeFile(wb, filename)
  } catch (err) {
    console.error('exportToExcel error:', err)
    throw err
  }
}
