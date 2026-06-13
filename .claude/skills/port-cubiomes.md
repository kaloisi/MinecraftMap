# Port Cubiomes to TypeScript

This skill ports the latest version of the [cubiomes](https://github.com/Cubitect/cubiomes) C library into a TypeScript library under `src/CubiomesTS/`.

## When to use

Run this skill whenever the cubiomes TypeScript port needs to be created or regenerated from the latest upstream C source.

## Instructions

### Step 0 — Detect upstream changes and plan scope

Before porting, determine what has changed since the last run:

1. Read the **History** section at the bottom of this file to find the last recorded upstream commit hash.
2. Fetch the current HEAD of `https://github.com/Cubitect/cubiomes`:
   ```bash
   git ls-remote https://github.com/Cubitect/cubiomes.git HEAD
   ```
3. If the hash matches the last recorded hash, inform the user that the upstream is unchanged and ask whether to proceed with a full regeneration or skip.
4. If the hash differs, clone or fetch the upstream repo to a temp directory and run:
   ```bash
   git diff <last-recorded-hash>..<current-hash> --stat
   git diff <last-recorded-hash>..<current-hash> -- rng.h noise.c noise.h biomenoise.c biomenoise.h generator.c generator.h biomes.h finders.c finders.h util.h
   ```
5. **Scope the regeneration based on what changed:**
   - If only `biomes.h` changed → regenerate `biomes.ts` and `btrees.ts` only (new biome IDs or version constants).
   - If only `finders.c/h` changed → regenerate `finders.ts` only.
   - If `rng.h` changed → regenerate `rng.ts`, then cascade to files that depend on it (`noise.ts`, `biomenoise.ts`).
   - If `noise.c/h` changed → regenerate `noise.ts` and `biomenoise.ts`.
   - If `biomenoise.c/h` changed → regenerate `biomenoise.ts` and `btrees.ts` (biome tree data may have changed).
   - If `generator.c/h` changed → regenerate `generator.ts`.
   - If nothing in scope changed → skip porting, inform the user.
   - If this is the first run (no history) → full regeneration of all files.
6. Review the **History** section for lessons learned from prior runs. Apply any relevant patterns or workarounds noted there.

### Step 1 — Fetch the latest cubiomes source

Fetch the latest versions of these files from `https://github.com/Cubitect/cubiomes` (use the `main` branch). Only fetch files identified as needing regeneration in Step 0. If doing a full regeneration, fetch all. Only these files are in scope:

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

### Step 4 — Migrate consuming code

After regenerating the library, update all files outside `src/CubiomesTS/` that import from it:

1. **Find all consumers:**
   ```bash
   grep -r "from.*CubiomesTS" src/ --include="*.ts" --include="*.tsx" -l | grep -v "src/CubiomesTS/"
   ```

2. **For each consumer, check and fix:**
   - **Removed or renamed exports:** If a function/type was renamed or removed in the regenerated library, update the import and all call sites.
   - **Changed signatures:** If a function's parameter types or return type changed (e.g., `number` → `bigint`, new required parameter, renamed interface field), update all call sites to match.
   - **New API opportunities:** If the upstream added new functions that replace workarounds in consuming code, refactor to use the new API.
   - **Version constants:** If new `MCVersion` values were added, check whether consumers should default to the latest version.

3. **Update `src/CubiomesTS/README.md`** to reflect any API changes — new functions, changed signatures, removed exports, or new usage patterns.

4. **Key consumer files to check:**
   - `src/components/CubiomesMap.tsx` — biome generation and rendering pipeline
   - `src/MapViewer.tsx` — passes seed and viewport to CubiomesMap
   - `src/App.tsx` — may reference version constants or seed types
   - Any future Web Worker files that call `genBiomes` or structure finders

### Step 5 — Verify

After porting and migrating:
1. Run `npm run build` to verify there are no TypeScript compilation errors.
2. Run `npm run lint` to check for lint issues and fix them.
3. Spot-check that every public function from the C API that is on the call path (see master prompt) has a corresponding export in `src/CubiomesTS/index.ts`.
4. Verify that all consuming code compiles and uses the updated API correctly.

### Step 6 — Record learnings and refine this skill

After a successful port:

1. **Record a new history entry.** Append an entry to the **History** section at the bottom of this file with:
   - Today's date
   - The upstream cubiomes commit hash that was ported (from Step 0)
   - Files regenerated (full or partial list)
   - Any bugs encountered and how they were fixed
   - Any new patterns, workarounds, or gotchas discovered
   - Any changes to the upstream C API that required adaptation

2. **Review and optimize this skill.** Re-read the entire skill file and:
   - Update translation patterns in Step 3 if new patterns were discovered
   - Update the skip list in Step 1 if new files or functions were added/removed upstream
   - Tighten or clarify any instructions that caused confusion during this run
   - Remove any instructions that are no longer relevant
   - Ensure the Step 0 change-detection cascade rules are still accurate

### Important notes

- **MC 1.18+ only.** Do not port any `layers.c/h` layer-stack logic. If you encounter `MC <= MC_1_17` branches in the C code, skip them or add an early return/throw for unsupported versions.
- **No seed searching.** Do not port `searchAll48`, `filterAllTempCat`, or any function whose purpose is iterating over seed candidates.
- **Keep function names matching the C originals** so the port can be cross-referenced with the cubiomes source.
- **No comments except where the WHY is non-obvious** (e.g., explaining a BigInt mask or a deviation from the C original).
- Consult `docs/MASTER_PROMPT.md` for architectural context and the full list of what to skip.

---

## History

### 2026-06-13 — Upstream `e61f9058`

**Files regenerated:** Full initial port — `rng.ts`, `noise.ts`, `btrees.ts`, `biomenoise.ts`, `finders.ts`, `generator.ts`, `types.ts`, `index.ts`

**Learnings:**

- **`indexedLerp` is a gradient function, not an RNG primitive.** Despite living in `rng.h` in the C source, it belongs in `noise.ts` because it's only used by Perlin noise sampling. Define it locally in `noise.ts` rather than exporting from `rng.ts`.
- **`skipNextN` requires `bigint` for the skip count parameter.** Callers in `noise.ts` (`octaveInit`) compute the skip as `number` arithmetic (`-end * 262`), which must be wrapped with `BigInt()` before passing.
- **BiomeTree data uses `BigUint64Array`.** The node data in `btrees.ts` stores packed uint64 values. Use `BigUint64Array` (not `Uint32Array` pairs) for faithful bit extraction with `>> shift & mask` patterns.
- **SplineStack uses flat arrays with index references.** C pointer-linked `Spline*` children become integer indices into `stack[]` and `fstack[]` arrays. The `SplineStack` holds `stack: Spline[42]`, `fstack: FixSpline[151]`, with `len` and `flen` counters.
- **DoublePerlinNoise fields:** Use `octA`/`octB` (matching the TS types), not `first`/`second` from some C versions.
- **`PerlinNoise` needs extra cached fields:** `h2`, `d2`, `t2` — these are precomputed in `xPerlinInit` and used by noise sampling. They don't exist in all C struct versions but are needed for correctness.
- **`let` vs `const` lint strictness:** ESLint's `prefer-const` catches variables that are initialized once and never reassigned, even if they look like accumulators. Watch for seed variables computed in a single expression (`let s = a + b + c`) — use `const` if never reassigned.
- **React 19 ref-in-render rules:** `useRef` values cannot be read inside `useMemo`/render. For caching generators and tile data, use module-level variables instead of refs.
- **Scale 1:1 (Voronoi) is not yet implemented** in `genBiomeNoiseScaled`. Throws an error. Scale 4 works for the map viewer.
- **`biomenoise.ts` is the hardest file to port.** It contains the spline system, climate seed initialization with md5 hashes, and the full biome sampling pipeline. Expect this to take the most time and produce the most bugs.
- **Fetching raw C source:** Use `curl` to download raw files from GitHub (`https://raw.githubusercontent.com/Cubitect/cubiomes/<hash>/<file>`). The GitHub MCP tools are repository-scoped and cannot access `Cubitect/cubiomes`. WebFetch may summarize content instead of returning it verbatim.
