import type { PerlinNoise, OctaveNoise, DoublePerlinNoise } from './types';
import type { Xoroshiro } from './rng';
import {
  nextInt, nextDouble, skipNextN,
  xNextLong, xNextInt, xNextDouble,
  lerp,
} from './rng';

function indexedLerp(idx: number, a: number, b: number, c: number): number {
  switch (idx & 0xf) {
    case 0:  return  a + b;
    case 1:  return -a + b;
    case 2:  return  a - b;
    case 3:  return -a - b;
    case 4:  return  a + c;
    case 5:  return -a + c;
    case 6:  return  a - c;
    case 7:  return -a - c;
    case 8:  return  b + c;
    case 9:  return -b + c;
    case 10: return  b - c;
    case 11: return -b - c;
    case 12: return  a + b;
    case 13: return -b + c;
    case 14: return -a + b;
    case 15: return -b - c;
    default: return 0;
  }
}

function createPerlinNoise(): PerlinNoise {
  return {
    d: new Uint8Array(257),
    a: 0,
    b: 0,
    c: 0,
    amplitude: 1.0,
    lacunarity: 1.0,
    h2: 0,
    d2: 0,
    t2: 0,
  };
}

function maintainPrecision(x: number): number {
  return x;
}

export function perlinInit(noise: PerlinNoise, seed: { seed: bigint }): void {
  noise.a = nextDouble(seed) * 256.0;
  noise.b = nextDouble(seed) * 256.0;
  noise.c = nextDouble(seed) * 256.0;
  noise.amplitude = 1.0;
  noise.lacunarity = 1.0;

  const idx = noise.d;
  for (let i = 0; i < 256; i++) {
    idx[i] = i;
  }
  for (let i = 0; i < 256; i++) {
    const j = nextInt(seed, 256 - i) + i;
    const n = idx[i];
    idx[i] = idx[j];
    idx[j] = n;
  }
  idx[256] = idx[0];
  const i2 = Math.floor(noise.b);
  const d2 = noise.b - i2;
  noise.h2 = i2 & 0xff;
  noise.d2 = d2;
  noise.t2 = d2 * d2 * d2 * (d2 * (d2 * 6.0 - 15.0) + 10.0);
}

export function xPerlinInit(noise: PerlinNoise, xr: Xoroshiro): void {
  noise.a = xNextDouble(xr) * 256.0;
  noise.b = xNextDouble(xr) * 256.0;
  noise.c = xNextDouble(xr) * 256.0;
  noise.amplitude = 1.0;
  noise.lacunarity = 1.0;

  const idx = noise.d;
  for (let i = 0; i < 256; i++) {
    idx[i] = i;
  }
  for (let i = 0; i < 256; i++) {
    const j = xNextInt(xr, 256 - i) + i;
    const n = idx[i];
    idx[i] = idx[j];
    idx[j] = n;
  }
  idx[256] = idx[0];
  const i2 = Math.floor(noise.b);
  const d2 = noise.b - i2;
  noise.h2 = i2 & 0xff;
  noise.d2 = d2;
  noise.t2 = d2 * d2 * d2 * (d2 * (d2 * 6.0 - 15.0) + 10.0);
}

export function samplePerlin(
  noise: PerlinNoise,
  d1: number, d2: number, d3: number,
  yamp: number, ymin: number,
): number {
  let h2: number;
  let t2: number;

  if (d2 === 0.0) {
    d2 = noise.d2;
    h2 = noise.h2;
    t2 = noise.t2;
  } else {
    d2 += noise.b;
    const i2 = Math.floor(d2);
    d2 -= i2;
    h2 = (i2 & 0xff);
    t2 = d2 * d2 * d2 * (d2 * (d2 * 6.0 - 15.0) + 10.0);
  }

  d1 += noise.a;
  d3 += noise.c;

  const i1 = Math.floor(d1);
  const i3 = Math.floor(d3);
  d1 -= i1;
  d3 -= i3;

  const h1 = (i1 & 0xff);
  const h3 = (i3 & 0xff);

  const t1 = d1 * d1 * d1 * (d1 * (d1 * 6.0 - 15.0) + 10.0);
  const t3 = d3 * d3 * d3 * (d3 * (d3 * 6.0 - 15.0) + 10.0);

  if (yamp) {
    const yclamp = ymin < d2 ? ymin : d2;
    d2 -= Math.floor(yclamp / yamp) * yamp;
  }

  const idx = noise.d;

  // uint8_t arithmetic in C wraps mod 256; idx has 257 entries so idx[val+1] is safe
  const a1 = (idx[h1] + h2) & 0xff;
  const b1 = (idx[h1 + 1] + h2) & 0xff;

  const a2 = (idx[a1] + h3) & 0xff;
  const a3 = (idx[a1 + 1] + h3) & 0xff;
  const b2 = (idx[b1] + h3) & 0xff;
  const b3 = (idx[b1 + 1] + h3) & 0xff;

  let l1 = indexedLerp(idx[a2], d1, d2, d3);
  const l2 = indexedLerp(idx[b2], d1 - 1, d2, d3);
  let l3 = indexedLerp(idx[a3], d1, d2 - 1, d3);
  const l4 = indexedLerp(idx[b3], d1 - 1, d2 - 1, d3);
  let l5 = indexedLerp(idx[a2 + 1], d1, d2, d3 - 1);
  const l6 = indexedLerp(idx[b2 + 1], d1 - 1, d2, d3 - 1);
  let l7 = indexedLerp(idx[a3 + 1], d1, d2 - 1, d3 - 1);
  const l8 = indexedLerp(idx[b3 + 1], d1 - 1, d2 - 1, d3 - 1);

  l1 = lerp(t1, l1, l2);
  l3 = lerp(t1, l3, l4);
  l5 = lerp(t1, l5, l6);
  l7 = lerp(t1, l7, l8);

  l1 = lerp(t2, l1, l3);
  l5 = lerp(t2, l5, l7);

  return lerp(t3, l1, l5);
}

