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
  const [radiusKm, setRadiusKm] = useState<number | null>(200);

  const [manualLocation, setManualLocation] = useState<[number, number] | null>(null);
  const [positionMode, setPositionMode] = useState<"manual" | null>(null);
  const [pickingLocation, setPickingLocation] = useState(false);

  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [categories, setCategories] = useState<FestivalCategory[]>([]);
  const [searchLocation, setSearchLocation] = useState<[number, number] | null>(null);

  useEffect(() => {
    fetchFestivals()
      .then(setFestivals)
      .catch((err) => console.error("Failed to load festivals", err));
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchLocation(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=no&q=${encodeURIComponent(trimmed)}`,
        { signal: controller.signal },
      )
        .then((res) => res.json())
        .then((results: { lon: string; lat: string }[]) => {
          if (results.length > 0) {
            setSearchLocation([parseFloat(results[0].lon), parseFloat(results[0].lat)]);
          } else {
            setSearchLocation(null);
          }
        })
        .catch(() => {});
    }, 500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const center = positionMode === "manual" ? manualLocation : searchLocation;

  // Once the search text resolves to a real place, filter purely by radius
  // from that point instead of also requiring the text to match name/city.
  const effectiveQuery = searchLocation ? "" : query;

  const visibleFestivals = filterFestivals(festivals, {
    query: effectiveQuery,
    center,
    radiusKm,
    dateFrom,
    dateTo,
    categories,
  });

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (value.trim()) {
      setPositionMode(null);
      setManualLocation(null);
      setDateFrom(null);
      setDateTo(null);
      setCategories([]);
    }
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
