'use strict';

function _getExportInvoices(period) {
  const now       = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thisYear  = String(now.getFullYear());
  let invs = [...(db.invoices || [])].sort((a, b) => b.date.localeCompare(a.date));
  if (period === 'month') invs = invs.filter(i => i.date.startsWith(thisMonth));
  if (period === 'year')  invs = invs.filter(i => i.date.startsWith(thisYear));
  return invs;
}

function exportCSV() {
  const period = document.getElementById('export-period-csv').value;
  const invs   = _getExportInvoices(period);
  if (invs.length === 0) { showToast(t('toast_no_data'), 'error'); return; }

  const rows = [];
  invs.forEach(inv => {
    const total = inv.total != null ? inv.total
      : (inv.items || []).reduce((s, i) => s + i.quantity * i.unit_price, 0);
    (inv.items || []).forEach(item => {
      rows.push([
        inv.date,
        `"${inv.title.replace(/"/g, '""')}"`,
        `"${item.product_name.replace(/"/g, '""')}"`,
        item.quantity,
        item.unit_price.toFixed(2),
        (item.quantity * item.unit_price).toFixed(2),
      ]);
    });
    if ((inv.items || []).length === 0) {
      rows.push([inv.date, `"${inv.title.replace(/"/g, '""')}"`, '', '', '', total.toFixed(2)]);
    }
  });

  const header = [t('col_date'), t('col_description'), t('agg_col_product'), t('agg_col_qty'), t('label_unit_price'), t('col_amount')];
  const csv    = 'sep=,\n' + [header, ...rows].map(r => r.join(',')).join('\n');
  const blob   = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  a.href = url;
  a.download = `factures-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`CSV — ${invs.length} ${t('stat_expenses')}`);
}

function exportPDF() {
  const period = document.getElementById('export-period-pdf').value;
  const invs   = _getExportInvoices(period);
  if (invs.length === 0) { showToast(t('toast_no_data'), 'error'); return; }

  const { jsPDF } = window.jspdf;
  const doc       = new jsPDF();
  const now       = new Date();
  const months    = getMonths();
  const periodLabel = {
    all:   t('period_all'),
    year:  `${t('period_year')} ${now.getFullYear()}`,
    month: `${months[now.getMonth()]} ${now.getFullYear()}`,
  }[period];

  const grandTotal = invs.reduce((s, inv) =>
    s + (inv.total != null ? inv.total : (inv.items || []).reduce((t, i) => t + i.quantity * i.unit_price, 0)), 0);

  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, 210, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20); doc.setFont('helvetica', 'bold');
  doc.text('Grocery Manager', 14, 14);
  doc.setFontSize(11); doc.setFont('helvetica', 'normal');
  doc.text(`${t('pdf_report')} — ${periodLabel}`, 14, 23);
  doc.text(`${t('pdf_generated')} ${now.toLocaleDateString()}`, 140, 23);

  doc.setTextColor(30, 27, 75);
  doc.setFillColor(240, 238, 255);
  doc.roundedRect(14, 38, 182, 22, 3, 3, 'F');
  doc.setFontSize(12); doc.setFont('helvetica', 'bold');
  doc.text(`${t('pdf_total')} : ${fmt(grandTotal)}`, 20, 51);
  doc.setFont('helvetica', 'normal');
  doc.text(`${invs.length} ${t('stat_expenses')}`, 110, 51);

  const tableRows = invs.map(inv => {
    const total = inv.total != null ? inv.total
      : (inv.items || []).reduce((s, i) => s + i.quantity * i.unit_price, 0);
    return [fmtDate(inv.date), inv.title, inv.items.length, fmt(total)];
  });

  doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text(t('pdf_detail'), 14, 72);

  doc.autoTable({
    startY: 76,
    head: [[t('col_date'), t('col_description'), t('inv_items_count'), t('col_amount')]],
    body: tableRows,
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 3: { fontStyle: 'bold', textColor: [5, 150, 105] } },
    margin: { left: 14, right: 14 },
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9); doc.setTextColor(150);
    doc.text(`${t('pdf_page')} ${i} / ${pageCount} — Grocery Manager`, 14, doc.internal.pageSize.height - 8);
  }

  doc.save(`rapport-factures-${period}-${now.toISOString().slice(0, 10)}.pdf`);
  showToast(`PDF — ${invs.length} ${t('stat_expenses')}`);
}

function renderExportSummary() {
  const now       = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const invs      = db.invoices || [];

  const _total = inv => inv.total != null ? inv.total
    : (inv.items || []).reduce((s, i) => s + i.quantity * i.unit_price, 0);

  const totalAll   = invs.reduce((s, inv) => s + _total(inv), 0);
  const yearInvs   = invs.filter(inv => inv.date.startsWith(String(now.getFullYear())));
  const monthInvs  = invs.filter(inv => inv.date.startsWith(thisMonth));
  const totalItems = invs.reduce((s, inv) => s + (inv.items || []).length, 0);

  document.getElementById('export-summary').innerHTML = `
    <ul class="list-unstyled mb-0 small lh-lg">
      <li><i class="bi bi-receipt me-2 text-muted"></i>${t('export_total_entries')} : <strong>${invs.length}</strong></li>
      <li><i class="bi bi-bag me-2 text-muted"></i>${t('agg_col_product')} : <strong>${totalItems}</strong></li>
      <li><i class="bi bi-coin me-2 text-muted"></i>${t('export_total_amount')} : <strong>${fmt(totalAll)}</strong></li>
      <li><i class="bi bi-calendar4-range me-2 text-muted"></i>${t('export_this_year')} : <strong>${fmt(yearInvs.reduce((s, i) => s + _total(i), 0))}</strong> (${yearInvs.length})</li>
      <li><i class="bi bi-calendar-month me-2 text-muted"></i>${t('export_this_month')} : <strong>${fmt(monthInvs.reduce((s, i) => s + _total(i), 0))}</strong> (${monthInvs.length})</li>
    </ul>`;
}
