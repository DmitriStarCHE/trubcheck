# Шаблоны труб — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить систему шаблонов типоразмеров трубы — сохранять набор (ГОСТ+Ø+марка+режим) под именем и применять в один тап при создании документа.

**Architecture:** Новый `templates` store в IndexedDB (версия 2). Новая страница `TemplatesPage` как 4-я вкладка навбара. В `AccountingPage` — кнопки «Применить шаблон» (bottom sheet выбора) и «Сохранить как шаблон» (inline форма с названием).

**Tech Stack:** React 19, idb (IndexedDB), существующие CSS-переменные и классы проекта.

**Корень приложения:** `pipe-tracker-pro/`

---

## Файловая карта

| Файл | Действие |
|---|---|
| `src/db/index.js` | Изменить — версия 2, templates store + CRUD |
| `src/pages/TemplatesPage.jsx` | Создать |
| `src/router.jsx` | Изменить — маршрут `/templates` |
| `src/App.jsx` | Изменить — 4-я вкладка «Шаблоны» |
| `src/pages/AccountingPage.jsx` | Изменить — кнопки apply/save + bottom sheet |
| `src/App.css` | Изменить — стили `.bottom-sheet`, `.toast` |

---

## Task 1: IndexedDB — templates store + CRUD

**Files:**
- Modify: `src/db/index.js`

- [ ] **Step 1: Поднять DB_VERSION и добавить templates store в upgrade()**

В `src/db/index.js` заменить:
```js
const DB_VERSION = 1
```
на:
```js
const DB_VERSION = 2
```

В блоке `upgrade(db, oldVersion)` добавить параметр `oldVersion` и ветку миграции:
```js
upgrade(db, oldVersion) {
  if (oldVersion < 1) {
    if (!db.objectStoreNames.contains('documents')) {
      const store = db.createObjectStore('documents', { keyPath: 'id' })
      store.createIndex('date', 'date')
      store.createIndex('type', 'type')
      store.createIndex('counterparty', 'counterparty')
    }
    if (!db.objectStoreNames.contains('counterparties')) {
      db.createObjectStore('counterparties', { keyPath: 'name' })
    }
  }
  if (oldVersion < 2) {
    if (!db.objectStoreNames.contains('templates')) {
      db.createObjectStore('templates', { keyPath: 'id' })
    }
  }
},
```

- [ ] **Step 2: Добавить три новые функции в конец db/index.js**

```js
// === Templates ===

export async function getAllTemplates() {
  try {
    const db = await getDB()
    return db.getAll('templates')
  } catch (err) {
    console.error('getAllTemplates error:', err)
    throw err
  }
}

export async function saveTemplate(tpl) {
  try {
    const db = await getDB()
    if (!tpl.id) {
      tpl.id = randomUUID()
      tpl.createdAt = new Date().toISOString()
    }
    await db.put('templates', tpl)
    return tpl
  } catch (err) {
    console.error('saveTemplate error:', err)
    throw err
  }
}

export async function deleteTemplate(id) {
  try {
    const db = await getDB()
    await db.delete('templates', id)
  } catch (err) {
    console.error('deleteTemplate error:', err)
    throw err
  }
}
```

- [ ] **Step 3: Проверить что сборка проходит**

```bash
cd pipe-tracker-pro && npm run build 2>&1 | tail -5
```

Ожидаем: `✓ built in ...ms`

- [ ] **Step 4: Commit**

```bash
git add pipe-tracker-pro/src/db/index.js
git commit -m "feat: add templates store to IndexedDB (v2 migration)"
```

---

## Task 2: CSS — стили bottom sheet и toast

**Files:**
- Modify: `src/App.css`

- [ ] **Step 1: Добавить стили в конец App.css**

