import html2pdf from 'html2pdf.js';

function formatDate(date) {
  return new Date(date).toLocaleDateString('ru-RU', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
}

function generateCalculationHtml(data) {
  return `
    <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; width: 210mm; height: 297mm;">
      <h1 style="font-size: 24px; margin-bottom: 0;">PIPE TRACKER PRO</h1>
      <p style="font-size: 14px; color: #777; margin-top: 5px;">Расчёт массы труб</p>

      <div style="margin-top: 30px;">
        <p><strong>Стандарт:</strong> ${data.gost || 'Не указан'}</p>
        <p><strong>Наружный диаметр:</strong> ${data.diameter} мм</p>
        <p><strong>Толщина стенки:</strong> ${data.thickness} мм</p>
        ${data.length ? `<p><strong>Длина трубы:</strong> ${data.length} м</p>` : ''}
        ${data.quantity > 1 ? `<p><strong>Количество:</strong> ${data.quantity} шт</p>` : ''}
      </div>

      <hr style="margin-top: 20px; margin-bottom: 20px; border: 0; border-top: 1px solid #eee;" />

      <h2 style="font-size: 18px;">Результаты расчёта</h2>
      <p><strong>Вес погонного метра:</strong> ${data.weightPerMeter.toFixed(2)} кг/м</p>
      ${data.weightOnePipe > 0 ? `<p><strong>Вес одной трубы:</strong> ${data.weightOnePipe.toFixed(2)} кг</p>` : ''}
      ${data.quantity > 1 ? `
        <p><strong>Общая длина:</strong> ${data.totalLength.toFixed(1)} м</p>
        <p><strong>Общий тоннаж:</strong> ${(data.totalWeight / 1000).toFixed(3)} т</p>
      ` : ''}

      <div style="position: absolute; bottom: 20px; font-size: 12px; color: #999;">
        Сформировано: ${formatDate(new Date())}
      </div>
    </div>
  `;
}

export async function printCalculation(data) {
  const element = document.createElement('div');
  element.innerHTML = generateCalculationHtml(data);

  const opt = {
    margin:       0,
    filename:     `calculation-${Date.now()}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().from(element).set(opt).save();
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function generateDocumentHtml(doc) {
  const title = doc.type === 'shipment' ? 'НАКЛАДНАЯ НА ОТГРУЗКУ' : 'ПРИЁМНЫЙ АКТ'
  const docNum = doc.id ? escapeHtml(doc.id.slice(-8).toUpperCase()) : '—'

  const pipeTablesHtml = (doc.pipeTypes || []).map(pt => {
    const D = Number(pt.diameter)
    const S = Number(pt.thickness)
    const wpm = D > S ? 0.02466 * S * (D - S) : 0
    const header = `${escapeHtml(pt.gost || '—')} &nbsp; Ø${escapeHtml(pt.diameter)}×${escapeHtml(pt.thickness)} мм${pt.steelGrade ? ' &nbsp; ' + escapeHtml(pt.steelGrade) : ''}`

    if (pt.mode === 'batch') {
      const batches = (pt.batches || []).filter(b => Number(b.count) > 0 && Number(b.totalLength) > 0 && Number(b.totalWeight) > 0)
      if (batches.length === 0) return ''
      let totalCnt = 0, totalLen = 0, totalWt = 0
      const rows = batches.map((b, i) => {
        const cnt = Number(b.count); const len = Number(b.totalLength); const wt = Number(b.totalWeight)
        totalCnt += cnt; totalLen += len; totalWt += wt
        return `<tr>
          <td style="padding:2px 6px;border:1px solid #ccc;text-align:center;font-size:10px;">${i + 1}</td>
          <td style="padding:2px 6px;border:1px solid #ccc;font-size:10px;">${cnt}</td>
          <td style="padding:2px 6px;border:1px solid #ccc;font-size:10px;">${len.toFixed(2)}</td>
          <td style="padding:2px 6px;border:1px solid #ccc;font-size:10px;">${wt.toFixed(3)}</td>
        </tr>`
      }).join('')
      return `
        <div style="margin-bottom:12px;">
          <p style="font-weight:600;margin-bottom:4px;font-size:11px;">${header}</p>
          <table style="width:auto;border-collapse:collapse;font-size:10px;">
            <thead><tr style="background:#f0f0f0;">
              <th style="padding:2px 6px;border:1px solid #ccc;">№</th>
              <th style="padding:2px 6px;border:1px solid #ccc;">Кол-во, шт</th>
              <th style="padding:2px 6px;border:1px solid #ccc;">Длина, м</th>
              <th style="padding:2px 6px;border:1px solid #ccc;">Тоннаж, тн</th>
            </tr></thead>
            <tbody>${rows}</tbody>
            <tfoot><tr style="font-weight:600;background:#f9f9f9;">
              <td style="padding:2px 6px;border:1px solid #ccc;">Итого:</td>
              <td style="padding:2px 6px;border:1px solid #ccc;">${totalCnt} шт</td>
              <td style="padding:2px 6px;border:1px solid #ccc;">${totalLen.toFixed(2)} м</td>
              <td style="padding:2px 6px;border:1px solid #ccc;">${totalWt.toFixed(3)} тн</td>
            </tr></tfoot>
          </table>
        </div>`
    }

    const lengths = (pt.lengths || []).filter(r => Number(r.length) > 0)
    if (lengths.length === 0) return ''

    let subtotalLen = 0
    let subtotalWeight = 0
    const rows = lengths.map((r, i) => {
      const l = Number(r.length)
      subtotalLen += l
      subtotalWeight += wpm * l
      return `<tr>
        <td style="padding:2px 6px;border:1px solid #ccc;text-align:center;font-size:10px;">${i + 1}</td>
        <td style="padding:2px 6px;border:1px solid #ccc;font-size:10px;">${l.toFixed(2)}</td>
      </tr>`
    }).join('')

    return `
      <div style="margin-bottom:12px;">
        <p style="font-weight:600;margin-bottom:4px;font-size:11px;">
          ${header} &nbsp;&nbsp; Вес п/м: ${wpm.toFixed(3)} кг/м
        </p>
        <table style="width:auto;border-collapse:collapse;font-size:10px;">
          <thead>
            <tr style="background:#f0f0f0;">
              <th style="padding:2px 6px;border:1px solid #ccc;text-align:left;">№</th>
              <th style="padding:2px 6px;border:1px solid #ccc;text-align:left;">Длина, м</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr style="font-weight:600;background:#f9f9f9;">
              <td style="padding:2px 6px;border:1px solid #ccc;">Итого: ${lengths.length} шт</td>
              <td style="padding:2px 6px;border:1px solid #ccc;">${subtotalLen.toFixed(2)} м / ${subtotalWeight.toFixed(3)} кг</td>
            </tr>
          </tfoot>
        </table>
      </div>`
  }).join('')

  const detailRows = [
    doc.date ? `<tr><td style="padding:3px 6px;color:#555;width:40%;">Дата:</td><td style="padding:3px 6px;">${escapeHtml(formatDate(doc.date))}</td></tr>` : '',
    doc.counterparty ? `<tr><td style="padding:3px 6px;color:#555;">Контрагент:</td><td style="padding:3px 6px;">${escapeHtml(doc.counterparty)}</td></tr>` : '',
    doc.location ? `<tr><td style="padding:3px 6px;color:#555;">Место:</td><td style="padding:3px 6px;">${escapeHtml(doc.location)}</td></tr>` : '',
    doc.vehicle ? `<tr><td style="padding:3px 6px;color:#555;">Авто / Водитель:</td><td style="padding:3px 6px;">${escapeHtml(doc.vehicle)}</td></tr>` : '',
    doc.note ? `<tr><td style="padding:3px 6px;color:#555;">Примечание:</td><td style="padding:3px 6px;">${escapeHtml(doc.note)}</td></tr>` : '',
  ].filter(Boolean).join('')

  return `
    <div style="font-family:Arial,sans-serif;color:#222;padding:20px 24px;width:210mm;box-sizing:border-box;">
      <div style="text-align:center;margin-bottom:18px;">
        <h2 style="margin:0;font-size:18px;letter-spacing:1px;">${escapeHtml(title)}</h2>
        <p style="margin:4px 0 0;font-size:12px;color:#666;">№ ${docNum} &nbsp;|&nbsp; ${doc.date ? escapeHtml(formatDate(doc.date)) : '—'}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:18px;">
        <tbody>${detailRows}</tbody>
      </table>
      <hr style="border:0;border-top:1px solid #ddd;margin-bottom:16px;" />
      ${pipeTablesHtml}
      <hr style="border:0;border-top:2px solid #333;margin:16px 0 10px;" />
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px;">
        <tbody>
          <tr style="font-weight:600;">
            <td style="padding:4px 8px;border:1px solid #ccc;">Всего труб:</td>
            <td style="padding:4px 8px;border:1px solid #ccc;">${doc.totalPipes || 0} шт</td>
            <td style="padding:4px 8px;border:1px solid #ccc;">Общая длина:</td>
            <td style="padding:4px 8px;border:1px solid #ccc;">${(doc.totalLength || 0).toFixed(2)} м</td>
            <td style="padding:4px 8px;border:1px solid #ccc;">Тоннаж:</td>
            <td style="padding:4px 8px;border:1px solid #ccc;">${((doc.totalWeight || 0) / 1000).toFixed(3)} т</td>
          </tr>
        </tbody>
      </table>
      <div style="display:flex;justify-content:space-between;margin-top:32px;font-size:12px;">
        <div>Сдал: ______________________ / ___________</div>
        <div>Принял: ______________________ / ___________</div>
      </div>
      <p style="font-size:10px;color:#aaa;margin-top:20px;">Сформировано: ${escapeHtml(formatDate(new Date()))}</p>
    </div>`
}

function createDocElement(docData) {
  const element = document.createElement('div')
  const safeHtml = generateDocumentHtml(docData)
  // Content is generated from app's own stored data with all strings escaped via escapeHtml
  element.innerHTML = safeHtml // eslint-disable-line -- user data is escaped above
  return element
}

function buildPdfFilename(docData) {
  const date = docData.date
    ? new Date(docData.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
    : ''
  const pipes = (docData.pipeTypes || [])
    .filter(pt => pt.diameter && pt.thickness)
    .map(pt => `${pt.diameter}x${pt.thickness}`)
    .slice(0, 2)
    .join('_')
  const parts = [date, pipes].filter(Boolean)
  return `${parts.join('_') || `document-${docData.id || Date.now()}`}.pdf`
}

function getDocOpt(docData) {
  return {
    margin: 0,
    filename: buildPdfFilename(docData),
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  }
}

export async function printDocument(docData) {
  try {
    const element = createDocElement(docData)
    document.body.appendChild(element)
    await html2pdf().from(element).set(getDocOpt(docData)).save()
    document.body.removeChild(element)
  } catch (err) {
    console.error('printDocument error:', err)
    throw err
  }
}

export async function getDocumentBlob(docData, format = 'pdf') {
  const element = createDocElement(docData)
  document.body.appendChild(element)
  try {
    if (format === 'image') {
      const { default: html2canvasMod } = await import('html2canvas')
      const canvas = await html2canvasMod(element, { scale: 2, useCORS: true })
      document.body.removeChild(element)
      return await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
    }
    const blob = await html2pdf().from(element).set(getDocOpt(docData)).outputPdf('blob')
    document.body.removeChild(element)
    return blob
  } catch (err) {
    document.body.removeChild(element)
    throw err
  }
}

// Returns true if native share dialog opened, false if fell back to new tab
// photos: array of { dataUrl, label }
export async function shareDocument(docData, photos = []) {
  const blob = await getDocumentBlob(docData, 'pdf')
  const pdfFile = new File([blob], `document-${docData.id || Date.now()}.pdf`, { type: 'application/pdf' })

  const labelMap = { 'Перед': 'front', 'Зад': 'back', 'Доп.': 'extra' }
  const photoFiles = photos.map((p, i) => {
    const base64 = p.dataUrl.split(',')[1]
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
    const slug = labelMap[p.label] || `photo-${i + 1}`
    return new File([bytes], `${slug}.jpg`, { type: 'image/jpeg' })
  })

  const title = docData.type === 'shipment' ? 'Накладная на отгрузку' : 'Приёмный акт'

  // Try sharing with photos first, then PDF-only, then fallback
  const allFiles = [pdfFile, ...photoFiles]
  const pdfOnly = [pdfFile]

  if (navigator.canShare) {
    if (navigator.canShare({ files: allFiles })) {
      await navigator.share({ title, files: allFiles })
      return true
    }
    if (navigator.canShare({ files: pdfOnly })) {
      await navigator.share({ title, files: pdfOnly })
      return true
    }
  }

  // Fallback: open PDF in new tab (photos can't be auto-shared without HTTPS)
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 30000)
  return false
}

export { generateDocumentHtml, escapeHtml, buildPdfFilename }
