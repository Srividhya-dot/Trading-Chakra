// Load TradingView chart with a delay so the container is ready
function loadChart(symbol) {
  const container = document.getElementById("chart-container");
  container.innerHTML = ""; // Clear old chart

  // Delay ensures GitHub Pages fully renders the container before TradingView loads
  setTimeout(() => {
    new TradingView.widget({
      width: "100%",
      height: "100%",
      symbol: symbol,
      interval: "D",
      range: "5Y",
      timezone: "Asia/Kolkata",
      theme: "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      hide_side_toolbar: false,
      withdateranges: true,
      container_id: "chart-container"
    });
  }, 300); // 300ms = perfect for GitHub Pages
}

// Load default chart when site opens
loadChart("NSE:RELIANCE");

// When you click any stock in the watchlist → update chart
document.querySelectorAll("#watchlist li").forEach(item => {
  item.addEventListener("click", () => {
    const symbol = item.dataset.symbol;
    loadChart(symbol);
  });
});

// Search bar filter
document.getElementById("search").addEventListener("input", (e) => {
  const value = e.target.value.toUpperCase();

  document.querySelectorAll("#watchlist li").forEach(li => {
    li.style.display = li.textContent.toUpperCase().includes(value)
      ? ""
      : "none";
  });
});
