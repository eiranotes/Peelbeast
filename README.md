# PEELBEAST

Asset-driven turn-based roguelike vertical-slice prototype.

## Run

Open `index.html` in a browser. The build is self-contained except for the optimized image atlas at `assets/atlas.webp`.

## v0.8

- Part assembly with visible raster-image layers
- Turn-based combat and enemy intent queue
- Peel / reattach mechanics that disable and restore part effects
- Combat, event, shop, elite, and boss nodes
- Scrap economy and HP / Glue carry-over
- Two route structures and multi-phase boss combat
- Full development documents under `docs/`

## Repository structure

- `index.html` — playable browser prototype
- `assets/atlas.webp` — optimized raster asset atlas
- `docs/` — master development document, version history, combat/feel specification, and roadmap
- `.github/workflows/reconstruct.yml` — upload assembly workflow retained for build traceability
