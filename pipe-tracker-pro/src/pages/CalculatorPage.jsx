import { useState, useMemo } from 'react'
import { GOST_DATA, calculateWeight } from '../data/gost'

export default function CalculatorPage() {
  const [gost, setGost] = useState('')
  const [diameter, setDiameter] = useState('')
  const [thickness, setThickness] = useState('')
  const [length, setLength] = useState('')
  const [quantity, setQuantity] = useState('')

  const gostKeys = Object.keys(GOST_DATA)

  const weightPerMeter = useMemo(() => calculateWeight(Number(diameter), Number(thickness)), [diameter, thickness])
  const weightOnePipe = useMemo(() => (weightPerMeter > 0 && length ? weightPerMeter * parseFloat(length) : 0), [weightPerMeter, length])
  const totalWeight = useMemo(() => {
    const qty = quantity ? Number(quantity) : 1
    return weightOnePipe > 0 ? weightOnePipe * qty : 0
  }, [weightOnePipe, quantity])

  const totalLength = useMemo(() => {
    const qty = quantity ? Number(quantity) : 1
    return length ? parseFloat(length) * qty : 0
  }, [length, quantity])

  const resetForm = () => {
    setGost('')
    setDiameter('')
    setThickness('')
    setLength('')
    setQuantity('')
  }

  const handlePrint = async () => {
    if (weightPerMeter <= 0) return
    const { printCalculation } = await import('../utils/print')
    await printCalculation({
      gost,
      diameter: Number(diameter),
      thickness: Number(thickness),
      length: parseFloat(length) || 0,
      quantity: Number(quantity) || 1,
      weightPerMeter,
      weightOnePipe,
      totalWeight,
      totalLength,
    })
  }

  const handleShare = async () => {
    if (weightPerMeter <= 0) return

    const shareData = {
      title: 'Расчет труб',
      text: `
Расчет массы труб:
Стандарт: ${gost || 'Не указан'}
Наружный диаметр: ${diameter} мм
Толщина стенки: ${thickness} мм
${length ? `Длина трубы: ${length} м\n` : ''}
${quantity > 1 ? `Количество: ${quantity} шт\n` : ''}
---
Вес погонного метра: ${weightPerMeter.toFixed(2)} кг/м
${weightOnePipe > 0 ? `Вес одной трубы: ${weightOnePipe.toFixed(2)} кг\n` : ''}
${quantity > 1 ? `Общая длина: ${totalLength.toFixed(1)} м\n` : ''}
${quantity > 1 ? `Общий тоннаж: ${(totalWeight / 1000).toFixed(3)} т\n` : ''}
      `.trim(),
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        console.error('Ошибка при попытке поделиться:', err)
      }
    } else {
      alert('Функция "Поделиться" не поддерживается в вашем браузере.')
    }
  }

  return (
    <div className="page-enter">
      <div className="card">
        <div className="card-header">
          <div className="card-num">1</div>
          <div className="card-title">Калькулятор труб</div>
        </div>

        <div className="form-group">
          <label className="form-label">Стандарт (ГОСТ)</label>
          <select value={gost} onChange={(e) => setGost(e.target.value)}>
            <option value="">— Выберите ГОСТ —</option>
            {gostKeys.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Наружный диаметр, мм</label>
            <input type="number" min="0" step="0.1" placeholder="Напр. 159" value={diameter} onChange={(e) => setDiameter(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Толщина стенки, мм</label>
            <input type="number" min="0" step="0.1" placeholder="Напр. 4.5" value={thickness} onChange={(e) => setThickness(e.target.value)} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Длина трубы, м</label>
            <input type="number" min="0" step="0.1" placeholder="Напр. 11.5" value={length} onChange={(e) => setLength(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Количество, шт</label>
            <input type="number" min="1" step="1" placeholder="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
        </div>

        <div className="divider" />

        {weightPerMeter > 0 && (
          <>
            <div className="result-row">
              <span className="result-label">Вес погонного метра</span>
              <span className="result-value">{weightPerMeter.toFixed(2)} кг/м</span>
            </div>
            {weightOnePipe > 0 && (
              <div className="result-row">
                <span className="result-label">Вес одной трубы</span>
                <span className="result-value">{weightOnePipe.toFixed(2)} кг</span>
              </div>
            )}
            {quantity && Number(quantity) > 1 && (
              <>
                <div className="result-row">
                  <span className="result-label">Общая длина</span>
                  <span className="result-value">{totalLength.toFixed(1)} м</span>
                </div>
                <div className="result-row">
                  <span className="result-label">Общий тоннаж</span>
                  <span className="result-value">{(totalWeight / 1000).toFixed(3)} т</span>
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={handlePrint}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
                Печать
              </button>
              <button className="btn btn-primary" onClick={handleShare}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                Поделиться
              </button>
              <button className="btn btn-secondary" onClick={resetForm}>Сбросить</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
