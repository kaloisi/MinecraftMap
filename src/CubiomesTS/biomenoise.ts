import { MCVersion } from './biomes';
import type { DoublePerlinNoise, PerlinNoise } from './types';
import {
  xSetSeed, xNextLong,
  type Xoroshiro,
} from './rng';
import {
  xDoublePerlinInit,
  sampleDoublePerlin,
  createPerlinNoise,
} from './noise';
import {
  btree18, btree192, btree19, btree20, btree21wd,
  type BiomeTree,
} from './btrees';

export const enum NP {
  NP_TEMPERATURE = 0,
  NP_HUMIDITY = 1,
  NP_CONTINENTALNESS = 2,
  NP_EROSION = 3,
  NP_SHIFT = 4,
  NP_WEIRDNESS = 5,
  NP_MAX = 6,
}
export const NP_DEPTH = NP.NP_SHIFT;

export const enum SampleFlags {
  SAMPLE_NO_SHIFT = 0x1,
  SAMPLE_NO_DEPTH = 0x2,
  SAMPLE_NO_BIOME = 0x4,
}

const enum SP {
  SP_CONTINENTALNESS = 0,
  SP_EROSION = 1,
  SP_RIDGES = 2,
  SP_WEIRDNESS = 3,
}

export interface Spline {
  len: number;
  typ: number;
  loc: Float32Array;
  der: Float32Array;
  val: (Spline | FixSpline)[];
}

export interface FixSpline {
  len: 1;
  val: number;
}

export interface SplineStack {
  stack: Spline[];
  fstack: FixSpline[];
  len: number;
  flen: number;
}

export interface BiomeNoise {
  climate: DoublePerlinNoise[];
  oct: PerlinNoise[];
  sp: Spline | null;
  ss: SplineStack;
  nptype: number;
  mc: number;
}

function createSplineStack(): SplineStack {
  return {
    stack: [],
    fstack: [],
    len: 0,
    flen: 0,
  };
}

function createSpline(): Spline {
  return {
    len: 0,
    typ: 0,
    loc: new Float32Array(12),
    der: new Float32Array(12),
    val: [],
  };
}

function addSplineVal(rsp: Spline, loc: number, val: Spline | FixSpline, der: number): void {
  rsp.loc[rsp.len] = loc;
  rsp.val[rsp.len] = val;
  rsp.der[rsp.len] = der;
  rsp.len++;
}

function createFixSpline(ss: SplineStack, val: number): FixSpline {
  const sp: FixSpline = { len: 1, val };
  ss.fstack[ss.flen++] = sp;
  return sp;
}

function lerp(part: number, from: number, to: number): number {
  return from + part * (to - from);
}

function getOffsetValue(weirdness: number, continentalness: number): number {
  const f0 = 1.0 - (1.0 - continentalness) * 0.5;
  const f1 = 0.5 * (1.0 - continentalness);
  const f2 = (weirdness + 1.17) * 0.46082947;
  const off = f2 * f0 - f1;
  if (weirdness < -0.7)
    return off > -0.2222 ? off : -0.2222;
  else
    return off > 0 ? off : 0;
}

function createSpline_38219(ss: SplineStack, f: number, bl: boolean): Spline {
  const sp = createSpline();
  ss.stack[ss.len++] = sp;
  sp.typ = SP.SP_RIDGES;

  const i = getOffsetValue(-1.0, f);
  const k = getOffsetValue(1.0, f);
  const l_val = 1.0 - (1.0 - f) * 0.5;
  let u = 0.5 * (1.0 - f);
  const l = u / (0.46082947 * l_val) - 1.17;

  if (-0.65 < l && l < 1.0) {
    u = getOffsetValue(-0.65, f);
    const p = getOffsetValue(-0.75, f);
    const q = (p - i) * 4.0;
    const r = getOffsetValue(l, f);
    const s = (k - r) / (1.0 - l);

    addSplineVal(sp, -1.0, createFixSpline(ss, i), q);
    addSplineVal(sp, -0.75, createFixSpline(ss, p), 0);
    addSplineVal(sp, -0.65, createFixSpline(ss, u), 0);
    addSplineVal(sp, l - 0.01, createFixSpline(ss, r), 0);
    addSplineVal(sp, l, createFixSpline(ss, r), s);
    addSplineVal(sp, 1.0, createFixSpline(ss, k), s);
  } else {
    u = (k - i) * 0.5;
    if (bl) {
      addSplineVal(sp, -1.0, createFixSpline(ss, i > 0.2 ? i : 0.2), 0);
      addSplineVal(sp, 0.0, createFixSpline(ss, lerp(0.5, i, k)), u);
    } else {
      addSplineVal(sp, -1.0, createFixSpline(ss, i), u);
    }
    addSplineVal(sp, 1.0, createFixSpline(ss, k), u);
  }
  return sp;
}

