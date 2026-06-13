import { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { biomeColor } from '../CubiomesTS';
import type { Range } from '../CubiomesTS';

export interface CubiomesMapProps {
  seed: bigint;
  /** Blocks per pixel at scale=1. Default 4 (biome-resolution). */
  blockScale?: number;
  /** Current viewport transform from the parent MapViewer. */
  transform: { x: number; y: number; scale: number };
  /** SVG viewport dimensions in pixels. */
  viewportWidth: number;
  viewportHeight: number;
}

interface TileKey {
  tileX: number;
  tileZ: number;
}

const TILE_SIZE = 16;

function tileKeyStr(tileX: number, tileZ: number): string {
  return `${tileX},${tileZ}`;
}

export default function CubiomesMap({
  seed: _seed,
  blockScale = 4,
  transform,
  viewportWidth,
  viewportHeight,
}: CubiomesMapProps) {
  const cacheRef = useRef(new Map<string, Int32Array>());
  const [generatorReady, setGeneratorReady] = useState(false);

  useEffect(() => {
    // TODO: call setupGenerator + applySeed when CubiomesTS is ported
    // const gen = setupGenerator(MCVersion.MC_1_21);
    // applySeed(gen, Dimension.DIM_OVERWORLD, seed);
    // generatorRef.current = gen;
    setGeneratorReady(false);
  }, [_seed]);

  const visibleTiles = useMemo(() => {
    const invScale = 1 / transform.scale;
    const worldLeft = (-transform.x * invScale) / blockScale;
    const worldTop = (-transform.y * invScale) / blockScale;
    const worldRight = worldLeft + (viewportWidth * invScale) / blockScale;
    const worldBottom = worldTop + (viewportHeight * invScale) / blockScale;

    const tileLeft = Math.floor(worldLeft / TILE_SIZE);
    const tileTop = Math.floor(worldTop / TILE_SIZE);
    const tileRight = Math.ceil(worldRight / TILE_SIZE);
    const tileBottom = Math.ceil(worldBottom / TILE_SIZE);

    const tiles: TileKey[] = [];
    for (let tz = tileTop; tz <= tileBottom; tz++) {
      for (let tx = tileLeft; tx <= tileRight; tx++) {
        tiles.push({ tileX: tx, tileZ: tz });
      }
    }
    return tiles;
  }, [transform, viewportWidth, viewportHeight, blockScale]);

  const generateTile = useCallback(
    (_range: Range): Int32Array => {
      const cache = new Int32Array(_range.sx * _range.sz);
      // TODO: genBiomes(generatorRef.current, cache, range) when ported
      // For now, fill with a deterministic placeholder pattern
      for (let z = 0; z < _range.sz; z++) {
        for (let x = 0; x < _range.sx; x++) {
          cache[z * _range.sx + x] = Math.abs((_range.x + x) * 7 + (_range.z + z) * 13) % 60;
        }
      }
      return cache;
    },
    [generatorReady],
  );

  const tileElements = useMemo(() => {
    const elements: React.ReactElement[] = [];
    const cache = cacheRef.current;

    for (const { tileX, tileZ } of visibleTiles) {
      const key = tileKeyStr(tileX, tileZ);
      let biomes = cache.get(key);
      if (!biomes) {
        const range: Range = {
          scale: blockScale,
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
              x={(tileX * TILE_SIZE + x) * blockScale}
              y={(tileZ * TILE_SIZE + z) * blockScale}
              width={blockScale}
              height={blockScale}
              fill={biomeColor(biomeId)}
            />,
          );
        }
      }

      elements.push(<g key={key}>{rects}</g>);
    }

    return elements;
  }, [visibleTiles, blockScale, generateTile]);

  return <>{tileElements}</>;
}
