"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";

type Point = { id: string; lng: number; lat: number };

type ScreenPoint = { id: string; x: number; y: number };

function buildChain(points: ScreenPoint[]): [ScreenPoint, ScreenPoint][] {
  if (points.length < 2) return [];
  const remaining = [...points];
  const chain: ScreenPoint[] = [remaining.shift()!];

  while (remaining.length > 0) {
    const last = chain[chain.length - 1];
    let nearestIdx = 0;
    let nearestDist = Infinity;
    remaining.forEach((p, i) => {
      const d = (p.x - last.x) ** 2 + (p.y - last.y) ** 2;
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    });
    chain.push(remaining.splice(nearestIdx, 1)[0]);
  }

  const edges: [ScreenPoint, ScreenPoint][] = [];
  for (let i = 0; i < chain.length - 1; i++) {
    edges.push([chain[i], chain[i + 1]]);
  }
  return edges;
}

export function GlowLines({
  map,
  points,
}: {
  map: MapLibreMap | null;
  points: Point[];
}) {
  const [edges, setEdges] = useState<[ScreenPoint, ScreenPoint][]>([]);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!map) return;

    const update = () => {
      const screenPoints: ScreenPoint[] = points.map((p) => {
        const { x, y } = map.project([p.lng, p.lat]);
        return { id: p.id, x, y };
      });
      setEdges(buildChain(screenPoints));
    };

    const schedule = () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(update);
    };

    update();
    map.on("move", schedule);
    map.on("zoom", schedule);
    map.on("resize", schedule);

    return () => {
      map.off("move", schedule);
      map.off("zoom", schedule);
      map.off("resize", schedule);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [map, points]);

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full">
      <defs>
        <filter id="glow-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {edges.map(([a, b], i) => {
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2 - 40;
        const d = `M ${a.x} ${a.y} Q ${midX} ${midY} ${b.x} ${b.y}`;
        return (
          <path
            key={`${a.id}-${b.id}-${i}`}
            d={d}
            fill="none"
            stroke="#ff8a3d"
            strokeWidth={1}
            strokeOpacity={0.45}
            strokeDasharray="6 10"
            filter="url(#glow-blur)"
            className="animate-glow-dash"
          />
        );
      })}
    </svg>
  );
}
