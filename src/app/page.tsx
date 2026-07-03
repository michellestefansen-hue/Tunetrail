"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [radiusKm, setRadiusKm] = useState<number | null>(null);

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

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (value.trim()) {
      setRadiusKm(null);
      setPositionMode(null);
      setGpsLocation(null);
      setManualLocation(null);
      setDateFrom(null);
      setDateTo(null);
      setCategories([]);
    }
  };

  const handleUseGpsPosition = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLocation([pos.coords.longitude, pos.coords.latitude]);
        setPositionMode("gps");
        setPickingLocation(false);
        setQuery("");
      },
      () => setGpsLocation(null),
    );
  };

  const handleStartPickingLocation = () => {
    setPickingLocation(true);
    setFiltersOpen(false);
  };

  const handlePickLocation = (lngLat: [number, number]) => {
    setManualLocation(lngLat);
    setPositionMode("manual");
    setPickingLocation(false);
    setQuery("");
    setFiltersOpen(true);
  };

  const handleSelectFestival = (festival: Festival) => {
    router.push(`/festival/${festival.slug}`);
  };

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#0b0a1f]">
      <TunetrailMap
        festivals={visibleFestivals}
        centerMarker={center}
        pickingLocation={pickingLocation}
        onPickLocation={handlePickLocation}
        onSelectFestival={handleSelectFestival}
      />

      <SearchOverlay
        query={query}
        onQueryChange={handleQueryChange}
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

      <FestivalSheet festivals={visibleFestivals} collapsed={pickingLocation} />
    </div>
  );
}