function simplexGrad(idx: number, x: number, y: number, z: number, d: number): number {
  let con = d - x * x - y * y - z * z;
  if (con < 0) return 0;
  con *= con;
  return con * con * indexedLerp(idx, x, y, z);
}

export function sampleSimplex2D(noise: PerlinNoise, x: number, y: number): number {
  const SKEW = 0.5 * (Math.sqrt(3) - 1.0);
  const UNSKEW = (3.0 - Math.sqrt(3)) / 6.0;

  const hf = (x + y) * SKEW;
  const hx = Math.floor(x + hf);
  const hz = Math.floor(y + hf);
  const mhxz = (hx + hz) * UNSKEW;
  const x0 = x - (hx - mhxz);
  const y0 = y - (hz - mhxz);
  const offx = x0 > y0 ? 1 : 0;
  const offz = offx === 0 ? 1 : 0;
  const x1 = x0 - offx + UNSKEW;
  const y1 = y0 - offz + UNSKEW;
  const x2 = x0 - 1.0 + 2.0 * UNSKEW;
  const y2 = y0 - 1.0 + 2.0 * UNSKEW;
  let gi0 = noise.d[0xff & hz];
  let gi1 = noise.d[0xff & (hz + offz)];
  let gi2 = noise.d[0xff & (hz + 1)];
  gi0 = noise.d[0xff & (gi0 + hx)];
  gi1 = noise.d[0xff & (gi1 + hx + offx)];
  gi2 = noise.d[0xff & (gi2 + hx + 1)];
  let t = 0;
  t += simplexGrad(gi0 % 12, x0, y0, 0.0, 0.5);
  t += simplexGrad(gi1 % 12, x1, y1, 0.0, 0.5);
  t += simplexGrad(gi2 % 12, x2, y2, 0.0, 0.5);
  return 70.0 * t;
}

export function octaveInit(
  noise: OctaveNoise,
  seed: { seed: bigint },
  omin: number,
  len: number,
): void {
  const end = omin + len - 1;
  let persist = 1.0 / ((1 << len) - 1.0);
  let lacuna = Math.pow(2.0, end);

  if (len < 1 || end > 0) {
    throw new Error('octaveInit(): unsupported octave range');
  }

  const octaves: PerlinNoise[] = [];
  let i: number;

  if (end === 0) {
    const p = createPerlinNoise();
    perlinInit(p, seed);
    p.amplitude = persist;
    p.lacunarity = lacuna;
    octaves.push(p);
    persist *= 2.0;
    lacuna *= 0.5;
    i = 1;
  } else {
    skipNextN(seed, BigInt(-end * 262));
    i = 0;
  }

  for (; i < len; i++) {
    const p = createPerlinNoise();
    perlinInit(p, seed);
    p.amplitude = persist;
    p.lacunarity = lacuna;
    octaves.push(p);
    persist *= 2.0;
    lacuna *= 0.5;
  }

  noise.octaves = octaves;
  noise.octcnt = len;
}

const md5_octave_n: [bigint, bigint][] = [
  [0xb198de63a8012672n, 0x7b84cad43ef7b5a8n], // octave_-12
  [0x0fd787bfbc403ec3n, 0x74a4a31ca21b48b8n], // octave_-11
  [0x36d326eed40efeb2n, 0x5be9ce18223c636an], // octave_-10
  [0x082fe255f8be6631n, 0x4e96119e22dedc81n], // octave_-9
  [0x0ef68ec68504005en, 0x48b6bf93a2789640n], // octave_-8
  [0xf11268128982754fn, 0x257a1d670430b0aan], // octave_-7
  [0xe51c98ce7d1de664n, 0x5f9478a733040c45n], // octave_-6
  [0x6d7b49e7e429850an, 0x2e3063c622a24777n], // octave_-5
  [0xbd90d5377ba1b762n, 0xc07317d419a7548dn], // octave_-4
  [0x53d39c6752dac858n, 0xbcd1c5a80ab65b3en], // octave_-3
  [0xb4a24d7a84e7677bn, 0x023ff9668e89b5c4n], // octave_-2
  [0xdffa22b534c5f608n, 0xb9b67517d3665ca9n], // octave_-1
  [0xd50708086cef4d7cn, 0x6e1651ecc7f43309n], // octave_0
];

