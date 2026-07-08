"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MapLibreMap, Marker, GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { nightGlowStyle } from "./mapStyle";
import { createFractalNoiseCanvas } from "./noiseTexture";
import { dateRangeLabel, sortedDates, type Festival } from "@/lib/festivals";

const EUROPE_SW: [number, number] = [-11.0, 35.0];
const EUROPE_NE: [number, number] = [31.0, 66.0];

type HoverInfo =
  | { kind: "single"; x: number; y: number; festival: Festival }
  | { kind: "cluster"; x: number; y: number; festivals: Festival[]; extra: number };

function hoverDateLabel(festival: Festival): string {
  return sortedDates(festival).length === 0 ? "NA" : dateRangeLabel(festival);
}

function HoverRow({ festival }: { festival: Festival }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="min-w-0 flex-1 truncate font-heading text-white">{festival.name}</span>
      <span className="shrink-0 text-white/70">{hoverDateLabel(festival)}</span>
    </div>
  );
}

const TOOLTIP_WIDTH = 260;
const TOOLTIP_MAX_HEIGHT = 220;
const EDGE_PADDING = 10;

function toFeatureCollection(festivals: Festival[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: festivals
      .filter((f) => Number.isFinite(f.longitude) && Number.isFinite(f.latitude))
      .map((f) => ({
        type: "Feature",
        properties: { fid: f.id },
        geometry: { type: "Point", coordinates: [f.longitude, f.latitude] },
      })),
  };
}

