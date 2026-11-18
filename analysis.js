// Pure analysis functions. The page imports them, and so can a Node check.

export const PAIR_TYPES = [
  { key: "short-short", label: "Two short comments", versions: ["short", "short"] },
  { key: "long-long", label: "Two long comments", versions: ["long", "long"] },
  { key: "short-long", label: "A short and a long comment", versions: ["short", "long"] },
];

export function indexData({ comments, similarities }) {
  const position = new Map(comments.map((comment, index) => [`${comment.commentId}:${comment.version}`, index]));
  const ids = [...new Set(comments.map(comment => comment.commentId))];
  const themes = new Map(comments.map(comment => [comment.commentId, comment.theme]));

  function comment(id, version) {
    return comments[position.get(`${id}:${version}`)];
  }

  // `similarities` holds the upper triangle of the cosine matrix, without the diagonal.
  function similarity(idA, versionA, idB, versionB) {
    const a = position.get(`${idA}:${versionA}`);
    const b = position.get(`${idB}:${versionB}`);
    const first = Math.min(a, b);
    const second = Math.max(a, b);
    return similarities[first][second - first - 1];
  }

  return { ids, comment, similarity, theme: id => themes.get(id) };
}

// Candidates for a short reference, all short except the one lengthened comment.
export function rankCandidates(index, referenceId, lengthenedId = null) {
  return index.ids
    .filter(id => id !== referenceId)
    .map(id => {
      const version = id === lengthenedId ? "long" : "short";
      return { ...index.comment(id, version), score: index.similarity(referenceId, "short", id, version) };
    })
    .sort((a, b) => b.score - a.score);
}

export function compareMatches(data) {
  const index = indexData(data);
  const { referenceId, editableId } = data.example;
  return {
    reference: index.comment(referenceId, "short"),
    editableId,
    results: {
      short: rankCandidates(index, referenceId),
      long: rankCandidates(index, referenceId, editableId),
    },
  };
}

// Every comment serves as the reference once, and each other comment is lengthened alone.
export function countThemeChanges(data) {
  const index = indexData(data);
  let total = 0;
  let changed = 0;
  for (const referenceId of index.ids) {
    const baseTheme = rankCandidates(index, referenceId)[0].theme;
    for (const lengthenedId of index.ids) {
      if (lengthenedId === referenceId) continue;
      total += 1;
      if (rankCandidates(index, referenceId, lengthenedId)[0].theme !== baseTheme) changed += 1;
    }
  }
  return { changed, total };
}

const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;

export function summarizePlacebo(data) {
  const index = indexData(data);
  const { referenceId, editableId } = data.example;
  const referenceTheme = index.theme(referenceId);
  const items = data.placebo.map(item => ({ ...item, sameTheme: item.theme === referenceTheme }));
  const longScore = index.similarity(referenceId, "short", editableId, "long");
  return {
    items,
    referenceTheme,
    shortScore: index.similarity(referenceId, "short", editableId, "short"),
    longScore,
    mean: mean(items.map(item => item.score)),
    sameThemeMean: mean(items.filter(item => item.sameTheme).map(item => item.score)),
    otherThemeMean: mean(items.filter(item => !item.sameTheme).map(item => item.score)),
    sameThemeCount: items.filter(item => item.sameTheme).length,
    aboveLong: items.filter(item => item.score > longScore).length,
    top: items.reduce((best, item) => (item.score > best.score ? item : best)),
  };
}

// Pairs of different comments. Same-length pairs are unordered, mixed pairs are ordered,
// and a comment is never paired with its own other version.
export function buildPairs(data) {
  const index = indexData(data);
  return PAIR_TYPES.map(type => {
    const [versionA, versionB] = type.versions;
    const pairs = [];
    index.ids.forEach((a, i) => {
      index.ids.forEach((b, j) => {
        if (a === b || (versionA === versionB && j <= i)) return;
        pairs.push({
          score: index.similarity(a, versionA, b, versionB),
          sameTheme: index.theme(a) === index.theme(b),
        });
      });
    });
    return { ...type, pairs };
  });
}

export function ratesAtCutoff(pairTypes, cutoff) {
  return pairTypes.map(({ pairs, ...type }) => {
    const same = pairs.filter(pair => pair.sameTheme);
    const different = pairs.filter(pair => !pair.sameTheme);
    const sameGrouped = same.filter(pair => pair.score > cutoff).length;
    const differentGrouped = different.filter(pair => pair.score > cutoff).length;
    const grouped = sameGrouped + differentGrouped;
    return {
      ...type,
      pairCount: pairs.length,
      sameGrouped,
      sameTotal: same.length,
      differentGrouped,
      differentTotal: different.length,
      sharedAmongGrouped: grouped ? sameGrouped / grouped : null,
    };
  });
}
