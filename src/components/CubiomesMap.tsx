import { useMemo, memo } from 'react';
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
  /** Current viewport transform from the parent MapViewer. */
  transform: { x: number; y: number; scale: number };
  /** SVG viewport dimensions in pixels. */
  viewportWidth: number;
  viewportHeight: number;
}

const TILE_SIZE = 16;
const BUFFER_CHUNKS = 5;

let cachedGen: { seed: bigint; gen: ReturnType<typeof setupGenerator> } | null = null;
const tileCache = new Map<string, Int32Array>();
const activeChunks = new Map<string, ChunkData>();

interface ChunkData {
  tileX: number;
  tileZ: number;
  biomes: Int32Array;
}

function getGenerator(seed: bigint) {
  if (cachedGen && cachedGen.seed === seed) return cachedGen.gen;
  tileCache.clear();
  activeChunks.clear();
  const gen = setupGenerator(MCVersion.MC_1_21);
  applySeed(gen, Dimension.DIM_OVERWORLD, seed);
  cachedGen = { seed, gen };
  return gen;
}

function tileKeyStr(tx: number, tz: number): string {
  return `${tx},${tz}`;
}

const ChunkTile = memo(function ChunkTile({
  tileX,
  tileZ,
  biomes,
}: ChunkData) {
  const rects: React.ReactElement[] = [];
  for (let z = 0; z < TILE_SIZE; z++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const biomeId = biomes[z * TILE_SIZE + x];
      rects.push(
        <rect
          key={`${x},${z}`}
          x={tileX * TILE_SIZE + x}
          y={tileZ * TILE_SIZE + z}
          width={1}
          height={1}
          fill={biomeColor(biomeId)}
        />,
      );
    }
  }
  return <g id={`chunk_${tileX}_${tileZ}`}>{rects}</g>;
});

export default function CubiomesMap({
  seed,
  transform,
  viewportWidth,
  viewportHeight,
}: CubiomesMapProps) {
  const generator = useMemo(() => getGenerator(seed), [seed]);

  const chunks = useMemo(() => {
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

    for (const key of desiredKeys) {
      if (!activeChunks.has(key)) {
        const [tx, tz] = key.split(',').map(Number);
        let biomes = tileCache.get(key);
        if (!biomes) {
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
          biomes = cache;
          tileCache.set(key, biomes);
        }
        activeChunks.set(key, { tileX: tx, tileZ: tz, biomes });
      }
    }

    return Array.from(activeChunks.values());
  }, [transform, viewportWidth, viewportHeight, generator]);

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
