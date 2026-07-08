"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MapLibreMap, Marker, GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { nightGlowStyle } from "./mapStyle";
import { createFractalNoiseCanvas } from "./noiseTexture";
import type { Festival } from "@/lib/festivals";

const EUROPE_SW: [number, number] = [-11.0, 35.0];
const EUROPE_NE: [number, number] = [31.0, 66.0];

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
  const [mapInstance, setMapInstance] = useState<MapLibreMap | null>(null);

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

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0">
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </div>
  );
}
