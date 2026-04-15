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

// Note: printDocument is not fully implemented with the new method yet.
// This is a placeholder to avoid breaking the app.
// We will need to create generateDocumentHtml similar to generateCalculationHtml
export async function printDocument(docData) {
  console.log("printDocument function needs to be updated to use html2pdf.js");
  alert("Функция печати документа еще не обновлена.");
}
