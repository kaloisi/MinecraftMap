import { useMemo, useState, useEffect, memo, useRef } from 'react';
import {
  biomeColor,
  biomeName,
  setupGenerator,
  applySeed,
  allocCache,
  genBiomes,
  MCVersion,
  Dimension,
  StructureType,
  getStructureConfig,
  getStructurePos,
  getBiomeAt,
} from '../CubiomesTS';
import { isViableFeatureBiome } from '../structureViability';
import type { Range } from '../CubiomesTS';

export interface CubiomesMapProps {
  seed: bigint;
  dimension: Dimension;
  mcVersion: MCVersion;
  enabledStructures: Set<StructureType>;
  /** Current viewport transform from the parent MapViewer. */
  transform: { x: number; y: number; scale: number };
  /** SVG viewport dimensions in pixels. */
  viewportWidth: number;
  viewportHeight: number;
  /** World-space cursor position, or null when cursor is outside the map. */
  cursorWorld: { x: number; z: number } | null;
  /** Called with the biome name under the cursor. */
  onBiomeHover?: (name: string | null) => void;
}

function dimCoordScale(dim: Dimension): number {
  return dim === Dimension.DIM_NETHER ? NETHER_RATIO : 1;
}

let currentDimension: Dimension = Dimension.DIM_OVERWORLD;

export function lookupBiomeName(worldX: number, worldZ: number): string | null {
  const cs = dimCoordScale(currentDimension);
  const dimX = worldX / cs;
  const dimZ = worldZ / cs;
  const tx = Math.floor(dimX / TILE_SIZE);
  const tz = Math.floor(dimZ / TILE_SIZE);
  const key = tileKeyStr(tx, tz);
  const tile = tileCache.get(key);
  if (!tile) return null;
  const lx = Math.floor(dimX) - tx * TILE_SIZE;
  const lz = Math.floor(dimZ) - tz * TILE_SIZE;
  if (lx < 0 || lx >= TILE_SIZE || lz < 0 || lz >= TILE_SIZE) return null;
  const biomeId = tile[lz * TILE_SIZE + lx];
  return biomeName(biomeId);
}

const TILE_SIZE = 16;
const BUFFER_CHUNKS = 5;
const BATCH_SIZE = 8;
const BIOME_SCALE = 4;
const NETHER_RATIO = 8;

let cachedGen: { seed: bigint; dim: Dimension; ver: MCVersion; gen: ReturnType<typeof setupGenerator> } | null = null;
const tileCache = new Map<string, Int32Array>();
const activeChunks = new Map<string, ChunkData>();

interface ChunkData {
  tileX: number;
  tileZ: number;
  biomes: Int32Array;
}

export function getGenerator(seed: bigint, dim: Dimension, ver: MCVersion) {
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
  coordScale,
}: ChunkData & { coordScale: number }) {
  const merged = mergeRects(biomes, TILE_SIZE);
  const ox = tileX * TILE_SIZE * coordScale;
  const oz = tileZ * TILE_SIZE * coordScale;
  return (
    <g id={`chunk_${tileX}_${tileZ}`}>
      {merged.map((r, i) => (
        <rect
          key={i}
          x={ox + r.x * coordScale}
          y={oz + r.z * coordScale}
          width={r.w * coordScale}
          height={r.h * coordScale}
          fill={r.fill}
        />
      ))}
    </g>
  );
});

const STRUCTURE_COLORS: Partial<Record<StructureType, string>> = {
  [StructureType.Desert_Pyramid]: '#FFD700',
  [StructureType.Jungle_Temple]: '#228B22',
  [StructureType.Swamp_Hut]: '#556B2F',
  [StructureType.Igloo]: '#E0FFFF',
  [StructureType.Village]: '#CD853F',
  [StructureType.Ocean_Ruin]: '#4682B4',
  [StructureType.Shipwreck]: '#8B4513',
  [StructureType.Monument]: '#00CED1',
  [StructureType.Mansion]: '#8B0000',
  [StructureType.Outpost]: '#A0522D',
  [StructureType.Ruined_Portal]: '#9932CC',
  [StructureType.Ruined_Portal_N]: '#9932CC',
  [StructureType.Ancient_City]: '#1C1C1C',
  [StructureType.Treasure]: '#FF4500',
  [StructureType.Mineshaft]: '#808080',
  [StructureType.Desert_Well]: '#F0E68C',
  [StructureType.Geode]: '#DA70D6',
  [StructureType.Fortress]: '#B22222',
  [StructureType.Bastion]: '#2F4F4F',
  [StructureType.End_City]: '#DDA0DD',
  [StructureType.End_Gateway]: '#E6E6FA',
  [StructureType.End_Island]: '#D8BFD8',
  [StructureType.Trail_Ruins]: '#D2691E',
  [StructureType.Trial_Chambers]: '#C0C0C0',
};

