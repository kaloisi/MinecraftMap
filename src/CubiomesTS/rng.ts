const MASK48 = (1n << 48n) - 1n;
const MASK64 = 0xFFFFFFFFFFFFFFFFn;
const MASK32 = 0xFFFFFFFFn;
const LCG_MULT = 0x5DEECE66Dn;
const LCG_ADD = 0xBn;

export interface SeedBox {
  seed: bigint;
}

export interface Xoroshiro {
  lo: bigint;
  hi: bigint;
}

export function rotl64(x: bigint, b: number): bigint {
  return ((x << BigInt(b)) | (x >> BigInt(64 - b))) & MASK64;
}

export function rotr32(a: number, b: number): number {
  return ((a >>> b) | (a << (32 - b))) | 0;
}

export function floordiv(a: number, b: number): number {
  a = a | 0;
  b = b | 0;
  const q = (a / b) | 0;
  const r = (a % b) | 0;
  return q - (((a ^ b) < 0 && r !== 0) ? 1 : 0);
}

// Java Random LCG

export function setSeed(box: SeedBox, value: bigint): void {
  box.seed = (value ^ LCG_MULT) & MASK48;
}

export function next(box: SeedBox, bits: number): number {
  box.seed = (box.seed * LCG_MULT + LCG_ADD) & MASK48;
  return Number(BigInt.asIntN(64, box.seed) >> BigInt(48 - bits));
}

export function nextInt(box: SeedBox, n: number): number {
  const m = n - 1;

  if ((m & n) === 0) {
    const x = BigInt(n) * BigInt(next(box, 31));
    return Number(BigInt.asIntN(64, x) >> 31n);
  }

  let bits: number;
  let val: number;
  do {
    bits = next(box, 31);
    val = bits % n;
  } while (((bits - val + m) | 0) < 0);
  return val;
}

export function nextLong(box: SeedBox): bigint {
  return ((BigInt(next(box, 32)) << 32n) + BigInt(next(box, 32))) & MASK64;
}

export function nextFloat(box: SeedBox): number {
  return next(box, 24) / (1 << 24);
}

export function nextDouble(box: SeedBox): number {
  let x = BigInt(next(box, 26));
  x = (x << 27n) + BigInt(next(box, 27));
  return Number(BigInt.asIntN(64, x)) / (2 ** 53);
}

export function skipNextN(box: SeedBox, n: bigint): void {
  let m = 1n;
  let a = 0n;
  let im = LCG_MULT;
  let ia = LCG_ADD;

  for (let k = n & MASK64; k; k >>= 1n) {
    if (k & 1n) {
      m = (m * im) & MASK64;
      a = (im * a + ia) & MASK64;
    }
    ia = ((im + 1n) * ia) & MASK64;
    im = (im * im) & MASK64;
  }

  box.seed = (box.seed * m + a) & MASK48;
}

// Xoroshiro 128

export function xSetSeed(xr: Xoroshiro, value: bigint): void {
  const XL = 0x9E3779B97F4A7C15n;
  const XH = 0x6A09E667F3BCC909n;
  const A = 0xBF58476D1CE4E5B9n;
  const B = 0x94D049BB133111EBn;

  let l = (value ^ XH) & MASK64;
  let h = (l + XL) & MASK64;

  l = ((l ^ (l >> 30n)) * A) & MASK64;
  h = ((h ^ (h >> 30n)) * A) & MASK64;
  l = ((l ^ (l >> 27n)) * B) & MASK64;
  h = ((h ^ (h >> 27n)) * B) & MASK64;
  l = (l ^ (l >> 31n)) & MASK64;
  h = (h ^ (h >> 31n)) & MASK64;

  xr.lo = l;
  xr.hi = h;
}

export function xNextLong(xr: Xoroshiro): bigint {
  const l = xr.lo;
  let h = xr.hi;
  const n = (rotl64((l + h) & MASK64, 17) + l) & MASK64;
  h ^= l;
  xr.lo = (rotl64(l, 49) ^ h ^ ((h << 21n) & MASK64)) & MASK64;
  xr.hi = rotl64(h, 28);
  return n;
}

export function xNextInt(xr: Xoroshiro, n: number): number {
  const nb = BigInt(n) & MASK32;
  let r = ((xNextLong(xr) & MASK32) * nb) & MASK64;
  if ((r & MASK32) < nb) {
    const threshold = ((~nb + 1n) & MASK32) % nb;
    while ((r & MASK32) < threshold) {
      r = ((xNextLong(xr) & MASK32) * nb) & MASK64;
    }
  }
  return Number(r >> 32n);
}

