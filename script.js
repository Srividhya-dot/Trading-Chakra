// -----------------------------
// CONFIG
// -----------------------------
const WORKER_URL = "https://black-tree-2e32.sriviadithi.workers.dev/?symbol=";

// HTML elements
const chartContainer = document.getElementById("chart-container");
const watchlistItems = document.querySelectorAll("#watchlist li");

// Global chart + series reference
let chart = null;
let candleSeries = null;

// -----------------------------
// CREATE CHART (only once)
// -----------------------------
function createChart() {
    if (chart) return chart; // Already created

    chart = LightweightCharts.createChart(chartContainer, {
        width: chartContainer.clientWidth,
        height: chartContainer.clientHeight,
        layout: {
            backgroundColor: "#0e1624",
            textColor: "#d1d4dc"
        },
        grid: {
            vertLines: { color: "#253248" },
            horzLines: { color: "#253248" }
        },
        timeScale: { borderColor: "#485c7b" },
        rightPriceScale: { borderColor: "#485c7b" }
    });

    candleSeries = chart.addCandlestickSeries({
        upColor: "#26a69a",
        downColor: "#ef5350",
        borderVisible: true,
        wickVisible: true,
    });

    return chart;
}

// -----------------------------
// FETCH OHLC DATA FROM WORKER
// -----------------------------
async function fetchData(symbol) {
    try {
        const response = await fetch(WORKER_URL + symbol);
        const data = await response.json();

        if (!Array.isArray(data)) {
            console.warn("⚠ Worker returned empty or invalid data");
            return [];
        }

        return data;
    } catch (e) {
        console.error("Fetch Error:", e);
        return [];
    }
}

// -----------------------------
// LOAD CHART DATA
// -----------------------------
async function loadChart(symbol) {
    console.log("Loading:", symbol);

    createChart(); // Ensure chart exists

    const ohlc = await fetchData(symbol);

    if (ohlc.length === 0) {
        console.warn("⚠ No chart data returned");
        return;
    }

    candleSeries.setData(ohlc);
}

// -----------------------------
// WATCHLIST CLICK EVENT
// -----------------------------
watchlistItems.forEach(item => {
    item.addEventListener("click", () => {
        const symbol = item.dataset.symbol;
        loadChart(symbol);
    });
});

// Load default
loadChart("RELIANCE.NS");
