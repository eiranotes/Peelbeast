# Legacy builds

## `v0.8/index.html`

The entire v0.8 game: a single 661-line HTML file containing markup, 235 lines of CSS,
the atlas coordinate table, all game data, the rules engine, and every renderer.

It is kept for reference only. It is not built, linked, tested or served, and the
current game shares no code with it.

Why it was replaced rather than extended:
[`../docs/analysis/CURRENT_REPOSITORY_AUDIT.md`](../docs/analysis/CURRENT_REPOSITORY_AUDIT.md)

To run it: open `v0.8/index.html` directly in a browser. Note that its image atlas moved to
`assets/source/reference/legacy-atlas-v0.8.webp`, so its sprites will not resolve —
which is itself a demonstration of the coupling the rewrite removed.
