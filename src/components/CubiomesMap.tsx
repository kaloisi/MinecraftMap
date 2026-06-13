import { useRef, useMemo, useCallback } from 'react';
import { biomeColor } from '../CubiomesTS';
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

const PLACEHOLDER_BIOMES = [
  0, 1, 2, 4, 5, 6, 7, 12, 14, 16, 21, 24, 27, 29, 35, 37,
  40, 41, 42, 44, 45, 46, 177, 178, 179, 180, 181, 182, 184,
];

function tileKeyStr(tx: number, tz: number): string {
  return `${tx},${tz}`;
}

export default function CubiomesMap({
  seed: _seed,
  transform,
  viewportWidth,
  viewportHeight,
}: CubiomesMapProps) {
  const cacheRef = useRef(new Map<string, Int32Array>());

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

  const generateTile = useCallback(
    (range: Range): Int32Array => {
      const cache = new Int32Array(range.sx * range.sz);
      // TODO: genBiomes(generator, cache, range) when CubiomesTS is ported
      for (let z = 0; z < range.sz; z++) {
        for (let x = 0; x < range.sx; x++) {
          const wx = range.x + x;
          const wz = range.z + z;
          const hash = Math.abs(wx * 374761393 + wz * 668265263) >>> 0;
          cache[z * range.sx + x] = PLACEHOLDER_BIOMES[hash % PLACEHOLDER_BIOMES.length];
        }
      }
      return cache;
    },
    [],
  );

  const tileElements = useMemo(() => {
    const elements: React.ReactElement[] = [];
    const cache = cacheRef.current;

    for (const { tileX, tileZ } of visibleTiles) {
      const key = tileKeyStr(tileX, tileZ);
      let biomes = cache.get(key);
      if (!biomes) {
        const range: Range = {
          scale: 1,
          x: tileX * TILE_SIZE,
          z: tileZ * TILE_SIZE,
          sx: TILE_SIZE,
          sz: TILE_SIZE,
          y: 320,
          sy: 1,
        };
        biomes = generateTile(range);
        cache.set(key, biomes);
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
  }, [visibleTiles, generateTile]);

  return <>{tileElements}</>;
}
