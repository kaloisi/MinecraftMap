import { useMemo, useState, useEffect, memo } from 'react';
import {
  biomeColor,
  setupGenerator,
  applySeed,
  allocCache,
  genBiomes,
  MCVersion,
  Dimension,
} from '../CubiomesTS';
import type { Range } from '../CubiomesTS';

export interface CubiomesMapProps {
  seed: bigint;
  dimension: Dimension;
  mcVersion: MCVersion;
  /** Current viewport transform from the parent MapViewer. */
  transform: { x: number; y: number; scale: number };
  /** SVG viewport dimensions in pixels. */
  viewportWidth: number;
  viewportHeight: number;
}

const TILE_SIZE = 16;
const BUFFER_CHUNKS = 5;
const BATCH_SIZE = 8;

let cachedGen: { seed: bigint; dim: Dimension; ver: MCVersion; gen: ReturnType<typeof setupGenerator> } | null = null;
const tileCache = new Map<string, Int32Array>();
const activeChunks = new Map<string, ChunkData>();

interface ChunkData {
  tileX: number;
  tileZ: number;
  biomes: Int32Array;
}

function getGenerator(seed: bigint, dim: Dimension, ver: MCVersion) {
  if (cachedGen && cachedGen.seed === seed && cachedGen.dim === dim && cachedGen.ver === ver) return cachedGen.gen;
  tileCache.clear();
  activeChunks.clear();
  const gen = setupGenerator(ver);
  applySeed(gen, dim, seed);
  cachedGen = { seed, dim, ver, gen };
  return gen;
}

function tileKeyStr(tx: number, tz: number): string {
  return `${tx},${tz}`;
}

function generateTile(
  generator: ReturnType<typeof setupGenerator>,
  tx: number,
  tz: number,
): Int32Array {
  const range: Range = {
    scale: 4,
    x: tx * TILE_SIZE,
    z: tz * TILE_SIZE,
    sx: TILE_SIZE,
    sz: TILE_SIZE,
    y: 320,
    sy: 1,
  };
  const cache = allocCache(range);
  genBiomes(generator, cache, range);
  return cache;
}

interface MergedRect {
  x: number;
  z: number;
  w: number;
  h: number;
  fill: string;
}

function mergeRects(biomes: Int32Array, size: number): MergedRect[] {
  const result: MergedRect[] = [];
  let previousRuns: MergedRect[] = [];

  for (let z = 0; z < size; z++) {
    const currentRuns: MergedRect[] = [];
    let x = 0;
    while (x < size) {
      const biomeId = biomes[z * size + x];
      const fill = biomeColor(biomeId);
      let runEnd = x + 1;
      while (runEnd < size && biomes[z * size + runEnd] === biomeId) runEnd++;
      const w = runEnd - x;

      let merged = false;
      for (let i = 0; i < previousRuns.length; i++) {
        const r = previousRuns[i];
        if (r.x === x && r.w === w && r.fill === fill) {
          r.h++;
          currentRuns.push(r);
          merged = true;
          break;
        }
      }
      if (!merged) {
        const rect: MergedRect = { x, z, w, h: 1, fill };
        currentRuns.push(rect);
        result.push(rect);
      }
      x = runEnd;
    }
    previousRuns = currentRuns;
  }
  return result;
}

const ChunkTile = memo(function ChunkTile({
  tileX,
  tileZ,
  biomes,
}: ChunkData) {
  const merged = mergeRects(biomes, TILE_SIZE);
  const ox = tileX * TILE_SIZE;
  const oz = tileZ * TILE_SIZE;
  return (
    <g id={`chunk_${tileX}_${tileZ}`}>
      {merged.map((r, i) => (
        <rect
          key={i}
          x={ox + r.x}
          y={oz + r.z}
          width={r.w}
          height={r.h}
          fill={r.fill}
        />
      ))}
    </g>
  );
});

export default function CubiomesMap({
  seed,
  dimension,
  mcVersion,
  transform,
  viewportWidth,
  viewportHeight,
}: CubiomesMapProps) {
  const generator = useMemo(() => getGenerator(seed, dimension, mcVersion), [seed, dimension, mcVersion]);
  const [asyncVersion, setAsyncVersion] = useState(0);

  const pendingKeys = useMemo(() => {
    if (viewportWidth === 0 || viewportHeight === 0) return [];

    const invScale = 1 / transform.scale;
    const worldLeft = -transform.x * invScale;
    const worldTop = -transform.y * invScale;
    const worldRight = worldLeft + viewportWidth * invScale;
    const worldBottom = worldTop + viewportHeight * invScale;

    const tileLeft = Math.floor(worldLeft / TILE_SIZE) - BUFFER_CHUNKS;
    const tileTop = Math.floor(worldTop / TILE_SIZE) - BUFFER_CHUNKS;
    const tileRight = Math.ceil(worldRight / TILE_SIZE) + BUFFER_CHUNKS;
    const tileBottom = Math.ceil(worldBottom / TILE_SIZE) + BUFFER_CHUNKS;

    const desiredKeys = new Set<string>();
    for (let tz = tileTop; tz <= tileBottom; tz++) {
      for (let tx = tileLeft; tx <= tileRight; tx++) {
        desiredKeys.add(tileKeyStr(tx, tz));
      }
    }

    for (const key of activeChunks.keys()) {
      if (!desiredKeys.has(key)) {
        activeChunks.delete(key);
      }
    }

    const pending: string[] = [];
    for (const key of desiredKeys) {
      if (!activeChunks.has(key)) {
        const [tx, tz] = key.split(',').map(Number);
        const cached = tileCache.get(key);
        if (cached) {
          activeChunks.set(key, { tileX: tx, tileZ: tz, biomes: cached });
        } else {
          pending.push(key);
        }
      }
    }

    const centerTx = (tileLeft + tileRight) / 2;
    const centerTz = (tileTop + tileBottom) / 2;
    pending.sort((a, b) => {
      const [ax, az] = a.split(',').map(Number);
      const [bx, bz] = b.split(',').map(Number);
      return (ax - centerTx) ** 2 + (az - centerTz) ** 2
        - ((bx - centerTx) ** 2 + (bz - centerTz) ** 2);
    });

    return pending;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- generator triggers recalc on seed change
  }, [transform, viewportWidth, viewportHeight, generator]);

  useEffect(() => {
    if (pendingKeys.length === 0) return;

    let cancelled = false;
    let i = 0;

    function processBatch() {
      if (cancelled) return;

      const end = Math.min(i + BATCH_SIZE, pendingKeys.length);
      for (; i < end; i++) {
        if (cancelled) return;
        const key = pendingKeys[i];
        if (activeChunks.has(key)) continue;
        const [tx, tz] = key.split(',').map(Number);
        const biomes = generateTile(generator, tx, tz);
        tileCache.set(key, biomes);
        activeChunks.set(key, { tileX: tx, tileZ: tz, biomes });
      }

      setAsyncVersion((v) => v + 1);

      if (i < pendingKeys.length && !cancelled) {
        setTimeout(processBatch, 0);
      }
    }

    setTimeout(processBatch, 0);

    return () => {
      cancelled = true;
    };
  }, [pendingKeys, generator]);

  const chunks = useMemo(
    () => Array.from(activeChunks.values()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pendingKeys, asyncVersion],
  );

  return (
    <>
      {chunks.map((chunk) => (
        <ChunkTile
          key={tileKeyStr(chunk.tileX, chunk.tileZ)}
          tileX={chunk.tileX}
          tileZ={chunk.tileZ}
          biomes={chunk.biomes}
        />
      ))}
    </>
  );
}
