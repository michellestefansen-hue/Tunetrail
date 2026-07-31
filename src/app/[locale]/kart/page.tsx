"use client";

import dynamic from "next/dynamic";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { Header } from "@/components/Header";
import { FilterButton } from "@/components/FilterButton";
import {
  FilterDrawer,
  EMPTY_FILTERS,
  activeFilterCount,
  type FilterState,
} from "@/components/FilterDrawer";
import { FestivalSheet } from "@/components/FestivalSheet";
import {
  fetchFestivals,
  filterFestivals,
  FESTIVAL_CATEGORIES,
  type Festival,
  type FestivalCategory,
} from "@/lib/festivals";
import type { MapBounds } from "@/components/map/TunetrailMap";

const TunetrailMap = dynamic(
  () => import("@/components/map/TunetrailMap").then((m) => m.TunetrailMap),
  { ssr: false },
);

export default function Home() {
  return (
    <Suspense fallback={<div className="h-dvh w-full bg-[#0b0a1f]" />}>
      <MapView />
    </Suspense>
  );
}

function MapView() {
  const router = useRouter();
  // Guides link here with ?q= and ?category= so their CTA lands on a filtered
  // map. Read once, as initial state — after that the UI owns the filters.
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const initialCategory = searchParams.get("category");

  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(() => ({
    ...EMPTY_FILTERS,
    // A guide's "explore on the map" CTA passes a place (a country or region),
    // so it seeds the place field rather than the festival-name one.
    placeQuery: initialQuery,
    categories:
      initialCategory && (FESTIVAL_CATEGORIES as string[]).includes(initialCategory)
        ? [initialCategory as FestivalCategory]
        : [],
  }));
  const [searchLocation, setSearchLocation] = useState<[number, number] | null>(null);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);

  const { placeQuery } = filters;

  useEffect(() => {
    fetchFestivals()
      .then(setFestivals)
      .catch((err) => console.error("Failed to load festivals", err));
  }, []);

  // Geocode the place field so a place name (e.g. "Kristiansand") flies the
  // map there; the viewport-synced list then naturally shows what's nearby.
  useEffect(() => {
    const trimmed = placeQuery.trim();
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
  }, [placeQuery]);

  // A place can be written two ways: as text a festival record actually
  // stores ("Frankrike"), or as somewhere only the map knows ("Kristiansand",
  // where no festival's own city says that). When the text matches nothing but
  // the geocoder did resolve it, drop the text test and let the map fly there
  // — the viewport scoping below then surfaces what is actually nearby.
  const strict = filterFestivals(festivals, filters);
  const placeIsMapOnly = Boolean(searchLocation) && strict.length === 0;
  const visibleFestivals = placeIsMapOnly
    ? filterFestivals(festivals, { ...filters, placeQuery: "" })
    : strict;

  // Searching by festival name or artist is a lookup, not a browse: those
  // results must not be cut down to whatever the map happens to be showing,
  // since the match may well sit outside the current viewport.
  const isLookup = Boolean(filters.festivalQuery.trim() || filters.artistQuery.trim());

  const festivalsInView = useMemo(() => {
    if (!mapBounds || isLookup) return visibleFestivals;
    return visibleFestivals.filter(
      (f) =>
        f.longitude >= mapBounds.west &&
        f.longitude <= mapBounds.east &&
        f.latitude >= mapBounds.south &&
        f.latitude <= mapBounds.north,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleFestivals, mapBounds, isLookup]);

  const handleSelectFestival = useCallback(
    (festival: Festival) => {
      router.push({ pathname: "/festival/[slug]", params: { slug: festival.slug } });
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

      <FilterButton
        count={activeFilterCount(filters)}
        open={filtersOpen}
        onClick={() => setFiltersOpen(true)}
      />

      <FilterDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        onChange={setFilters}
      />

      <FestivalSheet festivals={festivalsInView} />
    </div>
  );
}
