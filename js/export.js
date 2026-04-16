'use strict';

// ─── Filter revenues by period ────────────────────────────────
function getExportRevenues(period) {
  const now       = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thisYear  = String(now.getFullYear());

  let revs = [...db.revenues].sort((a, b) => b.date.localeCompare(a.date));
  if (period === 'month') revs = revs.filter(r => r.date.startsWith(thisMonth));
  if (period === 'year')  revs = revs.filter(r => r.date.startsWith(thisYear));
  return revs;
}

// ─── Export CSV ───────────────────────────────────────────────
function exportCSV() {
  const period = document.getElementById('export-period-csv').value;
  const revs   = getExportRevenues(period);

  if (revs.length === 0) { showToast('Aucune donnée à exporter', 'error'); return; }

  const header = ['Date', 'Description', 'Catégorie', 'Montant (€)', 'Notes'];
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

  const csv  = [header, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `revenus-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  showToast(`CSV exporté (${revs.length} entrée(s))`);
}

// ─── Export PDF ───────────────────────────────────────────────
function exportPDF() {
  const period = document.getElementById('export-period-pdf').value;
  const revs   = getExportRevenues(period);

  if (revs.length === 0) { showToast('Aucune donnée à exporter', 'error'); return; }

  const { jsPDF } = window.jspdf;
  const doc       = new jsPDF();
  const total     = revs.reduce((a, r) => a + r.amount, 0);
  const now       = new Date();
  const periodLabel = {
    all:   'Toutes les données',
    year:  `Année ${now.getFullYear()}`,
    month: `${MONTHS_FULL[now.getMonth()]} ${now.getFullYear()}`,
  }[period];

  // ── Header band ──────────────────────────────────────────
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, 210, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20); doc.setFont('helvetica', 'bold');
  doc.text('Revenue Manager', 14, 14);
  doc.setFontSize(11); doc.setFont('helvetica', 'normal');
  doc.text(`Rapport — ${periodLabel}`, 14, 23);
  doc.text(`Généré le ${now.toLocaleDateString('fr-FR')}`, 140, 23);

  // ── Summary box ──────────────────────────────────────────
  doc.setTextColor(30, 27, 75);
  doc.setFillColor(240, 238, 255);
  doc.roundedRect(14, 38, 182, 22, 3, 3, 'F');
  doc.setFontSize(12); doc.setFont('helvetica', 'bold');
  doc.text(`Total : ${fmt(total)}`, 20, 51);
  doc.setFont('helvetica', 'normal');
  doc.text(`${revs.length} entrée(s)`, 110, 51);

  // ── Category summary table ────────────────────────────────
  doc.setTextColor(30, 27, 75);
  doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text('Répartition par catégorie', 14, 72);

  const byCat   = {};
  revs.forEach(r => { byCat[r.category] = (byCat[r.category] || 0) + r.amount; });
  const catRows = Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .map(([id, amt]) => {
      const cat = getCategoryById(id);
      return [
        cat.name,
        revs.filter(r => r.category === id).length,
        fmt(amt),
        `${Math.round(amt / total * 100)} %`,
      ];
    });

  doc.autoTable({
    startY: 76,
    head: [['Catégorie', 'Nb', 'Montant', '%']],
    body: catRows,
    styles:          { fontSize: 10, cellPadding: 4 },
    headStyles:      { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  // ── Detail table ─────────────────────────────────────────
  const afterY = doc.lastAutoTable.finalY + 12;
  doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text('Détail des revenus', 14, afterY);

  const tableRows = revs.map(r => {
    const cat = getCategoryById(r.category);
    return [fmtDate(r.date), r.description, cat.name, fmt(r.amount), r.notes || ''];
  });

  doc.autoTable({
    startY: afterY + 4,
    head: [['Date', 'Description', 'Catégorie', 'Montant', 'Notes']],
    body: tableRows,
    styles:          { fontSize: 9, cellPadding: 3 },
    headStyles:      { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles:    { 3: { fontStyle: 'bold', textColor: [5, 150, 105] } },
    margin: { left: 14, right: 14 },
  });

  // ── Page footers ─────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9); doc.setTextColor(150);
    doc.text(
      `Page ${i} / ${pageCount} — Revenue Manager`,
      14,
      doc.internal.pageSize.height - 8
    );
  }

  doc.save(`rapport-revenus-${period}-${now.toISOString().slice(0, 10)}.pdf`);
  showToast(`PDF généré (${revs.length} entrée(s))`);
}

// ─── Export page summary ──────────────────────────────────────
function renderExportSummary() {
  const now       = new Date();
  const totalAll  = db.revenues.reduce((a, r) => a + r.amount, 0);
  const yearRevs  = db.revenues.filter(r => r.date.startsWith(String(now.getFullYear())));
  const monthRevs = db.revenues.filter(r =>
    r.date.startsWith(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  );

  document.getElementById('export-summary').innerHTML = `
    <ul class="list-unstyled mb-0 small lh-lg">
      <li><i class="bi bi-box-seam me-2 text-muted"></i>Total entrées : <strong>${db.revenues.length}</strong></li>
      <li><i class="bi bi-coin me-2 text-muted"></i>Total cumulé : <strong>${fmt(totalAll)}</strong></li>
      <li><i class="bi bi-calendar4-range me-2 text-muted"></i>Cette année : <strong>${fmt(yearRevs.reduce((a, r) => a + r.amount, 0))}</strong> (${yearRevs.length})</li>
      <li><i class="bi bi-calendar-month me-2 text-muted"></i>Ce mois : <strong>${fmt(monthRevs.reduce((a, r) => a + r.amount, 0))}</strong> (${monthRevs.length})</li>
      <li><i class="bi bi-tags me-2 text-muted"></i>Catégories : <strong>${db.categories.length}</strong></li>
    </ul>`;
}
