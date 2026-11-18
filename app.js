import { buildPairs, compareMatches, countThemeChanges, ratesAtCutoff, summarizePlacebo } from "./analysis.js";

const $ = selector => document.querySelector(selector);
const DISPLAY_COUNT = 3;
const SVG_NS = "http://www.w3.org/2000/svg";
const formatCount = new Intl.NumberFormat("en-US").format;
const formatScore = value => value.toFixed(3);
const toPercent = (part, whole) => Math.round((100 * part) / whole);

async function start() {
  const response = await fetch("./demo-data.json");
  if (!response.ok) throw new Error(`Demo data returned HTTP ${response.status}`);
  const data = await response.json();
  showExample(data);
  showPlacebo(data);
  showCutoff(data);
}

// Step 1: one lengthened candidate and the closest matches.
function showExample(data) {
  const { reference, editableId, results } = compareMatches(data);
  const controls = $("#version-controls");
  const matchList = $("#matches");
  const readout = $("#readout");
  const rowTemplate = $("#match-row");
  const rankOf = version => results[version].findIndex(comment => comment.commentId === editableId) + 1;
  const shortRank = rankOf("short");

  $("#reference-text").textContent = reference.text;
  $("#reference-theme").textContent = reference.theme;
  $("#match-count").textContent = `Top ${DISPLAY_COUNT} of ${results.short.length} by cosine similarity. Themes were coded by hand.`;

  function showMatches(version) {
    const ranked = results[version];
    const rows = ranked.slice(0, DISPLAY_COUNT).map(comment => {
      const row = rowTemplate.content.firstElementChild.cloneNode(true);
      row.querySelector(".match-text").textContent = comment.text;
      row.querySelector(".match-theme").textContent = comment.theme;
      row.querySelector(".match-score").textContent = formatScore(comment.score);
      row.classList.toggle("edited", comment.commentId === editableId);
      return row;
    });
    matchList.replaceChildren(...rows);

    const position = version === "long"
      ? `With its extra sentence, the priorities comment moves from #${shortRank} to #${rankOf("long")}.`
      : `The short priorities comment ranks #${shortRank}.`;
    readout.textContent = `${position} Theme of the closest match: ${ranked[0].theme}.`;
  }

  controls.addEventListener("change", event => showMatches(event.target.value));
  showMatches(controls.querySelector("input:checked").value);
  controls.disabled = false;

  const { changed, total } = countThemeChanges(data);
  const referenceCount = new Set(data.comments.map(comment => comment.commentId)).size;
  $("#rarity-note").textContent = `I picked this example because the theme of the closest match changes. `
    + `Across all ${referenceCount} references, lengthening one candidate changed that theme `
    + `in only ${changed} of ${formatCount(total)} possible single swaps.`;
}

// Step 2: Liu-style placebo with borrowed sentences.
function showPlacebo(data) {
  const summary = summarizePlacebo(data);
  const reference = compareMatches(data).reference;
  const chart = $("#placebo-chart");

  $("#legend-same").textContent = `From another ${summary.referenceTheme} comment, the reference’s theme`;
  $("#placebo-axis").textContent = `Cosine similarity with “${reference.text}”`;

  const relation = summary.mean < summary.shortScore ? "below" : "above";
  $("#placebo-readout").textContent = `Borrowed sentences averaged ${formatScore(summary.mean)}, `
    + `${relation} the short version’s ${formatScore(summary.shortScore)}. `
    + `Only ${summary.aboveLong} of ${summary.items.length} scored higher than the comment’s own sentence (${formatScore(summary.longScore)}). `
    + `Sentences from other ${summary.referenceTheme} comments averaged ${formatScore(summary.sameThemeMean)}, `
    + `against ${formatScore(summary.otherThemeMean)} for other themes. What the sentence said mattered more than its length.`;

  let lastWidth = 0;
  const draw = () => {
    const width = Math.round(chart.clientWidth);
    if (width === lastWidth || width === 0) return;
    lastWidth = width;
    drawStrip(chart, summary, width);
  };
  new ResizeObserver(draw).observe(chart);
  draw();
}

function svg(name, attributes = {}, text) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  if (text !== undefined) node.textContent = text;
  return node;
}

