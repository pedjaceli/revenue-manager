'use strict';

function getExportRevenues(period) {
  const now       = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thisYear  = String(now.getFullYear());

  let revs = [...db.revenues].sort((a, b) => b.date.localeCompare(a.date));
  if (period === 'month') revs = revs.filter(r => r.date.startsWith(thisMonth));
  if (period === 'year')  revs = revs.filter(r => r.date.startsWith(thisYear));
  return revs;
}

function exportCSV() {
  const period = document.getElementById('export-period-csv').value;
  const revs   = getExportRevenues(period);

  if (revs.length === 0) { showToast(t('toast_no_data'), 'error'); return; }

  const header = [t('col_date'), t('col_description'), t('col_category'), t('col_amount'), t('col_notes')];
  const rows   = revs.map(r => {
    const cat = getCategoryById(r.category);
    return [
      r.date,
      `"${r.description.replace(/"/g, '""')}"`,
      cat.name,
      r.amount.toFixed(2),
      `"${(r.notes || '').replace(/"/g, '""')}"`,
    ];
  });

  const csv  = 'sep=,\n' + [header, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `revenues-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  showToast(`CSV — ${revs.length} ${t('stat_entries')}`);
}

function exportPDF() {
  const period = document.getElementById('export-period-pdf').value;
  const revs   = getExportRevenues(period);

  if (revs.length === 0) { showToast(t('toast_no_data'), 'error'); return; }

  const { jsPDF } = window.jspdf;
  const doc       = new jsPDF();
  const total     = revs.reduce((a, r) => a + r.amount, 0);
  const now       = new Date();
  const months    = getMonths();
  const periodLabel = {
    all:   t('period_all'),
    year:  `${t('period_year')} ${now.getFullYear()}`,
    month: `${months[now.getMonth()]} ${now.getFullYear()}`,
  }[period];

  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, 210, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20); doc.setFont('helvetica', 'bold');
  doc.text('Revenue Manager', 14, 14);
  doc.setFontSize(11); doc.setFont('helvetica', 'normal');
  doc.text(`${t('pdf_report')} — ${periodLabel}`, 14, 23);
  doc.text(`${t('pdf_generated')} ${now.toLocaleDateString()}`, 140, 23);

  doc.setTextColor(30, 27, 75);
  doc.setFillColor(240, 238, 255);
  doc.roundedRect(14, 38, 182, 22, 3, 3, 'F');
  doc.setFontSize(12); doc.setFont('helvetica', 'bold');
  doc.text(`${t('pdf_total')} : ${fmt(total)}`, 20, 51);
  doc.setFont('helvetica', 'normal');
  doc.text(`${revs.length} ${t('stat_entries')}`, 110, 51);

  doc.setTextColor(30, 27, 75);
  doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text(t('pdf_by_category'), 14, 72);

  const byCat   = {};
  revs.forEach(r => { byCat[r.category] = (byCat[r.category] || 0) + r.amount; });
  const catRows = Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .map(([id, amt]) => {
      const cat = getCategoryById(id);
      return [cat.name, revs.filter(r => r.category === id).length, fmt(amt), `${Math.round(amt / total * 100)} %`];
    });

  doc.autoTable({
    startY: 76,
    head: [[t('col_category'), 'Nb', t('col_amount'), '%']],
    body: catRows,
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  const afterY = doc.lastAutoTable.finalY + 12;
  doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text(t('pdf_detail'), 14, afterY);

  const tableRows = revs.map(r => {
    const cat = getCategoryById(r.category);
    return [fmtDate(r.date), r.description, cat.name, fmt(r.amount), r.notes || ''];
  });

  doc.autoTable({
    startY: afterY + 4,
    head: [[t('col_date'), t('col_description'), t('col_category'), t('col_amount'), t('col_notes')]],
    body: tableRows,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 3: { fontStyle: 'bold', textColor: [5, 150, 105] } },
    margin: { left: 14, right: 14 },
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9); doc.setTextColor(150);
    doc.text(`${t('pdf_page')} ${i} / ${pageCount} — Revenue Manager`, 14, doc.internal.pageSize.height - 8);
  }

  doc.save(`report-revenues-${period}-${now.toISOString().slice(0, 10)}.pdf`);
  showToast(`PDF — ${revs.length} ${t('stat_entries')}`);
}

function renderExportSummary() {
  const now       = new Date();
  const totalAll  = db.revenues.reduce((a, r) => a + r.amount, 0);
  const yearRevs  = db.revenues.filter(r => r.date.startsWith(String(now.getFullYear())));
  const monthRevs = db.revenues.filter(r =>
    r.date.startsWith(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  );

  document.getElementById('export-summary').innerHTML = `
    <ul class="list-unstyled mb-0 small lh-lg">
      <li><i class="bi bi-box-seam me-2 text-muted"></i>${t('export_total_entries')} : <strong>${db.revenues.length}</strong></li>
      <li><i class="bi bi-coin me-2 text-muted"></i>${t('export_total_amount')} : <strong>${fmt(totalAll)}</strong></li>
      <li><i class="bi bi-calendar4-range me-2 text-muted"></i>${t('export_this_year')} : <strong>${fmt(yearRevs.reduce((a, r) => a + r.amount, 0))}</strong> (${yearRevs.length})</li>
      <li><i class="bi bi-calendar-month me-2 text-muted"></i>${t('export_this_month')} : <strong>${fmt(monthRevs.reduce((a, r) => a + r.amount, 0))}</strong> (${monthRevs.length})</li>
      <li><i class="bi bi-tags me-2 text-muted"></i>${t('export_categories')} : <strong>${db.categories.length}</strong></li>
    </ul>`;
}
