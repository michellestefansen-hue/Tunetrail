"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { SearchOverlay } from "@/components/SearchOverlay";
import { FilterPanel } from "@/components/FilterPanel";
import { FestivalSheet } from "@/components/FestivalSheet";
import {
  fetchFestivals,
  filterFestivals,
  type Festival,
  type FestivalCategory,
} from "@/lib/festivals";

const TunetrailMap = dynamic(
  () => import("@/components/map/TunetrailMap").then((m) => m.TunetrailMap),
  { ssr: false },
);

export default function Home() {
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [selected, setSelected] = useState<Festival | null>(null);

  const [gpsLocation, setGpsLocation] = useState<[number, number] | null>(null);
  const [manualLocation, setManualLocation] = useState<[number, number] | null>(null);
  const [positionMode, setPositionMode] = useState<"gps" | "manual" | null>(null);
  const [pickingLocation, setPickingLocation] = useState(false);

  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [categories, setCategories] = useState<FestivalCategory[]>([]);

  useEffect(() => {
    fetchFestivals()
      .then(setFestivals)
      .catch((err) => console.error("Failed to load festivals", err));
  }, []);

  const center = positionMode === "manual" ? manualLocation : gpsLocation;

  const visibleFestivals = filterFestivals(festivals, {
    query,
    center,
    radiusKm,
    dateFrom,
    dateTo,
    categories,
  });

  const handleUseGpsPosition = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLocation([pos.coords.longitude, pos.coords.latitude]);
        setPositionMode("gps");
        setPickingLocation(false);
      },
      () => setGpsLocation(null),
    );
  };

  const handleStartPickingLocation = () => {
    setPickingLocation(true);
  };

  const handlePickLocation = (lngLat: [number, number]) => {
    setManualLocation(lngLat);
    setPositionMode("manual");
    setPickingLocation(false);
  };

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#0b0a1f]">
      <TunetrailMap
        festivals={visibleFestivals}
        centerMarker={center}
        pickingLocation={pickingLocation}
        onPickLocation={handlePickLocation}
        onSelectFestival={setSelected}
      />

      <SearchOverlay
        query={query}
        onQueryChange={setQuery}
        onToggleFilters={() => setFiltersOpen((v) => !v)}
        filtersOpen={filtersOpen}
      />

      {filtersOpen && (
        <FilterPanel
          radiusKm={radiusKm}
          onRadiusChange={setRadiusKm}
          hasCenter={center !== null}
          positionMode={positionMode}
          onUseGpsPosition={handleUseGpsPosition}
          onStartPickingLocation={handleStartPickingLocation}
          pickingLocation={pickingLocation}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          categories={categories}
          onCategoriesChange={setCategories}
        />
      )}

      <FestivalSheet
        festivals={visibleFestivals}
        selected={selected}
        onSelect={setSelected}
        onBack={() => setSelected(null)}
      />
    </div>
  );
}
