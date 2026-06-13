import type { MCVersion } from './biomes';

export interface Range {
  scale: number;
  x: number;
  z: number;
  sx: number;
  sz: number;
  y: number;
  sy: number;
}

export interface PerlinNoise {
  d: Uint8Array;
  a: number;
  b: number;
  c: number;
  amplitude: number;
  lacunarity: number;
}

export interface OctaveNoise {
  octaves: PerlinNoise[];
}

export interface DoublePerlinNoise {
  amplitude: number;
  first: OctaveNoise;
  second: OctaveNoise;
}

export interface BiomeNoise {
  climate: DoublePerlinNoise[];
  shift: DoublePerlinNoise;
}

export const enum Dimension {
  DIM_OVERWORLD = 0,
  DIM_NETHER = -1,
  DIM_END = 1,
}

export interface Generator {
  mc: MCVersion;
  dim: Dimension;
  flags: number;
  seed: bigint;
  bn: BiomeNoise;
}
