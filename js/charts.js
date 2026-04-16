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
  renderCategoryChart();
  renderYearlyChart();
}

// ─── Bar chart : revenues per month (last 12) ─────────────────
function renderMonthlyChart() {
  destroyChart('monthly');
  const now    = new Date();
  const labels = [];
  const data   = [];

  for (let i = 11; i >= 0; i--) {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    labels.push(MONTHS_FR[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2));
    data.push(
      db.revenues
        .filter(r => r.date.startsWith(key))
        .reduce((a, r) => a + r.amount, 0)
    );
  }

  chartInstances.monthly = new Chart(
    document.getElementById('chart-monthly').getContext('2d'),
    {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Revenus (€)',
          data,
          backgroundColor: 'rgba(99,102,241,.75)',
          borderColor: '#6366f1',
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
            grid: { color: '#f1f5f9' },
            ticks: { callback: v => fmt(v) },
          },
          x: { grid: { display: false } },
        },
      },
    }
  );
}

// ─── Doughnut chart : by category ─────────────────────────────
function renderCategoryChart() {
  destroyChart('category');

  const byCat = {};
  db.revenues.forEach(r => {
    byCat[r.category] = (byCat[r.category] || 0) + r.amount;
  });
  const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return;

  const cats = entries.map(([id]) => getCategoryById(id));

  chartInstances.category = new Chart(
    document.getElementById('chart-category').getContext('2d'),
    {
      type: 'doughnut',
      data: {
        labels: cats.map(c => `${c.icon} ${c.name}`),
        datasets: [{
          data: entries.map(([, v]) => v),
          backgroundColor: cats.map(c => c.color + 'cc'),
          borderColor:     cats.map(c => c.color),
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

// ─── Line chart : yearly evolution ───────────────────────────
function renderYearlyChart() {
  destroyChart('yearly');

  const years = [...new Set(db.revenues.map(r => r.date.slice(0, 4)))].sort();
  if (years.length === 0) return;

  const data = years.map(y =>
    db.revenues
      .filter(r => r.date.startsWith(y))
      .reduce((a, r) => a + r.amount, 0)
  );

  chartInstances.yearly = new Chart(
    document.getElementById('chart-yearly').getContext('2d'),
    {
      type: 'line',
      data: {
        labels: years,
        datasets: [{
          label: 'Revenus annuels',
          data,
          fill: true,
          backgroundColor: 'rgba(99,102,241,.1)',
          borderColor: '#6366f1',
          borderWidth: 2.5,
          tension: 0.4,
          pointBackgroundColor: '#6366f1',
          pointRadius: 5,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: '#f1f5f9' },
            ticks: { callback: v => fmt(v) },
          },
          x: { grid: { display: false } },
        },
      },
    }
  );
}
