# Minecraft Map Viewer

## Overview
React/TypeScript app that renders SVG biome maps for Minecraft Java Edition 1.18+ world seeds. Runs entirely in the browser. Biome generation logic ported from [cubiomes](https://github.com/Cubitect/cubiomes) (MIT-licensed C library).

## Tech Stack
- **Framework:** React 19 + TypeScript (Vite)
- **UI:** MUI (Material UI) with dark theme
- **Rendering:** SVG with pan/zoom
- **Deploy:** GitHub Pages via GitHub Actions

## Architecture
See `docs/MASTER_PROMPT.md` for the full design document covering:
- cubiomes porting strategy and file mapping
- BigInt vs number usage boundaries
- Structure overlay tiers (1–3)
- Recommended implementation order

## Build & Run
```bash
npm install
npm run dev      # dev server
npm run build    # production build
npm run lint     # eslint
```

## Key Design Decisions
- **MC 1.18+ only** — eliminates layers.c/h (~1,500 lines of complex layer stack)
- **BigInt confined to seed setup** — render loop and structure overlays use plain `number`
- **SVG tiles** — `genBiomes` → `Int32Array` → `<rect>` grid, generated lazily per viewport
- **Web Worker** — only for Tier 3 (spawn + strongholds); biome tiles and Tier 1/2 structures run on main thread
