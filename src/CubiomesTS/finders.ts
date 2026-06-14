import { BiomeId, MCVersion } from './biomes';
import { setSeed, nextInt, nextFloat, type SeedBox } from './rng';

export const enum StructureType {
  Feature = 0,
  Desert_Pyramid,
  Jungle_Temple,
  Swamp_Hut,
  Igloo,
  Village,
  Ocean_Ruin,
  Shipwreck,
  Monument,
  Mansion,
  Outpost,
  Ruined_Portal,
  Ruined_Portal_N,
  Ancient_City,
  Treasure,
  Mineshaft,
  Desert_Well,
  Geode,
  Fortress,
  Bastion,
  End_City,
  End_Gateway,
  End_Island,
  Trail_Ruins,
  Trial_Chambers,
  FEATURE_NUM,
}

export interface StructureConfig {
  salt: number;
  regionSize: number;
  chunkRange: number;
  structType: number;
  dim: number;
  rarity: number;
}

export interface Pos {
  x: number;
  z: number;
}

const MASK48 = (1n << 48n) - 1n;
const LCG_MULT = 0x5DEECE66Dn;
const LCG_ADD = 0xBn;
const REGION_STEP_X = 341873128712n;
const REGION_STEP_Z = 132897987541n;

export function getStructureConfig(structureType: number, mc: number): StructureConfig | null {
  const sc = (salt: number, regionSize: number, chunkRange: number, structType: number, dim: number = 0, rarity: number = 0): StructureConfig =>
    ({ salt, regionSize, chunkRange, structType, dim, rarity });

  switch (structureType) {
    case StructureType.Desert_Pyramid:
      return mc >= MCVersion.MC_1_18 ? sc(14357617, 32, 24, StructureType.Desert_Pyramid) : null;
    case StructureType.Jungle_Temple:
      return mc >= MCVersion.MC_1_18 ? sc(14357619, 32, 24, StructureType.Jungle_Temple) : null;
    case StructureType.Swamp_Hut:
      return mc >= MCVersion.MC_1_18 ? sc(14357620, 32, 24, StructureType.Swamp_Hut) : null;
    case StructureType.Igloo:
      return mc >= MCVersion.MC_1_18 ? sc(14357618, 32, 24, StructureType.Igloo) : null;
    case StructureType.Village:
      return mc >= MCVersion.MC_1_18 ? sc(10387312, 34, 26, StructureType.Village) : null;
    case StructureType.Ocean_Ruin:
      return mc >= MCVersion.MC_1_18 ? sc(14357621, 20, 12, StructureType.Ocean_Ruin) : null;
    case StructureType.Shipwreck:
      return mc >= MCVersion.MC_1_18 ? sc(165745295, 24, 20, StructureType.Shipwreck) : null;
    case StructureType.Monument:
      return mc >= MCVersion.MC_1_18 ? sc(10387313, 32, 27, StructureType.Monument) : null;
    case StructureType.Mansion:
      return mc >= MCVersion.MC_1_18 ? sc(10387319, 80, 60, StructureType.Mansion) : null;
    case StructureType.Outpost:
      return mc >= MCVersion.MC_1_18 ? sc(165745296, 32, 24, StructureType.Outpost) : null;
    case StructureType.Ruined_Portal:
      return mc >= MCVersion.MC_1_18 ? sc(34222645, 40, 25, StructureType.Ruined_Portal) : null;
    case StructureType.Ancient_City:
      return mc >= MCVersion.MC_1_19 ? sc(20083232, 24, 16, StructureType.Ancient_City) : null;
    case StructureType.Trail_Ruins:
      return mc >= MCVersion.MC_1_20 ? sc(83469867, 34, 26, StructureType.Trail_Ruins) : null;
    case StructureType.Trial_Chambers:
      return mc >= MCVersion.MC_1_21 ? sc(94251327, 34, 22, StructureType.Trial_Chambers) : null;
    case StructureType.Treasure:
      return mc >= MCVersion.MC_1_18 ? sc(10387320, 1, 1, StructureType.Treasure) : null;
    case StructureType.Fortress:
      return mc >= MCVersion.MC_1_18 ? sc(30084232, 27, 23, StructureType.Fortress, -1) : null;
    case StructureType.Bastion:
      return mc >= MCVersion.MC_1_18 ? sc(30084232, 27, 23, StructureType.Bastion, -1) : null;
    case StructureType.End_City:
      return mc >= MCVersion.MC_1_18 ? sc(10387313, 20, 9, StructureType.End_City, 1) : null;
    default:
      return null;
  }
}

