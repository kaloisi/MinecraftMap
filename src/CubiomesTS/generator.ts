import type { MCVersion } from './biomes';
import type { Generator, Range, Dimension } from './types';

export function setupGenerator(_mc: MCVersion, _flags: number = 0): Generator {
  // TODO: initialize noise generators per cubiomes setupGenerator
  throw new Error('Not yet implemented — run the port-cubiomes skill to generate');
}

export function applySeed(_gen: Generator, _dim: Dimension, _seed: bigint): void {
  throw new Error('Not yet implemented — run the port-cubiomes skill to generate');
}

export function genBiomes(_gen: Generator, _cache: Int32Array, _range: Range): void {
  throw new Error('Not yet implemented — run the port-cubiomes skill to generate');
}

export function getBiomeAt(_gen: Generator, _scale: number, _x: number, _y: number, _z: number): number {
  throw new Error('Not yet implemented — run the port-cubiomes skill to generate');
}