```css
/* ===== BOTTOM SHEET ===== */
.bottom-sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  animation: fadeIn 0.15s ease;
}

[data-theme="light"] .bottom-sheet-overlay {
  background: rgba(0, 0, 0, 0.3);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.bottom-sheet {
  background: var(--bg3);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  border: 1px solid var(--border);
  border-bottom: none;
  width: 100%;
  max-width: 600px;
  max-height: 70vh;
  overflow-y: auto;
  padding: 16px;
  animation: slideUp 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}

.bottom-sheet-title {
  font-family: 'Poiret One', sans-serif;
  font-size: 15px;
  letter-spacing: 1.5px;
  color: var(--text);
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
}

.bottom-sheet-item {
  padding: 10px 12px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: background var(--transition);
  margin-bottom: 4px;
}

.bottom-sheet-item:hover {
  background: var(--bg4);
}

.bottom-sheet-item-name {
  font-weight: 600;
  font-size: 13px;
  color: var(--text);
  margin-bottom: 2px;
}

.bottom-sheet-item-desc {
  font-size: 11px;
  color: var(--text-muted);
}

/* ===== TOAST ===== */
.toast {
  position: fixed;
  bottom: 90px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg4);
  border: 1px solid var(--border-strong);
  color: var(--text);
  padding: 10px 20px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  z-index: 300;
  white-space: nowrap;
  box-shadow: var(--shadow-card);
  animation: toastIn 0.2s ease, toastOut 0.2s ease 2.3s forwards;
}

@keyframes toastIn {
  from { opacity: 0; transform: translateX(-50%) translateY(10px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}

@keyframes toastOut {
  from { opacity: 1; }
  to   { opacity: 0; }
}
```

- [ ] **Step 2: Commit**

```bash
git add pipe-tracker-pro/src/App.css
git commit -m "feat: add bottom-sheet and toast CSS"
```

---

## Task 3: TemplatesPage — страница управления шаблонами

**Files:**
- Create: `src/pages/TemplatesPage.jsx`

- [ ] **Step 1: Создать файл TemplatesPage.jsx**

```jsx
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
```

- [ ] **Step 2: Проверить сборку**

```bash
cd pipe-tracker-pro && npm run build 2>&1 | tail -5
```

Ожидаем: `✓ built in ...ms`

- [ ] **Step 3: Commit**

```bash
git add pipe-tracker-pro/src/pages/TemplatesPage.jsx pipe-tracker-pro/src/App.css
git commit -m "feat: add TemplatesPage with create/edit/delete"
```

---

## Task 4: Router + навигация — 4-я вкладка

**Files:**
- Modify: `src/router.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Добавить маршрут в router.jsx**

Заменить в `src/router.jsx`:
```js
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
```
на:
```js
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const TemplatesPage = lazy(() => import('./pages/TemplatesPage'))
```

Добавить в массив `children` после `history`:
```js
{ path: 'templates', element: <Suspense fallback={<LoadingFallback />}><TemplatesPage /></Suspense> },
```

- [ ] **Step 2: Добавить вкладку в навбар App.jsx**

В `src/App.jsx` добавить 4-й `NavLink` после вкладки «История»:
```jsx
<NavLink to="/templates" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
  <span>Шаблоны</span>
