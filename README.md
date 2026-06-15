# Minecraft Map Viewer

**Deployed at https://kaloisi.github.io/MinecraftMap/**

An interactive biome map viewer for Minecraft Java Edition 1.18+ world seeds. Runs entirely in the browser — no server required.

## Features

- **Biome map rendering** — SVG-based map with pan/zoom, lazily generated biome tiles
- **Unified Overworld/Nether map** — single coordinate space with a Google Maps-style skin toggle to switch between Overworld and Nether biome rendering
- **Structure overlays** — markers for 20+ structure types (Villages, Temples, Fortresses, Bastions, etc.) from both Overworld and Nether, always visible regardless of active skin
- **Location inspector** — click any point to open a drawer with Overworld and Nether coordinates, biome info, slime chunk status, and nearby structures from both dimensions
- **Per-seed persistence** — viewport position, zoom, MC version, enabled structures, and map name saved to localStorage
- **Multi-seed support** — switch between seeds via the Maps menu with recent map history

## Tech Stack

- **Framework:** React 19 + TypeScript (Vite)
- **UI:** MUI (Material UI) with dark theme
- **Biome generation:** TypeScript port of [cubiomes](https://github.com/Cubitect/cubiomes) (MIT-licensed)
- **Rendering:** SVG with optimized rect merging
- **Deploy:** GitHub Pages via GitHub Actions

## Getting Started

```bash
npm install
npm run dev      # dev server at localhost:5173
npm run build    # production build
npm run lint     # eslint
```

## Supported Minecraft Versions

MC 1.18, 1.19, 1.20, 1.21 — selectable via Maps > Properties.

## Documentation

- [`CLAUDE.md`](CLAUDE.md) — project instructions and architecture overview
- [`docs/MASTER_PROMPT.md`](docs/MASTER_PROMPT.md) — full design document
- [`src/CubiomesTS/README.md`](src/CubiomesTS/README.md) — cubiomes API reference