function createFlatOffsetSpline(
  ss: SplineStack, f: number, g: number, h: number, i: number, j: number, k: number
): Spline {
  const sp = createSpline();
  ss.stack[ss.len++] = sp;
  sp.typ = SP.SP_RIDGES;

  let l = 0.5 * (g - f); if (l < k) l = k;
  const m = 5.0 * (h - g);

  addSplineVal(sp, -1.0, createFixSpline(ss, f), l);
  addSplineVal(sp, -0.4, createFixSpline(ss, g), l < m ? l : m);
  addSplineVal(sp, 0.0, createFixSpline(ss, h), m);
  addSplineVal(sp, 0.4, createFixSpline(ss, i), 2.0 * (i - h));
  addSplineVal(sp, 1.0, createFixSpline(ss, j), 0.7 * (j - i));

  return sp;
}

function createLandSpline(
  ss: SplineStack, f: number, g: number, h: number, i: number, j: number, k: number, bl: boolean
): Spline {
  const sp1 = createSpline_38219(ss, lerp(i, 0.6, 1.5), bl);
  const sp2 = createSpline_38219(ss, lerp(i, 0.6, 1.0), bl);
  const sp3 = createSpline_38219(ss, i, bl);
  const ih = 0.5 * i;
  const sp4 = createFlatOffsetSpline(ss, f - 0.15, ih, ih, ih, i * 0.6, 0.5);
  const sp5 = createFlatOffsetSpline(ss, f, j * i, g * i, ih, i * 0.6, 0.5);
  const sp6 = createFlatOffsetSpline(ss, f, j, j, g, h, 0.5);
  const sp7 = createFlatOffsetSpline(ss, f, j, j, g, h, 0.5);

  const sp8 = createSpline();
  ss.stack[ss.len++] = sp8;
  sp8.typ = SP.SP_RIDGES;
  addSplineVal(sp8, -1.0, createFixSpline(ss, f), 0.0);
  addSplineVal(sp8, -0.4, sp6, 0.0);
  addSplineVal(sp8, 0.0, createFixSpline(ss, h + 0.07), 0.0);

  const sp9 = createFlatOffsetSpline(ss, -0.02, k, k, g, h, 0.0);
  const sp = createSpline();
  ss.stack[ss.len++] = sp;
  sp.typ = SP.SP_EROSION;
  addSplineVal(sp, -0.85, sp1, 0.0);
  addSplineVal(sp, -0.7, sp2, 0.0);
  addSplineVal(sp, -0.4, sp3, 0.0);
  addSplineVal(sp, -0.35, sp4, 0.0);
  addSplineVal(sp, -0.1, sp5, 0.0);
  addSplineVal(sp, 0.2, sp6, 0.0);
  if (bl) {
    addSplineVal(sp, 0.4, sp7, 0.0);
    addSplineVal(sp, 0.45, sp8, 0.0);
    addSplineVal(sp, 0.55, sp8, 0.0);
    addSplineVal(sp, 0.58, sp7, 0.0);
  }
  addSplineVal(sp, 0.7, sp9, 0.0);
  return sp;
}

function isFixSpline(sp: Spline | FixSpline): sp is FixSpline {
  return sp.len === 1 && 'val' in sp && typeof (sp as FixSpline).val === 'number' && !('typ' in sp);
}

export function getSpline(sp: Spline | FixSpline, vals: Float32Array): number {
  if (!sp || sp.len <= 0 || sp.len >= 12) {
    throw new Error('getSpline(): bad parameters');
  }

  if (isFixSpline(sp)) {
    return sp.val;
  }

  const s = sp as Spline;
  const f = vals[s.typ];
  let i: number;

  for (i = 0; i < s.len; i++) {
    if (s.loc[i] >= f) break;
  }
  if (i === 0 || i === s.len) {
    if (i) i--;
    const v = getSpline(s.val[i], vals);
    return v + s.der[i] * (f - s.loc[i]);
  }
  const sp1 = s.val[i - 1];
  const sp2 = s.val[i];
  const g = s.loc[i - 1];
  const h = s.loc[i];
  const k = (f - g) / (h - g);
  const ld = s.der[i - 1];
  const m = s.der[i];
  const n = getSpline(sp1, vals);
  const o = getSpline(sp2, vals);
  const p = ld * (h - g) - (o - n);
  const q = -m * (h - g) + (o - n);
  const r = lerp(k, n, o) + k * (1.0 - k) * lerp(k, p, q);
  return r;
}