</NavLink>
```

- [ ] **Step 3: Проверить сборку**

```bash
cd pipe-tracker-pro && npm run build 2>&1 | tail -5
```

Ожидаем: `✓ built in ...ms`

- [ ] **Step 4: Commit**

```bash
git add pipe-tracker-pro/src/router.jsx pipe-tracker-pro/src/App.jsx
git commit -m "feat: add Templates tab to navbar and router"
```

---

## Task 5: AccountingPage — применить и сохранить шаблон

**Files:**
- Modify: `src/pages/AccountingPage.jsx`

- [ ] **Step 1: Добавить импорты и state для шаблонов**

В начало `AccountingPage.jsx` добавить в импорт из `'../db'`:
```js
import { saveDocument, updateDocument, getDocument, getAllCounterparties, getAllTemplates, saveTemplate } from '../db'
```

В тело компонента `AccountingPage` добавить новые state после `[isExporting, setIsExporting]`:
```js
const [templates, setTemplates] = useState([])
const [showTemplateSheet, setShowTemplateSheet] = useState(false)
const [showSaveTpl, setShowSaveTpl] = useState(false)
const [tplName, setTplName] = useState('')
const [toast, setToast] = useState(null)
```

- [ ] **Step 2: Загружать шаблоны при инициализации**

В существующем `useEffect` (который вызывает `getAllCounterparties`) добавить загрузку шаблонов:
```js
useEffect(() => {
  getAllCounterparties()
    .then(list => setCounterparties(list.map(c => c.name)))
    .catch(err => setError('Не удалось загрузить контрагентов: ' + err.message))
  getAllTemplates()
    .then(setTemplates)
    .catch(() => {})
  import('../utils/print').catch(() => {})
}, [])
```

- [ ] **Step 3: Добавить хелперы showToast, handleApplyTemplate, handleSaveAsTemplate**

После существующего `handlePhotoRemove` добавить:
```js
const showToastMsg = (msg) => {
  setToast(msg)
  setTimeout(() => setToast(null), 2500)
}

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
```

- [ ] **Step 4: Добавить кнопки и UI в JSX**

Найти в JSX блок карточки типов трубы — он начинается примерно с:
```jsx
{/* Типы труб */}
```

Сразу **перед** блоком `{pipeTypes.map(...)}` добавить кнопку «Применить шаблон»:
```jsx
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
```

После `{pipeTypes.map(...)}` и кнопки «+ Добавить тип трубы» добавить блок «Сохранить как шаблон»:
```jsx
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
```

- [ ] **Step 5: Добавить bottom sheet и toast в конец JSX (перед закрывающим тегом возвращаемого div)**

```jsx
{/* Bottom sheet — выбор шаблона */}
{showTemplateSheet && (
  <div className="bottom-sheet-overlay" onClick={() => setShowTemplateSheet(false)}>
    <div className="bottom-sheet" onClick={e => e.stopPropagation()}>
      <div className="bottom-sheet-title">Выбрать шаблон</div>
      {templates.map(tpl => (
        <div key={tpl.id} className="bottom-sheet-item" onClick={() => handleApplyTemplate(tpl)}>
          <div className="bottom-sheet-item-name">{tpl.name}</div>
          <div className="bottom-sheet-item-desc">
            {(tpl.pipeTypes || []).map((pt, i) =>
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
```

- [ ] **Step 6: Проверить сборку**

```bash
cd pipe-tracker-pro && npm run build 2>&1 | tail -5
```

Ожидаем: `✓ built in ...ms`

- [ ] **Step 7: Commit**

```bash
git add pipe-tracker-pro/src/pages/AccountingPage.jsx
git commit -m "feat: apply/save template in AccountingPage"
```

---

## Task 6: Финальная проверка и push

- [ ] **Step 1: Запустить dev-сервер и проверить вручную**

```bash
cd pipe-tracker-pro && npm run dev
```

Проверить чек-лист:
1. Появилась вкладка «Шаблоны» в навбаре
2. Страница «Шаблоны»: пустое состояние → «+ Новый» → заполнить → Сохранить → шаблон появился в списке
3. Редактирование шаблона: «Изменить» → изменить название → Сохранить
4. Удаление: «🗑» → подтвердить → шаблон исчез
5. В «Учёт»: если есть шаблоны — кнопка «Применить шаблон» видна → клик → bottom sheet с шаблонами → выбрать → форма заполнилась нужными типами труб (пустые длины)
6. «Сохранить как шаблон»: заполнить типы труб → кнопка появилась → ввести название → Сохранить → toast «✓ Шаблон сохранён»
7. Темы: проверить оба варианта (тёмная / светлая) — bottom sheet выглядит нормально

- [ ] **Step 2: Push**

```bash
git push origin main
```
