# CubiomesTS API

TypeScript port of [cubiomes](https://github.com/Cubitect/cubiomes) for Minecraft Java Edition 1.18+ biome generation. Runs entirely in the browser.

## Upstream API Reference

This section documents **every public function, struct, and enum** in the original cubiomes C library, organized by source file. Items marked **[PORTED]** have been ported to CubiomesTS. Unmarked items are available upstream but not yet ported.

---

### `rng.h` — RNG Primitives

#### Types

| C Type | Status | CubiomesTS Equivalent |
|--------|--------|-----------------------|
| `Xoroshiro { lo, hi }` | **[PORTED]** | `Xoroshiro { lo: bigint; hi: bigint }` |
| `uint64_t *seed` (mutable pattern) | **[PORTED]** | `SeedBox { seed: bigint }` |

#### Functions

| Function | Status | Notes |
|----------|--------|-------|
| `setSeed(seed, value)` | **[PORTED]** | |
| `next(seed, bits)` | **[PORTED]** | |
| `nextInt(seed, n)` | **[PORTED]** | |
| `nextLong(seed)` | **[PORTED]** | |
| `nextFloat(seed)` | **[PORTED]** | |
| `nextDouble(seed)` | **[PORTED]** | |
| `skipNextN(seed, n)` | **[PORTED]** | |
| `xSetSeed(xr, value)` | **[PORTED]** | |
| `xNextLong(xr)` | **[PORTED]** | |
| `xNextInt(xr, n)` | **[PORTED]** | |
| `xNextDouble(xr)` | **[PORTED]** | |
| `xNextFloat(xr)` | **[PORTED]** | |
| `xSkipN(xr, count)` | **[PORTED]** | |
| `xNextLongJ(xr)` | **[PORTED]** | |
| `xNextIntJ(xr, n)` | **[PORTED]** | |
| `mcStepSeed(s, salt)` | **[PORTED]** | |
| `mcFirstInt(s, mod)` | **[PORTED]** | |
| `mcFirstIsZero(s, mod)` | **[PORTED]** | |
| `getChunkSeed(ss, x, z)` | **[PORTED]** | |
| `getLayerSalt(salt)` | **[PORTED]** | |
| `getStartSalt(ws, ls)` | **[PORTED]** | |
| `getStartSeed(ws, ls)` | **[PORTED]** | |
| `rotl64(x, b)` | **[PORTED]** | |
| `rotr32(a, b)` | **[PORTED]** | |
| `floordiv(a, b)` | **[PORTED]** | |
| `mulInv(x, m)` | **[PORTED]** | |
| `lerp(part, from, to)` | **[PORTED]** | |
| `lerp2(dx, dy, ...)` | **[PORTED]** | |
| `lerp3(dx, dy, dz, ...)` | **[PORTED]** | |
| `clampedLerp(part, from, to)` | **[PORTED]** | |

---

### `noise.h` / `noise.c` — Perlin and Octave Noise

#### Types

| C Type | Status | CubiomesTS Equivalent |
|--------|--------|-----------------------|
| `PerlinNoise` | **[PORTED]** | `PerlinNoise` interface |
| `OctaveNoise` | **[PORTED]** | `OctaveNoise` interface |
| `DoublePerlinNoise` | **[PORTED]** | `DoublePerlinNoise` interface |

#### Functions

| Function | Status | Notes |
|----------|--------|-------|
| `perlinInit(noise, seed)` | **[PORTED]** | |
| `xPerlinInit(noise, xr)` | **[PORTED]** | |
| `samplePerlin(noise, x, y, z, yamp, ymin)` | **[PORTED]** | |
| `sampleSimplex2D(noise, x, y)` | **[PORTED]** | |
| `octaveInit(noise, seed, octaves, omin, len)` | **[PORTED]** | |
| `xOctaveInit(noise, xr, octaves, amplitudes, omin, len, nmax)` | **[PORTED]** | |
| `sampleOctave(noise, x, y, z)` | **[PORTED]** | |
| `sampleOctaveAmp(noise, x, y, z, yamp, ymin, ydefault)` | **[PORTED]** | |
| `doublePerlinInit(noise, seed, octA, octB, omin, len)` | **[PORTED]** | |
| `xDoublePerlinInit(noise, xr, octaves, amplitudes, omin, len, nmax)` | **[PORTED]** | |
| `sampleDoublePerlin(noise, x, y, z)` | **[PORTED]** | |
| `maintainPrecision(x)` | | Floating-point precision helper |
| `octaveInitBeta(noise, seed, octaves, octcnt, lac, lacMul, persist, persistMul)` | | Beta terrain noise initialization |
| `sampleOctave2D(noise, x, z)` | | 2D octave sampling |
| `sampleOctaveBeta17Biome(noise, x, z)` | | Beta 1.7 biome noise |
| `sampleOctaveBeta17Terrain(noise, v, x, z, yLacFlag, lacmin)` | | Beta 1.7 terrain noise |

---

### `biomenoise.h` / `biomenoise.c` — Biome Noise Systems

#### Types

| C Type | Status | CubiomesTS Equivalent |
|--------|--------|-----------------------|
| `Range { scale, x, z, sx, sz, y, sy }` | **[PORTED]** | `Range` interface |
| `BiomeNoise` | **[PORTED]** | `BiomeNoise` interface |
| `NetherNoise` | **[PORTED]** | `NetherNoise` interface |
| `EndNoise` | **[PORTED]** | `EndNoise` interface |
| `Spline` | **[PORTED]** | `Spline` interface (array+index refs) |
| `FixSpline` | **[PORTED]** | `FixSpline` interface |
| `SplineStack` | **[PORTED]** | `SplineStack` interface |
| `BiomeTree` | **[PORTED]** | `BiomeTree` interface |
| `SurfaceNoise` | | Pre-1.18 and End terrain height noise |
| `SurfaceNoiseBeta` | | Beta terrain noise |
| `BiomeNoiseBeta` | | Beta biome noise |
| `SeaLevelColumnNoiseBeta` | | Beta sea-level column data |

#### Overworld Biome Functions (1.18+)

| Function | Status | Notes |
|----------|--------|-------|
| `initBiomeNoise(bn, mc)` | **[PORTED]** | |
| `setBiomeSeed(bn, seed, large)` | **[PORTED]** | |
| `sampleBiomeNoise(bn, np, x, y, z, dat, flags)` | **[PORTED]** | |
| `sampleClimatePara(bn, np, x, z)` | **[PORTED]** | |
| `genBiomeNoiseScaled(bn, out, r, sha)` | **[PORTED]** | |
| `climateToBiome(mc, np, dat)` | **[PORTED]** | |
| `setClimateParaSeed(bn, seed, large, nptype, nmax)` | | Climate parameter seed setup |
| `genBiomeNoiseChunkSection(bn, out, cx, cy, cz, dat)` | | Per-chunk-section 3D generation |

#### Nether Biome Functions

| Function | Status | Notes |
|----------|--------|-------|
| `setNetherSeed(nn, seed)` | **[PORTED]** | |
| `getNetherBiome(nn, x, y, z, ndel)` | **[PORTED]** | |
| `genNetherScaled(nn, out, r, mc, sha)` | **[PORTED]** | |
| `mapNether2D(nn, out, x, z, w, h)` | | Simple 2D Nether biome map |
| `mapNether3D(nn, out, r, confidence)` | | 3D Nether biome map with confidence |

#### End Biome Functions

| Function | Status | Notes |
|----------|--------|-------|
| `setEndSeed(en, mc, seed)` | **[PORTED]** | |
| `genEndScaled(en, out, r, mc, sha)` | **[PORTED]** | |
| `mapEndBiome(en, out, x, z, w, h)` | | Simple End biome map |
| `mapEnd(en, out, x, z, w, h)` | | Alternative End biome map |
| `getEndSurfaceHeight(mc, seed, x, z)` | | Single-point End surface height |
| `mapEndSurfaceHeight(y, en, sn, x, z, w, h, scale, ymin)` | | End surface heightmap |

#### Surface Noise Functions

| Function | Status | Notes |
|----------|--------|-------|
| `initSurfaceNoise(sn, dim, seed)` | | Initializes surface noise for pre-1.18 or End terrain |
| `sampleSurfaceNoise(sn, x, y, z)` | | Samples 3D density noise |
| `sampleSurfaceNoiseBetween(sn, x, y, z, min, max)` | | Bounded surface noise sampling |

#### Beta Biome Functions

| Function | Status | Notes |
|----------|--------|-------|
| `setBetaBiomeSeed(bnb, seed)` | | Beta biome seed setup |
| `sampleBiomeNoiseBeta(bnb, np, nv, x, z)` | | Beta biome noise sampling |
| `approxSurfaceBeta(bnb, snb, x, z)` | | Beta surface height approximation |
| `initSurfaceNoiseBeta(snb, seed)` | | Beta surface noise init |
| `getOldBetaBiome(t, h)` | | Beta biome from temperature/humidity |
| `genBiomeNoiseBetaScaled(bnb, snb, out, r)` | | Scaled Beta biome generation |

#### Utility

| Function | Status | Notes |
|----------|--------|-------|
| `getBiomeDepthAndScale(id, depth, scale, grass)` | | Biome terrain shape parameters |
| `getVoronoiSrcRange(r)` | | Source range for Voronoi zoom |

---

### `generator.h` / `generator.c` — Top-Level Generator

#### Types

| C Type | Status | CubiomesTS Equivalent |
|--------|--------|-----------------------|
| `Generator` | **[PORTED]** | `Generator` interface |
| `LayerStack` | | Pre-1.18 layer system (out of scope) |
| `Layer` | | Pre-1.18 layer (out of scope) |

#### Flags

| Flag | Status |
|------|--------|
| `LARGE_BIOMES` | **[PORTED]** |
| `NO_BETA_OCEAN` | **[PORTED]** |
| `FORCE_OCEAN_VARIANTS` | **[PORTED]** |

#### Functions

| Function | Status | Notes |
|----------|--------|-------|
| `setupGenerator(g, mc, flags)` | **[PORTED]** | |
| `applySeed(g, dim, seed)` | **[PORTED]** | |
| `genBiomes(g, cache, r)` | **[PORTED]** | |
| `getBiomeAt(g, scale, x, y, z)` | **[PORTED]** | |
| `allocCache(g, r)` | **[PORTED]** | Returns `Int32Array` |
| `mapApproxHeight(y, ids, g, sn, x, z, w, h)` | | Approximate Overworld surface heightmap (1:4 scale). Requires `SurfaceNoise`. |
| `getMinCacheSize(g, scale, sx, sy, sz)` | | Compute minimum cache allocation |
| `getLayerForScale(g, scale)` | | Pre-1.18 layer access (out of scope) |
| `setupLayerStack(g, mc, largeBiomes)` | | Pre-1.18 layer init (out of scope) |
| `getMinLayerCacheSize(layer, sizeX, sizeZ)` | | Pre-1.18 cache sizing (out of scope) |
| `setupLayer(l, map, mc, zoom, edge, saltbase, p, p2)` | | Pre-1.18 layer setup (out of scope) |
| `genArea(layer, out, areaX, areaZ, areaW, areaH)` | | Pre-1.18 area generation (out of scope) |

---

### `biomes.h` — Biome IDs and Version Constants

#### Enums

| Enum | Status | Notes |
|------|--------|-------|
| `BiomeID` (all vanilla biome IDs) | **[PORTED]** | `BiomeId` const enum |
| `MCVersion` (MC_B1_7 through MC_NEWEST) | **[PORTED]** | Only MC_1_18+ values used |
| `Dimension` (DIM_NETHER, DIM_OVERWORLD, DIM_END) | **[PORTED]** | In `types.ts` |

#### Functions

| Function | Status | Notes |
|----------|--------|-------|
| `biomeExists(mc, id)` | | Check if biome exists in a version |
| `isOverworld(mc, id)` | | Check if biome is an Overworld biome |
| `getDimension(id)` | | Get dimension for a biome |
| `getMutated(id)` | | Get mutated variant of a biome |
| `getCategory(mc, id)` | | Get biome category |
| `areSimilar(mc, id1, id2)` | | Check if two biomes are similar |
| `isMesa(id)` | | Check if biome is a mesa/badlands variant |
| `isShallowOcean(id)` | | Check if biome is a shallow ocean |
| `isDeepOcean(id)` | | Check if biome is a deep ocean |
| `isOceanic(id)` | | Check if biome is any ocean type |
| `isSnowy(id)` | | Check if biome is a snowy variant |

---

### `finders.h` / `finders.c` — Structure Finders

#### Types

| C Type | Status | CubiomesTS Equivalent |
|--------|--------|-----------------------|
| `Pos { x, z }` | **[PORTED]** | `Pos` interface |
| `StructureConfig { salt, regionSize, chunkRange, structType, dim, rarity }` | **[PORTED]** | `StructureConfig` interface |
| `StructureType` enum | **[PORTED]** | `StructureType` const enum |
| `Pos3 { x, y, z }` | | 3D position |
| `StrongholdIter` | | Stronghold ring iterator |
| `StructureVariant` | | Detailed structure variant info |
| `Piece` | | Structure piece linked list node |
| `EndIsland` | | End island with position and radius |
| `BiomeFilter` | | Biome filter bitmask (pre-1.18) |

#### Structure Position Functions

| Function | Status | Notes |
|----------|--------|-------|
| `getStructureConfig(structType, mc, sconf)` | **[PORTED]** | |
| `getStructurePos(structType, mc, seed, regX, regZ, pos)` | **[PORTED]** | |
| `getFeaturePos(config, seed, regX, regZ)` | **[PORTED]** | |
| `getLargeStructurePos(config, seed, regX, regZ)` | **[PORTED]** | |
| `moveStructure(baseSeed, regX, regZ)` | **[PORTED]** | |
| `isSlimeChunk(seed, chunkX, chunkZ)` | **[PORTED]** | |
| `isViableFeatureBiome(mc, structType, biomeId)` | **[PORTED]** | |
| `getFeatureChunkInRegion(config, seed, regX, regZ)` | | Chunk-relative position within region |
| `getLargeStructureChunkInRegion(config, seed, regX, regZ)` | | Chunk-relative for large structures |
| `getMineshafts(mc, seed, chunkX, chunkZ, chunkW, chunkH, out, nout)` | | Find mineshafts in chunk range |
| `isViableStructurePos(structType, g, blockX, blockZ, flags)` | | Full viability check (Tier 2) — requires generator |
| `isViableStructureTerrain(structType, g, blockX, blockZ)` | | Terrain viability check — requires generator |
| `isViableEndCityTerrain(g, sn, blockX, blockZ)` | | End city terrain check — requires `SurfaceNoise` |

#### Stronghold & Spawn

| Function | Status | Notes |
|----------|--------|-------|
| `initFirstStronghold(sh, mc, s48)` | | Initialize stronghold ring iterator |
| `nextStronghold(sh, g)` | | Advance to next stronghold position |
| `estimateSpawn(g, rng)` | | Approximate spawn point |
| `getSpawn(g)` | | Exact spawn point |
| `locateBiome(g, x, y, z, radius, validB, validM, rng, passes)` | | Search for nearest biome match |

#### Structure Properties

| Function | Status | Notes |
|----------|--------|-------|
| `getVariant(sv, structType, mc, seed, blockX, blockZ, biomeId)` | | Detailed structure variant (size, rotation, etc.) |
| `getEndCityPieces(pieces, seed, chunkX, chunkZ)` | | End city piece layout |
| `getFortressPieces(list, n, mc, seed, chunkX, chunkZ)` | | Fortress piece layout |
| `chunkGenerateRnd(worldSeed, chunkX, chunkZ)` | | Chunk decoration RNG seed |
| `getFixedEndGateways(mc, seed, src)` | | Fixed End gateway positions |
| `getLinkedGatewayChunk(en, sn, seed, src, dst)` | | Linked End gateway chunk |
| `getLinkedGatewayPos(en, sn, seed, src)` | | Linked End gateway position |
| `getHouseList(houses, seed, chunkX, chunkZ)` | | Village house type list |
| `getEndIslands(islands, mc, seed, chunkX, chunkZ)` | | End island positions |
| `mapEndIslandHeight(y, en, seed, x, z, w, h, scale)` | | End island heightmap |
| `isEndChunkEmpty(en, sn, seed, chunkX, chunkZ)` | | Check if End chunk is void |
| `getShadow(seed)` | | Get shadow seed |

#### Biome Filtering (pre-1.18)

| Function | Status | Notes |
|----------|--------|-------|
| `setupBiomeFilter(bf, mc, flags, required, requiredLen, excluded, excludedLen, matchany, matchanyLen)` | | Out of scope |
| `checkForBiomes(g, cache, r, dim, seed, filter, stop)` | | Out of scope |
| `checkForBiomesAtLayer(ls, entry, cache, seed, x, z, w, h, filter)` | | Out of scope |
| `checkForTemps(g, seed, x, z, w, h, tc)` | | Out of scope |
| `getBiomeCenters(pos, siz, nmax, g, r, match, minsiz, tol, stop)` | | Out of scope |
| `canBiomeGenerate(layerId, mc, flags, biomeId)` | | Out of scope |
| `genPotential(mL, mM, layerId, mc, flags, biomeId)` | | Out of scope |
| `getAvailableBiomes(mL, mM, layerId, mc, flags)` | | Out of scope |

#### Noise-Based Biome Search (1.18+)

| Function | Status | Notes |
|----------|--------|-------|
| `getParaDescent(para, factor, x, z, w, h, i0, j0, maxrad, maxiter, alpha, data, func)` | | Gradient descent on climate noise |
| `getParaRange(para, pmin, pmax, x, z, w, h, data, func)` | | Climate noise parameter ranges |
| `getBiomeParaExtremes(mc)` | | Extreme climate values per version |
| `getBiomeParaLimits(mc, id)` | | Climate limits for a biome |
| `getPossibleBiomesForLimits(ids, mc, limits)` | | Biomes matching climate limits |
| `getLargestRec(match, ids, sx, sz, p0, p1)` | | Largest rectangular biome region |

#### Monte Carlo

| Function | Status | Notes |
|----------|--------|-------|
| `monteCarloBiomes(g, r, rng, coverage, confidence, eval, data)` | | Out of scope |

---

### `util.h` — Utility Functions

| Function | Status | Notes |
|----------|--------|-------|
| `initBiomeColors(biomeColors)` | **[PORTED]** | As `BIOME_COLORS` map + `biomeColor()` helper |
| `biome2str(mc, id)` | **[PORTED]** | As `biomeName()` |
| `mc2str(mc)` | | Version enum to display string |
| `str2mc(s)` | | String to version enum |
| `struct2str(stype)` | | Structure type to display string |
| `initBiomeTypeColors(biomeColors)` | | Alternative color scheme by biome type |
| `parseBiomeColors(biomeColors, buf)` | | Parse custom biome colors from text |
| `biomesToImage(pixels, biomeColors, biomes, sx, sy, pixscale, flip)` | | Render biomes to pixel buffer |
| `savePPM(path, pixels, sx, sy)` | | File I/O — out of scope |
| `loadSavedSeeds(fnam, scnt)` | | File I/O — out of scope |

---

## Currently Used API

These are the functions and types actively used by the map viewer (`CubiomesMap.tsx`):

### Biome Generation (core pipeline)

```ts
import {
  setupGenerator,
  applySeed,
  allocCache,
  genBiomes,
  getBiomeAt,
  biomeColor,
  MCVersion,
  Dimension,
} from './CubiomesTS';
import type { Generator, Range } from './CubiomesTS';
```

#### `setupGenerator(mc: MCVersion, flags?: number): Generator`

Creates and initializes a biome generator for the given Minecraft version. Only MC 1.18+ is supported.

```ts
const gen = setupGenerator(MCVersion.MC_1_21);
```

Optional `flags` parameter accepts `GeneratorFlags.LARGE_BIOMES` for large biome worlds.

#### `applySeed(gen: Generator, dim: Dimension, seed: bigint): void`

Seeds the generator for a specific dimension. Must be called before generating biomes. Supports `DIM_OVERWORLD`, `DIM_NETHER`, and `DIM_END`.

```ts
applySeed(gen, Dimension.DIM_OVERWORLD, 123456789n);
applySeed(gen, Dimension.DIM_NETHER, 123456789n);
```

#### `allocCache(range: Range): Int32Array`

Allocates a biome ID output buffer sized for the given range. Use this instead of manually sizing arrays.

```ts
const cache = allocCache(range);
```

#### `genBiomes(gen: Generator, cache: Int32Array, range: Range): void`

Fills `cache` with biome IDs for the region described by `range`. The cache must have been allocated with `allocCache`.

```ts
const range: Range = { scale: 4, x: 0, z: 0, sx: 16, sz: 16, y: 320, sy: 1 };
const cache = allocCache(range);
genBiomes(gen, cache, range);
// cache now contains 16*16 = 256 biome IDs
```

**`Range` fields:**
| Field | Description |
|-------|-------------|
| `scale` | Resolution: `4` = 1:4 blocks per sample, `16` = 1:16, etc. Scale `1` (Voronoi) is not yet implemented. |
| `x`, `z` | World coordinate origin (in scale units) |
| `sx`, `sz` | Width and depth in samples |
| `y` | Y coordinate (use `320` for surface-level biomes) |
| `sy` | Height in samples (use `1` for 2D maps) |

#### `getBiomeAt(gen: Generator, scale: number, x: number, y: number, z: number): number`

Convenience function to get a single biome ID at a specific world position. Allocates internally — use `genBiomes` for bulk queries.

```ts
const biomeId = getBiomeAt(gen, 4, 100, 320, 200);
```

#### `biomeColor(id: number): string`

Returns an `"rgb(r,g,b)"` CSS color string for a biome ID. Used to color map tiles.

```ts
const color = biomeColor(BiomeId.plains); // "rgb(141,179,96)"
```

### Structure Finders

```ts
import {
  StructureType,
  getStructureConfig,
  getStructurePos,
  isSlimeChunk,
} from './CubiomesTS';
import type { StructureConfig, Pos } from './CubiomesTS';
```

#### `getStructureConfig(structureType: number, mc: number): StructureConfig | null`

Returns the generation parameters for a structure type and MC version, or `null` if the structure doesn't exist in that version.

```ts
const config = getStructureConfig(StructureType.Village, MCVersion.MC_1_21);
```

#### `getStructurePos(structureType: number, mc: number, seed: bigint, regX: number, regZ: number): Pos | null`

Returns the block position of a structure in the given region, or `null` if no structure generates there. Handles all structure-specific logic (outpost spacing, bastion rarity, etc.).

```ts
const pos = getStructurePos(StructureType.Village, MCVersion.MC_1_21, seed, 0, 0);
if (pos) console.log(`Village at ${pos.x}, ${pos.z}`);
```

#### `isSlimeChunk(seed: bigint, chunkX: number, chunkZ: number): boolean`

Tests whether a chunk is a slime chunk.

```ts
if (isSlimeChunk(seed, 3, -5)) { /* slime chunk */ }
```

### Enums and Constants

| Export | Values |
|--------|--------|
| `MCVersion` | `MC_1_18`, `MC_1_19`, `MC_1_20`, `MC_1_21` |
| `Dimension` | `DIM_OVERWORLD`, `DIM_NETHER`, `DIM_END` |
| `BiomeId` | `plains`, `desert`, `forest`, `ocean`, ... (all vanilla biome IDs) |
| `StructureType` | `Village`, `Desert_Pyramid`, `Monument`, `Mansion`, `Fortress`, ... |
| `GeneratorFlags` | `LARGE_BIOMES`, `NO_BETA_OCEAN`, `FORCE_OCEAN_VARIANTS` |

## Typical Usage

```ts
import { setupGenerator, applySeed, allocCache, genBiomes, biomeColor, MCVersion, Dimension } from './CubiomesTS';
import type { Range } from './CubiomesTS';

// 1. Create generator
const gen = setupGenerator(MCVersion.MC_1_21);

// 2. Apply seed
applySeed(gen, Dimension.DIM_OVERWORLD, 12345n);

// 3. Define region to generate
const range: Range = { scale: 4, x: -64, z: -64, sx: 128, sz: 128, y: 320, sy: 1 };

// 4. Generate biomes
const cache = allocCache(range);
genBiomes(gen, cache, range);

// 5. Read results
for (let z = 0; z < range.sz; z++) {
  for (let x = 0; x < range.sx; x++) {
    const biomeId = cache[z * range.sx + x];
    const color = biomeColor(biomeId);
    // render tile at (range.x + x, range.z + z) with color
  }
}
```

## Notable Unported APIs

These upstream functions could add significant features if ported:

| Function | What it enables |
|----------|----------------|
| `mapApproxHeight` | Approximate Overworld terrain heightmap (1:4 scale). Uses spline-evaluated climate noise. Requires porting `SurfaceNoise`. |
| `initFirstStronghold` / `nextStronghold` | Stronghold ring positions. Currently handled via Web Worker in Tier 3. |
| `getSpawn` / `estimateSpawn` | World spawn point calculation. |
| `isViableStructurePos` | Full structure viability (Tier 2) — checks surrounding biomes, not just the biome at the structure position. |
| `isViableStructureTerrain` | Terrain-based structure viability (e.g., ocean monuments need deep ocean around them). |
| `getVariant` | Structure variant details (size, rotation, abandoned village, etc.). |
| `getEndIslands` / `mapEndIslandHeight` | End island geometry and heightmaps. |
| `SurfaceNoise` | Terrain density noise — prerequisite for `mapApproxHeight` and End terrain checks. |