function initClimateSeed(
  dpn: DoublePerlinNoise,
  oct: PerlinNoise[],
  xlo: bigint,
  xhi: bigint,
  large: boolean,
  nptype: number,
  nmax: number,
): number {
  const pxr: Xoroshiro = { lo: 0n, hi: 0n };
  let n = 0;

  switch (nptype) {
    case NP.NP_SHIFT: {
      const amp = [1, 1, 1, 0];
      pxr.lo = xlo ^ 0x080518cf6af25384n;
      pxr.hi = xhi ^ 0x3f3dfb40a54febd5n;
      n += xDoublePerlinInit(dpn, pxr, oct, amp, -3, 4, nmax);
      break;
    }
    case NP.NP_TEMPERATURE: {
      const amp = [1.5, 0, 1, 0, 0, 0];
      pxr.lo = xlo ^ (large ? 0x944b0073edf549dbn : 0x5c7e6b29735f0d7fn);
      pxr.hi = xhi ^ (large ? 0x4ff44347e9d22b96n : 0xf7d86f1bbc734988n);
      n += xDoublePerlinInit(dpn, pxr, oct, amp, large ? -12 : -10, 6, nmax);
      break;
    }
    case NP.NP_HUMIDITY: {
      const amp = [1, 1, 0, 0, 0, 0];
      pxr.lo = xlo ^ (large ? 0x71b8ab943dbd5301n : 0x81bb4d22e8dc168en);
      pxr.hi = xhi ^ (large ? 0xbb63ddcf39ff7a2bn : 0xf1c8b4bea16303cdn);
      n += xDoublePerlinInit(dpn, pxr, oct, amp, large ? -10 : -8, 6, nmax);
      break;
    }
    case NP.NP_CONTINENTALNESS: {
      const amp = [1, 1, 2, 2, 2, 1, 1, 1, 1];
      pxr.lo = xlo ^ (large ? 0x9a3f51a113fce8dcn : 0x83886c9d0ae3a662n);
      pxr.hi = xhi ^ (large ? 0xee2dbd157e5dcdadn : 0xafa638a61b42e8adn);
      n += xDoublePerlinInit(dpn, pxr, oct, amp, large ? -11 : -9, 9, nmax);
      break;
    }
    case NP.NP_EROSION: {
      const amp = [1, 1, 0, 1, 1];
      pxr.lo = xlo ^ (large ? 0x8c984b1f8702a951n : 0xd02491e6058f6fd8n);
      pxr.hi = xhi ^ (large ? 0xead7b1f92bae535fn : 0x4792512c94c17a80n);
      n += xDoublePerlinInit(dpn, pxr, oct, amp, large ? -11 : -9, 5, nmax);
      break;
    }
    case NP.NP_WEIRDNESS: {
      const amp = [1, 2, 1, 0, 0, 0];
      pxr.lo = xlo ^ 0xefc8ef4d36102b34n;
      pxr.hi = xhi ^ 0x1beeeb324a0f24ean;
      n += xDoublePerlinInit(dpn, pxr, oct, amp, -7, 6, nmax);
      break;
    }
    default:
      throw new Error(`unsupported climate parameter ${nptype}`);
  }
  return n;
}

export function createBiomeNoise(): BiomeNoise {
  return {
    climate: [],
    oct: [],
    sp: null,
    ss: createSplineStack(),
    nptype: -1,
    mc: 0,
  };
}

export function initBiomeNoise(bn: BiomeNoise, mc: number): void {
  const ss = createSplineStack();
  bn.ss = ss;

  const sp = createSpline();
  ss.stack[ss.len++] = sp;
  sp.typ = SP.SP_CONTINENTALNESS;

  const sp1 = createLandSpline(ss, -0.15, 0.00, 0.0, 0.1, 0.00, -0.03, false);
  const sp2 = createLandSpline(ss, -0.10, 0.03, 0.1, 0.1, 0.01, -0.03, false);
  const sp3 = createLandSpline(ss, -0.10, 0.03, 0.1, 0.7, 0.01, -0.03, true);
  const sp4 = createLandSpline(ss, -0.05, 0.03, 0.1, 1.0, 0.01, 0.01, true);

  addSplineVal(sp, -1.10, createFixSpline(ss, 0.044), 0.0);
  addSplineVal(sp, -1.02, createFixSpline(ss, -0.2222), 0.0);
  addSplineVal(sp, -0.51, createFixSpline(ss, -0.2222), 0.0);
  addSplineVal(sp, -0.44, createFixSpline(ss, -0.12), 0.0);
  addSplineVal(sp, -0.18, createFixSpline(ss, -0.12), 0.0);
  addSplineVal(sp, -0.16, sp1, 0.0);
  addSplineVal(sp, -0.15, sp1, 0.0);
  addSplineVal(sp, -0.10, sp2, 0.0);
  addSplineVal(sp, 0.25, sp3, 0.0);
  addSplineVal(sp, 1.00, sp4, 0.0);

  bn.sp = sp;
  bn.mc = mc;

  for (let i = 0; i < NP.NP_MAX; i++) {
    bn.climate.push({
      amplitude: 0,
      octA: { octaves: [], octcnt: 0 },
      octB: { octaves: [], octcnt: 0 },
    });
  }
}

