import { useRef, useState, useCallback, useEffect } from 'react';
import Box from '@mui/material/Box';

interface Transform {
  x: number;
  y: number;
  scale: number;
}

export default function MapViewer() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
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
        style={{ display: 'block', touchAction: 'none' }}
      >
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
          {/* Placeholder grid to demonstrate pan/zoom */}
          <rect x={-500} y={-500} width={1000} height={1000} fill="#1a1a2e" />
          {Array.from({ length: 21 }, (_, i) => {
            const pos = -500 + i * 50;
            return (
              <g key={i}>
                <line x1={pos} y1={-500} x2={pos} y2={500} stroke="#333" strokeWidth={0.5} />
                <line x1={-500} y1={pos} x2={500} y2={pos} stroke="#333" strokeWidth={0.5} />
              </g>
            );
          })}
          <text x={0} y={0} textAnchor="middle" dominantBaseline="central" fill="#666" fontSize={16}>
            Map Viewer
          </text>
        </g>
      </svg>
    </Box>
  );
}
