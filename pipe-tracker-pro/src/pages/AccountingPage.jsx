import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { GOST_DATA, calculateWeight } from '../data/gost'
import { saveDocument, getAllCounterparties } from '../db'

const MAX_PIPE_ROWS = 60

export default function AccountingPage() {
  const navigate = useNavigate()
  const today = new Date().toISOString().split('T')[0]

  const [type, setType] = useState('shipment')
  const [date, setDate] = useState(today)
  const [location, setLocation] = useState('')
  const [counterparty, setCounterparty] = useState('')
  const [counterparties, setCounterparties] = useState([])
  const [vehicle, setVehicle] = useState('')
  const [note, setNote] = useState('')

  const [pipeTypes, setPipeTypes] = useState([
    { gost: '', diameter: '', thickness: '', steelGrade: '', lengths: [{ id: crypto.randomUUID(), length: '' }] }
  ])

  useEffect(() => {
    getAllCounterparties().then((list) => setCounterparties(list.map(c => c.name)))
  }, [])

  const gostKeys = Object.keys(GOST_DATA)

  const totals = useMemo(() => {
    let totalPipes = 0
    let totalLength = 0
    let totalWeight = 0

    for (const pt of pipeTypes) {
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

    return { totalPipes, totalLength, totalWeight }
  }, [pipeTypes])

  const addPipeType = () => {
    setPipeTypes([...pipeTypes, { gost: '', diameter: '', thickness: '', steelGrade: '', lengths: [{ id: crypto.randomUUID(), length: '' }] }])
  }

  const removePipeType = (index) => {
    if (pipeTypes.length <= 1) return
    setPipeTypes(pipeTypes.filter((_, i) => i !== index))
  }

  const updatePipeType = (index, field, value) => {
    const updated = [...pipeTypes]
    updated[index] = { ...updated[index], [field]: value }
    if (field === 'gost') {
      updated[index].diameter = ''
      updated[index].thickness = ''
    }
    if (field === 'diameter') {
      updated[index].thickness = ''
    }
    setPipeTypes(updated)
  }

  const addLengthRow = (pipeIndex) => {
    if (totals.totalPipes >= MAX_PIPE_ROWS) return
    const updated = [...pipeTypes]
    updated[pipeIndex].lengths.push({ id: crypto.randomUUID(), length: '' })
    setPipeTypes(updated)
  }

  const removeLengthRow = (pipeIndex, rowIndex) => {
    const updated = [...pipeTypes]
    updated[pipeIndex].lengths = updated[pipeIndex].lengths.filter((_, i) => i !== rowIndex)
    setPipeTypes(updated)
  }

  const updateLength = (pipeIndex, rowIndex, value) => {
    const updated = [...pipeTypes]
    updated[pipeIndex].lengths[rowIndex].length = value
    setPipeTypes(updated)
  }

  const handleSave = async () => {
    const doc = {
      id: crypto.randomUUID(),
      type,
      date,
      location,
      counterparty,
      vehicle,
      note,
      pipeTypes,
      totalPipes: totals.totalPipes,
      totalLength: totals.totalLength,
      totalWeight: totals.totalWeight,
    }
    await saveDocument(doc)
    navigate('/history')
  }

  const handlePrint = async () => {
    const enrichedPipeTypes = pipeTypes.map(pt => {
      const D = Number(pt.diameter)
      const S = Number(pt.thickness)
      return {
        ...pt,
        weightPerMeter: calculateWeight(D, S),
      }
    })
    const { printDocument } = await import('../utils/print')
    await printDocument({
      id: 'preview',
      type,
      date,
      counterparty,
      location,
      vehicle,
      note,
      pipeTypes: enrichedPipeTypes,
      ...totals,
    })
  }

  return (
    <div className="page-enter">

      {/* Шапка документа */}
      <div className="card">
        <div className="card-header">
          <div className="card-num">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div className="card-title">Шапка документа</div>
        </div>

        <div className="form-group">
          <label className="form-label">Тип операции</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={`btn ${type === 'shipment' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1 }}
              onClick={() => setType('shipment')}
            >
              Отгрузка
            </button>
            <button
              className={`btn ${type === 'receiving' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1 }}
              onClick={() => setType('receiving')}
            >
              Приём
            </button>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Дата</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Место погрузки/выгрузки</label>
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
            onChange={(e) => setCounterparty(e.target.value)}
          />
          <datalist id="counterparties-list">
            {counterparties.map(c => <option key={c} value={c} />)}
          </datalist>
        </div>

        <div className="form-group">
          <label className="form-label">Авто / Водитель</label>
          <input type="text" placeholder="Напр. КАМАЗ А123БВ / Иванов И.И." value={vehicle} onChange={(e) => setVehicle(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Примечание</label>
          <textarea rows="2" placeholder="Дополнительная информация..." value={note} onChange={(e) => setNote(e.target.value)} style={{ resize: 'vertical' }} />
        </div>
      </div>

      {/* Параметры трубы */}
      {pipeTypes.map((pt, pi) => {
        const diameters = pt.gost ? Object.keys(GOST_DATA[pt.gost]).map(Number).sort((a, b) => a - b) : []
        const thicknesses = (pt.gost && pt.diameter) ? GOST_DATA[pt.gost][Number(pt.diameter)] || [] : []
        const D = Number(pt.diameter)
        const S = Number(pt.thickness)
        const wpm = calculateWeight(D, S)

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
              <label className="form-label">Стандарт (ГОСТ)</label>
              <select value={pt.gost} onChange={(e) => updatePipeType(pi, 'gost', e.target.value)}>
                <option value="">— Выберите ГОСТ —</option>
                {gostKeys.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Диаметр, мм</label>
                <select value={pt.diameter} onChange={(e) => updatePipeType(pi, 'diameter', e.target.value)}>
                  <option value="">— Ø —</option>
                  {diameters.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Толщина, мм</label>
                <select value={pt.thickness} onChange={(e) => updatePipeType(pi, 'thickness', e.target.value)}>
                  <option value="">— S —</option>
                  {thicknesses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Марка стали / Класс прочности</label>
              <input type="text" placeholder="Напр. Ст20" value={pt.steelGrade} onChange={(e) => updatePipeType(pi, 'steelGrade', e.target.value)} />
            </div>

            {wpm > 0 && (
              <div className="result-row">
                <span className="result-label">Вес п/м</span>
                <span className="result-value">{wpm.toFixed(2)} кг/м</span>
              </div>
            )}

            {/* Таблица длин */}
            <div className="divider" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span className="form-label" style={{ marginBottom: 0 }}>Длины труб</span>
              <span className="form-label" style={{ marginBottom: 0, color: 'var(--gold)' }}>
                {pt.lengths.filter(r => Number(r.length) > 0).length} / {MAX_PIPE_ROWS}
              </span>
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
                    placeholder="Длина, м"
                    value={row.length}
                    onChange={(e) => updateLength(pi, ri, e.target.value)}
                    style={{ flex: 1 }}
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

            {totals.totalPipes < MAX_PIPE_ROWS && (
              <button className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: 6 }} onClick={() => addLengthRow(pi)}>
                + Добавить строку
              </button>
            )}
          </div>
        )
      })}

      <button className="btn btn-secondary" style={{ width: '100%', marginBottom: 12 }} onClick={addPipeType}>
        + Добавить вид трубы
      </button>

      {/* Итоги */}
      {totals.totalPipes > 0 && (
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
            <span className="result-value">{totals.totalLength.toFixed(1)} м</span>
          </div>
          <div className="result-row">
            <span className="result-label">Общий тоннаж</span>
            <span className="result-value">{(totals.totalWeight / 1000).toFixed(3)} т</span>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              Сохранить
            </button>
            <button className="btn btn-gold" onClick={handlePrint}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
