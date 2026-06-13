import { useMemo } from 'react';
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

let cachedGen: { seed: bigint; gen: ReturnType<typeof setupGenerator> } | null = null;
const tileCache = new Map<string, Int32Array>();

function getGenerator(seed: bigint) {
  if (cachedGen && cachedGen.seed === seed) return cachedGen.gen;
  tileCache.clear();
  const gen = setupGenerator(MCVersion.MC_1_21);
  applySeed(gen, Dimension.DIM_OVERWORLD, seed);
  cachedGen = { seed, gen };
  return gen;
}

function tileKeyStr(tx: number, tz: number): string {
  return `${tx},${tz}`;
}

export default function CubiomesMap({
  seed,
  transform,
  viewportWidth,
  viewportHeight,
}: CubiomesMapProps) {
  const generator = useMemo(() => getGenerator(seed), [seed]);

  const visibleTiles = useMemo(() => {
    if (viewportWidth === 0 || viewportHeight === 0) return [];

    const invScale = 1 / transform.scale;
    const worldLeft = -transform.x * invScale;
    const worldTop = -transform.y * invScale;
    const worldRight = worldLeft + viewportWidth * invScale;
    const worldBottom = worldTop + viewportHeight * invScale;

    const tileLeft = Math.floor(worldLeft / TILE_SIZE);
    const tileTop = Math.floor(worldTop / TILE_SIZE);
    const tileRight = Math.ceil(worldRight / TILE_SIZE);
    const tileBottom = Math.ceil(worldBottom / TILE_SIZE);

    const tiles: { tileX: number; tileZ: number }[] = [];
    for (let tz = tileTop; tz <= tileBottom; tz++) {
      for (let tx = tileLeft; tx <= tileRight; tx++) {
        tiles.push({ tileX: tx, tileZ: tz });
      }
    }
    return tiles;
  }, [transform, viewportWidth, viewportHeight]);

  const tileElements = useMemo(() => {
    const elements: React.ReactElement[] = [];

    for (const { tileX, tileZ } of visibleTiles) {
      const key = tileKeyStr(tileX, tileZ);
      let biomes = tileCache.get(key);
      if (!biomes) {
        const range: Range = {
          scale: 4,
          x: tileX * TILE_SIZE,
          z: tileZ * TILE_SIZE,
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

      elements.push(<g key={key}>{rects}</g>);
    }

    return elements;
  }, [visibleTiles, generator]);

  return <>{tileElements}</>;
}