export function TunetrailMap({
  festivals,
  centerMarker,
  pickingLocation,
  onPickLocation,
  onSelectFestival,
}: {
  festivals: Festival[];
  centerMarker: [number, number] | null;
  pickingLocation: boolean;
  onPickLocation: (lngLat: [number, number]) => void;
  onSelectFestival: (festival: Festival) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const centerMarkerRef = useRef<Marker | null>(null);
  const layersReady = useRef(false);
  const festivalsRef = useRef<Festival[]>(festivals);
  festivalsRef.current = festivals;
  const lastClusterId = useRef<number | null>(null);
  const [mapInstance, setMapInstance] = useState<MapLibreMap | null>(null);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: nightGlowStyle,
      center: [10, 50],
      zoom: 3,
      attributionControl: false,
    });
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();

    mapRef.current = map;
    map.on("load", () => {
      const noise = createFractalNoiseCanvas(512, "#1F162B", "#7A2E4D");
      const noiseData = noise.getContext("2d")!.getImageData(0, 0, noise.width, noise.height);
      map.addImage("bg-noise", noiseData);
      map.setPaintProperty("background", "background-pattern", "bg-noise");

      map.resize();
      requestAnimationFrame(() => {
        map.fitBounds([EUROPE_SW, EUROPE_NE], {
          padding: { top: 160, bottom: 420, left: 20, right: 20 },
          animate: false,
        });
      });
      setMapInstance(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      layersReady.current = false;
    };
  }, []);

  // Festival points as a clustered source (scales to thousands of markers).
  useEffect(() => {
    if (!mapInstance) return;

    if (!layersReady.current) {
      mapInstance.addSource("festivals", {
        type: "geojson",
        data: toFeatureCollection(festivals),
        cluster: true,
        clusterRadius: 48,
        clusterMaxZoom: 11,
      });

      mapInstance.addLayer({
        id: "clusters",
        type: "circle",
        source: "festivals",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#FF8FB3",
            20,
            "#FF2D78",
            100,
            "#C9184A",
          ],
          "circle-radius": ["step", ["get", "point_count"], 15, 20, 20, 100, 27],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#FFF9F0",
          "circle-opacity": 0.92,
        },
      });

      mapInstance.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "festivals",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 13,
        },
        paint: { "text-color": "#FFFFFF" },
      });

      mapInstance.addLayer({
        id: "unclustered",
        type: "circle",
        source: "festivals",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#FF2D78",
          "circle-radius": 7,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#FFF9F0",
        },
      });

      mapInstance.on("click", "clusters", (e) => {
        const feature = e.features?.[0];
        const clusterId = feature?.properties?.cluster_id;
        if (clusterId == null) return;
        const source = mapInstance.getSource("festivals") as GeoJSONSource;
        source.getClusterExpansionZoom(clusterId).then((zoom) => {
          mapInstance.easeTo({
            center: (feature!.geometry as GeoJSON.Point).coordinates as [number, number],
            zoom,
          });
        });
      });

      mapInstance.on("click", "unclustered", (e) => {
        const fid = e.features?.[0]?.properties?.fid;
        const festival = festivalsRef.current.find((f) => f.id === fid);
        if (festival) onSelectFestival(festival);
      });

      for (const layer of ["clusters", "unclustered"]) {
        mapInstance.on("mouseenter", layer, () => {
          mapInstance.getCanvas().style.cursor = "pointer";
        });
        mapInstance.on("mouseleave", layer, () => {
          mapInstance.getCanvas().style.cursor = "";
        });
      }

      // Hover tooltips are a desktop-mouse convenience; on touch devices there's
      // no real "hover out", so a tap would leave the tooltip stuck on screen.
      const supportsHover =
        typeof window !== "undefined" &&
        window.matchMedia("(hover: hover) and (pointer: fine)").matches;

      if (supportsHover) {
        mapInstance.on("mousemove", "unclustered", (e) => {
          const fid = e.features?.[0]?.properties?.fid;
          const festival = festivalsRef.current.find((f) => f.id === fid);
          if (festival) {
            setHoverInfo({ kind: "single", x: e.point.x, y: e.point.y, festival });
          }
        });
        mapInstance.on("mouseleave", "unclustered", () => setHoverInfo(null));

        mapInstance.on("mousemove", "clusters", (e) => {
          const feature = e.features?.[0];
          const clusterId = feature?.properties?.cluster_id;
          const pointCount = feature?.properties?.point_count ?? 0;
          if (clusterId == null) return;

          if (clusterId !== lastClusterId.current) {
            lastClusterId.current = clusterId;
            const source = mapInstance.getSource("festivals") as GeoJSONSource;
            source.getClusterLeaves(clusterId, 8, 0).then((leaves) => {
              const matched = leaves
                .map((leaf) => festivalsRef.current.find((f) => f.id === leaf.properties?.fid))
                .filter((f): f is Festival => Boolean(f));
              setHoverInfo({
                kind: "cluster",
                x: e.point.x,
                y: e.point.y,
                festivals: matched,
                extra: Math.max(0, pointCount - matched.length),
              });
            });
          } else {
            setHoverInfo((prev) =>
              prev && prev.kind === "cluster" ? { ...prev, x: e.point.x, y: e.point.y } : prev,
            );
          }
        });
        mapInstance.on("mouseleave", "clusters", () => {
          lastClusterId.current = null;
          setHoverInfo(null);
        });
      }

      layersReady.current = true;
    } else {
      const source = mapInstance.getSource("festivals") as GeoJSONSource | undefined;
      source?.setData(toFeatureCollection(festivals));
    }
  }, [mapInstance, festivals, onSelectFestival]);

  // Radius center marker (manually picked / searched point)
  useEffect(() => {
    if (!mapInstance) return;

    centerMarkerRef.current?.remove();
    centerMarkerRef.current = null;

    if (centerMarker) {
      const el = document.createElement("div");
      el.className =
        "h-4 w-4 rounded-full border-2 border-white/90 bg-[#FFB347] animate-user-pulse";
      centerMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat(centerMarker)
        .addTo(mapInstance);
    }
  }, [mapInstance, centerMarker]);

  // Click-to-pick-location mode
  useEffect(() => {
    if (!mapInstance || !pickingLocation) return;

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      onPickLocation([e.lngLat.lng, e.lngLat.lat]);
    };

    mapInstance.getCanvas().style.cursor = "crosshair";
    mapInstance.on("click", handleClick);

    return () => {
      mapInstance.getCanvas().style.cursor = "";
      mapInstance.off("click", handleClick);
    };
  }, [mapInstance, pickingLocation, onPickLocation]);

  const containerWidth = containerRef.current?.clientWidth ?? 0;
  const containerHeight = containerRef.current?.clientHeight ?? 0;
  const tooltipLeft = hoverInfo
    ? Math.min(
        Math.max(hoverInfo.x + 14, EDGE_PADDING),
        Math.max(EDGE_PADDING, containerWidth - TOOLTIP_WIDTH - EDGE_PADDING),
      )
    : 0;
  const tooltipTop = hoverInfo
    ? Math.min(
        Math.max(hoverInfo.y + 14, EDGE_PADDING),
        Math.max(EDGE_PADDING, containerHeight - TOOLTIP_MAX_HEIGHT - EDGE_PADDING),
      )
    : 0;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0">
        <div ref={containerRef} className="h-full w-full" />
      </div>

      {hoverInfo && (
        <div
          className="pointer-events-none absolute z-30 max-h-[220px] overflow-hidden rounded-2xl border border-white/10 bg-white/10 p-3 text-xs shadow-lg backdrop-blur-xl"
          style={{ left: tooltipLeft, top: tooltipTop, width: TOOLTIP_WIDTH }}
        >
          {hoverInfo.kind === "single" ? (
            <HoverRow festival={hoverInfo.festival} />
          ) : (
            <div className="flex flex-col gap-1.5">
              {hoverInfo.festivals.map((f) => (
                <HoverRow key={f.id} festival={f} />
              ))}
              {hoverInfo.extra > 0 && (
                <span className="text-white/50">+{hoverInfo.extra} flere</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
