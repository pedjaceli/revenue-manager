'use strict';

const chartInstances = {};

function destroyChart(key) {
  if (chartInstances[key]) {
    chartInstances[key].destroy();
    delete chartInstances[key];
  }
}

function renderCharts() {
  renderMonthlyChart();
  renderTopProductsChart();
  renderMonthlyInvoicesChart();
}

// ─── Bar chart : grocery spending per month (last 12) ─────────
function renderMonthlyChart() {
  destroyChart('monthly');
  const now    = new Date();
  const labels = [];
  const data   = [];

  for (let i = 11; i >= 0; i--) {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    labels.push(MONTHS_FR[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2));
    const spent = (db.shoppingLists || [])
      .filter(l => l.date && l.date.startsWith(key))
      .flatMap(l => l.items || [])
      .filter(i => i.checked && i.unit_price > 0)
      .reduce((s, i) => s + (i.quantity || 1) * i.unit_price, 0);
    data.push(+spent.toFixed(2));
  }

  chartInstances.monthly = new Chart(
    document.getElementById('chart-monthly').getContext('2d'),
    {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: t('chart_grocery_label'),
          data,
          backgroundColor: 'rgba(99,102,241,.75)',
          borderColor: '#10b981',
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(128,128,128,.15)' },
            ticks: { callback: v => fmt(v) },
          },
          x: { grid: { display: false }, ticks: { maxRotation: 45, autoSkip: true, maxTicksLimit: 8 } },
        },
      },
    }
  );
}

// ─── Doughnut chart : top products from invoices ──────────────
function renderTopProductsChart() {
  destroyChart('category');

  const map = new Map();
  (db.invoices || []).forEach(inv => {
    (inv.items || []).forEach(item => {
      const key = item.product_name.toLowerCase();
      map.set(key, (map.get(key) || 0) + item.quantity * item.unit_price);
    });
  });

  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (sorted.length === 0) return;

  const colors = ['#10b981','#8b5cf6','#ec4899','#f43f5e','#f97316','#f59e0b','#10b981','#06b6d4'];

  chartInstances.category = new Chart(
    document.getElementById('chart-category').getContext('2d'),
    {
      type: 'doughnut',
      data: {
        labels: sorted.map(([name]) => name),
        datasets: [{
          data: sorted.map(([, v]) => +v.toFixed(2)),
          backgroundColor: colors.map(c => c + 'cc'),
          borderColor:     colors,
          borderWidth: 2,
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, padding: 12, font: { size: 12 } },
          },
          tooltip: {
            callbacks: { label: ctx => ` ${fmt(ctx.parsed)}` },
          },
        },
      },
    }
  );
}

// ─── Bar chart : invoice spending per month (last 12) ────────
function renderMonthlyInvoicesChart() {
  destroyChart('yearly');
  const now    = new Date();
  const labels = [];
  const data   = [];

  for (let i = 11; i >= 0; i--) {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    labels.push(MONTHS_FR[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2));
    const total = (db.invoices || [])
      .filter(inv => inv.date && inv.date.startsWith(key))
      .reduce((s, inv) => s + (inv.total != null ? inv.total
        : (inv.items || []).reduce((t, i) => t + i.quantity * i.unit_price, 0)), 0);
    data.push(+total.toFixed(2));
  }

  chartInstances.yearly = new Chart(
    document.getElementById('chart-yearly').getContext('2d'),
    {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: t('chart_invoices_label'),
          data,
          fill: true,
          backgroundColor: 'rgba(16,185,129,.65)',
          borderColor: '#10b981',
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(128,128,128,.15)' },
            ticks: { callback: v => fmt(v) },
          },
          x: { grid: { display: false }, ticks: { maxRotation: 45, autoSkip: true, maxTicksLimit: 8 } },
        },
      },
    }
  );
}
