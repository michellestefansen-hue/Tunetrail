"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Header } from "@/components/Header";
import { SearchOverlay } from "@/components/SearchOverlay";
import { FilterPanel } from "@/components/FilterPanel";
import { FestivalSheet } from "@/components/FestivalSheet";
import {
  fetchFestivals,
  filterFestivals,
  type Festival,
  type FestivalCategory,
} from "@/lib/festivals";
import type { MapBounds } from "@/components/map/TunetrailMap";

const TunetrailMap = dynamic(
  () => import("@/components/map/TunetrailMap").then((m) => m.TunetrailMap),
  { ssr: false },
);

export default function Home() {
  const router = useRouter();
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [categories, setCategories] = useState<FestivalCategory[]>([]);
  const [searchLocation, setSearchLocation] = useState<[number, number] | null>(null);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);

  useEffect(() => {
    fetchFestivals()
      .then(setFestivals)
      .catch((err) => console.error("Failed to load festivals", err));
  }, []);

  // Geocode search text so a place name (e.g. "Kristiansand") flies the map
  // there; the viewport-synced list then naturally shows what's nearby.
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchLocation(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(trimmed)}`,
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

  // Once the search text resolves to a real place, stop requiring the text to
  // also match name/city — the map flies there and the viewport list takes over.
  const effectiveQuery = searchLocation ? "" : query;

  const visibleFestivals = filterFestivals(festivals, {
    query: effectiveQuery,
    dateFrom,
    dateTo,
    categories,
  });

  // The bottom sheet only lists festivals currently visible within the map's viewport.
  const festivalsInView = useMemo(() => {
    if (!mapBounds) return visibleFestivals;
    return visibleFestivals.filter(
      (f) =>
        f.longitude >= mapBounds.west &&
        f.longitude <= mapBounds.east &&
        f.latitude >= mapBounds.south &&
        f.latitude <= mapBounds.north,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleFestivals, mapBounds]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (value.trim()) {
      setDateFrom(null);
      setDateTo(null);
      setCategories([]);
    }
  };

  const handleSelectFestival = useCallback(
    (festival: Festival) => {
      router.push(`/festival/${festival.slug}`);
    },
    [router],
  );

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#0b0a1f]">
      <TunetrailMap
        festivals={visibleFestivals}
        searchMarker={searchLocation}
        onSelectFestival={handleSelectFestival}
        onViewportChange={setMapBounds}
      />

      <Header />

      <SearchOverlay
        query={query}
        onQueryChange={handleQueryChange}
        onToggleFilters={() => setFiltersOpen((v) => !v)}
        filtersOpen={filtersOpen}
      />

      {filtersOpen && (
        <FilterPanel
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          categories={categories}
          onCategoriesChange={setCategories}
        />
      )}

      <FestivalSheet festivals={festivalsInView} />
    </div>
  );
}