const STRUCTURE_LABELS: Partial<Record<StructureType, string>> = {
  [StructureType.Desert_Pyramid]: 'Desert Pyramid',
  [StructureType.Jungle_Temple]: 'Jungle Temple',
  [StructureType.Swamp_Hut]: 'Swamp Hut',
  [StructureType.Igloo]: 'Igloo',
  [StructureType.Village]: 'Village',
  [StructureType.Ocean_Ruin]: 'Ocean Ruin',
  [StructureType.Shipwreck]: 'Shipwreck',
  [StructureType.Monument]: 'Monument',
  [StructureType.Mansion]: 'Mansion',
  [StructureType.Outpost]: 'Outpost',
  [StructureType.Ruined_Portal]: 'Ruined Portal',
  [StructureType.Ruined_Portal_N]: 'Ruined Portal (N)',
  [StructureType.Ancient_City]: 'Ancient City',
  [StructureType.Treasure]: 'Treasure',
  [StructureType.Mineshaft]: 'Mineshaft',
  [StructureType.Desert_Well]: 'Desert Well',
  [StructureType.Geode]: 'Geode',
  [StructureType.Fortress]: 'Fortress',
  [StructureType.Bastion]: 'Bastion',
  [StructureType.End_City]: 'End City',
  [StructureType.End_Gateway]: 'End Gateway',
  [StructureType.End_Island]: 'End Island',
  [StructureType.Trail_Ruins]: 'Trail Ruins',
  [StructureType.Trial_Chambers]: 'Trial Chambers',
};

interface StructureMarker {
  x: number;
  z: number;
  type: StructureType;
}

function findStructuresInView(
  seed: bigint,
  enabledStructures: Set<StructureType>,
  mcVersion: MCVersion,
  worldLeft: number,
  worldTop: number,
  worldRight: number,
  worldBottom: number,
): StructureMarker[] {
  const markers: StructureMarker[] = [];

  const generatorsByDim = new Map<Dimension, ReturnType<typeof setupGenerator>>();
  function getGen(dim: Dimension) {
    let gen = generatorsByDim.get(dim);
    if (!gen) {
      gen = setupGenerator(mcVersion);
      applySeed(gen, dim, seed);
      generatorsByDim.set(dim, gen);
    }
    return gen;
  }

  for (const structType of enabledStructures) {
    const config = getStructureConfig(structType, mcVersion);
    if (!config) continue;
    if (config.dim === Dimension.DIM_END) continue;

    const structDimScale = dimCoordScale(config.dim);

    const regionBlockSize = config.regionSize * 16;
    const blockLeft = worldLeft * BIOME_SCALE / structDimScale;
    const blockRight = worldRight * BIOME_SCALE / structDimScale;
    const blockTop = worldTop * BIOME_SCALE / structDimScale;
    const blockBottom = worldBottom * BIOME_SCALE / structDimScale;
    const minRegX = Math.floor(blockLeft / regionBlockSize) - 1;
    const maxRegX = Math.ceil(blockRight / regionBlockSize) + 1;
    const minRegZ = Math.floor(blockTop / regionBlockSize) - 1;
    const maxRegZ = Math.ceil(blockBottom / regionBlockSize) + 1;

    const gen = getGen(config.dim);

    for (let regZ = minRegZ; regZ <= maxRegZ; regZ++) {
      for (let regX = minRegX; regX <= maxRegX; regX++) {
        const pos = getStructurePos(structType, mcVersion, seed, regX, regZ);
        if (pos) {
          const biome = getBiomeAt(gen, 4, pos.x >> 2, 320, pos.z >> 2);
          if (!isViableFeatureBiome(mcVersion, structType, biome)) continue;
          markers.push({
            x: pos.x * structDimScale / BIOME_SCALE,
            z: pos.z * structDimScale / BIOME_SCALE,
            type: structType,
          });
        }
      }
    }
  }

  return markers;
}

