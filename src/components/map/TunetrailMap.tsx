"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { nightGlowStyle } from "./mapStyle";
import { createFractalNoiseCanvas } from "./noiseTexture";
import type { Festival } from "@/lib/festivals";
import { distanceKm } from "@/lib/festivals";

const NORWAY_SW: [number, number] = [3.0, 57.5];
const NORWAY_NE: [number, number] = [17.5, 69.5];

export function TunetrailMap({
  festivals,
  radiusKm,
  searchQuery,
  onSelectFestival,
}: {
  festivals: Festival[];
  radiusKm: number | null;
  searchQuery: string;
  onSelectFestival: (festival: Festival) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [mapInstance, setMapInstance] = useState<MapLibreMap | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null,
  );

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
        padding: { top: 100, bottom: 420, left: 30, right: 30 },
        animate: false,
      });
      setMapInstance(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.longitude, pos.coords.latitude]),
      () => setUserLocation(null),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, []);

  useEffect(() => {
    if (!mapInstance) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const query = searchQuery.trim().toLowerCase();

    const visible = festivals.filter((f) => {
      if (query && !f.name.toLowerCase().includes(query)) return false;
      if (radiusKm && userLocation) {
        const d = distanceKm(
          userLocation[1],
          userLocation[0],
          f.latitude,
          f.longitude,
        );
        if (d > radiusKm) return false;
      }
      return true;
    });

    visible.forEach((festival) => {
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

    if (userLocation) {
      const el = document.createElement("div");
      el.className =
        "h-4 w-4 rounded-full border-2 border-white/90 bg-[#FFB347] animate-user-pulse";
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(userLocation)
        .addTo(mapInstance);
      markersRef.current.push(marker);
    }
  }, [mapInstance, festivals, radiusKm, searchQuery, userLocation, onSelectFestival]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0">
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </div>
  );
}
