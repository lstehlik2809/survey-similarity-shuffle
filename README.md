# Which survey comment is the closest match?

A browser demo of how expanding one employee survey comment can change its nearest-neighbor ranking, inspired by [Fengming Liu’s preprint](https://arxiv.org/abs/2611.21519).

The fixture contains 48 fictional comments with eight manually assigned themes. Each comment has a short version and a version with an extra sentence of detail. The demo compares a short reference comment with the 47 other comments. Switching versions replaces one candidate and reranks the candidates by cosine similarity to the reference. The browser displays the top three.

For a check on real survey feedback, hand-code a sample from one question. Run your usual grouping workflow and compare which comments it groups with the hand-coded themes. Check for split themes and mixed-theme groups separately for short, long and mixed-length pairs.

## Run locally

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/` in a browser. The site runs on GitHub Pages as static HTML, CSS and JavaScript.

## Regenerate the data

```sh
python -m pip install sentence-transformers
python generate_data.py
```

The script uses [BAAI/bge-base-en-v1.5](https://huggingface.co/BAAI/bge-base-en-v1.5) to generate normalized embeddings locally. It writes both versions of the comments, the example IDs and the upper triangle of cosine similarities to `demo-data.json`. The browser ranks candidates using these scores.