export function getFeatureChunkInRegion(config: StructureConfig, seed: bigint, regX: number, regZ: number): Pos {
  const K = LCG_MULT;
  const M = MASK48;
  const b = LCG_ADD;

  let s = seed + BigInt(regX) * REGION_STEP_X + BigInt(regZ) * REGION_STEP_Z + BigInt(config.salt);
  s = s ^ K;
  s = (s * K + b) & M;

  const r = BigInt(config.chunkRange);
  let px: number, pz: number;

  if ((r & (r - 1n)) === 0n) {
    px = Number((r * (s >> 17n)) >> 31n);
    s = (s * K + b) & M;
    pz = Number((r * (s >> 17n)) >> 31n);
  } else {
    px = Number(s >> 17n) % config.chunkRange;
    s = (s * K + b) & M;
    pz = Number(s >> 17n) % config.chunkRange;
  }

  return { x: px, z: pz };
}

export function getFeaturePos(config: StructureConfig, seed: bigint, regX: number, regZ: number): Pos {
  const pos = getFeatureChunkInRegion(config, seed, regX, regZ);
  pos.x = (regX * config.regionSize + pos.x) << 4;
  pos.z = (regZ * config.regionSize + pos.z) << 4;
  return pos;
}

export function getLargeStructureChunkInRegion(config: StructureConfig, seed: bigint, regX: number, regZ: number): Pos {
  const K = LCG_MULT;
  const M = MASK48;
  const b = LCG_ADD;

  let s = seed + BigInt(regX) * REGION_STEP_X + BigInt(regZ) * REGION_STEP_Z + BigInt(config.salt);
  s = s ^ K;

  s = (s * K + b) & M;
  let px = Number(s >> 17n) % config.chunkRange;
  s = (s * K + b) & M;
  px += Number(s >> 17n) % config.chunkRange;

  s = (s * K + b) & M;
  let pz = Number(s >> 17n) % config.chunkRange;
  s = (s * K + b) & M;
  pz += Number(s >> 17n) % config.chunkRange;

  px >>= 1;
  pz >>= 1;

  return { x: px, z: pz };
}

export function getLargeStructurePos(config: StructureConfig, seed: bigint, regX: number, regZ: number): Pos {
  const pos = getLargeStructureChunkInRegion(config, seed, regX, regZ);
  pos.x = (regX * config.regionSize + pos.x) << 4;
  pos.z = (regZ * config.regionSize + pos.z) << 4;
  return pos;
}

export function isSlimeChunk(seed: bigint, chunkX: number, chunkZ: number): boolean {
  let rnd = seed;
  rnd += BigInt((chunkX * 0x5ac0db) | 0);
  rnd += BigInt((chunkX * chunkX * 0x4c1906) | 0);
  rnd += BigInt((chunkZ * 0x5f24f) | 0);
  rnd += BigInt(((chunkZ * chunkZ) | 0)) * 0x4307a7n;
  rnd ^= 0x3ad8025fn;
  const box: SeedBox = { seed: 0n };
  setSeed(box, rnd);
  return nextInt(box, 10) === 0;
}

export function moveStructure(baseSeed: bigint, regX: number, regZ: number): bigint {
  return (baseSeed - BigInt(regX) * REGION_STEP_X - BigInt(regZ) * REGION_STEP_Z) & MASK48;
}

