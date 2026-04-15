import { useState, useEffect } from 'react'
import { getAllDocuments, deleteDocument, getDocument } from '../db'

export default function HistoryPage() {
  const [documents, setDocuments] = useState([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [viewMode, setViewMode] = useState('list')

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    const docs = await getAllDocuments()
    setDocuments(docs)
  }

  const filteredDocs = documents.filter(doc => {
    if (filter === 'shipment' && doc.type !== 'shipment') return false
    if (filter === 'receiving' && doc.type !== 'receiving') return false
    if (search && !doc.counterparty?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleDelete = async (id) => {
    if (confirm('Удалить этот документ?')) {
      await deleteDocument(id)
      loadDocuments()
      if (selectedDoc?.id === id) {
        setSelectedDoc(null)
        setViewMode('list')
      }
    }
  }

  const handleView = async (id) => {
    const doc = await getDocument(id)
    setSelectedDoc(doc)
    setViewMode('detail')
  }

  const handlePrint = async () => {
    if (!selectedDoc) return
    const { printDocument } = await import('../utils/print')
    await printDocument(selectedDoc)
  }

  const handleExport = async () => {
    const { exportToExcel } = await import('../utils/export')
    exportToExcel(documents)
  }

  return (
    <div className="page-enter">

      {viewMode === 'list' && (
        <>
          {/* Фильтры */}
          <div className="card">
            <div className="form-group" style={{ marginBottom: 10 }}>
              <input
                type="text"
                placeholder="Поиск по контрагенту..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilter('all')}
              >
                Все
              </button>
              <button
                className={`btn btn-sm ${filter === 'shipment' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilter('shipment')}
              >
                Отгрузка
              </button>
              <button
                className={`btn btn-sm ${filter === 'receiving' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilter('receiving')}
              >
                Приём
              </button>
            </div>
          </div>

          {/* Список */}
          {filteredDocs.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <p>{documents.length === 0 ? 'Нет сохранённых документов' : 'Нет результатов по фильтру'}</p>
            </div>
          ) : (
            filteredDocs.map(doc => (
              <div className="card" key={doc.id} style={{ cursor: 'pointer', padding: 0, overflow: 'hidden' }}>
                <div onClick={() => handleView(doc.id)}>
                  <div style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span className={`badge ${doc.type === 'shipment' ? 'badge-shipment' : 'badge-receiving'}`}>
                        {doc.type === 'shipment' ? 'Отгрузка' : 'Приём'}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                        {new Date(doc.date).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                    {doc.counterparty && (
                      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{doc.counterparty}</div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
                      <span>{doc.totalPipes} труб</span>
                      <span style={{ color: 'var(--gold)', fontWeight: 600 }}>
                        {(doc.totalWeight / 1000).toFixed(3)} т
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', borderTop: '1px solid var(--border)' }}>
                  <button className="btn btn-secondary btn-sm" style={{ flex: 1, borderRadius: 0 }} onClick={() => handleView(doc.id)}>
                    Просмотр
                  </button>
                  <button className="btn btn-danger btn-sm" style={{ flex: 1, borderRadius: 0 }} onClick={() => handleDelete(doc.id)}>
                    Удалить
                  </button>
                </div>
              </div>
            ))
          )}

          {/* Экспорт */}
          {documents.length > 0 && (
            <button className="btn btn-gold" style={{ width: '100%', marginTop: 8 }} onClick={handleExport}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Экспорт в Excel
            </button>
          )}
        </>
      )}

      {viewMode === 'detail' && selectedDoc && (
        <DocumentDetail
          doc={selectedDoc}
          onBack={() => { setViewMode('list'); setSelectedDoc(null) }}
          onPrint={handlePrint}
          onDelete={() => handleDelete(selectedDoc.id)}
        />
      )}
    </div>
  )
}

function DocumentDetail({ doc, onBack, onPrint, onDelete }) {
  return (
    <div className="page-enter">
      <button className="btn btn-secondary btn-sm" onClick={onBack} style={{ marginBottom: 12 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Назад
      </button>

      <div className="card">
        <div className="card-header">
          <div className="card-num">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div className="card-title">Документ</div>
          <span className={`badge ${doc.type === 'shipment' ? 'badge-shipment' : 'badge-receiving'}`} style={{ marginLeft: 'auto' }}>
            {doc.type === 'shipment' ? 'Отгрузка' : 'Приём'}
          </span>
        </div>

        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {doc.date && <p><b>Дата:</b> {new Date(doc.date).toLocaleDateString('ru-RU')}</p>}
          {doc.counterparty && <p style={{ marginTop: 4 }}><b>Контрагент:</b> {doc.counterparty}</p>}
          {doc.location && <p style={{ marginTop: 4 }}><b>Место:</b> {doc.location}</p>}
          {doc.vehicle && <p style={{ marginTop: 4 }}><b>Авто:</b> {doc.vehicle}</p>}
          {doc.note && <p style={{ marginTop: 4 }}><b>Примечание:</b> {doc.note}</p>}
        </div>
      </div>

      {/* Pipe types */}
      {doc.pipeTypes?.map((pt, i) => {
        const lengths = pt.lengths?.filter(r => Number(r.length) > 0) || []
        if (lengths.length === 0) return null
        return (
          <div className="card" key={i}>
            <div className="card-header">
              <div className="card-num">{i + 1}</div>
              <div className="card-title">{pt.gost} — {pt.diameter}×{pt.thickness}</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
              {pt.steelGrade && <>Марка: {pt.steelGrade}</>}
            </div>
            <div style={{ fontSize: 12 }}>
              {lengths.map((r, ri) => (
                <div key={ri} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--border)' }}>
                  <span>Труба #{ri + 1}</span>
                  <span style={{ color: 'var(--gold-light)', fontWeight: 500 }}>{r.length} м</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}

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
          <span className="result-value">{doc.totalPipes} шт</span>
        </div>
        <div className="result-row">
          <span className="result-label">Общая длина</span>
          <span className="result-value">{doc.totalLength?.toFixed(1)} м</span>
        </div>
        <div className="result-row">
          <span className="result-label">Общий тоннаж</span>
          <span className="result-value">{(doc.totalWeight / 1000).toFixed(3)} т</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={onPrint}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Печать / PDF
        </button>
        <button className="btn btn-danger" onClick={onDelete}>
          Удалить
        </button>
      </div>
    </div>
  )
}
