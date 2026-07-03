"use client";

import { MagnifyingGlassIcon, AdjustmentsHorizontalIcon } from "@heroicons/react/24/solid";

export function SearchOverlay({
  query,
  onQueryChange,
  onToggleFilters,
  filtersOpen,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onToggleFilters: () => void;
  filtersOpen: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center px-4 pt-[calc(env(safe-area-inset-top)+16px)]">
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-3 shadow-lg backdrop-blur-md">
        <MagnifyingGlassIcon className="h-5 w-5 shrink-0 text-white/60" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Søk etter sted eller festival..."
          className="w-full bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none"
        />
        <button
          type="button"
          onClick={onToggleFilters}
          aria-label="Filter"
          className={`shrink-0 rounded-full p-1.5 transition-colors ${
            filtersOpen ? "bg-orange-500 text-white" : "text-white/60 hover:text-white"
          }`}
        >
          <AdjustmentsHorizontalIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