function isOceanBiome(id: number): boolean {
  return id === BiomeId.ocean || id === BiomeId.frozen_ocean || id === BiomeId.deep_ocean
    || id === BiomeId.warm_ocean || id === BiomeId.lukewarm_ocean || id === BiomeId.cold_ocean
    || id === BiomeId.deep_warm_ocean || id === BiomeId.deep_lukewarm_ocean
    || id === BiomeId.deep_cold_ocean || id === BiomeId.deep_frozen_ocean;
}

function isDeepOceanBiome(id: number): boolean {
  return id === BiomeId.deep_ocean || id === BiomeId.deep_warm_ocean
    || id === BiomeId.deep_lukewarm_ocean || id === BiomeId.deep_cold_ocean
    || id === BiomeId.deep_frozen_ocean;
}

export function isViableStructureBiome(structType: number, biomeId: number): boolean {
  switch (structType) {
    case StructureType.Desert_Pyramid:
      return biomeId === BiomeId.desert;
    case StructureType.Jungle_Temple:
      return biomeId === BiomeId.jungle || biomeId === BiomeId.bamboo_jungle;
    case StructureType.Swamp_Hut:
      return biomeId === BiomeId.swamp || biomeId === BiomeId.mangrove_swamp;
    case StructureType.Igloo:
      return biomeId === BiomeId.snowy_plains || biomeId === BiomeId.snowy_taiga || biomeId === BiomeId.snowy_slopes;
    case StructureType.Village:
      return biomeId === BiomeId.plains || biomeId === BiomeId.desert || biomeId === BiomeId.savanna
        || biomeId === BiomeId.taiga || biomeId === BiomeId.snowy_plains || biomeId === BiomeId.meadow
        || biomeId === BiomeId.cherry_grove;
    case StructureType.Ocean_Ruin:
      return isOceanBiome(biomeId);
    case StructureType.Shipwreck:
      return isOceanBiome(biomeId) || biomeId === BiomeId.beach || biomeId === BiomeId.snowy_beach;
    case StructureType.Monument:
      return isDeepOceanBiome(biomeId);
    case StructureType.Mansion:
      return biomeId === BiomeId.dark_forest;
    case StructureType.Outpost:
      return biomeId === BiomeId.desert || biomeId === BiomeId.plains || biomeId === BiomeId.savanna
        || biomeId === BiomeId.snowy_plains || biomeId === BiomeId.taiga
        || biomeId === BiomeId.meadow || biomeId === BiomeId.frozen_peaks
        || biomeId === BiomeId.jagged_peaks || biomeId === BiomeId.stony_peaks
        || biomeId === BiomeId.snowy_slopes || biomeId === BiomeId.grove
        || biomeId === BiomeId.cherry_grove || biomeId === BiomeId.savanna_plateau;
    case StructureType.Ruined_Portal:
    case StructureType.Ruined_Portal_N:
      return true;
    case StructureType.Ancient_City:
      return biomeId === BiomeId.deep_dark;
    case StructureType.Trail_Ruins:
      return biomeId === BiomeId.old_growth_pine_taiga || biomeId === BiomeId.old_growth_spruce_taiga
        || biomeId === BiomeId.taiga || biomeId === BiomeId.snowy_taiga
        || biomeId === BiomeId.jungle || biomeId === BiomeId.birch_forest;
    case StructureType.Trial_Chambers:
      return biomeId !== BiomeId.deep_dark;
    case StructureType.Fortress:
      return biomeId === BiomeId.nether_wastes || biomeId === BiomeId.soul_sand_valley
        || biomeId === BiomeId.warped_forest || biomeId === BiomeId.crimson_forest
        || biomeId === BiomeId.basalt_deltas;
    case StructureType.Bastion:
      return biomeId === BiomeId.nether_wastes || biomeId === BiomeId.soul_sand_valley
        || biomeId === BiomeId.warped_forest || biomeId === BiomeId.crimson_forest;
    case StructureType.End_City:
      return biomeId === BiomeId.end_midlands || biomeId === BiomeId.end_highlands;
    case StructureType.Treasure:
    case StructureType.Mineshaft:
    case StructureType.Desert_Well:
    case StructureType.Geode:
      return true;
    default:
      return true;
  }
}

