// script.js

// -----------------------------
// CONFIG
// -----------------------------
const WORKER_BASE = "https://black-tree-2e32.sriviadithi.workers.dev"; // <<--- set your worker URL here (no trailing slash required)

// DOM
const watchlistEl = document.getElementById("watchlist");
const addInput = document.getElementById("add-stock");
const addBtn = document.getElementById("add-btn");
const spinner = document.getElementById("spinner");
const errorBox = document.getElementById("error");
const symbolTitle = document.getElementById("symbol-title");
const tfButtons = document.querySelectorAll(".tf-btn");
const searchInput = document.getElementById("search");

// chart containers
const chartDiv = document.getElementById("chart");
const volumeDiv = document.getElementById("volume");

// state
let chart = null;
let candleSeries = null;
let volumeSeries = null;
let currentSymbol = null;
let currentInterval = "1m"; // default intraday
let currentRange = "7d";
let liveTimer = null;

// default watchlist (will be replaced by localStorage if present)
const DEFAULT_LIST = ["RELIANCE.NS","TCS.NS","INFY.NS","HDFCBANK.NS","ICICIBANK.NS"];

// map timeframe buttons to Yahoo interval+range
const TF_MAP = {
  "1m": { interval: "1m", range: "7d" },
  "5m": { interval: "5m", range: "1mo" },
  "15m": { interval: "15m", range: "3mo" },
  "30m": { interval: "30m", range: "3mo" },
  "60m": { interval: "60m", range: "6mo" },
  "1d": { interval: "1d", range: "5y" },
  "1w": { interval: "1wk", range: "5y" },
  "1mo": { interval: "1mo", range: "max" }
};

// -----------------------------
// UTIL
// -----------------------------
function showSpinner() { spinner.classList.remove("hidden"); }
function hideSpinner() { spinner.classList.add("hidden"); }
function showError(msg) { errorBox.style.display = "block"; errorBox.innerText = msg; }
function hideError() { errorBox.style.display = "none"; errorBox.innerText = ""; }

// localStorage watchlist helpers
function loadWatchlist() {
  try {
    const stored = JSON.parse(localStorage.getItem("tc_watchlist") || "null");
    if (Array.isArray(stored) && stored.length) return stored;
  } catch(e){}
  return DEFAULT_LIST.slice();
}
function saveWatchlist(list) {
  localStorage.setItem("tc_watchlist", JSON.stringify(list));
}

// -----------------------------
// CHART SETUP
// -----------------------------
function createChartIfNeeded() {
  if (chart) return;

  chart = LightweightCharts.createChart(chartDiv, {
    layout: { backgroundColor: "#0f1724", textColor: "#d1d4dc" },
    grid: { vertLines: { color: "#18323f" }, horzLines: { color: "#18323f" } },
    rightPriceScale: { borderColor: "#1e3342" },
    timeScale: { borderColor: "#1e3342" },
  });

  candleSeries = chart.addCandlestickSeries({
    upColor: "#22c55e", downColor: "#ef4444", borderVisible: true, wickVisible: true
  });

  // volume as histogram in separate pane (here we attach to same chart with priceScaleId "")
  volumeSeries = chart.addHistogramSeries({
    priceFormat: { type: "volume" },
    priceScaleId: "",
    scaleMargins: { top: 0.8, bottom: 0 },
  });
}

// -----------------------------
// WATCHLIST UI
// -----------------------------
function renderWatchlist() {
  const list = loadWatchlist();
  watchlistEl.innerHTML = "";
  list.forEach(sym => {
    const li = document.createElement("li");
    li.dataset.symbol = sym;
    li.innerText = sym.replace(".NS",""); // show shorter
    li.addEventListener("click", () => {
      loadChart(sym);
    });
    watchlistEl.appendChild(li);
  });
}

// Add stock button
addBtn.addEventListener("click", () => {
  const val = addInput.value.trim().toUpperCase();
  if (!val) return;
  // accept either "RELIANCE" or "RELIANCE.NS"
  const sym = val.includes(".") ? val : `${val}.NS`;
  const list = loadWatchlist();
  if (!list.includes(sym)) {
    list.unshift(sym);
    saveWatchlist(list);
    renderWatchlist();
    addInput.value = "";
    loadChart(sym);
  } else {
    // highlight existing
    loadChart(sym);
  }
});

// search filter
searchInput.addEventListener("input", (e) => {
  const q = e.target.value.trim().toLowerCase();
  Array.from(watchlistEl.children).forEach(li => {
    li.style.display = li.dataset.symbol.toLowerCase().includes(q) ? "" : "none";
  });
});

