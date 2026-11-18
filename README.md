# Does a longer answer change what counts as similar?

A browser demo of how answer length affects cosine similarity between employee survey comments, inspired by [Fengming Liu’s preprint](https://arxiv.org/abs/2611.21519).

The fixture contains 48 fictional comments with eight manually assigned themes. Each comment has a short version and a long version with one extra sentence. The page walks through three steps:

1. **One longer comment.** A short reference comment is compared with the 47 other comments. Lengthening one candidate moves it from third to first and changes the theme of the closest match. Across all 2,256 single swaps (48 references × 47 candidates), this happens 38 times.
2. **Was it the length?** Following Liu’s length-only placebo, the short candidate gets each of the other 46 extra sentences in place of its own. The borrowed sentences score lower on average than the short version, so the content of the sentence drives the change.
3. **Where length shows up.** A slider sets a cosine cut-off. For two short comments, two long comments, and a short and a long comment, the page shows the share of same-theme and different-theme pairs above the cut-off. At 0.60, two long comments on different themes clear it as often as a short and a long comment on the same theme.

For a check on real survey feedback, hand-code a sample from one question. Cut long answers to their first sentence and see whether the closest match changes theme. Then run your usual grouping workflow and compare it with the hand-coded themes separately for short, long and mixed-length pairs.

One person wrote all the long versions in a similar style, so treat the numbers as an illustration rather than an estimate for real survey data.

## Run locally

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/` in a browser. The site runs on GitHub Pages as static HTML, CSS and JavaScript. `analysis.js` holds the calculations and has no browser dependencies, so it can also be imported in Node.

## Regenerate the data

```sh
python -m pip install sentence-transformers
python generate_data.py
```

The script uses [BAAI/bge-base-en-v1.5](https://huggingface.co/BAAI/bge-base-en-v1.5) to generate normalized embeddings locally. It writes to `demo-data.json`:

- both versions of every comment and the example IDs,
- the upper triangle of cosine similarities between all 96 texts,
- the placebo scores: the short candidate with each borrowed sentence, scored against the reference.

The browser computes the rankings, swap counts and cut-off rates from these scores.
