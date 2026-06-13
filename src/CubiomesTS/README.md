# CubiomesTS API

TypeScript port of [cubiomes](https://github.com/Cubitect/cubiomes) for Minecraft Java Edition 1.18+ biome generation. Runs entirely in the browser.

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

Seeds the generator for a specific dimension. Must be called before generating biomes. Currently only `Dimension.DIM_OVERWORLD` is supported.

```ts
applySeed(gen, Dimension.DIM_OVERWORLD, 123456789n);
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
