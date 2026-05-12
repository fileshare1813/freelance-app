// ===== REALTIME CHART SYSTEM =====
let projectChart, revenueChart, userChart;
let graphRefreshInterval;

function initCharts(data) {
  if (!data) return;
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } } }
    },
    animation: { duration: 600, easing: 'easeInOutQuart' }
  };

  // Project Chart
  const pCanvas = document.getElementById('projectChart');
  if (pCanvas) {
    if (projectChart) projectChart.destroy();
    projectChart = new Chart(pCanvas, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [{
          label: data.role === 'admin' ? 'New Projects' : data.role === 'client' ? 'Projects Posted' : 'Projects Won',
          data: data.projectData,
          backgroundColor: 'rgba(108, 99, 255, 0.8)',
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: { ...commonOptions }
    });
  }

  // Revenue/Earnings Chart
  const rCanvas = document.getElementById('revenueChart');
  if (rCanvas) {
    if (revenueChart) revenueChart.destroy();
    revenueChart = new Chart(rCanvas, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [{
          label: data.role === 'client' ? 'Amount Spent (₹)' : 'Revenue (₹)',
          data: data.revenueData,
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#22c55e',
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: { ...commonOptions }
    });
  }

  // User Growth Chart (admin only)
  const uCanvas = document.getElementById('userChart');
  if (uCanvas && data.userGrowth) {
    if (userChart) userChart.destroy();
    userChart = new Chart(uCanvas, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'New Users',
          data: data.userGrowth,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#3b82f6',
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: { ...commonOptions }
    });
  }
}

function updateChartsData(data) {
  if (!data || !data.labels) return;

  if (projectChart && data.projectData) {
    projectChart.data.labels = data.labels;
    projectChart.data.datasets[0].data = data.projectData;
    projectChart.update('active');
  }
  if (revenueChart && data.revenueData) {
    revenueChart.data.labels = data.labels;
    revenueChart.data.datasets[0].data = data.revenueData;
    revenueChart.update('active');
  }
  if (userChart && data.userGrowth) {
    userChart.data.labels = data.labels;
    userChart.data.datasets[0].data = data.userGrowth;
    userChart.update('active');
  }
}

// Init charts from page data
document.addEventListener('DOMContentLoaded', () => {
  if (typeof GRAPH_DATA !== 'undefined' && GRAPH_DATA) {
    initCharts(GRAPH_DATA);
  }

  // Auto-refresh every 30 seconds via API
  if (typeof GRAPH_API_URL !== 'undefined' && GRAPH_API_URL) {
    graphRefreshInterval = setInterval(async () => {
      try {
        const res = await fetch(GRAPH_API_URL);
        const json = await res.json();
        if (json.success && json.data) {
          updateChartsData(json.data);
        }
      } catch (e) {}
    }, 30000);
  }
});

// Socket-based realtime graph updates
if (typeof io !== 'undefined' && typeof USER_ID !== 'undefined') {
  const socket = window._mainSocket || (window._mainSocket = io());
  socket.on('graphUpdate', (data) => {
    if (data.refresh && typeof GRAPH_API_URL !== 'undefined') {
      // Trigger refresh
      fetch(GRAPH_API_URL)
        .then(r => r.json())
        .then(json => { if (json.success) updateChartsData(json.data); })
        .catch(() => {});
    } else if (data.labels) {
      updateChartsData(data);
    }
  });
}