export function setBiomeSeed(bn: BiomeNoise, seed: bigint, large: boolean): void {
  const pxr: Xoroshiro = { lo: 0n, hi: 0n };
  xSetSeed(pxr, seed);
  const xlo = xNextLong(pxr);
  const xhi = xNextLong(pxr);

  // Pre-allocate octave buffer (2*23 = 46 octaves max)
  const oct: PerlinNoise[] = [];
  for (let i = 0; i < 46; i++) {
    oct.push(createPerlinNoise());
  }
  bn.oct = oct;

  let n = 0;
  for (let i = 0; i < NP.NP_MAX; i++) {
    n += initClimateSeed(bn.climate[i], oct.slice(n), xlo, xhi, large, i, -1);
  }
  bn.nptype = -1;
}

function getNpDist(np: BigInt64Array, bt: BiomeTree, idx: number): bigint {
  let ds = 0n;
  const node = bt.nodes[idx];

  for (let i = 0; i < 6; i++) {
    const paramIdx = Number((node >> BigInt(8 * i)) & 0xFFn);
    const npVal = np[i];
    const paramHi = BigInt(bt.param[2 * paramIdx + 1]);
    const paramLo = BigInt(bt.param[2 * paramIdx]);
    const a = npVal - paramHi;
    const b = paramLo - npVal;
    const d = a > 0n ? a : b > 0n ? b : 0n;
    ds += d * d;
  }
  return ds;
}

function getResultingNode(
  np: BigInt64Array, bt: BiomeTree, idx: number,
  alt: number, ds: bigint, depth: number
): number {
  if (bt.steps[depth] === 0) return idx;

  let step: number;
  do {
    step = bt.steps[depth];
    depth++;
  } while (idx + step >= bt.len);

  const node = bt.nodes[idx];
  let inner = Number((node >> 48n) & 0xFFFFn);

  let leaf = alt;

  for (let i = 0; i < bt.order; i++) {
    const dsInner = getNpDist(np, bt, inner);
    if (dsInner < ds) {
      const leaf2 = getResultingNode(np, bt, inner, leaf, ds, depth);
      let dsLeaf2: bigint;
      if (inner === leaf2) dsLeaf2 = dsInner;
      else dsLeaf2 = getNpDist(np, bt, leaf2);
      if (dsLeaf2 < ds) {
        ds = dsLeaf2;
        leaf = leaf2;
      }
    }
    inner += step;
    if (inner >= bt.len) break;
  }

  return leaf;
}

export function climateToBiome(mc: number, np: BigInt64Array, dat: { val: number } | null): number {
  let bt: BiomeTree;

  if (mc >= MCVersion.MC_1_21)
    bt = btree21wd;
  else if (mc >= MCVersion.MC_1_20)
    bt = btree20;
  else if (mc >= MCVersion.MC_1_19)
    bt = btree19;
  else if (mc >= 19) // MC_1_19_2 approximate
    bt = btree192;
  else
    bt = btree18;

  let idx: number;
  if (dat) {
    const alt = dat.val;
    const ds = getNpDist(np, bt, alt);
    idx = getResultingNode(np, bt, 0, alt, ds, 0);
    dat.val = idx;
  } else {
    // -1n as bigint is max unsigned — effectively infinity
    idx = getResultingNode(np, bt, 0, 0, 0xFFFFFFFFFFFFFFFFn, 0);
  }

  return Number((bt.nodes[idx] >> 48n) & 0xFFn);
}

