"use client";

import { useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import { FESTIVAL_CATEGORIES, type FestivalCategory } from "@/lib/festivals";

export function FilterPanel({
  radiusKm,
  onRadiusChange,
  hasCenter,
  positionMode,
  onStartPickingLocation,
  pickingLocation,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  categories,
  onCategoriesChange,
}: {
  radiusKm: number | null;
  onRadiusChange: (value: number | null) => void;
  hasCenter: boolean;
  positionMode: "manual" | null;
  onStartPickingLocation: () => void;
  pickingLocation: boolean;
  dateFrom: string | null;
  dateTo: string | null;
  onDateFromChange: (value: string | null) => void;
  onDateToChange: (value: string | null) => void;
  categories: FestivalCategory[];
  onCategoriesChange: (value: FestivalCategory[]) => void;
}) {
  const [categoryOpen, setCategoryOpen] = useState(false);

  const toggleCategory = (category: FestivalCategory) => {
    if (categories.includes(category)) {
      onCategoriesChange(categories.filter((c) => c !== category));
    } else {
      onCategoriesChange([...categories, category]);
    }
  };

  return (
    <div className="pointer-events-auto absolute inset-x-0 top-[calc(env(safe-area-inset-top)+136px)] z-20 flex justify-center px-4">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-white/10 bg-white/10 p-4 shadow-lg backdrop-blur-xl">
        <div>
          <div className="flex items-center justify-between text-sm text-white/80">
            <span>Radius fra posisjon</span>
            <span className="font-medium text-[#FF2D78]">
              {radiusKm ? `${radiusKm} km` : "Alle"}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={800}
            step={50}
            value={radiusKm ?? 800}
            onChange={(e) => {
              const value = Number(e.target.value);
              onRadiusChange(value >= 800 ? null : value);
            }}
            disabled={!hasCenter}
            className="mt-3 w-full accent-[#FF2D78]"
          />

          <button
            type="button"
            onClick={onStartPickingLocation}
            className={`mt-3 w-full rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              positionMode === "manual"
                ? "bg-[#FF2D78] text-white"
                : "bg-white/10 text-white/70 hover:bg-white/20"
            }`}
          >
            Velg på kartet
          </button>

          {pickingLocation && (
            <p className="mt-2 text-xs text-[#FEE3CA]">
              Trykk et sted på kartet for å sette posisjon.
            </p>
          )}
          {!hasCenter && !pickingLocation && (
            <p className="mt-2 text-xs text-white/50">
              Søk på et sted eller velg posisjon på kartet for å filtrere på avstand.
            </p>
          )}
        </div>

        <div className="border-t border-white/10 pt-3">
          <button
            type="button"
            onClick={() => setCategoryOpen((v) => !v)}
            className="flex w-full items-center justify-between text-sm text-white/80"
          >
            <span>
              Kategori
              {categories.length > 0 && (
                <span className="ml-1.5 text-[#FF2D78]">({categories.length})</span>
              )}
            </span>
            <ChevronDownIcon
              className={`h-4 w-4 text-white/60 transition-transform ${categoryOpen ? "rotate-180" : ""}`}
            />
          </button>

          {categoryOpen && (
            <div className="mt-3 flex flex-wrap gap-2">
              {FESTIVAL_CATEGORIES.map((category) => {
                const active = categories.includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? "border-[#FF2D78] bg-[#FF2D78] text-white"
                        : "border-white/15 bg-white/10 text-white/70 hover:bg-white/20"
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
              {categories.length > 0 && (
                <button
                  type="button"
                  onClick={() => onCategoriesChange([])}
                  className="rounded-full px-3 py-1.5 text-xs text-white/50 underline"
                >
                  Nullstill
                </button>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-white/10 pt-3">
          <span className="text-sm text-white/80">Datoperiode</span>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="date"
              value={dateFrom ?? ""}
              onChange={(e) => onDateFromChange(e.target.value || null)}
              className="w-full rounded-lg border border-white/10 bg-white/10 px-2 py-1.5 text-xs text-white [color-scheme:dark] focus:outline-none"
            />
            <span className="text-white/40">–</span>
            <input
              type="date"
              value={dateTo ?? ""}
              onChange={(e) => onDateToChange(e.target.value || null)}
              className="w-full rounded-lg border border-white/10 bg-white/10 px-2 py-1.5 text-xs text-white [color-scheme:dark] focus:outline-none"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => {
                onDateFromChange(null);
                onDateToChange(null);
              }}
              className="mt-2 text-xs text-white/50 underline"
            >
              Nullstill datoer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
