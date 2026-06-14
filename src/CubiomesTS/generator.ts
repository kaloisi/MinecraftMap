import { MCVersion } from './biomes';
import type { Range } from './types';
import { Dimension } from './types';
import {
  type BiomeNoise,
  type NetherNoise,
  type EndNoise,
  createBiomeNoise,
  createNetherNoise,
  createEndNoise,
  initBiomeNoise,
  setBiomeSeed,
  setNetherSeed,
  setEndSeed,
  genBiomeNoiseScaled,
  genNetherScaled,
  genEndScaled,
} from './biomenoise';

export const enum GeneratorFlags {
  LARGE_BIOMES = 0x1,
  NO_BETA_OCEAN = 0x2,
  FORCE_OCEAN_VARIANTS = 0x4,
}

export interface Generator {
  mc: MCVersion;
  dim: Dimension;
  flags: number;
  seed: bigint;
  sha: bigint;
  bn: BiomeNoise;
  nn: NetherNoise;
  en: EndNoise;
}

export function setupGenerator(mc: MCVersion, flags: number = 0): Generator {
  if (mc < MCVersion.MC_1_18) {
    throw new Error('Only MC 1.18+ is supported');
  }
  const bn = createBiomeNoise();
  initBiomeNoise(bn, mc);
  return {
    mc,
    dim: Dimension.DIM_OVERWORLD,
    flags,
    seed: 0n,
    sha: 0n,
    bn,
    nn: createNetherNoise(),
    en: createEndNoise(),
  };
}

export function applySeed(gen: Generator, dim: Dimension, seed: bigint): void {
  gen.dim = dim;
  gen.seed = seed;
  gen.sha = 0n;

  if (dim === Dimension.DIM_OVERWORLD) {
    setBiomeSeed(gen.bn, seed, !!(gen.flags & GeneratorFlags.LARGE_BIOMES));
  } else if (dim === Dimension.DIM_NETHER) {
    setNetherSeed(gen.nn, seed);
  } else if (dim === Dimension.DIM_END) {
    setEndSeed(gen.en, gen.mc, seed);
  }
}

export function allocCache(range: Range): Int32Array {
  const sy = range.sy <= 0 ? 1 : range.sy;
  let len = range.sx * range.sz * sy;
  if (range.scale <= 1) {
    const sx = ((range.sx + 3) >> 2) + 2;
    const sy2 = ((sy + 3) >> 2) + 2;
    const sz = ((range.sz + 3) >> 2) + 2;
    len += sx * sy2 * sz;
  }
  return new Int32Array(len);
}

export function genBiomes(gen: Generator, cache: Int32Array, range: Range): void {
  if (gen.mc < MCVersion.MC_1_18) {
    throw new Error('Only MC 1.18+ is supported');
  }
  if (gen.dim === Dimension.DIM_OVERWORLD) {
    genBiomeNoiseScaled(gen.bn, cache, range);
  } else if (gen.dim === Dimension.DIM_NETHER) {
    genNetherScaled(gen.nn, cache, range);
  } else if (gen.dim === Dimension.DIM_END) {
    genEndScaled(gen.en, cache, range);
  }
}

export function getBiomeAt(gen: Generator, scale: number, x: number, y: number, z: number): number {
  const range: Range = { scale, x, z, sx: 1, sz: 1, y, sy: 1 };
  const cache = allocCache(range);
  genBiomes(gen, cache, range);
  return cache[0];
}
