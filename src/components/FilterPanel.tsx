"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import { FESTIVAL_CATEGORIES, type FestivalCategory } from "@/lib/festivals";

export function FilterPanel({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  categories,
  onCategoriesChange,
}: {
  dateFrom: string | null;
  dateTo: string | null;
  onDateFromChange: (value: string | null) => void;
  onDateToChange: (value: string | null) => void;
  categories: FestivalCategory[];
  onCategoriesChange: (value: FestivalCategory[]) => void;
}) {
  const t = useTranslations("Filters");
  const tCategories = useTranslations("Categories");
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
          <button
            type="button"
            onClick={() => setCategoryOpen((v) => !v)}
            className="flex w-full items-center justify-between text-sm text-white/80"
          >
            <span>
              {t("category")}
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
                    {tCategories(category)}
                  </button>
                );
              })}
              {categories.length > 0 && (
                <button
                  type="button"
                  onClick={() => onCategoriesChange([])}
                  className="rounded-full px-3 py-1.5 text-xs text-white/50 underline"
                >
                  {t("reset")}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-white/10 pt-3">
          <span className="text-sm text-white/80">{t("dateRange")}</span>
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
              {t("resetDates")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
