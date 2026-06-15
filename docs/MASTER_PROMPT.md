# Master Prompt: Cubiomes TypeScript Map Viewer

## Project goal
Build a React map viewer that renders an SVG biome map for a given Minecraft Java Edition 1.18+ world seed. Supports pan/zoom with a unified Overworld/Nether map and structure overlays from both dimensions. No seed searching, no server — runs entirely in the browser.

Biome generation ported from [cubiomes](https://github.com/Cubitect/cubiomes) (MIT-licensed C library). Porting details live in `.claude/skills/port-cubiomes.md`.

---

## Call graph
```
setupGenerator(mc, flags)
  └─ applySeed(dim, seed)
       └─ genBiomes(generator, cache[], range)
            └─ biomeId → biomeColor() → SVG <rect fill="...">
```
Structure overlays (both dimensions rendered simultaneously):
```
getStructureConfig(type, mc)
  └─ getFeaturePos / getLargeStructurePos(config, seed, regX, regZ)  // Tier 1
       └─ isViableFeatureBiome(mc, type, biomeId)                    // Tier 2
```

---

## Unified map model

The Overworld and Nether are a single logical map with switchable biome "skins," similar to Google Maps' Map/Satellite toggle. The map always uses Overworld coordinates:

- **Dimension toggle** (`DimensionToggle.tsx`): Google Maps-style overlay in the bottom-right corner switches the biome rendering between Overworld and Nether
- **Coordinate space**: All coordinates (toolbar X/Z inputs, footer, saved state) are in Overworld block coordinates
- **Nether biome rendering**: Nether biomes render at 8:1 scale (`coordScale = 8`) so they fill the same visual area as the Overworld
- **Cross-dimension structures**: Structure markers from both Overworld and Nether are always visible regardless of active skin. Nether structure positions are converted to Overworld-equivalent coordinates (× 8)
- **Location drawer**: Single-click opens a left-side drawer showing both Overworld and Nether block/chunk coordinates for the clicked location, the biome under the cursor, slime chunk status, and nearby structures from both dimensions

---

## Structure overlay tiers

### Tier 1 — position arithmetic only (no generator needed)
Village, Monument, Mansion, Outpost, Desert Pyramid, Jungle Temple, Swamp Hut, Igloo, Shipwreck, Ocean Ruin, Ruined Portal, Ancient City, Trial Chambers, Trail Ruins, Nether Fortress, Bastion, Buried Treasure, Slime chunks.

All math stays below 2⁵³ — plain JS `number`, no BigInt.

### Tier 2 — position + biome check (reuses getBiomeAt)
Any Tier 1 structure filtered through `isViableFeatureBiome`. Uses per-dimension generators created on-demand for biome viability checks.

### Tier 3 — one-time computation (Web Worker)
- **Spawn** (`estimateSpawn`) — compute once on seed entry, cache.
- **Strongholds** (`initFirstStronghold` + `nextStronghold`) — compute nearest 3–5 in a Worker.

### Skip for v1
`isViableEndCityTerrain`, End Islands.

---

## Architecture decisions
- **MC 1.18+ only** — eliminates `layers.c/h` entirely.
- **BigInt confined to seed setup** — render loop and structure overlays use plain `number`.
- **SVG tiles** — `genBiomes` at `scale=4` → `<rect>` grid, generated lazily per viewport with rect merging to minimize DOM nodes.
- **Unified Overworld/Nether map** — single coordinate space (Overworld blocks), Nether skin stretches biomes 8× to fill the same area. Structures from both dimensions are always rendered.
- **Per-seed persistence** — viewport center, zoom, MC version, enabled structures, and map name stored in localStorage via `MapDataFile`/`MapDataFiles`.
- **Web Worker** — Tier 3 only. Biome tiles and Tier 1/2 structures run on main thread.

---

## Key constants
```typescript
// Java LCG (seed init only — BigInt)
const LCG_MULTIPLIER = 0x5deece66dn;
const LCG_ADDEND     = 0xbn;

// Structure region steps (plain number, < 2^53)
const REGION_STEP_X = 341873128712;
const REGION_STEP_Z = 132897987541;

// Xoroshiro128 init (seed init only — BigInt)
const XL = 0x9e3779b97f4a7c15n;
const XH = 0x6a09e667f3bcc909n;
const XA = 0xbf58476d1ce4e5b9n;
const XB = 0x94d049bb133111ebn;

// Coordinate scaling
const BIOME_SCALE = 4;   // 1 biome unit = 4 blocks
const NETHER_RATIO = 8;  // Nether is 8× smaller than Overworld
const TILE_SIZE = 16;    // 16×16 biome samples per tile
```

---

## Implementation status
1. ✅ Port cubiomes → `src/CubiomesTS/` (Overworld, Nether, End biome generation)
2. ✅ Build React tile renderer (`CubiomesMap` component with async batched loading)
3. ✅ Add Tier 1 structure overlay (all structure types)
4. ✅ Add Tier 2 viability filtering (`isViableFeatureBiome`)
5. ✅ Unified Overworld/Nether map with dimension toggle
6. ✅ Cross-dimension structure rendering
7. ✅ Location inspector drawer with dual-dimension coordinates
8. ⬜ Add Tier 3 in a Worker (spawn + strongholds)
