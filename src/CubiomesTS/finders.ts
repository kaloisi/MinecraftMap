import { MCVersion, BiomeId } from './biomes';
import { setSeed, nextInt, nextFloat, nextDouble, nextLong, type SeedBox } from './rng';
import { sampleBiomeNoise, SampleFlags } from './biomenoise';
import type { Generator } from './generator';

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

function isOceanic(id: number): boolean {
  return id === BiomeId.ocean || id === BiomeId.frozen_ocean || id === BiomeId.deep_ocean
    || id === BiomeId.warm_ocean || id === BiomeId.lukewarm_ocean || id === BiomeId.cold_ocean
    || id === BiomeId.deep_warm_ocean || id === BiomeId.deep_lukewarm_ocean
    || id === BiomeId.deep_cold_ocean || id === BiomeId.deep_frozen_ocean;
}

function isDeepOcean(id: number): boolean {
  return id === BiomeId.deep_ocean || id === BiomeId.deep_warm_ocean
    || id === BiomeId.deep_lukewarm_ocean || id === BiomeId.deep_cold_ocean
    || id === BiomeId.deep_frozen_ocean;
}

export function isViableFeatureBiome(mc: number, structureType: number, biomeId: number): boolean {
  switch (structureType) {
    case StructureType.Desert_Pyramid:
      return biomeId === BiomeId.desert;

    case StructureType.Jungle_Temple:
      return biomeId === BiomeId.jungle || biomeId === BiomeId.bamboo_jungle;

    case StructureType.Swamp_Hut:
      return biomeId === BiomeId.swamp;

    case StructureType.Igloo:
      return biomeId === BiomeId.snowy_plains || biomeId === BiomeId.snowy_taiga
        || biomeId === BiomeId.snowy_slopes;

    case StructureType.Ocean_Ruin:
      return isOceanic(biomeId);

    case StructureType.Shipwreck:
      return isOceanic(biomeId) || biomeId === BiomeId.beach || biomeId === BiomeId.snowy_beach;

    case StructureType.Ruined_Portal:
    case StructureType.Ruined_Portal_N:
      return true;

    case StructureType.Ancient_City:
      return biomeId === BiomeId.deep_dark;

    case StructureType.Trail_Ruins:
      return biomeId === BiomeId.taiga || biomeId === BiomeId.snowy_taiga
        || biomeId === BiomeId.old_growth_pine_taiga || biomeId === BiomeId.old_growth_spruce_taiga
        || biomeId === BiomeId.old_growth_birch_forest || biomeId === BiomeId.jungle;

    case StructureType.Trial_Chambers:
      return biomeId !== BiomeId.deep_dark;

    case StructureType.Treasure:
      return biomeId === BiomeId.beach || biomeId === BiomeId.snowy_beach;

    case StructureType.Mineshaft:
      return true;

    case StructureType.Desert_Well:
      return biomeId === BiomeId.desert;

    case StructureType.Geode:
      return true;

    case StructureType.Monument:
      return isDeepOcean(biomeId);

    case StructureType.Outpost:
      return biomeId === BiomeId.desert || biomeId === BiomeId.plains
        || biomeId === BiomeId.savanna || biomeId === BiomeId.snowy_plains
        || biomeId === BiomeId.taiga || biomeId === BiomeId.meadow
        || biomeId === BiomeId.frozen_peaks || biomeId === BiomeId.jagged_peaks
        || biomeId === BiomeId.stony_peaks || biomeId === BiomeId.snowy_slopes
        || biomeId === BiomeId.grove || biomeId === BiomeId.cherry_grove;

    case StructureType.Village:
      if (biomeId === BiomeId.plains || biomeId === BiomeId.desert || biomeId === BiomeId.savanna)
        return true;
      if (biomeId === BiomeId.taiga) return true;
      if (biomeId === BiomeId.snowy_plains) return true;
      if (mc >= MCVersion.MC_1_18 && biomeId === BiomeId.meadow) return true;
      return false;

    case StructureType.Mansion:
      return biomeId === BiomeId.dark_forest;

    case StructureType.Fortress:
      return biomeId === BiomeId.nether_wastes || biomeId === BiomeId.soul_sand_valley
        || biomeId === BiomeId.warped_forest || biomeId === BiomeId.crimson_forest
        || biomeId === BiomeId.basalt_deltas;

    case StructureType.Bastion:
      return biomeId === BiomeId.nether_wastes || biomeId === BiomeId.soul_sand_valley
        || biomeId === BiomeId.warped_forest || biomeId === BiomeId.crimson_forest;

    case StructureType.End_City:
      return biomeId === BiomeId.end_midlands || biomeId === BiomeId.end_highlands;

    case StructureType.End_Gateway:
      return biomeId === BiomeId.end_highlands;

    default:
      return true;
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

//==============================================================================
// Finding Strongholds and Spawn (finders.c)
//==============================================================================

/** Iteration state for the stronghold ring generator. */
export interface StrongholdIter {
  pos: Pos;         // accurate location of the current stronghold
  nextapprox: Pos;  // approximate location (+/-112 blocks) of the next stronghold
  index: number;    // stronghold index counter
  ringnum: number;  // ring number for index
  ringmax: number;  // max index within ring
  ringidx: number;  // index within ring
  angle: number;    // next angle within ring
  dist: number;     // next distance from origin (in chunks)
  rnds: SeedBox;    // 48-bit LCG state
  mc: number;       // minecraft version
}

// id_matches: is the biome id contained in the valid-biome bitmasks?
function idMatches(id: number, b: bigint, m: bigint): boolean {
  if (id < 0) return false;
  return id < 128
    ? (b & (1n << BigInt(id))) !== 0n
    : (m & (1n << BigInt(id - 128))) !== 0n;
}

// isOverworld: false for biomes that do not generate in the Overworld.
// Simplified for MC 1.18+ (the only versions this app supports). The mask this
// feeds is only ever tested against Overworld-generated biome ids, so rejecting
// the Nether/End ranges is sufficient — biomes that never generate can be left
// in the mask harmlessly because they never appear in a sample.
function isOverworld(mc: number, id: number): boolean {
  void mc;
  if (id < 0) return false;
  if (id >= BiomeId.small_end_islands && id <= BiomeId.end_barrens) return false; // 40..43
  if (id >= BiomeId.soul_sand_valley && id <= BiomeId.basalt_deltas) return false; // 170..173
  switch (id) {
    case BiomeId.nether_wastes:
    case BiomeId.the_end:
    case BiomeId.the_void:
      return false;
  }
  return true;
}

function isStrongholdBiome(mc: number, id: number): boolean {
  if (!isOverworld(mc, id)) return false;
  if (isOceanic(id)) return false;
  switch (id) {
    case BiomeId.plains:
    case BiomeId.mushroom_fields:
    case BiomeId.taiga_hills:
      return true; // mc >= MC_1_7
    case BiomeId.swamp:
      return false; // mc <= MC_1_6
    case BiomeId.river:
    case BiomeId.frozen_river:
    case BiomeId.beach:
    case BiomeId.snowy_beach:
      return false;
    case BiomeId.mushroom_field_shore:
      return true; // mc >= MC_1_13
    case BiomeId.stony_shore:
      return false; // valid only mc <= MC_1_17
    case BiomeId.bamboo_jungle:
      return true; // simulate MC-199298 (mc >= MC_1_18)
    case BiomeId.mangrove_swamp:
    case BiomeId.deep_dark:
      return false;
    default:
      return true;
  }
}

// locateBiome (MC 1.18+ branch only): finds the nearest matching biome within
// `radius` blocks of (x, z), sampling on a 4-block grid. Emulates the
// order-dependent biome generation of MC-241546 via the shared `dat` accumulator.
function locateBiome(
  g: Generator, x: number, y: number, z: number, radius: number,
  validB: bigint, validM: bigint, rng: SeedBox,
): Pos {
  const out: Pos = { x, z };
  let found = 0;

  x >>= 2;
  z >>= 2;
  radius >>= 2;
  const dat = { val: 0 };

  for (let j = -radius; j <= radius; j++) {
    for (let i = -radius; i <= radius; i++) {
      const id = sampleBiomeNoise(g.bn, null, x + i, y, z + j, dat, 0);
      if (!idMatches(id, validB, validM)) continue;
      if (found === 0 || nextInt(rng, found + 1) === 0) {
        out.x = (x + i) * 4;
        out.z = (z + j) * 4;
      }
      found++;
    }
  }
  return out;
}

/**
 * Finds the approximate location of the first stronghold (+/-112 blocks), which
 * can be determined from the lower 48 bits of the world seed without biome
 * checks. If `sh` is provided it is initialized for iteration via nextStronghold.
 * MC 1.18+ (the modern 1.9+ ring distance formula is used unconditionally).
 */
export function initFirstStronghold(sh: StrongholdIter | null, mc: number, s48: bigint): Pos {
  const rnds: SeedBox = { seed: 0n };
  setSeed(rnds, s48);

  const angle = 2.0 * Math.PI * nextDouble(rnds);
  const dist = (4.0 * 32.0) + (nextDouble(rnds) - 0.5) * 32 * 2.5;

  const p: Pos = {
    x: (Math.round(Math.cos(angle) * dist) * 16) + 8,
    z: (Math.round(Math.sin(angle) * dist) * 16) + 8,
  };

  if (sh) {
    sh.pos = { x: 0, z: 0 };
    sh.nextapprox = { x: p.x, z: p.z };
    sh.index = 0;
    sh.ringnum = 0;
    sh.ringmax = 3;
    sh.ringidx = 0;
    sh.angle = angle;
    sh.dist = dist;
    sh.rnds = rnds;
    sh.mc = mc;
  }

  return p;
}

/**
 * Performs the biome checks for the stronghold iterator, resolving the accurate
 * location of the current stronghold and the approximate location of the next.
 * For MC 1.19.3+ the generator may be null to iterate approximate positions
 * without biome checks. Returns the number of further strongholds after this one.
 */
export function nextStronghold(sh: StrongholdIter, g: Generator | null): number {
  let validB = 0n;
  let validM = 0n;
  for (let i = 0; i < 64; i++) {
    if (isStrongholdBiome(sh.mc, i)) validB |= (1n << BigInt(i));
    if (isStrongholdBiome(sh.mc, i + 128)) validM |= (1n << BigInt(i));
  }

  // The app's MC_1_19 tracks the latest 1.19.x (1.19.3+), which seeds a
  // separate RNG for the biome locate; MC_1_18 consumes the iterator RNG.
  if (sh.mc > MCVersion.MC_1_18) {
    if (g) {
      const lbr: SeedBox = { seed: 0n };
      setSeed(lbr, nextLong(sh.rnds));
      sh.pos = locateBiome(g, sh.nextapprox.x, 0, sh.nextapprox.z, 112, validB, validM, lbr);
    } else {
      nextLong(sh.rnds);
      sh.pos = { x: sh.nextapprox.x, z: sh.nextapprox.z };
    }
  } else {
    if (!g) throw new Error('nextStronghold requires a generator for MC 1.18');
    sh.pos = locateBiome(g, sh.nextapprox.x, 0, sh.nextapprox.z, 112, validB, validM, sh.rnds);
  }

  // staircase is located at (4, 4) in chunk
  sh.pos.x = (sh.pos.x & ~15) + 4;
  sh.pos.z = (sh.pos.z & ~15) + 4;

  sh.ringidx++;
  sh.angle += 2 * Math.PI / sh.ringmax;

  if (sh.ringidx === sh.ringmax) {
    sh.ringnum++;
    sh.ringidx = 0;
    sh.ringmax = sh.ringmax + Math.trunc(2 * sh.ringmax / (sh.ringnum + 1));
    if (sh.ringmax > 128 - sh.index) sh.ringmax = 128 - sh.index;
    sh.angle += nextDouble(sh.rnds) * Math.PI * 2.0;
  }

  sh.dist = (4.0 * 32.0) + (6.0 * sh.ringnum * 32.0) +
    (nextDouble(sh.rnds) - 0.5) * 32 * 2.5;

  sh.nextapprox.x = (Math.round(Math.cos(sh.angle) * sh.dist) * 16) + 8;
  sh.nextapprox.z = (Math.round(Math.sin(sh.angle) * sh.dist) * 16) + 8;
  sh.index++;

  return 128 - (sh.index - 1);
}

// calcFitness: lower is a better spawn candidate. Combines squared climate-band
// violations with a distance-from-origin penalty (MC <= 1.21.1 double formula,
// which covers every version this app supports).
function calcFitness(g: Generator, x: number, z: number): bigint {
  const np = new BigInt64Array(6);
  const flags = SampleFlags.SAMPLE_NO_DEPTH | SampleFlags.SAMPLE_NO_BIOME;
  sampleBiomeNoise(g.bn, np, x >> 2, 0, z >> 2, null, flags);

  const spawnNp: [bigint, bigint][] = [
    [-10000n, 10000n], [-10000n, 10000n], [-1100n, 10000n], [-10000n, 10000n], [0n, 0n],
    [-10000n, -1600n], [1600n, 10000n], // [6]: weirdness for the second noise point
  ];

  let ds = 0n;
  for (let i = 0; i < 5; i++) {
    const a = np[i] - spawnNp[i][1];
    const b = spawnNp[i][0] - np[i];
    const q = a > 0n ? a : (b > 0n ? b : 0n);
    ds += q * q;
  }

  let a = np[5] - spawnNp[5][1];
  let b = spawnNp[5][0] - np[5];
  let q = a > 0n ? a : (b > 0n ? b : 0n);
  const ds1 = ds + q * q;

  a = np[5] - spawnNp[6][1];
  b = spawnNp[6][0] - np[5];
  q = a > 0n ? a : (b > 0n ? b : 0n);
  const ds2 = ds + q * q;

  ds = ds1 <= ds2 ? ds1 : ds2;

  // dependence on distance from origin
  const ax = BigInt(x) * BigInt(x);
  const bz = BigInt(z) * BigInt(z);
  const s = Number(ax + bz) / (2500 * 2500);
  return BigInt(Math.trunc(s * s * 1e8)) + ds;
}

function findFittest(
  g: Generator, pos: Pos, fitness: { v: bigint }, maxrad: number, step: number,
): void {
  const px = pos.x;
  const pz = pos.z;
  for (let rad = step; rad <= maxrad; rad += step) {
    for (let ang = 0; ang <= Math.PI * 2; ang += step / rad) {
      const x = px + Math.trunc(Math.sin(ang) * rad);
      const z = pz + Math.trunc(Math.cos(ang) * rad);
      const fit = calcFitness(g, x, z);
      if (fit < fitness.v) {
        pos.x = x;
        pos.z = z;
        fitness.v = fit;
      }
    }
  }
}

function findFittestPos(g: Generator): Pos {
  const spawn: Pos = { x: 0, z: 0 };
  const fitness = { v: calcFitness(g, 0, 0) };
  findFittest(g, spawn, fitness, 2048.0, 512.0);
  findFittest(g, spawn, fitness, 512.0, 32.0);
  spawn.x = (spawn.x & ~15) + 8;
  spawn.z = (spawn.z & ~15) + 8;
  return spawn;
}

/**
 * Finds the approximate spawn point in the world. MC 1.18+ uses the fitness
 * search (the exact getSpawn refinement depends on the unported SurfaceNoise).
 */
export function estimateSpawn(g: Generator): Pos {
  return findFittestPos(g);
}
