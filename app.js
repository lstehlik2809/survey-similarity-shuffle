import { compareMatches } from "./analysis.js";

const referenceText = document.querySelector("#reference-text");
const referenceTheme = document.querySelector("#reference-theme");
const controls = document.querySelector("#version-controls");
const matchHeading = document.querySelector("#match-count");
const matchList = document.querySelector("#matches");
const readout = document.querySelector("#readout");
const rowTemplate = document.querySelector("#match-row");
const DISPLAY_COUNT = 3;

async function start() {
  const response = await fetch("./demo-data.json");
  if (!response.ok) throw new Error(`Demo data returned HTTP ${response.status}`);
  const { reference, editableId, results } = compareMatches(await response.json());
  const shortRank = results.short.findIndex(comment => comment.commentId === editableId) + 1;

  referenceText.textContent = reference.text;
  referenceTheme.textContent = reference.theme;
  matchHeading.textContent = `Top ${DISPLAY_COUNT} of ${results.short.length} by cosine similarity. Themes were coded by hand.`;

  function showMatches(version) {
    const ranked = results[version];
    const rows = ranked.slice(0, DISPLAY_COUNT).map(comment => {
      const row = rowTemplate.content.firstElementChild.cloneNode(true);
      row.querySelector(".match-text").textContent = comment.text;
      row.querySelector(".match-theme").textContent = comment.theme;
      row.querySelector(".match-score").textContent = comment.score.toFixed(3);
      row.classList.toggle("edited", comment.commentId === editableId);
      return row;
    });
    matchList.replaceChildren(...rows);

    const best = ranked[0];
    const rank = ranked.findIndex(comment => comment.commentId === editableId) + 1;
    const position = version === "expanded"
      ? `With the extra sentence, the priorities comment moves from #${shortRank} to #${rank}.`
      : `The short priorities comment ranks #${rank}.`;
    readout.textContent = `${position} Theme of the closest match: ${best.theme}.`;
  }

  controls.addEventListener("change", event => showMatches(event.target.value));
  showMatches(controls.querySelector("input:checked").value);
  controls.disabled = false;
}

start().catch(error => {
  console.error(error);
  readout.textContent = "The demo data could not be loaded. Reload the page to try again.";
});