export function xNextDouble(xr: Xoroshiro): number {
  return Number(xNextLong(xr) >> 11n) * 1.1102230246251565e-16;
}

export function xNextFloat(xr: Xoroshiro): number {
  return Number(xNextLong(xr) >> 40n) * 5.9604645e-8;
}

export function xSkipN(xr: Xoroshiro, count: number): void {
  for (let i = 0; i < count; i++) {
    xNextLong(xr);
  }
}

export function xNextLongJ(xr: Xoroshiro): bigint {
  // Signed 32-bit truncation of each half, then recombine
  const a = BigInt.asIntN(32, xNextLong(xr) >> 32n);
  const b = BigInt.asIntN(32, xNextLong(xr) >> 32n);
  return (((a << 32n) & MASK64) + ((b & MASK32))) & MASK64;
}

export function xNextIntJ(xr: Xoroshiro, n: number): number {
  const m = n - 1;

  if ((m & n) === 0) {
    const x = BigInt(n) * (xNextLong(xr) >> 33n);
    return Number(BigInt.asIntN(64, x) >> 31n);
  }

  let bits: number;
  let val: number;
  do {
    bits = Number(xNextLong(xr) >> 33n);
    val = bits % n;
  } while (((bits - val + m) | 0) < 0);
  return val;
}

// MC Seed Helpers

export function mcStepSeed(s: bigint, salt: bigint): bigint {
  return (s * ((s * 6364136223846793005n + 1442695040888963407n) & MASK64) + salt) & MASK64;
}

export function mcFirstInt(s: bigint, mod: number): number {
  let ret = Number(BigInt.asIntN(64, s) >> 24n) % mod;
  if (ret < 0) ret += mod;
  return ret;
}

export function mcFirstIsZero(s: bigint, mod: number): boolean {
  return (Number(BigInt.asIntN(64, s) >> 24n) % mod) === 0;
}

export function getChunkSeed(ss: bigint, x: number, z: number): bigint {
  let cs = (ss + BigInt(x)) & MASK64;
  cs = mcStepSeed(cs, BigInt(z));
  cs = mcStepSeed(cs, BigInt(x));
  cs = mcStepSeed(cs, BigInt(z));
  return cs;
}

export function getLayerSalt(salt: bigint): bigint {
  let ls = mcStepSeed(salt, salt);
  ls = mcStepSeed(ls, salt);
  ls = mcStepSeed(ls, salt);
  return ls;
}

export function getStartSalt(ws: bigint, ls: bigint): bigint {
  let st = ws;
  st = mcStepSeed(st, ls);
  st = mcStepSeed(st, ls);
  st = mcStepSeed(st, ls);
  return st;
}

export function getStartSeed(ws: bigint, ls: bigint): bigint {
  let ss = getStartSalt(ws, ls);
  ss = mcStepSeed(ss, 0n);
  return ss;
}

// Arithmetic

export function lerp(part: number, from: number, to: number): number {
  return from + part * (to - from);
}

export function lerp2(
  dx: number, dy: number,
  v00: number, v10: number, v01: number, v11: number,
): number {
  return lerp(dy, lerp(dx, v00, v10), lerp(dx, v01, v11));
}

export function lerp3(
  dx: number, dy: number, dz: number,
  v000: number, v100: number, v010: number, v110: number,
  v001: number, v101: number, v011: number, v111: number,
): number {
  return lerp(dz,
    lerp2(dx, dy, v000, v100, v010, v110),
    lerp2(dx, dy, v001, v101, v011, v111),
  );
}

export function clampedLerp(part: number, from: number, to: number): number {
  if (part <= 0) return from;
  if (part >= 1) return to;
  return lerp(part, from, to);
}

export function mulInv(x: bigint, m: bigint): bigint {
  if (BigInt.asIntN(64, m) <= 1n) return 0n;

  const n = m;
  let a = 0n;
  let b = 1n;

  while (BigInt.asIntN(64, x) > 1n) {
    if (m === 0n) return 0n;
    const q = x / m;
    let t = m;
    m = x % m;
    x = t;
    t = a;
    a = (b - q * a) & MASK64;
    b = t;
  }

  if (BigInt.asIntN(64, b) < 0n) {
    b = (b + n) & MASK64;
  }
  return b;
}