function drawStrip(container, summary, width) {
  const narrow = width < 480;
  const radius = narrow ? 4 : 5.5;
  const step = radius * 2 + 1.5;
  const margin = 12;
  const domain = [0.46, 0.74];
  const rowHeight = 17;
  const labelTop = 13;
  const plotTop = labelTop + rowHeight * 3;
  const x = value => margin + ((value - domain[0]) / (domain[1] - domain[0])) * (width - 2 * margin);

  // Stack dots upward wherever they would overlap, keeping each dot at its exact score.
  const levels = [];
  const dots = [...summary.items].sort((a, b) => a.score - b.score).map(item => {
    const cx = x(item.score);
    let level = 0;
    while (levels[level]?.some(other => Math.abs(other - cx) < step)) level += 1;
    (levels[level] ??= []).push(cx);
    return { item, cx, level };
  });
  const baseline = plotTop + levels.length * step + 8;
  const height = baseline + 26;

  const root = svg("svg", {
    width,
    height,
    viewBox: `0 0 ${width} ${height}`,
    role: "img",
    "aria-label": `Dot plot of ${summary.items.length} borrowed sentences. Their average score is ${formatScore(summary.mean)}, `
      + `the short version scores ${formatScore(summary.shortScore)} and the comment's own sentence scores ${formatScore(summary.longScore)}.`,
  });

  const axis = svg("g", { class: "axis" });
  axis.append(svg("line", { x1: margin, x2: width - margin, y1: baseline, y2: baseline }));
  for (const tick of [0.5, 0.55, 0.6, 0.65, 0.7]) {
    axis.append(svg("line", { x1: x(tick), x2: x(tick), y1: baseline, y2: baseline + 4 }));
    axis.append(svg("text", { x: x(tick), y: baseline + 17, "text-anchor": "middle" }, tick.toFixed(2)));
  }
  root.append(axis);

  const markers = [
    { value: summary.longScore, row: 0, anchor: "start", className: "marker own", label: "Own sentence" },
    { value: summary.shortScore, row: 1, anchor: "end", className: "marker short", label: narrow ? "Short" : "Short version" },
    { value: summary.mean, row: 2, anchor: "end", className: "marker average", label: narrow ? "Average" : "Borrowed average" },
  ];
  const labels = [];
  for (const marker of markers) {
    const lineX = x(marker.value);
    const y = labelTop + marker.row * rowHeight;
    root.append(svg("line", { class: marker.className, x1: lineX, x2: lineX, y1: y + 4, y2: baseline }));
    const label = svg("text", { class: "marker-label", y, "text-anchor": marker.anchor }, `${marker.label} ${formatScore(marker.value)}`);
    root.append(label);
    labels.push({ label, lineX, anchor: marker.anchor });
  }

  const dotGroup = svg("g");
  for (const { item, cx, level } of dots) {
    const dot = svg("circle", {
      class: item.sameTheme ? "dot same" : "dot different",
      cx,
      cy: baseline - radius - 3 - level * step,
      r: radius,
    });
    dot.append(svg("title", {}, `${formatScore(item.score)} · ${item.theme}: “${item.sentence}”`));
    dotGroup.append(dot);
  }
  root.append(dotGroup);
  container.replaceChildren(root);

  // Keep every marker label inside the chart, flipping it to the other side of its line if needed.
  for (const { label, lineX, anchor } of labels) {
    const labelWidth = label.getComputedTextLength();
    let side = anchor;
    if (side === "end" && lineX - 4 - labelWidth < margin) side = "start";
    if (side === "start" && lineX + 4 + labelWidth > width - margin) side = "end";
    label.setAttribute("text-anchor", side);
    label.setAttribute("x", side === "start" ? lineX + 4 : lineX - 4);
  }
}

// Step 3: share of same-theme and different-theme pairs above a cut-off.
function showCutoff(data) {
  const pairTypes = buildPairs(data);
  const slider = $("#cutoff");
  const output = $("#cutoff-value");
  const container = $("#rates");
  const readout = $("#cutoff-readout");
  const compared = { "long-long": "different", "short-long": "same" };

  const rows = new Map(pairTypes.map(type => {
    const row = document.createElement("div");
    row.className = "rate-row";
    row.innerHTML = `
      <p class="rate-title"></p>
      <div class="bar-line same"><span class="bar-name">Same theme</span><span class="track"><span class="bar"></span></span><span class="bar-value"></span></div>
      <div class="bar-line different"><span class="bar-name">Different themes</span><span class="track"><span class="bar"></span></span><span class="bar-value"></span></div>
      <p class="rate-note"></p>`;
    row.querySelector(".rate-title").textContent = type.label;
    if (compared[type.key]) row.querySelector(`.bar-line.${compared[type.key]}`).classList.add("compare");
    container.append(row);
    return [type.key, row];
  }));

  function render() {
    const cutoff = Number(slider.value);
    output.textContent = cutoff.toFixed(2);
    const rates = ratesAtCutoff(pairTypes, cutoff);
    for (const rate of rates) {
      const row = rows.get(rate.key);
      const same = toPercent(rate.sameGrouped, rate.sameTotal);
      const different = toPercent(rate.differentGrouped, rate.differentTotal);
      row.querySelector(".same .bar").style.width = `${same}%`;
      row.querySelector(".same .bar-value").textContent = `${same}%`;
      row.querySelector(".different .bar").style.width = `${different}%`;
      row.querySelector(".different .bar-value").textContent = `${different}%`;
      row.querySelector(".rate-note").textContent = rate.sharedAmongGrouped === null
        ? `None of the ${formatCount(rate.pairCount)} pairs are grouped.`
        : `${formatCount(rate.pairCount)} pairs. Of those grouped, ${Math.round(100 * rate.sharedAmongGrouped)}% share a theme.`;
    }

    const byKey = Object.fromEntries(rates.map(rate => [rate.key, rate]));
    const longDifferent = toPercent(byKey["long-long"].differentGrouped, byKey["long-long"].differentTotal);
    const mixedSame = toPercent(byKey["short-long"].sameGrouped, byKey["short-long"].sameTotal);
    const shortDifferent = toPercent(byKey["short-short"].differentGrouped, byKey["short-short"].differentTotal);
    const mixed = "a short and a long comment on the same theme";
    const comparison = longDifferent === mixedSame
      ? `the same rate as ${mixed}`
      : `${Math.abs(longDifferent - mixedSame)} points ${longDifferent < mixedSame ? "less" : "more"} often than ${mixed} (${mixedSame}%)`;
    readout.textContent = `At ${cutoff.toFixed(2)}, two long comments on different themes clear the bar ${longDifferent}% of the time, `
      + `${comparison}. For two short comments on different themes, it is ${shortDifferent}%.`;
  }

  slider.addEventListener("input", render);
  slider.disabled = false;
  render();
}

start().catch(error => {
  console.error(error);
  $("#readout").textContent = "The demo data could not be loaded. Reload the page to try again.";
});
