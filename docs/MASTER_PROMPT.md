# Master Prompt: Cubiomes TypeScript Map Viewer
## Project goal
Build a React map viewer that renders an SVG biome map for a given Minecraft Java Edition world seed. The viewer supports pan and zoom. It also shows an optional overlay of structure locations (portals, fortresses, swamp huts, spawn point, strongholds, etc.). No seed searching, no raw image output, no server — runs entirely in the browser.
The biome generation logic is ported from **[cubiomes](https://github.com/Cubitect/cubiomes)** (MIT-licensed C library, ~5,000 lines). This document captures every decision made during the feasibility study so future sessions can skip straight to implementation.
---
## Source library structure
| File(s) | Role |
|---|---|
| `rng.h` | Java RNG LCG, Xoroshiro128, seed helpers, lerp math |
| `noise.c/h` | PerlinNoise, OctaveNoise, DoublePerlinNoise — pure doubles |
| `biomenoise.c/h` | BiomeNoise (1.18+ spline system), BiomeNoiseBeta, Range struct |
| `generator.c/h` | setupGenerator, applySeed, genBiomes, getBiomeAt |
| `layers.c/h` | Old layer stack for MC ≤ 1.17 (skip for 1.18+-only target) |
| `finders.c/h` | Structure position math + biome viability checks |
| `quadbase.c/h` | Quad-structure seed search — **not needed, skip entirely** |
| `util.c/h` | initBiomeColors (keep), file I/O + PPM output (skip) |
---
## What the map viewer actually calls
```
setupGenerator(mc, flags)
  └─ applySeed(dim, seed)
       └─ genBiomes(generator, cache[], range)   // returns int[] biome IDs
            └─ biomeId → initBiomeColors lookup → SVG <rect fill="...">
```
For structure overlays add:
```
getStructureConfig(type, mc)
  └─ getFeaturePos / getLargeStructurePos(config, seed, regX, regZ)  // Tier 1
       └─ isViableStructurePos(type, generator, x, z)                // Tier 2 optional
```
---
## Porting problems — scoped to the map viewer
### Dropped entirely (not on the call path)
| Problem | Files eliminated |
|---|---|
| `pthreads` — `searchAll48` parallel seed search | `quadbase.c/h` — entire file |
| Blocking loops + `volatile stop` flag | `checkForBiomes`, `locateBiome`, `monteCarloBiomes`, `getBiomeCenters` in `finders.c` |
| `Piece*` linked lists | `getEndCityPieces`, `getFortressPieces` in `finders.c` |
| File I/O (`loadSavedSeeds`, `savePPM`) | `util.c` (except `initBiomeColors`) |
### Shrunk to one-time seed initialisation only
**64-bit integer arithmetic.** Seeds are `uint64_t` throughout. For MC 1.18+ the biome *render* path uses Xoroshiro128 (explicit unsigned 64-bit masks) then switches to `double` noise. BigInt is only needed during `setBiomeSeed` / `xSetSeed` — called once per seed change, not per tile. The render loop itself is pure `number` (doubles and int32 biome IDs).
**Signed integer overflow (`-fwrapv`).** The LCG functions in `rng.h` (`next`, `nextInt`, `mcStepSeed`) depend on two's-complement wrap. These are called only during generator setup, not during `genBiomes`. The 1.18+ Xoroshiro path avoids LCG entirely and has clean overflow semantics with explicit masks.
**Mutable `uint64_t *seed` pointer pattern.** All `next()`-family functions mutate a seed in-place. This is only exercised during setup (`perlinInit`, `setLayerSeed`). Once the `Generator` struct is built, `genBiomes` takes a `const Generator*` and never mutates seed state. Fix: one `{ seed: bigint }` box threaded through init functions only.
### Remains — but tractable
| Remaining issue | What to do |
|---|---|
| `allocCache` / `int*` biome buffer | `new Int32Array(sx * sz)` — one line |
| SplineStack (42 Spline + 151 FixSpline objects, pointer-linked) | Convert to fixed-size array of plain TS objects with index references. The hardest surviving piece but self-contained in `biomenoise.c` |
| Double Perlin + Octave Noise | Pure `number` arithmetic. Direct 1:1 translation. `d[256]` permutation table → `Uint8Array` |
---
## Files to port (1.18+ target only)
| File | TS effort | Notes |
|---|---|---|
| `rng.h` | Low–medium | ~30 functions. BigInt only for 15 LCG/seed-setup functions; Xoroshiro uses masked uint64. |
| `noise.c` | Low | Pure doubles. Most mechanical translation in the project. |
| `biomenoise.c` | Medium–high | SplineStack + BiomeTree + climateToBiome. Hardest piece; self-contained. |
| `generator.c` | Low | Thin orchestration over the above. |
| `util.c` (colours only) | Trivial | `initBiomeColors` → `const BIOME_COLORS: Record<number, string>` |
**Skip entirely:** `layers.c/h`, `quadbase.c/h`, `finders.c` (most of it), `util.c` file I/O.
Estimated TS output: **~1,500–2,000 lines** for the 1.18+ biome renderer.
---
## Structure overlay — portability by tier
### Tier 1 — pure position arithmetic, no generator needed (add for free)
- Village, Monument, Mansion, Outpost, Desert Pyramid, Jungle Temple, Swamp Hut, Igloo, Shipwreck, Ocean Ruin, Ruined Portal, Ancient City, Trial Chambers, Trail Ruins
- Nether Fortress + Bastion (1.18+)
- Slime chunks (`isSlimeChunk` — 8-line inline)
- Buried Treasure
**Key fact:** `getFeaturePos` / `getLargeStructurePos` use only the lower 48 bits of the world seed. All intermediate arithmetic stays below 2⁵³, so **plain JS `number` works — no BigInt needed** for the overlay layer at all.
Implementation: iterate region grid covering the viewport, call once per region, plot SVG icon. ~150 lines of TS. Can be added alongside the map renderer at negligible extra cost.
### Tier 2 — position + single biome check (reuses already-ported getBiomeAt)
- Any Tier 1 structure passed through `isViableStructurePos`
Requires the `Generator` to be initialized (already done for the map). If the structure is inside the visible viewport, look up the biome from the cached tile array for free. Zero additional porting cost.
### Tier 3 — one-time seed-load computation (run in a Web Worker)
**World spawn** (`estimateSpawn`): calls `locateBiome` internally over a bounded ~200-block radius. Fast (ms range), but should not block the main thread. Compute once on seed entry, cache result.
**Strongholds** (`initFirstStronghold` + `nextStronghold`): first stronghold is fast (pure trig + LCG). Each subsequent one calls `locateBiome`. For a map overlay, compute the nearest 3–5 on seed load in a Worker; computing all 128 is optional and slower.
### Skip for v1
- `isViableEndCityTerrain` — requires `SurfaceNoise` (60 Perlin octaves). Show attempt positions only.
- Desert Wells, Geodes, End Islands — per-chunk decorator features; too dense at typical zoom.
---
## Architecture decisions
**MC version target:** 1.18+ recommended. Eliminates `layers.c/h` entirely (~1,500 lines, complex 64-bit LCG layer stack). If pre-1.18 support is needed, that scope reopens significantly.
**BigInt usage:** Confined to `rng.h` setup functions only. The map render loop and the entire structure overlay layer use plain `number`.
**Wasm alternative:** Compiling with Emscripten is still zero-risk-on-correctness and lower total effort than a native port. Worth considering if the SplineStack translation proves problematic. The COOP/COEP headers required for `pthreads` are only needed if `searchAll48` is compiled in — which it isn't for this scope.
**Web Worker:** Needed only for Tier 3 (spawn + strongholds). Everything else — biome tile generation, all Tier 1/2 structure positions — is fast enough to run synchronously or in a `requestIdleCallback` per tile.
**Tile generation strategy:** `genBiomes` with `scale=16` (chunk scale) for zoom levels showing large areas; `scale=4` (biome scale) for closer zoom. Each SVG tile is a fixed-size grid of `<rect>` elements corresponding to one biome cell. Tiles are generated lazily as the viewport pans.
---
## Key constants (needed for structure position math)
```typescript
// Java LCG — used in getFeaturePos / seed setup
const LCG_MULTIPLIER = 0x5deece66dn;   // BigInt (seed init only)
const LCG_ADDEND     = 0xbn;
// Region seed steps — used in structure position, stay in 48-bit range
// Safe to use as JS number (< 2^53)
const REGION_STEP_X = 341873128712;
const REGION_STEP_Z = 132897987541;
// Xoroshiro128 init constants (seed init only — BigInt)
const XL = 0x9e3779b97f4a7c15n;
const XH = 0x6a09e667f3bcc909n;
const XA = 0xbf58476d1ce4e5b9n;
const XB = 0x94d049bb133111ebn;
```
---
## Recommended implementation order
1. Port `rng.h` — Java RNG + Xoroshiro128 + seed helpers. Write tests against known seeds.
2. Port `noise.c` — PerlinNoise, OctaveNoise, DoublePerlinNoise. Verify against cubiomes test vectors.
3. Port `biomenoise.c` — SplineStack first (static data structure), then `sampleBiomeNoise` + `climateToBiome`.
4. Port `generator.c` — wire up `setupGenerator`, `applySeed`, `genBiomeNoiseScaled`.
5. Port `initBiomeColors` from `util.c` — static color table.
6. Build React tile renderer — `genBiomes` → `Int32Array` → SVG `<rect>` grid with pan/zoom.
7. Add Tier 1 structure overlay — `getStructureConfig` + `getFeaturePos` / `getLargeStructurePos`.
8. Add Tier 2 viability filtering — `isViableStructurePos` using cached biome data.
9. Add Tier 3 in a Worker — `estimateSpawn`, `initFirstStronghold` + first N `nextStronghold` calls.
