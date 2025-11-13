/*
  Trading Chakra v2 - Lightweight Charts + Cloudflare Worker
  Fully working NSE candles + volume
*/

const API_BASE = "https://black-tree-2e32.sriviadithi.workers.dev/?symbol=";

// DOM references
const chartContainer = document.getElementById("chart");
const volumeContainer = document.getElementById("volume");
const spinner = document.getElementById("spinner");
const errorBox = document.getElementById("error");
const symbolTitle = document.getElementById("symbol-title");

// chart objects
let chart = null;
let candleSeries = null;
let volumeSeries = null;

// helpers
function showSpinner(state = true) {
  spinner.classList.toggle("hidden", !state);
}
function showError(msg) {
  errorBox.textContent = msg;
  errorBox.style.display = msg ? "block" : "none";
}

// Create chart if not exists
function createChartIfNeeded() {
  if (chart) return;

  if (typeof LightweightCharts === "undefined") {
    showError("Chart library failed to load.");
    throw new Error("LightweightCharts missing");
  }

  chart = LightweightCharts.createChart(chartContainer, {
    layout: {
      background: { color: "#0f1724" },
      textColor: "#e6eef8"
    },
    rightPriceScale: {
      borderColor: "rgba(255,255,255,0.2)"
    },
    timeScale: {
      borderColor: "rgba(255,255,255,0.2)"
    },
    width: chartContainer.clientWidth,
    height: chartContainer.clientHeight,
  });

  candleSeries = chart.addCandlestickSeries({
    upColor: "#26a69a",
    downColor: "#ef5350",
    borderUpColor: "#26a69a",
    borderDownColor: "#ef5350",
    wickUpColor: "#26a69a",
    wickDownColor: "#ef5350",
  });

  volumeSeries = chart.addHistogramSeries({
    color: "#4a90e2",
    priceFormat: { type: "volume" },
    priceScaleId: "",
    scaleMargins: {
      top: 0.8,
      bottom: 0
    }
  });

  // Resize chart on window resize
  window.addEventListener("resize", () => {
    chart.applyOptions({
      width: chartContainer.clientWidth,
      height: chartContainer.clientHeight
    });
  });
}

// Convert Yahoo Finance data → candles
function convertYahoo(result) {
  const timestamps = result.timestamp;
  const quote = result.indicators.quote[0];

  return timestamps.map((t, i) => ({
    time: t,
    open: quote.open[i],
    high: quote.high[i],
    low: quote.low[i],
    close: quote.close[i],
    volume: quote.volume[i]
  })).filter(c => c.open !== null && c.close !== null);
}

// Load symbol → fetch → draw
async function loadSymbol(symbol) {
  showError("");
  showSpinner(true);
  symbolTitle.textContent = symbol;

  try {
    const response = await fetch(API_BASE + symbol);
    const data = await response.json();

    if (!data.chart || !data.chart.result) {
      throw new Error("No chart data returned.");
    }

    const result = data.chart.result[0];
    const candles = convertYahoo(result);

    createChartIfNeeded();

    const candleData = candles.map(c => ({
      time: c.time,
      open: +c.open,
      high: +c.high,
      low: +c.low,
      close: +c.close,
    }));

    const volumeData = candles.map(c => ({
      time: c.time,
      value: c.volume,
      color: c.close >= c.open ? "#26a69a" : "#ef5350"
    }));

    candleSeries.setData(candleData);
    volumeSeries.setData(volumeData);

    chart.timeScale().fitContent();

  } catch (err) {
    console.error(err);
    showError(err.message);
  } finally {
    showSpinner(false);
  }
}

// Initialize app
function init() {
  loadSymbol("RELIANCE.NS");

  // watchlist clicking
  document.querySelectorAll("#watchlist li").forEach(li => {
    li.addEventListener("click", () => {
      document.querySelectorAll("#watchlist li").forEach(x => x.classList.remove("active"));
      li.classList.add("active");
      loadSymbol(li.dataset.symbol);
    });
  });

  // search filter
  document.getElementById("search").addEventListener("input", e => {
    const q = e.target.value.toUpperCase();
    document.querySelectorAll("#watchlist li").forEach(li => {
      li.style.display = li.textContent.toUpperCase().includes(q) ? "" : "none";
    });
  });
}

init();
