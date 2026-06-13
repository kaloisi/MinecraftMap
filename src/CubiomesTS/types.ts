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
  h2: number;
  d2: number;
  t2: number;
}

export interface OctaveNoise {
  octaves: PerlinNoise[];
  octcnt: number;
}

export interface DoublePerlinNoise {
  amplitude: number;
  octA: OctaveNoise;
  octB: OctaveNoise;
}

export const enum Dimension {
  DIM_OVERWORLD = 0,
  DIM_NETHER = -1,
  DIM_END = 1,
}
