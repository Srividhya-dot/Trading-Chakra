/*
  Trading Chakra v2
  Lightweight Charts + Cloudflare Worker (Yahoo Finance)
  Make sure your Worker URL is correct in API_BASE
*/

const API_BASE = "https://black-tree-2e32.sriviadithi.workers.dev/?symbol="; // <- your worker

// DOM nodes
const chartContainer = document.getElementById("chart");
const volContainer = document.getElementById("volume");
const spinner = document.getElementById("spinner");
const errorBox = document.getElementById("error");
const symbolTitle = document.getElementById("symbol-title");

// Lightweight chart instances
let chart = null;
let candleSeries = null;
let volumeSeries = null;

// helper to show/hide
function showSpinner(on = true){
  spinner.classList.toggle("hidden", !on);
}
function showError(msg){
  errorBox.textContent = msg;
  errorBox.style.display = msg ? "block" : "none";
}

// convert yahoo result->lightweight format
function parseYahoo(result){
  if(!result || !result.timestamp) return [];
  const ts = result.timestamp; // seconds array
  const quote = result.indicators.quote[0];
  const candles = ts.map((t,i) => {
    return {
      time: t,                    // UNIX seconds supported by LWCharts
      open: quote.open[i],
      high: quote.high[i],
      low: quote.low[i],
      close: quote.close[i],
      volume: quote.volume[i]
    };
  }).filter(c => c.open !== null && c.close !== null); // drop null rows
  return candles;
}

// create chart / series (reuse if exists)
function createChartIfNeeded(){
  // if already built, just update sizes later
  if (chart) return;

  // create main chart
  chart = LightweightCharts.createChart(chartContainer, {
    layout: {
      background: { color: "#0f1724" },
      textColor: "#e6eef8"
    },
    rightPriceScale: {
      borderColor: "rgba(255,255,255,0.04)"
    },
    timeScale: {
      borderColor: "rgba(255,255,255,0.04)"
    },
    handleScroll: true,
    handleScale: true,
  });

  candleSeries = chart.addCandlestickSeries({
    upColor: "#26a69a",
    downColor: "#ef5350",
    borderUpColor: "#26a69a",
    borderDownColor: "#ef5350",
    wickUpColor: "#26a69a",
    wickDownColor: "#ef5350",
  });

  // volume histogram on separate price scale
  volumeSeries = chart.addHistogramSeries({
    color: "#4a90e2",
    priceFormat: { type: "volume" },
    priceScaleId: "",
    scaleMargins: {
      top: 0.8,
      bottom: 0
    }
  });

  // responsive
  window.addEventListener("resize", () => {
    chart.applyOptions({ width: chartContainer.clientWidth, height: chartContainer.clientHeight });
  });
}

// load and render a symbol
async function loadSymbol(symbol){
  showError("");
  showSpinner(true);
  symbolTitle.textContent = symbol;

  try {
    const resp = await fetch(API_BASE + encodeURIComponent(symbol));
    if (!resp.ok) throw new Error("Failed to fetch data from backend");

    const data = await resp.json();

    // Yahoo response nested: data.chart.result[0]
    if(!data || !data.chart || !data.chart.result || !data.chart.result.length){
      throw new Error("No chart data returned");
    }

    const result = data.chart.result[0];
    const candles = parseYahoo(result);

    if(!candles.length){
      throw new Error("No usable candle data returned");
    }

    // ensure chart exists
    createChartIfNeeded();

    // map for LW charts: time in seconds is OK
    const lwCandles = candles.map(c => ({
      time: c.time,
      open: +c.open,
      high: +c.high,
      low: +c.low,
      close: +c.close
    }));

    const lwVolume = candles.map(c => ({
      time: c.time,
      value: c.volume,
      color: c.close >= c.open ? "#26a69a" : "#ef5350"
    }));

    candleSeries.setData(lwCandles);
    volumeSeries.setData(lwVolume);

    // apply nice zoom to show all data
    chart.timeScale().fitContent();

  } catch (err) {
    console.error(err);
    showError("Failed to load data: " + (err.message || err));
  } finally {
    showSpinner(false);
  }
}

// initialize defaults and attach events
function init(){
  // initial create to prepare sizes
  createChartIfNeeded();

  // default symbol
  const defaultSymbol = "RELIANCE.NS";
  loadSymbol(defaultSymbol);

  // watchlist clicks
  document.querySelectorAll("#watchlist li").forEach(li => {
    li.addEventListener("click", () => {
      // highlight
      document.querySelectorAll("#watchlist li").forEach(x => x.classList.remove("active"));
      li.classList.add("active");
      const sym = li.dataset.symbol;
      loadSymbol(sym);
    });
  });

  // search
  document.getElementById("search").addEventListener("input", (e) => {
    const q = e.target.value.trim().toUpperCase();
    document.querySelectorAll("#watchlist li").forEach(li => {
      li.style.display = li.textContent.toUpperCase().includes(q) ? "" : "none";
    });
  });
}

// start
init();
