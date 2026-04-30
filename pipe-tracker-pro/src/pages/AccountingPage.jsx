import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { GOST_DATA, calculateWeight } from '../data/gost'
import { saveDocument, updateDocument, getDocument, getAllCounterparties, getAllTemplates, saveTemplate } from '../db'
import { randomUUID } from '../utils/uuid'

const MAX_PIPE_ROWS = 60

const emptyBatch = () => ({ id: randomUUID(), count: '', totalLength: '', totalWeight: '' })
const emptyPipeType = () => ({
  gost: '', diameter: '', thickness: '', steelGrade: '',
  mode: 'individual',
  lengths: [{ id: randomUUID(), length: '', note: '' }],
  batches: [emptyBatch()],
})

export default function AccountingPage() {
  const navigate = useNavigate()
  const { id: editId } = useParams()
  const isEditMode = Boolean(editId)
  const today = new Date().toISOString().split('T')[0]

  const [type, setType] = useState('shipment')
  const [date, setDate] = useState(today)
  const [location, setLocation] = useState('')
  const [counterparty, setCounterparty] = useState('')
  const [counterparties, setCounterparties] = useState([])
  const [vehicle, setVehicle] = useState('')
  const [note, setNote] = useState('')
  const [docId, setDocId] = useState(null)
  const [docNumber, setDocNumber] = useState(null)

  const [pipeTypes, setPipeTypes] = useState([emptyPipeType()])

  const [photos, setPhotos] = useState([])

  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [errors, setErrors] = useState({})
  const [isExporting, setIsExporting] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [templates, setTemplates] = useState([])
  const [showTemplateSheet, setShowTemplateSheet] = useState(false)
  const [showSaveTpl, setShowSaveTpl] = useState(false)
  const [tplName, setTplName] = useState('')
  const [toast, setToast] = useState(null)

  const toastTimerRef = useRef(null)

  useEffect(() => {
    getAllCounterparties()
      .then(list => setCounterparties(list.map(c => c.name)))
      .catch(err => setError('Не удалось загрузить контрагентов: ' + err.message))
    getAllTemplates()
      .then(setTemplates)
      .catch(() => {})
    import('../utils/print').catch(() => {})
  }, [])

  useEffect(() => {
    if (!isEditMode) return
    getDocument(editId)
      .then(doc => {
        if (!doc) return
        setDocId(doc.id)
        setDocNumber(doc.docNumber || null)
        setType(doc.type || 'shipment')
        setDate(doc.date || today)
        setLocation(doc.location || '')
        setCounterparty(doc.counterparty || '')
        setVehicle(doc.vehicle || '')
        setNote(doc.note || '')
        if (doc.pipeTypes?.length) {
          setPipeTypes(doc.pipeTypes.map(pt => ({
            ...pt,
            mode: pt.mode || 'individual',
            batches: pt.batches?.length ? pt.batches : [emptyBatch()],
          })))
        }
        if (doc.photos?.length) setPhotos(doc.photos)
      })
      .catch(err => setError('Не удалось загрузить документ: ' + err.message))
  }, [editId, isEditMode])

  const gostKeys = Object.keys(GOST_DATA)

  const compressImage = (file) => new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const MAX = 1400
      let w = img.width, h = img.height
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX }
        else { w = Math.round(w * MAX / h); h = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = () => URL.revokeObjectURL(objectUrl)
    img.src = objectUrl
  })

  const handlePhotoAdd = (label) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.style.display = 'none'
    document.body.appendChild(input)
    const cleanup = () => {
      if (document.body.contains(input)) document.body.removeChild(input)
    }
    input.onchange = async (e) => {
      const file = e.target.files[0]
      cleanup()
      if (!file) return
      try {
        const dataUrl = await compressImage(file)
        setPhotos(prev => {
          const existing = prev.findIndex(p => p.label === label)
          if (existing >= 0) {
            const updated = [...prev]
            updated[existing] = { ...updated[existing], dataUrl }
            return updated
          }
          return [...prev, { id: randomUUID(), dataUrl, label }]
        })
      } catch (err) { setError('Не удалось загрузить фото: ' + err.message) }
    }
    input.addEventListener('cancel', cleanup)
    input.click()
  }

  const handlePhotoRemove = (id) => setPhotos(prev => prev.filter(p => p.id !== id))

  const showToastMsg = (msg) => {
    clearTimeout(toastTimerRef.current)
    setToast(msg)
    toastTimerRef.current = setTimeout(() => setToast(null), 2500)
  }

  useEffect(() => () => clearTimeout(toastTimerRef.current), [])

  const handleApplyTemplate = (tpl) => {
    setShowTemplateSheet(false)
    setPipeTypes(tpl.pipeTypes.map(pt => ({
      ...pt,
      id: randomUUID(),
      lengths: [{ id: randomUUID(), length: '' }],
      batches: [emptyBatch()],
    })))
  }

  const handleSaveAsTemplate = async () => {
    if (!tplName.trim()) return
    const validSpecs = pipeTypes
      .filter(pt => pt.diameter && pt.thickness)
      .map(({ lengths: _l, batches: _b, id: _id, ...rest }) => rest)
    if (!validSpecs.length) return
    try {
      await saveTemplate({ name: tplName.trim(), pipeTypes: validSpecs })
      const updated = await getAllTemplates()
      setTemplates(updated)
      setTplName('')
      setShowSaveTpl(false)
      showToastMsg('✓ Шаблон сохранён')
    } catch (err) {
      setError('Не удалось сохранить шаблон: ' + err.message)
    }
  }

  const totals = useMemo(() => {
    let totalPipes = 0
    let totalLength = 0
    let totalWeight = 0

    for (const pt of pipeTypes) {
      if (pt.mode === 'batch') {
        for (const b of (pt.batches || [])) {
          const cnt = Number(b.count)
          const len = Number(b.totalLength)
          const wt = Number(b.totalWeight)
          if (cnt > 0 && len > 0 && wt > 0) {
            totalPipes += cnt
            totalLength += len
            totalWeight += wt * 1000
          }
        }
      } else {
        if (!pt.diameter || !pt.thickness) continue
        const D = Number(pt.diameter)
        const S = Number(pt.thickness)
        const wpm = calculateWeight(D, S)
        for (const row of pt.lengths) {
          const l = Number(row.length)
          if (l > 0) {
            totalPipes++
            totalLength += l
            totalWeight += wpm * l
          }
        }
      }
    }

    return { totalPipes, totalLength, totalWeight }
  }, [pipeTypes])

  const validate = () => {
    const errs = {}
    if (!counterparty.trim()) errs.counterparty = 'Укажите контрагента'
    if (!date) errs.date = 'Укажите дату'
    const hasData = pipeTypes.some(pt => {
      if (pt.mode === 'batch') {
        return (pt.batches || []).some(b => Number(b.count) > 0 && Number(b.totalLength) > 0 && Number(b.totalWeight) > 0)
      }
      return (pt.lengths || []).some(r => Number(r.length) > 0)
    })
    if (!hasData) errs.pipes = 'Добавьте хотя бы одну трубу или пачку с данными'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const addPipeType = () => setPipeTypes([...pipeTypes, emptyPipeType()])

  const removePipeType = (index) => {
    if (pipeTypes.length <= 1) return
    setPipeTypes(pipeTypes.filter((_, i) => i !== index))
  }

  const updatePipeType = (index, field, value) => {
    const updated = [...pipeTypes]
    updated[index] = { ...updated[index], [field]: value }
    if (field === 'gost') { updated[index].diameter = ''; updated[index].thickness = '' }
    if (field === 'diameter') { updated[index].thickness = '' }
    setPipeTypes(updated)
  }

  const setMode = (pipeIndex, mode) => {
    setPipeTypes(pipeTypes.map((p, i) => i === pipeIndex ? { ...p, mode } : p))
  }

  // Individual mode helpers
  const removeLengthRow = (pipeIndex, rowIndex) => {
    const pt = pipeTypes[pipeIndex]
    if (pt.lengths.length <= 1) return
    setPipeTypes(pipeTypes.map((p, i) =>
      i === pipeIndex ? { ...p, lengths: p.lengths.filter((_, ri) => ri !== rowIndex) } : p
    ))
  }

  const updateLength = (pipeIndex, rowIndex, value) => {
    setPipeTypes(pipeTypes.map((p, i) => {
      if (i !== pipeIndex) return p
      const newLengths = p.lengths.map((r, ri) =>
        ri === rowIndex ? { ...r, length: value } : r
      )
      if (rowIndex === newLengths.length - 1 && value !== '') {
        newLengths.push({ id: randomUUID(), length: '', note: '' })
      }
      return { ...p, lengths: newLengths }
    }))
  }

  const updateLengthNote = (pipeIndex, rowIndex, value) => {
    setPipeTypes(pipeTypes.map((p, i) => {
      if (i !== pipeIndex) return p
      return {
        ...p,
        lengths: p.lengths.map((r, ri) =>
          ri === rowIndex ? { ...r, note: value } : r
        ),
      }
    }))
  }

  // Batch mode helpers
  const updateBatch = (pipeIndex, batchIndex, field, value) => {
    setPipeTypes(pipeTypes.map((p, i) => {
      if (i !== pipeIndex) return p
      const newBatches = p.batches.map((b, bi) =>
        bi === batchIndex ? { ...b, [field]: value } : b
      )
      return { ...p, batches: newBatches }
    }))
  }

  const addBatchRow = (pipeIndex) => {
    setPipeTypes(pipeTypes.map((p, i) =>
      i === pipeIndex ? { ...p, batches: [...p.batches, emptyBatch()] } : p
    ))
  }

  const removeBatchRow = (pipeIndex, batchIndex) => {
    setPipeTypes(pipeTypes.map((p, i) => {
      if (i !== pipeIndex) return p
      if (p.batches.length <= 1) return p
      return { ...p, batches: p.batches.filter((_, bi) => bi !== batchIndex) }
    }))
  }

  const buildDocData = () => ({
    id: docId || 'preview',
    docNumber,
    type,
    date,
    counterparty,
    location,
    vehicle,
    note,
    pipeTypes: pipeTypes.map(pt => {
      const D = Number(pt.diameter)
      const S = Number(pt.thickness)
      return { ...pt, weightPerMeter: calculateWeight(D, S) }
    }),
    ...totals,
  })

  const handleSave = async () => {
    if (!validate()) return
    setError(null)
    try {
      const doc = {
        type, date, location, counterparty, vehicle, note, pipeTypes,
        totalPipes: totals.totalPipes,
        totalLength: totals.totalLength,
        totalWeight: totals.totalWeight,
      }
      doc.photos = photos
      if (isEditMode) {
        doc.id = docId || editId
        await updateDocument(doc)
      } else {
        await saveDocument(doc)
      }
      navigate('/history')
    } catch (err) {
      setError('Не удалось сохранить документ: ' + err.message)
    }
  }

  const handleOpenPdf = async () => {
    setIsExporting(true)
    setError(null)
    try {
      const { getDocumentBlob, buildPdfFilename } = await import('../utils/print')
      const docData = buildDocData()
      const blob = await getDocumentBlob(docData, 'pdf')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = buildPdfFilename(docData)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 30000)
    } catch (err) {
      setError('Ошибка при генерации PDF: ' + err.message)
    } finally {
      setIsExporting(false)
    }
  }

  const handleShare = async () => {
    setError(null)
    setInfo(null)

    if (!navigator.share) {
      setInfo('Функция «Поделиться» не поддерживается в вашем браузере.')
      return
    }

    setIsExporting(true)
    const docData = buildDocData()
    const typeLabel = docData.type === 'shipment' ? 'Накладная на отгрузку' : 'Приёмный акт'

    const photoFiles = photos.map((p, i) => {
      const base64 = p.dataUrl.split(',')[1]
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
      return new File([bytes], `photo-${p.label || i + 1}.jpg`, { type: 'image/jpeg' })
    })

    try {
      const { getDocumentBlob } = await import('../utils/print')
      const blob = await getDocumentBlob(docData, 'pdf')
      const pdfFile = new File([blob], `document-${Date.now()}.pdf`, { type: 'application/pdf' })
      const allFiles = [pdfFile, ...photoFiles]

      let shareData
      if (navigator.canShare({ files: allFiles })) {
        shareData = { title: typeLabel, files: allFiles }
      } else if (navigator.canShare({ files: [pdfFile] })) {
        shareData = { title: typeLabel, files: [pdfFile] }
      } else {
        shareData = { title: typeLabel, text: `${typeLabel}\n${docData.counterparty || ''}\nТоннаж: ${(docData.totalWeight / 1000).toFixed(3)} т` }
      }

      await navigator.share(shareData)
    } catch (err) {
      if (err.name !== 'AbortError') setError('Ошибка при отправке: ' + err.message)
    } finally {
      setIsExporting(false)
    }
  }

  const handlePreview = async () => {
    setError(null)
    setIsPreviewing(true)
    try {
      const { generateDocumentHtml } = await import('../utils/print')
      const body = generateDocumentHtml(buildDocData())
      const fullHtml = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Предпросмотр</title></head><body style="margin:0;padding:0">${body}</body></html>`
      const blob = new Blob([fullHtml], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 30000)
    } catch (err) {
      setError('Ошибка предпросмотра: ' + err.message)
    } finally {
      setIsPreviewing(false)
    }
  }

  return (
    <div className="page-enter">

      {error && (
        <div className="error-banner">
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}
      {info && (
        <div className="info-banner">
          <span style={{ flex: 1 }}>{info}</span>
          <button onClick={() => setInfo(null)}>×</button>
        </div>
      )}

      {/* Шапка документа */}
      <div className="card">
        <div className="card-header">
          <div className="card-num">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div className="card-title">{isEditMode ? 'Редактирование документа' : 'Шапка документа'}</div>
        </div>

        <div className="form-group">
          <label className="form-label">Тип операции</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={`btn ${type === 'shipment' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => setType('shipment')}>
              Отгрузка
            </button>
            <button className={`btn ${type === 'receiving' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => setType('receiving')}>
              Приём
            </button>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Дата</label>
            <input
              type="date"
              value={date}
              className={errors.date ? 'input-error' : ''}
              onChange={(e) => { setDate(e.target.value); setErrors(prev => ({ ...prev, date: null })) }}
            />
            {errors.date && <span className="field-error">{errors.date}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Место</label>
            <input type="text" placeholder="Напр. Склад №1" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Контрагент</label>
          <input
            type="text"
            list="counterparties-list"
            placeholder="Название компании"
            value={counterparty}
            className={errors.counterparty ? 'input-error' : ''}
            onChange={(e) => { setCounterparty(e.target.value); setErrors(prev => ({ ...prev, counterparty: null })) }}
          />
          {errors.counterparty && <span className="field-error">{errors.counterparty}</span>}
          <datalist id="counterparties-list">
            {counterparties.map(c => <option key={c} value={c} />)}
          </datalist>
        </div>

        <div className="form-group">
          <label className="form-label">Авто / водитель</label>
          <input type="text" placeholder="Напр. КАМАЗ А123БВ / Иванов И.И." value={vehicle} onChange={(e) => setVehicle(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Примечание</label>
          <textarea rows="2" placeholder="Дополнительная информация..." value={note} onChange={(e) => setNote(e.target.value)} style={{ resize: 'vertical' }} />
        </div>
      </div>

      {/* Параметры трубы */}
      {templates.length > 0 && (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ width: '100%', marginBottom: 10, borderColor: 'var(--cyan)', color: 'var(--cyan-light)' }}
          onClick={() => setShowTemplateSheet(true)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          Применить шаблон
        </button>
      )}
      {pipeTypes.map((pt, pi) => {
        const diameters = pt.gost ? Object.keys(GOST_DATA[pt.gost]).map(Number).sort((a, b) => a - b) : []
        const thicknesses = (pt.gost && pt.diameter) ? GOST_DATA[pt.gost][Number(pt.diameter)] || [] : []
        const D = Number(pt.diameter)
        const S = Number(pt.thickness)
        const wpm = calculateWeight(D, S)
        const isBatch = pt.mode === 'batch'

        // Per-type mini summary
        let ptSummary = null
        if (isBatch) {
          const filled = (pt.batches || []).filter(b => Number(b.count) > 0 && Number(b.totalLength) > 0 && Number(b.totalWeight) > 0)
          if (filled.length > 0) {
            const ptPipes = filled.reduce((s, b) => s + Number(b.count), 0)
            const ptLength = filled.reduce((s, b) => s + Number(b.totalLength), 0)
            const ptWeight = filled.reduce((s, b) => s + Number(b.totalWeight), 0)
            ptSummary = (
              <div style={{ display: 'flex', gap: 6, marginBottom: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                <span>{ptPipes} шт</span><span>·</span>
                <span>{ptLength.toFixed(2)} м</span><span>·</span>
                <span style={{ color: 'var(--gold)' }}>{ptWeight.toFixed(3)} т</span>
              </div>
            )
          }
        } else {
          const filledLengths = pt.lengths.filter(r => Number(r.length) > 0)
          const ptPipes = filledLengths.length
          const ptLength = filledLengths.reduce((s, r) => s + Number(r.length), 0)
          const ptWeight = wpm * ptLength
          if (ptPipes > 0 && wpm > 0) {
            ptSummary = (
              <div style={{ display: 'flex', gap: 6, marginBottom: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                <span>{ptPipes} шт</span><span>·</span>
                <span>{ptLength.toFixed(2)} м</span><span>·</span>
                <span style={{ color: 'var(--gold)' }}>{(ptWeight / 1000).toFixed(3)} т</span>
              </div>
            )
          }
        }

        return (
          <div className="card" key={pi}>
            <div className="card-header">
              <div className="card-num">{pi + 1}</div>
              <div className="card-title">Параметры трубы</div>
              {pipeTypes.length > 1 && (
                <button className="btn-icon btn-danger btn-sm" onClick={() => removePipeType(pi)} title="Удалить вид трубы">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">ГОСТ</label>
              <select value={pt.gost} onChange={(e) => updatePipeType(pi, 'gost', e.target.value)}>
                <option value="">— Выберите ГОСТ —</option>
                {gostKeys.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Диаметр, мм</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="— Ø —"
                  value={pt.diameter}
                  list={`diameters-${pi}`}
                  onChange={(e) => updatePipeType(pi, 'diameter', e.target.value)}
                />
                <datalist id={`diameters-${pi}`}>
                  {diameters.map(d => <option key={d} value={d} />)}
                </datalist>
              </div>
              <div className="form-group">
                <label className="form-label">Толщина, мм</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="— S —"
                  value={pt.thickness}
                  list={`thicknesses-${pi}`}
                  onChange={(e) => updatePipeType(pi, 'thickness', e.target.value)}
                />
                <datalist id={`thicknesses-${pi}`}>
                  {thicknesses.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Марка стали</label>
              <input type="text" placeholder="Напр. Ст20" value={pt.steelGrade} onChange={(e) => updatePipeType(pi, 'steelGrade', e.target.value)} />
            </div>

            {wpm > 0 && !isBatch && (
              <div className="result-row">
                <span className="result-label">Вес п/м</span>
                <span className="result-value">{wpm.toFixed(2)} кг/м</span>
              </div>
            )}

            {/* Режим ввода */}
            <div className="divider" />
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <button
                className={`btn btn-sm ${!isBatch ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => setMode(pi, 'individual')}
              >
                По трубам
              </button>
              <button
                className={`btn btn-sm ${isBatch ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => setMode(pi, 'batch')}
              >
                Пачками
              </button>
            </div>

            {ptSummary}

            {isBatch ? (
              /* Таблица пачек */
              <div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 4, paddingLeft: 30 }}>
                  <span style={{ flex: 1, fontSize: 10, color: 'var(--text-dim)', textAlign: 'center' }}>Кол-во, шт</span>
                  <span style={{ flex: 1.5, fontSize: 10, color: 'var(--text-dim)', textAlign: 'center' }}>Длина, м</span>
                  <span style={{ flex: 1.5, fontSize: 10, color: 'var(--text-dim)', textAlign: 'center' }}>Тоннаж, тн</span>
                  <span style={{ width: 30 }} />
                </div>
                {pt.batches.map((b, bi) => (
                  <div key={b.id} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)', width: 24, textAlign: 'center', flexShrink: 0 }}>
                      {bi + 1}
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="шт"
                      value={b.count}
                      onChange={(e) => updateBatch(pi, bi, 'count', e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="м"
                      value={b.totalLength}
                      onChange={(e) => updateBatch(pi, bi, 'totalLength', e.target.value)}
                      style={{ flex: 1.5 }}
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      placeholder="тн"
                      value={b.totalWeight}
                      onChange={(e) => updateBatch(pi, bi, 'totalWeight', e.target.value)}
                      style={{ flex: 1.5 }}
                    />
                    {pt.batches.length > 1 && (
                      <button className="btn-icon btn-sm" onClick={() => removeBatchRow(pi, bi)} style={{ flexShrink: 0 }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                <button className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: 4 }} onClick={() => addBatchRow(pi)}>
                  + Добавить пачку
                </button>
              </div>
            ) : (
              /* Таблица индивидуальных длин */
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span className="form-label" style={{ marginBottom: 0 }}>Длины труб</span>
                  <span className="form-label" style={{ marginBottom: 0, color: 'var(--gold)' }}>
                    {pt.lengths.filter(r => Number(r.length) > 0).length} / {MAX_PIPE_ROWS}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 4, paddingLeft: 30 }}>
                  <span style={{ flex: 1, fontSize: 10, color: 'var(--text-dim)' }}>Длина, м</span>
                  <span style={{ flex: 1.5, fontSize: 10, color: 'var(--text-dim)' }}>Примечание</span>
                  <span style={{ width: 28, flexShrink: 0 }} />
                </div>
                <div className="length-table" style={{ maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
                  {pt.lengths.map((row, ri) => (
                    <div key={row.id} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-dim)', width: 24, textAlign: 'center', flexShrink: 0 }}>
                        {ri + 1}
                      </span>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="м"
                        value={row.length}
                        onChange={(e) => updateLength(pi, ri, e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <input
                        type="text"
                        placeholder="Примечание"
                        value={row.note || ''}
                        onChange={(e) => updateLengthNote(pi, ri, e.target.value)}
                        style={{ flex: 1.5 }}
                      />
                      {pt.lengths.length > 1 && (
                        <button className="btn-icon btn-sm" onClick={() => removeLengthRow(pi, ri)} style={{ flexShrink: 0 }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )
      })}

      {errors.pipes && <span className="field-error" style={{ display: 'block', marginBottom: 8 }}>{errors.pipes}</span>}

      <button className="btn btn-secondary" style={{ width: '100%', marginBottom: 12 }} onClick={addPipeType}>
        + Добавить вид трубы
      </button>

      {pipeTypes.some(pt => pt.diameter && pt.thickness) && (
        <div style={{ marginTop: 8 }}>
          {!showSaveTpl ? (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', color: 'var(--gold)', borderColor: 'var(--border-gold)' }}
              onClick={() => setShowSaveTpl(true)}
            >
              ⭐ Сохранить как шаблон
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="text"
                placeholder='Название шаблона'
                value={tplName}
                onChange={e => setTplName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveAsTemplate()}
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary btn-sm" onClick={handleSaveAsTemplate} disabled={!tplName.trim()}>
                Сохранить
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => { setShowSaveTpl(false); setTplName('') }}>
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      {/* Фото погрузки */}
      <div className="card">
        <div className="card-header">
          <div className="card-num">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </div>
          <div className="card-title">Фото погрузки</div>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-dim)' }}>{photos.length}/4</span>
        </div>

        <div className="photo-grid">
          {['1','2','3','4'].map(label => {
            const photo = photos.find(p => p.label === label)
            return (
              <div key={label} className="photo-slot" onClick={() => handlePhotoAdd(label)}>
                {photo ? (
                  <>
                    <img src={photo.dataUrl} alt={`Фото ${label}`} />
                    <button className="photo-slot-remove" onClick={e => { e.stopPropagation(); handlePhotoRemove(photo.id) }}>×</button>
                  </>
                ) : (
                  <span style={{ fontSize: 28, fontWeight: 300, opacity: 0.35, lineHeight: 1 }}>+</span>
                )}
              </div>
            )
          })}
        </div>

        {photos.length === 0 && (
          <p style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center', marginTop: 6 }}>
            Нажмите на слот — откроется камера или галерея
          </p>
        )}
      </div>

      {/* Итоги */}
      <div className="card">
        <div className="card-header">
          <div className="card-num" style={{ background: 'linear-gradient(135deg, #a07845, var(--gold))' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div className="card-title">Итого</div>
        </div>

        <div className="result-row">
          <span className="result-label">Количество труб</span>
          <span className="result-value">{totals.totalPipes} шт</span>
        </div>
        <div className="result-row">
          <span className="result-label">Общая длина</span>
          <span className="result-value">{totals.totalLength.toFixed(2)} м</span>
        </div>
        <div className="result-row">
          <span className="result-label">Общий тоннаж</span>
          <span className="result-value">{(totals.totalWeight / 1000).toFixed(3)} т</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSave}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            {isEditMode ? 'Обновить' : 'Сохранить'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} title="Предпросмотр" onClick={handlePreview} disabled={isPreviewing}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
            <button className="btn btn-gold" style={{ flex: 1 }} title="Открыть PDF" onClick={handleOpenPdf} disabled={isExporting}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
            <button className="btn btn-secondary" style={{ flex: 1 }} title="Поделиться" onClick={handleShare} disabled={isExporting}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      {/* Bottom sheet — выбор шаблона */}
      {showTemplateSheet && (
        <div className="bottom-sheet-overlay" onClick={() => setShowTemplateSheet(false)}>
          <div className="bottom-sheet" onClick={e => e.stopPropagation()}>
            <div className="bottom-sheet-title">Выбрать шаблон</div>
            {templates.map(tpl => (
              <div key={tpl.id} className="bottom-sheet-item" onClick={() => handleApplyTemplate(tpl)}>
                <div className="bottom-sheet-item-name">{tpl.name}</div>
                <div className="bottom-sheet-item-desc">
                  {(tpl.pipeTypes || []).map((pt) =>
                    `Ø${pt.diameter}×${pt.thickness}${pt.steelGrade ? ' ' + pt.steelGrade : ''}`
                  ).join(' · ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
