# Port Cubiomes to TypeScript

This skill ports the latest version of the [cubiomes](https://github.com/Cubitect/cubiomes) C library into a TypeScript library under `src/CubiomesTS/`.

## When to use

Run this skill whenever the cubiomes TypeScript port needs to be created or regenerated from the latest upstream C source.

## Instructions

### Step 1 — Fetch the latest cubiomes source

Fetch the latest versions of these files from `https://github.com/Cubitect/cubiomes` (use the `main` branch). Only these files are in scope:

| C source file | Purpose |
|---|---|
| `rng.h` | Java RNG LCG, Xoroshiro128, seed helpers, lerp/clamp math |
| `noise.c` + `noise.h` | PerlinNoise, OctaveNoise, DoublePerlinNoise |
| `biomenoise.c` + `biomenoise.h` | BiomeNoise (1.18+ spline system), BiomeTree, climateToBiome |
| `generator.c` + `generator.h` | setupGenerator, applySeed, genBiomes, getBiomeAt |
| `biomes.h` | Biome ID enum and version constants |
| `util.h` | initBiomeColors (colour table only — skip file I/O) |
| `finders.c` + `finders.h` | Structure position math (getFeaturePos, getLargeStructurePos, isViableStructurePos, getStructureConfig) |

**Skip entirely:** `layers.c/h`, `quadbase.c/h`, file I/O functions in `util.c`, `searchAll48`, seed-search functions, `Piece*` linked-list logic (`getEndCityPieces`, `getFortressPieces`), blocking-loop functions (`checkForBiomes`, `locateBiome`, `monteCarloBiomes`, `getBiomeCenters`).

### Step 2 — Port to TypeScript in order

Port files in this order, placing output in `src/CubiomesTS/`:

#### 2.1 `biomes.ts` — Biome IDs and version constants
- Port the biome ID enum from `biomes.h`.
- Port MC version constants (e.g., `MC_1_18`, `MC_1_19`, etc.).

#### 2.2 `rng.ts` — RNG primitives
- Port all ~30 functions from `rng.h`.
- **BigInt rules:** Use `bigint` only for functions that operate on 64-bit seeds: the LCG family (`next`, `nextInt`, `mcStepSeed`, `mcFirstInt`, `mcFirstIsZero`), `xSetSeed`, `xNextLong`, `xNextDouble`, `xNextFloat`, and the `setSeed`/`chunkGenerateRnd`/`layerSeed` helpers.
- **Xoroshiro128:** Use BigInt with explicit `& 0xFFFFFFFFFFFFFFFFn` masks for unsigned 64-bit behaviour. Store state as `{ lo: bigint; hi: bigint }`.
- **Mutable seed pattern:** C functions take `uint64_t *seed`. In TS, use a `{ seed: bigint }` box object so mutations are visible to callers.
- **Signed overflow (`-fwrapv`):** For LCG functions that depend on two's-complement wrap at 64 bits, mask with `& 0xFFFFFFFFFFFFFFFFn` and convert back to signed with `BigInt.asIntN(64, value)` where needed.
- Port `lerp`, `clampedLerp`, `indexedLerp` as plain `number` functions.

#### 2.3 `noise.ts` — Perlin and Octave noise
- Port `PerlinNoise`, `OctaveNoise`, `DoublePerlinNoise` from `noise.c/h`.
- All noise math uses plain `number` (doubles). No BigInt.
- The `d[512]` permutation table → `Uint8Array(512)`.
- `perlinInit` takes the `{ seed: bigint }` box from `rng.ts`.
- Port `samplePerlin`, `sampleOctave`, `sampleDoublePerlin`.

#### 2.4 `biomenoise.ts` — Spline system and biome climate mapping
- This is the hardest piece. Port carefully.
- **SplineStack:** Convert the pointer-linked `Spline` / `FixSpline` structures into flat arrays of plain TS objects with index references (not pointers).
  - `Spline { typ, loc, der, len, val[] }` → use array indices for child references.
  - `FixSpline` → inline value splines with no children.
  - The `SplineStack` holds fixed-capacity arrays: `stack[42]` for Spline, `fstack[151]` for FixSpline.
- Port `BiomeNoise` struct, `BiomeTree`, `climateToBiome`.
- Port `sampleBiomeNoise`, `genBiomeNoiseScaled`, `genBiomeNoise`.
- Port the `Range` struct as `{ scale: number; x: number; z: number; sx: number; sz: number; y: number; sy: number }`.

#### 2.5 `generator.ts` — Top-level orchestration
- Port `Generator` struct/interface with fields for the noise generators, dimension, MC version, flags, seed, biome params.
- Port `setupGenerator(mcVersion, flags)`, `applySeed(generator, dimension, seed)`, `genBiomes(generator, cache, range)`, `getBiomeAt(generator, scale, x, y, z)`.
- `allocCache(range)` → `new Int32Array(range.sx * range.sz * range.sy)`.

#### 2.6 `biomeColors.ts` — Color lookup table
- Port `initBiomeColors` from `util.h` as `const BIOME_COLORS: Map<number, [number, number, number]>`.
- Add a helper `biomeColor(id: number): string` that returns `"rgb(r,g,b)"`.

#### 2.7 `finders.ts` — Structure position math
- Port `getStructureConfig`, `getFeaturePos`, `getLargeStructurePos`.
- Port structure type enum and `StructureConfig` data table.
- Port `isViableStructurePos` (Tier 2) — calls `getBiomeAt` internally.
- **All structure position math uses plain `number`** (stays below 2⁵³). No BigInt needed.
- Port `isSlimeChunk` (8 lines).

#### 2.8 `index.ts` — Public API barrel export
- Re-export the public API from all modules.

### Step 3 — Key translation patterns

Apply these patterns consistently throughout the port:

| C pattern | TypeScript equivalent |
|---|---|
| `uint64_t seed` (parameter) | `bigint` |
| `uint64_t *seed` (mutable) | `{ seed: bigint }` |
| `int` / `int32_t` | `number` |
| `double` | `number` |
| `int cache[]` (biome output) | `Int32Array` |
| `uint8_t d[512]` (permutation) | `Uint8Array` |
| `struct Foo` | `interface Foo` |
| `enum` | `const enum` (`erasableSyntaxOnly` is disabled in tsconfig) |
| `#define` constants | `const` |
| `static` tables/arrays | Module-level `const` |
| `NULL` pointer | `null` |
| Two's-complement wrap | `BigInt.asIntN(64, val)` or `& 0xFFFFFFFFFFFFFFFFn` |
| Pointer-linked structs | Array + index references |
| `sizeof(int) * n` | `new Int32Array(n)` |

### Step 4 — Verify

After porting:
1. Run `npm run build` to verify there are no TypeScript compilation errors.
2. Run `npm run lint` to check for lint issues and fix them.
3. Spot-check that every public function from the C API that is on the call path (see master prompt) has a corresponding export in `src/CubiomesTS/index.ts`.

### Important notes

- **MC 1.18+ only.** Do not port any `layers.c/h` layer-stack logic. If you encounter `MC <= MC_1_17` branches in the C code, skip them or add an early return/throw for unsupported versions.
- **No seed searching.** Do not port `searchAll48`, `filterAllTempCat`, or any function whose purpose is iterating over seed candidates.
- **Keep function names matching the C originals** so the port can be cross-referenced with the cubiomes source.
- **No comments except where the WHY is non-obvious** (e.g., explaining a BigInt mask or a deviation from the C original).
- Consult `docs/MASTER_PROMPT.md` for architectural context and the full list of what to skip.