export function sampleBiomeNoise(
  bn: BiomeNoise, np: BigInt64Array | null,
  x: number, y: number, z: number,
  dat: { val: number } | null, sampleFlags: number
): number {
  if (bn.nptype >= 0) {
    if (np) np.fill(0n);
    const id = Math.round(10000.0 * sampleClimatePara(bn, np, x, z));
    return id;
  }

  let d = 0;
  let px: number = x, pz: number = z;
  if (!(sampleFlags & SampleFlags.SAMPLE_NO_SHIFT)) {
    px += sampleDoublePerlin(bn.climate[NP.NP_SHIFT], x, 0, z) * 4.0;
    pz += sampleDoublePerlin(bn.climate[NP.NP_SHIFT], z, x, 0) * 4.0;
  }

  const c = sampleDoublePerlin(bn.climate[NP.NP_CONTINENTALNESS], px, 0, pz);
  const e = sampleDoublePerlin(bn.climate[NP.NP_EROSION], px, 0, pz);
  const w = sampleDoublePerlin(bn.climate[NP.NP_WEIRDNESS], px, 0, pz);

  if (!(sampleFlags & SampleFlags.SAMPLE_NO_DEPTH)) {
    const npParam = new Float32Array([
      c, e, -3.0 * (Math.abs(Math.abs(w) - 0.6666667) - 0.33333334), w,
    ]);
    const off = getSpline(bn.sp!, npParam) + 0.015;
    d = 1.0 - (y * 4) / 128.0 - 83.0 / 160.0 + off;
  }

  const t = sampleDoublePerlin(bn.climate[NP.NP_TEMPERATURE], px, 0, pz);
  const h = sampleDoublePerlin(bn.climate[NP.NP_HUMIDITY], px, 0, pz);

  const lNp = np ?? new BigInt64Array(6);
  lNp[0] = BigInt(Math.round(10000.0 * t));
  lNp[1] = BigInt(Math.round(10000.0 * h));
  lNp[2] = BigInt(Math.round(10000.0 * c));
  lNp[3] = BigInt(Math.round(10000.0 * e));
  lNp[4] = BigInt(Math.round(10000.0 * d));
  lNp[5] = BigInt(Math.round(10000.0 * w));

  let id = -1;
  if (!(sampleFlags & SampleFlags.SAMPLE_NO_BIOME)) {
    id = climateToBiome(bn.mc, lNp, dat);
  }
  return id;
}

export function sampleClimatePara(bn: BiomeNoise, np: BigInt64Array | null, x: number, z: number): number {
  if (bn.nptype === NP_DEPTH) {
    const c = sampleDoublePerlin(bn.climate[NP.NP_CONTINENTALNESS], x, 0, z);
    const e = sampleDoublePerlin(bn.climate[NP.NP_EROSION], x, 0, z);
    const w = sampleDoublePerlin(bn.climate[NP.NP_WEIRDNESS], x, 0, z);

    const npParam = new Float32Array([
      c, e, -3.0 * (Math.abs(Math.abs(w) - 0.6666667) - 0.33333334), w,
    ]);
    const off = getSpline(bn.sp!, npParam) + 0.015;
    const d = 1.0 - (0 * 4) / 128.0 - 83.0 / 160.0 + off;
    if (np) {
      np[2] = BigInt(Math.round(10000.0 * c));
      np[3] = BigInt(Math.round(10000.0 * e));
      np[4] = BigInt(Math.round(10000.0 * d));
      np[5] = BigInt(Math.round(10000.0 * w));
    }
    return d;
  }
  const p = sampleDoublePerlin(bn.climate[bn.nptype], x, 0, z);
  if (np) {
    np[bn.nptype] = BigInt(Math.round(10000.0 * p));
  }
  return p;
}

export function genBiomeNoiseScaled(bn: BiomeNoise, out: Int32Array, r: import('./types').Range): void {
  if (r.sy <= 0) r.sy = 1;

  if (r.scale === 1) {
    throw new Error('Voronoi scale 1:1 not yet implemented');
  }

  const scale = r.scale > 4 ? Math.floor(r.scale / 4) : 1;
  const mid = Math.floor(scale / 2);
  const opt = r.scale > 4;
  const dat: { val: number } | null = opt ? { val: 0 } : null;
  const flags = opt ? SampleFlags.SAMPLE_NO_SHIFT : 0;
  let p = 0;

  for (let k = 0; k < r.sy; k++) {
    const yk = r.y + k;
    for (let j = 0; j < r.sz; j++) {
      const zj = (r.z + j) * scale + mid;
      for (let i = 0; i < r.sx; i++) {
        const xi = (r.x + i) * scale + mid;
        out[p] = sampleBiomeNoise(bn, null, xi, yk, zj, dat, flags);
        p++;
      }
    }
  }
}
