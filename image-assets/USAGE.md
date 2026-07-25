# Usage

1. Reference assets by the stable `id` in `catalog.json`.
2. Load the mapped WebP file from `generated-v1/chroma/`.
3. Remove the solid `#FF00FF` background at import time or in the rendering pipeline.
4. To replace artwork, keep the ID and filename mapping stable or update only the catalog mapping.
5. Keep large scene objects as individual images; generate atlases only as build outputs.
