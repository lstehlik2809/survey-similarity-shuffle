import { createExperiment, quantile } from "./analysis.js";

const RUNS = 400;
const chart = document.querySelector("#chart");
const button = document.querySelector("#shuffle");
const readout = document.querySelector("#readout");
const shuffleKey = document.querySelector("#shuffle-key");
const waveSummary = document.querySelector("#wave-summary");
const formatDelta = value => `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(3)}`;

function showWaves(summary) {
  for (const { wave, total, long, score } of summary) {
    const row = document.createElement("div");
    row.className = "wave";
    row.innerHTML = `
      <h3>Wave ${wave}</h3>
      <span class="score" aria-label="Mean cosine similarity ${score.toFixed(3)}">${score.toFixed(3)}</span>
      <span class="mix-label">${long} of ${total} answers have 20+ words</span>
      <div class="mix" aria-hidden="true"><div class="long"></div></div>
    `;
    row.querySelector(".long").style.width = `${long / total * 100}%`;
    waveSummary.append(row);
  }
}

function drawChart(observed, simulated) {
  const { width, height } = chart.getBoundingClientRect();
  if (!width || !height) return;

  const pixelRatio = window.devicePixelRatio || 1;
  chart.width = Math.round(width * pixelRatio);
  chart.height = Math.round(height * pixelRatio);

  const context = chart.getContext("2d");
  context.scale(pixelRatio, pixelRatio);
  context.font = '12px "Segoe UI", system-ui, sans-serif';
  const left = 39;
  const right = width - 20;
  const top = 30;
  const bottom = height - 25;
  const binSize = 0.0025;
  const tickSize = 0.02;
  const min = Math.floor(Math.min(0, observed, ...simulated) / tickSize) * tickSize;
  const max = Math.ceil(Math.max(0.075, observed + binSize, ...simulated) / tickSize) * tickSize;
  const bins = new Array(Math.round((max - min) / binSize)).fill(0);
  for (const value of simulated) {
    const bin = Math.min(bins.length - 1, Math.floor((value - min) / binSize));
    bins[bin] += 1;
  }
  const x = value => left + (value - min) / (max - min) * (right - left);
  const maxCount = Math.max(10, Math.ceil(Math.max(...bins) / 10) * 10);
  const y = count => bottom - count / maxCount * (bottom - top);
  const panel = "#fffefa";
  const text = "#51645c";

  context.fillStyle = text;
  if (simulated.length) {
    context.textAlign = "left";
    context.fillText("Runs per bin", 4, 16);
    for (const count of [0, maxCount / 2, maxCount]) {
      context.fillStyle = "#d8dfd7";
      context.fillRect(left, y(count), right - left, 1);
      context.fillStyle = text;
      context.textAlign = "right";
      context.fillText(count, left - 7, y(count) + 4);
    }
    context.fillStyle = "#39756b";
    for (let i = 0; i < bins.length; i += 1) {
      const first = x(min + i * binSize);
      const last = x(min + (i + 1) * binSize);
      context.fillRect(first + 0.6, y(bins[i]), last - first - 1.2, bottom - y(bins[i]));
    }
  }

  context.fillStyle = "#97a697";
  context.fillRect(left, bottom, right - left, 1);
  const tickCount = Math.round((max - min) / tickSize);
  const tickStride = Math.max(1, Math.ceil(tickCount / (width < 380 ? 4 : 6)));
  context.textAlign = "center";
  for (let i = 0; i <= tickCount; i += tickStride) {
    const value = min + i * tickSize;
    context.fillStyle = "#97a697";
    context.fillRect(x(value), bottom, 1, 4);
    context.fillStyle = text;
    context.fillText(value.toFixed(2), x(value), bottom + 19);
  }

  const marker = x(observed);
  context.fillStyle = panel;
  context.fillRect(marker - 2.5, top - 3, 6, bottom - top + 3);
  context.fillStyle = "#aa3c23";
  context.fillRect(marker - 1, top - 3, 3, bottom - top + 3);
  context.font = '650 12px "Segoe UI", system-ui, sans-serif';
  const label = formatDelta(observed);
  const labelX = Math.max(left + 23, Math.min(right - 23, marker));
  context.fillText(label, labelX, top - 10);
}

async function start() {
  const response = await fetch("./demo-data.json");
  if (!response.ok) throw new Error(`Demo data returned HTTP ${response.status}`);
  const experiment = createExperiment(await response.json());
  const observed = formatDelta(experiment.observed);
  let simulated = [];
  showWaves(experiment.summary);
  const render = () => drawChart(experiment.observed, simulated);
  new ResizeObserver(render).observe(chart);
  render();
  chart.setAttribute("aria-label", `Observed change in mean cosine similarity: ${observed}.`);
  readout.textContent = `The observed change is ${observed}. Run the shuffle to see how it compares.`;

  button.addEventListener("click", () => {
    simulated = experiment.shuffle(RUNS).sort((a, b) => a - b);
    const lower = quantile(simulated, 0.025);
    const upper = quantile(simulated, 0.975);
    const range = `${formatDelta(lower)} to ${formatDelta(upper)}`;
    const inside = experiment.observed >= lower && experiment.observed <= upper;
    shuffleKey.hidden = false;
    button.textContent = "Rerun the shuffle";
    render();
    chart.setAttribute("aria-label", `Histogram of ${RUNS} shuffled changes. The middle 95% run from ${range}. The observed change is ${observed}.`);
    const interpretation = inside
      ? "The observed change falls within that range. Keeping the mix of answer lengths was enough to reproduce a change this large."
      : "The observed change falls outside that range on this run. Compare answers of similar length and check which themes changed.";
    readout.textContent = `The middle 95% of shuffled changes ran from ${range}. ${interpretation}`;
  });
  button.disabled = false;
}

start().catch(error => {
  console.error(error);
  readout.textContent = "The demo data could not be loaded. Reload the page to try again.";
});
