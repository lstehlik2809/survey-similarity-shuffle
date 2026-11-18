# Survey similarity shuffle

A browser demo of a length-matched shuffle for employee survey comments, adapted from [Fengming Liu’s preprint](https://arxiv.org/abs/2611.21519).

Each of 48 fictional comments has a short and an expanded version. Each wave contains one version per comment. Both waves have six comments about each of eight themes. Wave 1 has eight expanded answers and Wave 2 has 40. The demo compares the second wave’s mean pairwise cosine with the first wave’s mean.

The shuffle reassigns comments between waves without replacement within five-word bands. It keeps the original number of comments from each band in each wave. The chart shows the observed difference and 400 shuffled differences. The middle 95% reports the 2.5th and 97.5th percentiles of those differences.

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

The script uses [BAAI/bge-base-en-v1.5](https://huggingface.co/BAAI/bge-base-en-v1.5) to generate normalized embeddings locally. It writes the comments and the upper triangle of their cosine similarities to `demo-data.json`. The browser uses those precomputed scores for the live shuffle.
