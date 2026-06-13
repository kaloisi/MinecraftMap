# Master Prompt: Cubiomes TypeScript Map Viewer

## Project goal
Build a React map viewer that renders an SVG biome map for a given Minecraft Java Edition 1.18+ world seed. Supports pan/zoom and optional structure overlays. No seed searching, no server — runs entirely in the browser.

Biome generation ported from [cubiomes](https://github.com/Cubitect/cubiomes) (MIT-licensed C library). Porting details live in `.claude/skills/port-cubiomes.md`.

---

## Call graph
```
setupGenerator(mc, flags)
  └─ applySeed(dim, seed)
       └─ genBiomes(generator, cache[], range)
            └─ biomeId → biomeColor() → SVG <rect fill="...">
```
Structure overlays:
```
getStructureConfig(type, mc)
  └─ getFeaturePos / getLargeStructurePos(config, seed, regX, regZ)  // Tier 1
       └─ isViableStructurePos(type, generator, x, z)                // Tier 2
```

---

## Structure overlay tiers

### Tier 1 — position arithmetic only (no generator needed)
Village, Monument, Mansion, Outpost, Desert Pyramid, Jungle Temple, Swamp Hut, Igloo, Shipwreck, Ocean Ruin, Ruined Portal, Ancient City, Trial Chambers, Trail Ruins, Nether Fortress, Bastion, Buried Treasure, Slime chunks.

All math stays below 2⁵³ — plain JS `number`, no BigInt.

### Tier 2 — position + biome check (reuses getBiomeAt)
Any Tier 1 structure filtered through `isViableStructurePos`. Uses the already-initialized Generator.

### Tier 3 — one-time computation (Web Worker)
- **Spawn** (`estimateSpawn`) — compute once on seed entry, cache.
- **Strongholds** (`initFirstStronghold` + `nextStronghold`) — compute nearest 3–5 in a Worker.

### Skip for v1
`isViableEndCityTerrain`, Desert Wells, Geodes, End Islands.

---

## Architecture decisions
- **MC 1.18+ only** — eliminates `layers.c/h` entirely.
- **BigInt confined to seed setup** — render loop and structure overlays use plain `number`.
- **SVG tiles** — `genBiomes` at `scale=16` (far zoom) or `scale=4` (close zoom) → `<rect>` grid, generated lazily per viewport.
- **Web Worker** — Tier 3 only. Biome tiles and Tier 1/2 structures run on main thread.
- **Wasm fallback** — Emscripten is an option if the SplineStack translation proves problematic.

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
```

---

## Implementation order
1. Port cubiomes → `src/CubiomesTS/` (use the `port-cubiomes` skill)
2. Build React tile renderer (`CubiomesMap` component)
3. Add Tier 1 structure overlay
4. Add Tier 2 viability filtering
5. Add Tier 3 in a Worker (spawn + strongholds)
