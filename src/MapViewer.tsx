import { useRef, useState, useCallback, useEffect } from 'react';
import Box from '@mui/material/Box';
import CubiomesMap from './components/CubiomesMap';

export interface Transform {
  x: number;
  y: number;
  scale: number;
}

export interface MapViewerProps {
  seed: bigint;
}

const INITIAL_SCALE = 4;

export default function MapViewer({ seed }: MapViewerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: INITIAL_SCALE });
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const initialized = useRef(false);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });

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
    panStart.current = { x: e.clientX, y: e.clientY };
    (e.target as Element).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    panStart.current = { x: e.clientX, y: e.clientY };
    setTransform((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const handlePointerUp = useCallback(() => {
    isPanning.current = false;
  }, []);

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

  useEffect(() => {
    if (initialized.current || viewport.width === 0 || viewport.height === 0) return;
    initialized.current = true;
    setTransform({
      scale: INITIAL_SCALE,
      x: viewport.width / 2,
      y: viewport.height / 2,
    });
  }, [viewport]);

  return (
    <Box sx={{ flexGrow: 1, overflow: 'hidden', cursor: isPanning.current ? 'grabbing' : 'grab' }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ display: 'block', touchAction: 'none', background: '#121212' }}
      >
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
          <CubiomesMap
            seed={seed}
            transform={transform}
            viewportWidth={viewport.width}
            viewportHeight={viewport.height}
          />
        </g>
      </svg>
    </Box>
  );
}
