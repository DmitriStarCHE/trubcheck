import { useState, useEffect } from 'react'
import { getAllTemplates, saveTemplate, deleteTemplate } from '../db'
import { randomUUID } from '../utils/uuid'
import { GOST_DATA } from '../data/gost'

const emptyPipeSpec = () => ({ id: randomUUID(), gost: '', diameter: '', thickness: '', steelGrade: '', mode: 'individual' })
const emptyForm = () => ({ id: null, name: '', pipeSpecs: [emptyPipeSpec()] })

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([])
  const [error, setError] = useState(null)
  const [form, setForm] = useState(null) // null = скрыта, object = открыта
  const [editingId, setEditingId] = useState(null)

  const gostKeys = Object.keys(GOST_DATA)

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const list = await getAllTemplates()
      setTemplates(list)
    } catch (err) {
      setError('Не удалось загрузить шаблоны: ' + err.message)
    }
  }

  const openNew = () => {
    setForm(emptyForm())
    setEditingId(null)
  }

  const openEdit = (tpl) => {
    setForm({
      id: tpl.id,
      name: tpl.name,
      pipeSpecs: tpl.pipeTypes.map(pt => ({ ...pt, id: pt.id || randomUUID() })),
    })
    setEditingId(tpl.id)
  }

  const closeForm = () => { setForm(null); setEditingId(null) }

  const updateSpec = (specId, field, value) => {
    setForm(f => ({
      ...f,
      pipeSpecs: f.pipeSpecs.map(s => {
        if (s.id !== specId) return s
        const updated = { ...s, [field]: value }
        if (field === 'gost') { updated.diameter = ''; updated.thickness = '' }
        if (field === 'diameter') { updated.thickness = '' }
        return updated
      }),
    }))
  }

  const addSpec = () => setForm(f => ({ ...f, pipeSpecs: [...f.pipeSpecs, emptyPipeSpec()] }))

  const removeSpec = (specId) => {
    setForm(f => ({ ...f, pipeSpecs: f.pipeSpecs.filter(s => s.id !== specId) }))
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Введите название шаблона'); return }
    const validSpecs = form.pipeSpecs.filter(s => s.diameter && s.thickness)
    if (!validSpecs.length) { setError('Добавьте хотя бы один типоразмер с диаметром и толщиной'); return }
    setError(null)
    try {
      await saveTemplate({
        id: form.id || undefined,
        name: form.name.trim(),
        pipeTypes: validSpecs.map(({ id: _id, ...rest }) => rest),
      })
      await load()
      closeForm()
    } catch (err) {
      setError('Не удалось сохранить: ' + err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Удалить шаблон?')) return
    try {
      await deleteTemplate(id)
      await load()
    } catch (err) {
      setError('Не удалось удалить: ' + err.message)
    }
  }

  return (
    <div className="page-enter" style={{ padding: '16px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ letterSpacing: 2 }}>ШАБЛОНЫ</h2>
        {!form && (
          <button className="btn btn-primary btn-sm" onClick={openNew}>+ Новый</button>
        )}
      </div>

      {error && (
        <div className="error-banner" style={{ marginBottom: 12 }}>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', color: 'inherit', fontSize: 18 }}>×</button>
        </div>
      )}

      {/* Форма создания / редактирования */}
      {form && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div className="card-title">{editingId ? 'Изменить шаблон' : 'Новый шаблон'}</div>
          </div>

          <div className="form-group">
            <label className="form-label">Название шаблона</label>
            <input
              type="text"
              placeholder='Например: "Стандарт 57×3"'
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          {form.pipeSpecs.map((spec, idx) => {
            const diameters = spec.gost ? Object.keys(GOST_DATA[spec.gost] || {}).map(Number) : []
            const thicknesses = (spec.gost && spec.diameter)
              ? (GOST_DATA[spec.gost]?.[Number(spec.diameter)] || [])
              : []

            return (
              <div key={spec.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 10, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>ТРУБА {idx + 1}</span>
                  {form.pipeSpecs.length > 1 && (
                    <button className="btn btn-icon btn-sm" style={{ width: 24, height: 24, fontSize: 14, borderRadius: 6 }}
                      onClick={() => removeSpec(spec.id)}>×</button>
                  )}
                </div>
                <div className="form-row" style={{ gap: 8, marginBottom: 8 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">ГОСТ</label>
                    <select value={spec.gost} onChange={e => updateSpec(spec.id, 'gost', e.target.value)}>
                      <option value="">— ГОСТ —</option>
                      {gostKeys.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Марка стали</label>
                    <input type="text" placeholder="09Г2С" value={spec.steelGrade}
                      onChange={e => updateSpec(spec.id, 'steelGrade', e.target.value)} />
                  </div>
                </div>
                <div className="form-row" style={{ gap: 8, marginBottom: 8 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Диаметр, мм</label>
                    <select value={spec.diameter} onChange={e => updateSpec(spec.id, 'diameter', e.target.value)} disabled={!spec.gost}>
                      <option value="">— Ø —</option>
                      {diameters.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Толщина, мм</label>
                    <select value={spec.thickness} onChange={e => updateSpec(spec.id, 'thickness', e.target.value)} disabled={!spec.diameter}>
                      <option value="">— S —</option>
                      {thicknesses.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Режим учёта</label>
                  <select value={spec.mode} onChange={e => updateSpec(spec.id, 'mode', e.target.value)}>
                    <option value="individual">По трубам (длины)</option>
                    <option value="batch">Пачками (кол-во / тоннаж)</option>
                  </select>
                </div>
              </div>
            )
          })}

          <button className="btn btn-secondary btn-sm" style={{ width: '100%', marginBottom: 12 }} onClick={addSpec}>
            + Добавить тип трубы
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave}>Сохранить</button>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={closeForm}>Отмена</button>
          </div>
        </div>
      )}

      {/* Список шаблонов */}
      {templates.length === 0 && !form ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <p>Шаблонов пока нет.<br/>Нажмите «+ Новый» чтобы создать первый.</p>
        </div>
      ) : (
        templates.map(tpl => (
          <div key={tpl.id} className="card" style={{ borderLeft: editingId === tpl.id ? '3px solid var(--pink)' : undefined }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{tpl.name}</div>
                {(tpl.pipeTypes || []).map((pt, i) => (
                  <div key={i} style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {[pt.gost, pt.diameter && pt.thickness ? `Ø${pt.diameter}×${pt.thickness} мм` : '', pt.steelGrade].filter(Boolean).join(' · ')}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 8 }}>
                <button className="btn btn-icon btn-sm" onClick={() => openEdit(tpl)} title="Изменить">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button className="btn btn-icon btn-sm" onClick={() => handleDelete(tpl.id)} title="Удалить"
                  style={{ borderColor: 'rgba(232,24,60,0.3)', color: 'var(--danger-light)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