const MARKER_RADIUS = 1.5;

const StructureOverlay = memo(function StructureOverlay({
  markers,
  scale,
}: {
  markers: StructureMarker[];
  scale: number;
}) {
  const fontSize = Math.max(2, 8 / scale);
  const showLabels = scale >= 2;
  return (
    <g>
      {markers.map((m, i) => {
        const color = STRUCTURE_COLORS[m.type] ?? '#FFFFFF';
        return (
          <g key={i}>
            <circle
              cx={m.x}
              cy={m.z}
              r={MARKER_RADIUS}
              fill={color}
              stroke="#000"
              strokeWidth={0.3}
            />
            {showLabels && (
              <text
                x={m.x}
                y={m.z - MARKER_RADIUS - 0.5}
                textAnchor="middle"
                fill="#fff"
                stroke="#000"
                strokeWidth={0.15}
                paintOrder="stroke"
                fontSize={fontSize}
              >
                {STRUCTURE_LABELS[m.type] ?? '?'}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
});

export default function CubiomesMap({
  seed,
  dimension,
  mcVersion,
  enabledStructures,
  transform,
  viewportWidth,
  viewportHeight,
  cursorWorld,
  onBiomeHover,
}: CubiomesMapProps) {
  const generator = useMemo(() => getGenerator(seed, dimension, mcVersion), [seed, dimension, mcVersion]);
  const coordScale = dimCoordScale(dimension);
  currentDimension = dimension;
  const [asyncVersion, setAsyncVersion] = useState(0);

  useEffect(() => {
    if (!onBiomeHover) return;
    if (!cursorWorld) {
      onBiomeHover(null);
      return;
    }
    onBiomeHover(lookupBiomeName(cursorWorld.x, cursorWorld.z));
  }, [cursorWorld, onBiomeHover, asyncVersion]);
  const [structureMarkers, setStructureMarkers] = useState<StructureMarker[]>([]);
  const structureGenId = useRef(0);

  const pendingKeys = useMemo(() => {
    if (viewportWidth === 0 || viewportHeight === 0) return [];

    const invScale = 1 / transform.scale;
    const worldLeft = -transform.x * invScale;
    const worldTop = -transform.y * invScale;
    const worldRight = worldLeft + viewportWidth * invScale;
    const worldBottom = worldTop + viewportHeight * invScale;

    // Convert display coords to dimension-local tile coords
    const dimLeft = worldLeft / coordScale;
    const dimTop = worldTop / coordScale;
    const dimRight = worldRight / coordScale;
    const dimBottom = worldBottom / coordScale;

    const tileLeft = Math.floor(dimLeft / TILE_SIZE) - BUFFER_CHUNKS;
    const tileTop = Math.floor(dimTop / TILE_SIZE) - BUFFER_CHUNKS;
    const tileRight = Math.ceil(dimRight / TILE_SIZE) + BUFFER_CHUNKS;
    const tileBottom = Math.ceil(dimBottom / TILE_SIZE) + BUFFER_CHUNKS;

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

  useEffect(() => {
    if (enabledStructures.size === 0) {
      setStructureMarkers([]);
      return;
    }
    if (viewportWidth === 0 || viewportHeight === 0) return;

    const genId = ++structureGenId.current;

    const invScale = 1 / transform.scale;
    const worldLeft = -transform.x * invScale;
    const worldTop = -transform.y * invScale;
    const worldRight = worldLeft + viewportWidth * invScale;
    const worldBottom = worldTop + viewportHeight * invScale;

    const handle = setTimeout(() => {
      if (genId !== structureGenId.current) return;
      const markers = findStructuresInView(
        seed, enabledStructures, mcVersion,
        worldLeft, worldTop, worldRight, worldBottom,
      );
      if (genId === structureGenId.current) {
        setStructureMarkers(markers);
      }
    }, 0);

    return () => clearTimeout(handle);
  }, [generator, enabledStructures, seed, mcVersion, dimension, transform, viewportWidth, viewportHeight]);

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
          coordScale={coordScale}
        />
      ))}
      {structureMarkers.length > 0 && (
        <StructureOverlay markers={structureMarkers} scale={transform.scale} />
      )}
    </>
  );
}