// -----------------------------
// TIMEFRAME BUTTONS
// -----------------------------
tfButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    tfButtons.forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    const tf = btn.dataset.tf;
    if (!TF_MAP[tf]) return;
    currentInterval = TF_MAP[tf].interval;
    currentRange = TF_MAP[tf].range;
    if (currentSymbol) loadChart(currentSymbol);
  });
});

// -----------------------------
// DATA FETCH via Worker
// -----------------------------
async function fetchYahoo(symbol, interval, range) {
  const u = `${WORKER_BASE}?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(range)}`;
  const resp = await fetch(u, { method: "GET" });
  if (!resp.ok) throw new Error("Network error: " + resp.status);
  const data = await resp.json();
  return data;
}

// Parse yahoo response into OHLC + volume
function parseYahoo(data) {
  try {
    const result = data.chart.result && data.chart.result[0];
    if (!result) return { ohlc: [], volume: [], meta: null };

    const timestamps = result.timestamp || (result.indicators && result.indicators.quote && result.indicators.quote[0] && result.indicators.quote[0].timestamp) || [];
    const quotes = (result.indicators && result.indicators.quote && result.indicators.quote[0]) || {};
    const opens = quotes.open || [];
    const highs = quotes.high || [];
    const lows = quotes.low || [];
    const closes = quotes.close || [];
    const volumes = quotes.volume || [];

    const tz = result.meta && result.meta.timezone;
    const meta = result.meta || null;

    const ohlc = [];
    const volume = [];

    for (let i = 0; i < timestamps.length; i++) {
      const t = timestamps[i];
      // lightweight-charts expects 'time' as unix seconds or 'YYYY-MM-DD' (we have seconds)
      const o = opens[i];
      const h = highs[i];
      const l = lows[i];
      const c = closes[i];
      const v = volumes[i] || 0;
      if ([o,h,l,c].some(x => x === undefined || x === null || isNaN(x))) continue;
      ohlc.push({ time: t, open: o, high: h, low: l, close: c });
      volume.push({ time: t, value: v, color: c >= o ? "#22c55e" : "#ef4444" });
    }

    return { ohlc, volume, meta };
  } catch (e) {
    console.error("parse error", e);
    return { ohlc: [], volume: [], meta: null };
  }
}

// -----------------------------
// LOAD CHART
// -----------------------------
async function loadChart(symbol) {
  try {
    showSpinner();
    hideError();
    createChartIfNeeded();

    // highlight active li
    Array.from(watchlistEl.children).forEach(li => li.classList.toggle("active", li.dataset.symbol === symbol));

    currentSymbol = symbol;
    symbolTitle.innerText = symbol;

    // stop previous live polling
    if (liveTimer) { clearInterval(liveTimer); liveTimer = null; }

    // fetch OHLC via worker
    const raw = await fetchYahoo(symbol, currentInterval, currentRange);
    if (!raw) {
      throw new Error("No data");
    }

    const parsed = parseYahoo(raw);
    if (!parsed.ohlc || parsed.ohlc.length === 0) {
      showError("No chart data returned.");
      hideSpinner();
      return;
    }

    candleSeries.setData(parsed.ohlc);
    volumeSeries.setData(parsed.volume);
    chart.timeScale().fitContent();

    hideSpinner();

    // set up live price polling (only for displayed symbol)
    liveTimer = setInterval(async () => {
      try {
        // For a lightweight live update, request the latest 2 points
        const liveRaw = await fetchYahoo(symbol, currentInterval, currentRange);
        const liveParsed = parseYahoo(liveRaw);
        if (liveParsed.ohlc.length) {
          // update last candle and append new if timestamp increased
          const last = liveParsed.ohlc[liveParsed.ohlc.length - 1];
          const prev = liveParsed.ohlc[liveParsed.ohlc.length - 2];
          if (prev) {
            // set full dataset (simple approach) - for performance you can patch last bar only
            candleSeries.setData(liveParsed.ohlc);
            volumeSeries.setData(liveParsed.volume);
            chart.timeScale().fitContent();
          }
        }
      } catch (e) {
        console.warn("Live poll error", e);
      }
    }, 15000); // 15s poll

  } catch (err) {
    console.error(err);
    showError(err.message || "Failed to load chart");
    hideSpinner();
  }
}

// -----------------------------
// ON LOAD
// -----------------------------
function init() {
  // render saved watchlist
  const list = loadWatchlist();
  // if none, initialise with default
  if (list.length === 0) {
    saveWatchlist(DEFAULT_LIST);
  }

  renderWatchlist();

  // load first symbol from watchlist
  const first = loadWatchlist()[0] || DEFAULT_LIST[0];
  if (first) loadChart(first);

  // make clicking on watchlist work (items created by renderWatchlist)
  // (they already include listeners in renderWatchlist)

  // keyboard: add on Enter
  addInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addBtn.click();
  });
}

init();
