// ----------------------------------------------------
// CONFIG
// ----------------------------------------------------
const WORKER_URL = "https://black-tree-2e32.sriviadithi.workers.dev/?symbol=";

// HTML references
const chartDiv = document.getElementById("chart");
const volumeDiv = document.getElementById("volume");
const watchlistItems = document.querySelectorAll("#watchlist li");
const spinner = document.getElementById("spinner");
const errorBox = document.getElementById("error");
const symbolTitle = document.getElementById("symbol-title");

// Global chart + series
let chart = null;
let candleSeries = null;
let volumeSeries = null;

// ----------------------------------------------------
// CREATE CHART ONCE
// ----------------------------------------------------
function createChart() {
    if (chart) return;

    chart = LightweightCharts.createChart(chartDiv, {
        width: chartDiv.clientWidth,
        height: chartDiv.clientHeight,
        layout: {
            backgroundColor: "#0f1724",
            textColor: "#d1d4dc",
        },
        grid: {
            vertLines: { color: "#253248" },
            horzLines: { color: "#253248" },
        },
        timeScale: {
            borderColor: "#485c7b",
        },
        rightPriceScale: {
            borderColor: "#485c7b",
        },
    });

    candleSeries = chart.addCandlestickSeries({
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderVisible: true,
        wickVisible: true,
    });

    volumeSeries = chart.addHistogramSeries({
        priceFormat: { type: "volume" },
        color: "#4c78ff",
        priceScaleId: "",
        scaleMargins: {
            top: 0.8,
            bottom: 0,
        },
    });
}

// ----------------------------------------------------
// FETCH DATA
// ----------------------------------------------------
async function fetchData(symbol) {
    try {
        const response = await fetch(WORKER_URL + symbol);

        if (!response.ok) {
            throw new Error("HTTP Error");
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            return { ohlc: [], volume: [] };
        }

        // Convert to separate arrays
        const ohlc = data.map(row => ({
            time: row.time,
            open: row.open,
            high: row.high,
            low: row.low,
            close: row.close,
        }));

        const volume = data.map(row => ({
            time: row.time,
            value: row.volume ?? 0,
            color: row.close >= row.open ? "#22c55e" : "#ef4444",
        }));

        return { ohlc, volume };

    } catch (err) {
        showError("Failed to fetch data");
        return { ohlc: [], volume: [] };
    }
}

// ----------------------------------------------------
// SHOW / HIDE SPINNER
// ----------------------------------------------------
function showSpinner() {
    spinner.classList.remove("hidden");
}
function hideSpinner() {
    spinner.classList.add("hidden");
}
function showError(msg) {
    errorBox.innerText = msg;
    errorBox.style.display = "block";
}
function hideError() {
    errorBox.style.display = "none";
}

// ----------------------------------------------------
// LOAD CHART
// ----------------------------------------------------
async function loadChart(symbol) {
    console.log("Loading:", symbol);

    createChart();

    showSpinner();
    hideError();
    symbolTitle.innerText = symbol;

    // Highlight active item
    watchlistItems.forEach(li => li.classList.remove("active"));
    document.querySelector(`[data-symbol="${symbol}"]`)?.classList.add("active");

    const { ohlc, volume } = await fetchData(symbol);

    hideSpinner();

    if (ohlc.length === 0) {
        showError("No chart data returned.");
        return;
    }

    candleSeries.setData(ohlc);
    volumeSeries.setData(volume);

    chart.timeScale().fitContent();
}

// ----------------------------------------------------
// WATCHLIST CLICK
// ------------------------
