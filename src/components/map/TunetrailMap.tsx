"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { nightGlowStyle } from "./mapStyle";
import { createFractalNoiseCanvas } from "./noiseTexture";
import type { Festival } from "@/lib/festivals";

const NORWAY_SW: [number, number] = [3.0, 57.5];
const NORWAY_NE: [number, number] = [17.5, 69.5];

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
  const markersRef = useRef<Marker[]>([]);
  const centerMarkerRef = useRef<Marker | null>(null);
  const [mapInstance, setMapInstance] = useState<MapLibreMap | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: nightGlowStyle,
      center: [9.5, 63.5],
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

      map.fitBounds([NORWAY_SW, NORWAY_NE], {
        padding: { top: 160, bottom: 420, left: 30, right: 30 },
        animate: false,
      });
      setMapInstance(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Festival markers
  useEffect(() => {
    if (!mapInstance) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    festivals.forEach((festival) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className =
        "h-4 w-4 rounded-full border-2 border-white/80 bg-[#FF2D78] animate-marker-pulse cursor-pointer";
      el.addEventListener("click", () => onSelectFestival(festival));

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([festival.longitude, festival.latitude])
        .addTo(mapInstance);

      markersRef.current.push(marker);
    });
  }, [mapInstance, festivals, onSelectFestival]);

  // Radius center marker (GPS position or manually picked point)
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

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0">
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </div>
  );
}