export function getStructurePos(
  structureType: number, mc: number, seed: bigint, regX: number, regZ: number
): Pos | null {
  const sconf = getStructureConfig(structureType, mc);
  if (!sconf) return null;

  switch (structureType) {
    case StructureType.Desert_Pyramid:
    case StructureType.Jungle_Temple:
    case StructureType.Swamp_Hut:
    case StructureType.Igloo:
    case StructureType.Village:
    case StructureType.Ocean_Ruin:
    case StructureType.Shipwreck:
    case StructureType.Ruined_Portal:
    case StructureType.Ancient_City:
    case StructureType.Trail_Ruins:
    case StructureType.Trial_Chambers:
      return getFeaturePos(sconf, seed, regX, regZ);

    case StructureType.Monument:
    case StructureType.Mansion:
      return getLargeStructurePos(sconf, seed, regX, regZ);

    case StructureType.End_City: {
      const pos = getLargeStructurePos(sconf, seed, regX, regZ);
      if (pos.x * pos.x + pos.z * pos.z >= 1008 * 1008)
        return pos;
      return null;
    }

    case StructureType.Outpost: {
      const pos = getFeaturePos(sconf, seed, regX, regZ);
      const box: SeedBox = { seed: 0n };
      setAttemptSeed(box, pos.x >> 4, pos.z >> 4);
      if (nextInt(box, 5) === 0) return pos;
      return null;
    }

    case StructureType.Treasure: {
      const pos: Pos = { x: regX * 16 + 9, z: regZ * 16 + 9 };
      const s = BigInt(regX) * REGION_STEP_X + BigInt(regZ) * REGION_STEP_Z + seed + BigInt(sconf.salt);
      const box: SeedBox = { seed: 0n };
      setSeed(box, s);
      if (nextFloat(box) < 0.01) return pos;
      return null;
    }

    case StructureType.Fortress: {
      return getFeaturePos(sconf, seed, regX, regZ);
    }

    case StructureType.Bastion: {
      const pos = getFeaturePos(sconf, seed, regX, regZ);
      const box: SeedBox = { seed: 0n };
      const cgSeed = chunkGenerateRnd(seed, pos.x >> 4, pos.z >> 4);
      setSeedDirect(box, cgSeed);
      if (nextInt(box, 5) >= 2) return pos;
      return null;
    }

    default:
      return null;
  }
}

function setAttemptSeed(box: SeedBox, chunkX: number, chunkZ: number): void {
  setSeed(box, BigInt(chunkX) ^ BigInt(chunkZ));
}

function setSeedDirect(box: SeedBox, val: bigint): void {
  box.seed = val;
}

function chunkGenerateRnd(worldSeed: bigint, chunkX: number, chunkZ: number): bigint {
  const box: SeedBox = { seed: 0n };
  setSeed(box, worldSeed);
  const a = nextLongLocal(box);
  const b = nextLongLocal(box);
  const rnd = (a * BigInt(chunkX)) ^ (b * BigInt(chunkZ)) ^ worldSeed;
  setSeed(box, rnd);
  return box.seed;
}

function nextLongLocal(box: SeedBox): bigint {
  const hi = BigInt(nextBits(box, 32));
  const lo = BigInt(nextBits(box, 32));
  return (hi << 32n) + lo;
}

function nextBits(box: SeedBox, bits: number): number {
  box.seed = (box.seed * 0x5DEECE66Dn + 0xBn) & ((1n << 48n) - 1n);
  return Number(BigInt.asIntN(64, box.seed) >> BigInt(48 - bits));
}
