function loadChart(symbol) {
  const container = document.getElementById("chart-container");

  // Clear previous chart
  container.innerHTML = "";

  // Create TradingView widget
  new TradingView.widget({
    autosize: true,
    symbol: symbol,
    interval: "D",
    range: "5Y",
    timezone: "Asia/Kolkata",
    theme: "dark",
    style: "1",
    locale: "en",
    enable_publishing: false,
    container_id: "chart-container"
  });
}

// Load default chart
loadChart("RELIANCE.NS");

// Click watchlist to load new chart
document.querySelectorAll("#watchlist li").forEach(item => {
  item.addEventListener("click", () => {
    const symbol = item.getAttribute("data-symbol");
    loadChart(symbol);
  });
});

// Search filter
document.getElementById("search").addEventListener("input", e => {
  const value = e.target.value.toUpperCase();

  document.querySelectorAll("#watchlist li").forEach(li => {
    li.style.display = li.textContent.toUpperCase().includes(value)
      ? ""
      : "none";
  });
});
