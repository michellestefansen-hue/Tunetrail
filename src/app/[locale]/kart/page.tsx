"use client";

import dynamic from "next/dynamic";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  buildSuggestions,
  FESTIVAL_TAGS,
  type Festival,
  type FestivalTag,
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
  // Guides link here with ?q= and ?tags= so their CTA lands on a filtered
  // map. Read once, as initial state — after that the UI owns the filters.
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const initialTags = searchParams.get("tags")?.split(",") ?? [];

  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(() => ({
    ...EMPTY_FILTERS,
    tags: initialTags.filter((v): v is FestivalTag =>
      (FESTIVAL_TAGS as string[]).includes(v),
    ),
  }));
  const [searchLocation, setSearchLocation] = useState<[number, number] | null>(null);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const seededCountries = useRef(false);

  useEffect(() => {
    fetchFestivals()
      .then(setFestivals)
      .catch((err) => console.error("Failed to load festivals", err));
  }, []);

  const suggestions = useMemo(() => buildSuggestions(festivals), [festivals]);

  // A guide's "explore on the map" CTA arrives as ?q=, comma-separated for
  // regions that span several countries. Seed it once the data is in,
  // dropping anything the data cannot actually match.
  useEffect(() => {
    if (seededCountries.current || festivals.length === 0 || !initialQuery) return;
    seededCountries.current = true;
    const valid = initialQuery
      .split(",")
      .map((v) => v.trim())
      .filter((v) => suggestions.countries.includes(v));
    if (valid.length > 0) setFilters((f) => ({ ...f, countries: valid }));
  }, [festivals, initialQuery, suggestions]);

  // Fly the map to a single chosen country. With several selected there is no
  // one point to fly to, so the fitted results speak for themselves.
  const soloCountry = filters.countries.length === 1 ? filters.countries[0] : null;
  useEffect(() => {
    if (!soloCountry) {
      setSearchLocation(null);
      return;
    }
    const controller = new AbortController();
    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(soloCountry)}`,
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
    return () => controller.abort();
  }, [soloCountry]);

  // Every chip is an exact value taken from the data, so a filtered result is
  // always the true, complete answer. Showing only the part of it that happens
  // to fall inside the viewport would hide real matches, so the viewport
  // scoping applies solely while browsing unfiltered.
  const visibleFestivals = filterFestivals(festivals, filters);
  const isFiltered = activeFilterCount(filters) > 0;

  const festivalsInView = useMemo(() => {
    if (!mapBounds || isFiltered) return visibleFestivals;
    return visibleFestivals.filter(
      (f) =>
        f.longitude >= mapBounds.west &&
        f.longitude <= mapBounds.east &&
        f.latitude >= mapBounds.south &&
        f.latitude <= mapBounds.north,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleFestivals, mapBounds, isFiltered]);

  const handleSelectFestival = useCallback(
    (festival: Festival) => {
      router.push({ pathname: "/festival/[slug]", params: { slug: festival.slug } });
    },
    [router],
  );

  return (
    // flex-1 rather than h-dvh: the footer is a sibling in the layout, so a
    // fixed viewport height here would push it off-screen and add a scrollbar
    // to a page that is meant not to have one.
    <div className="relative min-h-0 w-full flex-1 overflow-hidden bg-[#0b0a1f]">
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
        suggestions={suggestions}
      />

      <FestivalSheet festivals={festivalsInView} />
    </div>
  );
}