const lacuna_ini = [
  1, 0.5, 0.25, 1 / 8, 1 / 16, 1 / 32, 1 / 64, 1 / 128, 1 / 256, 1 / 512, 1 / 1024,
  1 / 2048, 1 / 4096,
];

const persist_ini = [
  0, 1, 2 / 3, 4 / 7, 8 / 15, 16 / 31, 32 / 63, 64 / 127, 128 / 255, 256 / 511,
];

export function xOctaveInit(
  noise: OctaveNoise,
  xr: Xoroshiro,
  octaves: PerlinNoise[],
  amplitudes: number[],
  omin: number,
  len: number,
  nmax: number,
): number {
  let lacuna = lacuna_ini[-omin];
  let persist = persist_ini[len];
  const xlo = xNextLong(xr);
  const xhi = xNextLong(xr);
  let n = 0;

  for (let i = 0; i < len && n !== nmax; i++, lacuna *= 2.0, persist *= 0.5) {
    if (amplitudes[i] === 0) continue;
    const pxr: Xoroshiro = {
      lo: xlo ^ md5_octave_n[12 + omin + i][0],
      hi: xhi ^ md5_octave_n[12 + omin + i][1],
    };
    xPerlinInit(octaves[n], pxr);
    octaves[n].amplitude = amplitudes[i] * persist;
    octaves[n].lacunarity = lacuna;
    n++;
  }

  noise.octaves = octaves.slice(0, n);
  noise.octcnt = n;
  return n;
}

export function sampleOctaveAmp(
  noise: OctaveNoise,
  x: number, y: number, z: number,
  yamp: number, ymin: number, ydefault: number,
): number {
  let v = 0;
  for (let i = 0; i < noise.octcnt; i++) {
    const p = noise.octaves[i];
    const lf = p.lacunarity;
    const ax = maintainPrecision(x * lf);
    const ay = ydefault ? -p.b : maintainPrecision(y * lf);
    const az = maintainPrecision(z * lf);
    const pv = samplePerlin(p, ax, ay, az, yamp * lf, ymin * lf);
    v += p.amplitude * pv;
  }
  return v;
}

export function sampleOctave(noise: OctaveNoise, x: number, y: number, z: number): number {
  let v = 0;
  for (let i = 0; i < noise.octcnt; i++) {
    const p = noise.octaves[i];
    const lf = p.lacunarity;
    const ax = maintainPrecision(x * lf);
    const ay = maintainPrecision(y * lf);
    const az = maintainPrecision(z * lf);
    const pv = samplePerlin(p, ax, ay, az, 0, 0);
    v += p.amplitude * pv;
  }
  return v;
}

export function doublePerlinInit(
  noise: DoublePerlinNoise,
  seed: { seed: bigint },
  omin: number,
  len: number,
): void {
  noise.amplitude = (10.0 / 6.0) * len / (len + 1);
  octaveInit(noise.octA, seed, omin, len);
  octaveInit(noise.octB, seed, omin, len);
}

const amp_ini = [
  0, 5 / 6, 10 / 9, 15 / 12, 20 / 15, 25 / 18, 30 / 21, 35 / 24, 40 / 27, 45 / 30,
];

export function xDoublePerlinInit(
  noise: DoublePerlinNoise,
  xr: Xoroshiro,
  octaves: PerlinNoise[],
  amplitudes: number[],
  omin: number,
  len: number,
  nmax: number,
): number {
  let n = 0;
  let na = -1;
  let nb = -1;
  if (nmax > 0) {
    na = (nmax + 1) >> 1;
    nb = nmax - na;
  }
  const nA = xOctaveInit(noise.octA, xr, octaves, amplitudes, omin, len, na);
  n += nA;
  n += xOctaveInit(noise.octB, xr, octaves.slice(nA), amplitudes, omin, len, nb);

  let trimmedLen = len;
  for (let i = trimmedLen - 1; i >= 0 && amplitudes[i] === 0.0; i--)
    trimmedLen--;
  for (let i = 0; amplitudes[i] === 0.0; i++)
    trimmedLen--;
  noise.amplitude = amp_ini[trimmedLen];
  return n;
}

export function sampleDoublePerlin(
  noise: DoublePerlinNoise,
  x: number, y: number, z: number,
): number {
  const f = 337.0 / 331.0;
  let v = 0;
  v += sampleOctave(noise.octA, x, y, z);
  v += sampleOctave(noise.octB, x * f, y * f, z * f);
  return v * noise.amplitude;
}

export { createPerlinNoise };
