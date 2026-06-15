import { useRef, useState, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import Box from '@mui/material/Box';
import CubiomesMap from './components/CubiomesMap';
import type { Dimension, MCVersion, StructureType } from './CubiomesTS';
import type { CustomMarker } from './MapDataFile';

export interface Transform {
  x: number;
  y: number;
  scale: number;
}

export interface HighlightLine {
  fromX: number;
  fromZ: number;
  toX: number;
  toZ: number;
}

export interface MapViewerProps {
  seed: bigint;
  dimension: Dimension;
  mcVersion: MCVersion;
  enabledStructures: Set<StructureType>;
  initialCenter?: { x: number; z: number };
  initialZoom?: number;
  onBiomeHover?: (name: string | null) => void;
  onCenterChange?: (x: number, z: number) => void;
  onZoomChange?: (zoom: number) => void;
  onCursorChange?: (pos: { x: number; z: number } | null) => void;
  onLocationClick?: (worldPos: { x: number; z: number }) => void;
  highlightLine?: HighlightLine | null;
  customMarkers?: CustomMarker[];
}

export interface MapViewerHandle {
  goToOrigin: () => void;
  goToPosition: (blockX: number, blockZ: number) => void;
}

const BIOME_SCALE = 4;

const INITIAL_SCALE = 4;

const MapViewer = forwardRef<MapViewerHandle, MapViewerProps>(function MapViewer({ seed, dimension, mcVersion, enabledStructures, initialCenter, initialZoom, onBiomeHover, onCenterChange, onZoomChange, onCursorChange, onLocationClick, highlightLine, customMarkers }, ref) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: initialZoom ?? INITIAL_SCALE });
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [cursorWorld, setCursorWorld] = useState<{ x: number; z: number } | null>(null);
  const initialized = useRef(false);
  const isPanning = useRef(false);
  const didPan = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const transformRef = useRef(transform);
  transformRef.current = transform;

  useImperativeHandle(ref, () => ({
    goToOrigin() {
      setTransform({
        scale: INITIAL_SCALE,
        x: viewport.width / 2,
        y: viewport.height / 2,
      });
    },
    goToPosition(blockX: number, blockZ: number) {
      setTransform((prev) => ({
        scale: prev.scale,
        x: viewport.width / 2 - (blockX / BIOME_SCALE) * prev.scale,
        y: viewport.height / 2 - (blockZ / BIOME_SCALE) * prev.scale,
      }));
    },
  }), [viewport]);

  useEffect(() => {
    if (viewport.width === 0) return;
    if (onCenterChange) {
      const centerWorldX = (viewport.width / 2 - transform.x) / transform.scale;
      const centerWorldZ = (viewport.height / 2 - transform.y) / transform.scale;
      onCenterChange(
        Math.round(centerWorldX * BIOME_SCALE),
        Math.round(centerWorldZ * BIOME_SCALE),
      );
    }
    if (onZoomChange) {
      onZoomChange(transform.scale);
    }
  }, [transform, viewport, onCenterChange, onZoomChange]);

  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const t = transformRef.current;
    return {
      x: (sx - t.x) / t.scale,
      z: (sy - t.y) / t.scale,
    };
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 1 / 1.1;

    setTransform((prev) => {
      const newScale = Math.min(Math.max(prev.scale * zoomFactor, 0.1), 50);
      const ratio = newScale / prev.scale;
      return {
        scale: newScale,
        x: mouseX - ratio * (mouseX - prev.x),
        y: mouseY - ratio * (mouseY - prev.y),
      };
    });
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isPanning.current = true;
    didPan.current = false;
    panStart.current = { x: e.clientX, y: e.clientY };
    (e.target as Element).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const world = screenToWorld(e.clientX, e.clientY);
    if (world) {
      setCursorWorld(world);
      onCursorChange?.(world);
    }

    if (!isPanning.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) didPan.current = true;
    panStart.current = { x: e.clientX, y: e.clientY };
    setTransform((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  }, [screenToWorld]);

  const handlePointerUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (didPan.current) return;
    const world = screenToWorld(e.clientX, e.clientY);
    if (world) onLocationClick?.(world);
  }, [screenToWorld, onLocationClick]);

  const handlePointerLeave = useCallback(() => {
    setCursorWorld(null);
    onCursorChange?.(null);
  }, [onCursorChange]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const prevent = (e: WheelEvent) => e.preventDefault();
    svg.addEventListener('wheel', prevent, { passive: false });
    return () => svg.removeEventListener('wheel', prevent);
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setViewport({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  const initialCenterRef = useRef(initialCenter);
  const initialZoomRef = useRef(initialZoom);

  useEffect(() => {
    if (initialized.current || viewport.width === 0 || viewport.height === 0) return;
    initialized.current = true;
    const cx = initialCenterRef.current?.x ?? 0;
    const cz = initialCenterRef.current?.z ?? 0;
    const scale = initialZoomRef.current ?? INITIAL_SCALE;
    setTransform({
      scale,
      x: viewport.width / 2 - (cx / BIOME_SCALE) * scale,
      y: viewport.height / 2 - (cz / BIOME_SCALE) * scale,
    });
  }, [viewport]);

  return (
    <Box sx={{ flexGrow: 1, overflow: 'hidden', cursor: isPanning.current ? 'grabbing' : 'grab' }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        onWheel={handleWheel}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        style={{ display: 'block', touchAction: 'none', background: '#121212' }}
      >
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
          <CubiomesMap
            seed={seed}
            dimension={dimension}
            mcVersion={mcVersion}
            enabledStructures={enabledStructures}
            transform={transform}
            viewportWidth={viewport.width}
            viewportHeight={viewport.height}
            cursorWorld={cursorWorld}
            onBiomeHover={onBiomeHover}
            customMarkers={customMarkers}
          />
          {highlightLine && (
            <line
              x1={highlightLine.fromX}
              y1={highlightLine.fromZ}
              x2={highlightLine.toX}
              y2={highlightLine.toZ}
              stroke="#FFD700"
              strokeWidth={1.5 / transform.scale}
              strokeDasharray={`${4 / transform.scale} ${3 / transform.scale}`}
              pointerEvents="none"
            />
          )}
        </g>
      </svg>
    </Box>
  );
});

export default MapViewer;
