// Initialize TradingView chart
function loadChart(symbol) {
  document.getElementById('chart-container').innerHTML = ''; // clear previous chart

  new TradingView.widget({
    autosize: true,
    symbol: symbol,
    interval: "D",
    range: "5Y",
    timezone: "Asia/Kolkata",
    theme: "dark",
    style: "1",
    locale: "en",
    toolbar_bg: "#f1f3f6",
    enable_publishing: false,
    hide_top_toolbar: false,
    hide_legend: false,
    container_id: "chart-container",
  });
}

// Load default chart
loadChart("RELIANCE.NS");

// Click to load other stocks
document.querySelectorAll('#watchlist li').forEach(item => {
  item.addEventListener('click', () => {
    const symbol = item.getAttribute('data-symbol');
    loadChart(symbol);
  });
});

// Search stocks (for demo, just filters the list)
document.getElementById('search').addEventListener('input', e => {
  const filter = e.target.value.toUpperCase();
  document.querySelectorAll('#watchlist li').forEach(li => {
    li.style.display = li.textContent.toUpperCase().includes(filter) ? '' : 'none';
  });
});
