// UI-facing helpers that build on the CubiomesTS stronghold/spawn API without
// modifying the generated library. Strongholds and the world spawn point come
// from a separate code path (finders.c's initFirstStronghold/nextStronghold and
// estimateSpawn) rather than the region-based structure finders, so they are
// wrapped here with per-seed caching and incremental generation.
import {
  setupGenerator, applySeed, Dimension,
  initFirstStronghold, nextStronghold, estimateSpawn,
} from './CubiomesTS';
import type { Pos, StrongholdIter, Generator } from './CubiomesTS';

/** Total strongholds in a MC 1.9+ world. */
export const MAX_STRONGHOLDS = 128;

let genCache: { seed: bigint; mc: number; gen: Generator } | null = null;

function getOverworldGenerator(seed: bigint, mc: number): Generator {
  if (genCache && genCache.seed === seed && genCache.mc === mc) return genCache.gen;
  const gen = setupGenerator(mc);
  applySeed(gen, Dimension.DIM_OVERWORLD, seed);
  genCache = { seed, mc, gen };
  return gen;
}

interface StrongholdState {
  seed: bigint;
  mc: number;
  gen: Generator;
  iter: StrongholdIter;
  list: Pos[];
  done: boolean;
}

let shState: StrongholdState | null = null;

function ensureStrongholdState(seed: bigint, mc: number): StrongholdState {
  if (shState && shState.seed === seed && shState.mc === mc) return shState;
  const gen = getOverworldGenerator(seed, mc);
  const iter = {} as StrongholdIter;
  initFirstStronghold(iter, mc, seed);
  shState = { seed, mc, gen, iter, list: [], done: false };
  return shState;
}

/**
 * Resolves up to `budget` more stronghold positions for the given seed, in ring
 * order (nearest first). Results are cached so repeated calls resume where the
 * last left off. Returns the full list resolved so far and whether generation
 * is complete. Each stronghold requires a biome search, so callers should spread
 * generation across frames rather than requesting all 128 at once.
 */
export function advanceStrongholds(
  seed: bigint, mc: number, budget: number,
): { strongholds: Pos[]; done: boolean } {
  const state = ensureStrongholdState(seed, mc);
  for (let n = 0; n < budget && !state.done; n++) {
    const remaining = nextStronghold(state.iter, state.gen);
    state.list.push({ x: state.iter.pos.x, z: state.iter.pos.z });
    if (remaining <= 0 || state.list.length >= MAX_STRONGHOLDS) {
      state.done = true;
    }
  }
  return { strongholds: state.list.slice(), done: state.done };
}

let spawnCache: { seed: bigint; mc: number; pos: Pos } | null = null;

/** Approximate world spawn point in Overworld block coordinates (cached per seed). */
export function getSpawnPoint(seed: bigint, mc: number): Pos {
  if (spawnCache && spawnCache.seed === seed && spawnCache.mc === mc) return spawnCache.pos;
  const gen = getOverworldGenerator(seed, mc);
  const pos = estimateSpawn(gen);
  spawnCache = { seed, mc, pos };
  return pos;
}
