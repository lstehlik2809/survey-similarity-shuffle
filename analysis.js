export function averageCosine(indices, upperTriangle) {
  let total = 0;
  for (let i = 0; i < indices.length; i += 1) {
    for (let j = i + 1; j < indices.length; j += 1) {
      const first = Math.min(indices[i], indices[j]);
      const second = Math.max(indices[i], indices[j]);
      total += upperTriangle[first][second - first - 1];
    }
  }
  return total / (indices.length * (indices.length - 1) / 2);
}

export function createExperiment({ comments, similarities }) {
  const indicesByWave = [[], []];
  const bands = new Map();
  comments.forEach(({ wave, words }, index) => {
    indicesByWave[wave - 1].push(index);
    const key = Math.floor(words / 5);
    if (!bands.has(key)) bands.set(key, { indices: [], firstWaveCount: 0 });
    const band = bands.get(key);
    band.indices.push(index);
    band.firstWaveCount += Number(wave === 1);
  });

  const score = indices => averageCosine(indices, similarities);
  const scores = indicesByWave.map(score);
  const summary = indicesByWave.map((indices, index) => ({
    wave: index + 1,
    total: indices.length,
    long: indices.filter(item => comments[item].words >= 20).length,
    score: scores[index],
  }));

  return {
    summary,
    observed: scores[1] - scores[0],
    shuffle(repeats, random = Math.random) {
      return Array.from({ length: repeats }, () => {
        const firstWave = [];
        const secondWave = [];
        for (const { indices, firstWaveCount } of bands.values()) {
          const shuffled = indices.slice();
          for (let i = shuffled.length - 1; i > 0; i -= 1) {
            const j = Math.floor(random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          firstWave.push(...shuffled.slice(0, firstWaveCount));
          secondWave.push(...shuffled.slice(firstWaveCount));
        }
        return score(secondWave) - score(firstWave);
      });
    },
  };
}

export function quantile(sorted, probability) {
  const index = (sorted.length - 1) * probability;
  const floor = Math.floor(index);
  return sorted[floor] + (sorted[Math.ceil(index)] - sorted[floor]) * (index - floor);
}
