"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("Search");
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center px-4 pt-[calc(env(safe-area-inset-top)+72px)]">
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-3 shadow-lg backdrop-blur-xl">
        <MagnifyingGlassIcon className="h-5 w-5 shrink-0 text-[#FF2D78]" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={t("placeholder")}
          className="w-full bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none"
        />
        <button
          type="button"
          onClick={onToggleFilters}
          aria-label={t("filterLabel")}
          className={`shrink-0 rounded-full p-1.5 transition-colors ${
            filtersOpen ? "bg-[#FF2D78] text-white" : "text-[#FF2D78] hover:text-white"
          }`}
        >
          <AdjustmentsHorizontalIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
