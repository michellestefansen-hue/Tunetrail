"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { XMarkIcon, MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import { FESTIVAL_CATEGORIES, type FestivalCategory } from "@/lib/festivals";

export type FilterState = {
  festivalQuery: string;
  placeQuery: string;
  artistQuery: string;
  dateFrom: string | null;
  dateTo: string | null;
  categories: FestivalCategory[];
};

export const EMPTY_FILTERS: FilterState = {
  festivalQuery: "",
  placeQuery: "",
  artistQuery: "",
  dateFrom: null,
  dateTo: null,
  categories: [],
};

/** How many filters the user has actually set — drives the button's badge. */
export function activeFilterCount(f: FilterState): number {
  return (
    (f.festivalQuery.trim() ? 1 : 0) +
    (f.placeQuery.trim() ? 1 : 0) +
    (f.artistQuery.trim() ? 1 : 0) +
    (f.dateFrom || f.dateTo ? 1 : 0) +
    f.categories.length
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-[#6B5E59]">{label}</span>
      <div className="mt-1.5 flex items-center gap-2 rounded-full border border-black/10 bg-white px-3.5 py-2.5">
        <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-[#FF2D78]" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-[#2D1A12] placeholder:text-[#B5A9A2] focus:outline-none"
        />
      </div>
    </label>
  );
}

export function FilterDrawer({
  open,
  onClose,
  filters,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  filters: FilterState;
  onChange: (next: FilterState) => void;
}) {
  const t = useTranslations("Filters");
  const tCategories = useTranslations("Categories");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const set = <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
    onChange({ ...filters, [key]: value });

  const toggleCategory = (category: FestivalCategory) =>
    set(
      "categories",
      filters.categories.includes(category)
        ? filters.categories.filter((c) => c !== category)
        : [...filters.categories, category],
    );

  const count = activeFilterCount(filters);

  return (
    <>
      {/* Backdrop: dismisses on click, and hides from AT since Escape and the
          close button already expose the same action. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("title")}
        className={`fixed inset-y-0 left-0 z-50 flex w-[86%] max-w-sm flex-col bg-[#FFF9F0] shadow-2xl transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-black/5 px-5 pb-3 pt-[calc(env(safe-area-inset-top)+16px)]">
          <h2 className="font-heading text-lg text-[#2D1A12]">{t("title")}</h2>
          {count > 0 && (
            <span className="rounded-full bg-[#FF2D78] px-2 py-0.5 text-xs font-semibold text-white">
              {count}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white text-[#6B5E59]"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
          <Field
            label={t("festivalLabel")}
            placeholder={t("festivalPlaceholder")}
            value={filters.festivalQuery}
            onChange={(v) => set("festivalQuery", v)}
          />
          <Field
            label={t("placeLabel")}
            placeholder={t("placePlaceholder")}
            value={filters.placeQuery}
            onChange={(v) => set("placeQuery", v)}
          />
          <Field
            label={t("artistLabel")}
            placeholder={t("artistPlaceholder")}
            value={filters.artistQuery}
            onChange={(v) => set("artistQuery", v)}
          />

          <div className="border-t border-black/5 pt-4">
            <span className="text-xs font-medium text-[#6B5E59]">{t("category")}</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {FESTIVAL_CATEGORIES.map((category) => {
                const active = filters.categories.includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleCategory(category)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? "border-[#FF2D78] bg-[#FF2D78] text-white"
                        : "border-black/10 bg-white text-[#6B5E59]"
                    }`}
                  >
                    {tCategories(category)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-black/5 pt-4">
            <span className="text-xs font-medium text-[#6B5E59]">{t("dateRange")}</span>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="date"
                aria-label={t("dateFrom")}
                value={filters.dateFrom ?? ""}
                onChange={(e) => set("dateFrom", e.target.value || null)}
                className="w-full rounded-lg border border-black/10 bg-white px-2.5 py-2 text-xs text-[#2D1A12] focus:outline-none"
              />
              <span className="text-[#B5A9A2]">–</span>
              <input
                type="date"
                aria-label={t("dateTo")}
                value={filters.dateTo ?? ""}
                onChange={(e) => set("dateTo", e.target.value || null)}
                className="w-full rounded-lg border border-black/10 bg-white px-2.5 py-2 text-xs text-[#2D1A12] focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-black/5 px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4">
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTERS)}
            disabled={count === 0}
            className="w-full rounded-full border border-black/10 bg-white py-2.5 text-sm font-medium text-[#2D1A12] disabled:opacity-40"
          >
            {t("clearAll")}
          </button>
        </div>
      </div>
    </>
  );
}
