"use client";

import maplibregl, { Map as MapLibreMap, Marker } from "maplibre-gl";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { nightGlowStyle } from "@/components/map/mapStyle";
import "maplibre-gl/dist/maplibre-gl.css";

/**
 * Where the festival actually is, confirmed by the one person who knows.
 *
 * The lookup guesses from the text they already typed, but the pin is what
 * gets saved -- and it is draggable, because a wrong coordinate is invisible
 * until someone notices a festival in the wrong country. Leffingeleuren sat
 * 222 km off, effectively in Germany, for months.
 */
export function LocationPicker({
  value,
  onChange,
  query,
}: {
  value: [number, number] | null;
  onChange: (coords: [number, number]) => void;
  query: string;
}) {
  const t = useTranslations("NewFestival");
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const [looking, setLooking] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!container.current || map.current) return;
    const m = new maplibregl.Map({
      container: container.current,
      style: nightGlowStyle,
      center: value ? [value[1], value[0]] : [10, 54],
      zoom: value ? 11 : 3,
      attributionControl: false,
    });
    m.dragRotate.disable();
    m.touchZoomRotate.disableRotation();
    map.current = m;

    // Tapping the map is often quicker than dragging the pin across a city.
    m.on("click", (e) => onChange([e.lngLat.lat, e.lngLat.lng]));
    return () => {
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m || !value) return;
    const lngLat: [number, number] = [value[1], value[0]];

    if (!marker.current) {
      const el = document.createElement("div");
      el.className =
        "h-5 w-5 rounded-full border-2 border-white bg-[#FF2D78] shadow-lg cursor-grab";
      marker.current = new maplibregl.Marker({ element: el, draggable: true })
        .setLngLat(lngLat)
        .addTo(m);
      marker.current.on("dragend", () => {
        const p = marker.current!.getLngLat();
        onChange([p.lat, p.lng]);
      });
    } else {
      marker.current.setLngLat(lngLat);
    }
    m.easeTo({ center: lngLat, zoom: Math.max(m.getZoom(), 11), duration: 600 });
  }, [value, onChange]);

  async function locate() {
    if (!query.trim()) return;
    setLooking(true);
    setNotFound(false);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
      );
      const hits: { lat: string; lon: string }[] = await res.json();
      if (hits.length === 0) setNotFound(true);
      else onChange([parseFloat(hits[0].lat), parseFloat(hits[0].lon)]);
    } catch {
      setNotFound(true);
    } finally {
      setLooking(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={locate}
        disabled={looking || !query.trim()}
        className="rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-medium text-[#2D1A12] disabled:opacity-40"
      >
        {looking ? t("locating") : t("locate")}
      </button>

      {notFound && <p className="text-sm text-amber-800">{t("locateFailed")}</p>}

      <div
        ref={container}
        className="h-56 w-full overflow-hidden rounded-xl border border-black/10"
      />

      <p className="text-sm text-[#2D1A12]/60">
        {value
          ? t("pinSet", { lat: value[0].toFixed(4), lon: value[1].toFixed(4) })
          : t("pinMissing")}
      </p>
    </div>
  );
}
