"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { SearchOverlay } from "@/components/SearchOverlay";
import { FilterPanel } from "@/components/FilterPanel";
import { FestivalSheet } from "@/components/FestivalSheet";
import { fetchFestivals, type Festival } from "@/lib/festivals";

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
  const [hasUserLocation, setHasUserLocation] = useState(false);

  useEffect(() => {
    fetchFestivals()
      .then(setFestivals)
      .catch((err) => console.error("Failed to load festivals", err));
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      () => setHasUserLocation(true),
      () => setHasUserLocation(false),
    );
  }, []);

  const visibleFestivals = festivals.filter((f) =>
    query.trim() ? f.name.toLowerCase().includes(query.trim().toLowerCase()) : true,
  );

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#0b0a1f]">
      <TunetrailMap
        festivals={festivals}
        radiusKm={radiusKm}
        searchQuery={query}
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
          hasUserLocation={hasUserLocation}
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
