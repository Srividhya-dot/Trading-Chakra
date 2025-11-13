// ==============================
// CONFIG
// ==============================
const WORKER_URL = "https://black-tree-2e32.sriviadithi.workers.dev/?symbol=";

// ==============================
// CHART SETUP
// ==============================
let chart;
let candleSeries;

function initChart() {
    const chartContainer = document.getElementById("chart-container");

    chart = LightweightCharts.createChart(chartContainer, {
        width: chartContainer.clientWidth,
        height: chartContainer.clientHeight,
        layout: {
            background: { color: "#0d1b2a" },
            textColor: "#ffffff",
        },
        grid: {
            vertLines: { color: "#1b263b" },
            horzLines: { color: "#1b263b" },
        },
        timeScale: {
            borderColor: "#1b263b",
        },
    });

    candleSeries = chart.addCandlestickSeries();
}

// ==============================
// FETCH OHLC DATA FROM WORKER
// ==============================
async function fetchData(symbol) {
    const url = WORKER_URL + symbol;

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

        if (!response.ok) {
            console.error("Fetch failed:", response.status);
            return null;
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            console.error("Invalid data format:", data);
            return null;
        }

        return data;

    } catch (err) {
        console.error("Fetch error:", err);
        return null;
    }
}

// ==============================
// LOAD CHART
// ==============================
async function loadChart(symbol) {
    console.log("Loading:", symbol);

    const data = await fetchData(symbol);

    if (!data || data.length === 0) {
        console.warn("⚠ No chart data returned");
        return;
    }

    // Convert to Lightweight Charts format
    const formatted = data.map(c => ({
        time: Math.floor(c.time), // seconds timestamp
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close
    }));

    candleSeries.setData(formatted);
}

// ==============================
// WATCHLIST CLICK EVENTS
// ==============================
function initWatchlist() {
    const items = document.querySelectorAll("#watchlist li");

    items.forEach(item => {
        item.addEventListener("click", () => {
            const sym = item.dataset.symbol;
            loadChart(sym);
        });
    });
}

// ==============================
// RESIZE HANDLER
// ==============================
window.addEventListener("resize", () => {
    if (chart) {
        chart.applyOptions({
            width: chartContainer.clientWidth,
            height: chartContainer.clientHeight
        });
    }
});

// ==============================
// INITIALIZE APP
// ==============================
function init() {
    initChart();
    initWatchlist();

    // Load default chart
    loadChart("RELIANCE.NS");
}

init();
