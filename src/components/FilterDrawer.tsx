"use client";

import { useEffect, useMemo, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { ChipField } from "@/components/ChipField";
import { SizeRange } from "@/components/SizeRange";
import {
  FESTIVAL_TAGS,
  BCP47_LOCALE,
  SIZE_BANDS,
  scopeRange,
  scopeOfRange,
  type FestivalTag,
  type Suggestions,
  type TimeScope,
} from "@/lib/festivals";

export type FilterState = {
  festivalNames: string[];
  countries: string[];
  artists: string[];
  dateFrom: string | null;
  dateTo: string | null;
  tags: FestivalTag[];
  /** Inclusive positions into SIZE_BANDS; the full span means "any size". */
  sizeMin: number;
  sizeMax: number;
};

export const SIZE_MAX_INDEX = SIZE_BANDS.length - 1;

/** Hiding what has already finished is the useful default: today, 314 of the
 *  508 dated 2026 editions are in the past. */
export const DEFAULT_TIME_SCOPE: TimeScope = "upcoming";

export const EMPTY_FILTERS: FilterState = {
  festivalNames: [],
  countries: [],
  artists: [],
  ...scopeRange(DEFAULT_TIME_SCOPE),
  tags: [],
  sizeMin: 0,
  sizeMax: SIZE_MAX_INDEX,
};

/**
 * How many filters the user has actually set — drives the button's badge.
 * The default date range doesn't count, so an untouched filter still reads
 * as "no filters".
 */
export function activeFilterCount(f: FilterState): number {
  const isDefaultRange = scopeOfRange(f.dateFrom, f.dateTo) === DEFAULT_TIME_SCOPE;
  // The size range counts as one filter only once it has been narrowed, on the
  // same principle as the date range: an untouched control is not a choice.
  const isFullSizeRange = f.sizeMin === 0 && f.sizeMax === SIZE_MAX_INDEX;
  return (
    (isDefaultRange ? 0 : 1) +
    (isFullSizeRange ? 0 : 1) +
    f.festivalNames.length +
    f.countries.length +
    f.artists.length +
    f.tags.length
  );
}

/**
 * Where the map remembers its filters between visits.
 *
 * The URL is the real storage -- this only exists so the back arrow on a
 * festival page can return you to the map you left. That arrow is a fresh
 * navigation, not a browser back, so it has no way of knowing what you had
 * selected unless the map writes it down somewhere first.
 */
export const MAP_FILTER_KEY = "tunetrail:kart-filter";

/**
 * Filters as URL parameters.
 *
 * Two things fall out of putting them here rather than in component state. A
 * filtered map becomes a link you can send someone, and opening a festival and
 * coming back no longer throws away what you had chosen -- which it did, every
 * time, because the page unmounts and remounts.
 *
 * `q` and `tags` keep the names the guide pages already link with, so those
 * CTAs go on working. Only values that differ from the default are written, so
 * an untouched map keeps a clean URL.
 */
export function filtersToParams(f: FilterState): URLSearchParams {
  const p = new URLSearchParams();
  if (f.countries.length) p.set("q", f.countries.join(","));
  if (f.tags.length) p.set("tags", f.tags.join(","));
  if (f.festivalNames.length) p.set("navn", f.festivalNames.join(","));
  if (f.artists.length) p.set("artist", f.artists.join(","));

  // The default range is "from today onwards", which has to stay a default
  // rather than a stored date -- pinned to a date it would silently become
  // "from last Tuesday" a week later.
  if (scopeOfRange(f.dateFrom, f.dateTo) !== DEFAULT_TIME_SCOPE) {
    if (f.dateFrom) p.set("fra", f.dateFrom);
    if (f.dateTo) p.set("til", f.dateTo);
  }

  if (f.sizeMin !== 0 || f.sizeMax !== SIZE_MAX_INDEX) {
    p.set("str", `${f.sizeMin}-${f.sizeMax}`);
  }
  return p;
}

export function paramsToFilters(p: Pick<URLSearchParams, "get">): FilterState {
  const list = (key: string) =>
    p
      .get(key)
      ?.split(",")
      .map((v) => v.trim())
      .filter(Boolean) ?? [];

  const clamp = (n: number) => Math.max(0, Math.min(n, SIZE_MAX_INDEX));
  const size = p.get("str")?.split("-").map(Number);
  const [min, max] =
    size?.length === 2 && size.every((n) => Number.isInteger(n))
      ? [clamp(Math.min(...size)), clamp(Math.max(...size))]
      : [0, SIZE_MAX_INDEX];

  const from = p.get("fra");
  const to = p.get("til");

  return {
    ...EMPTY_FILTERS,
    countries: list("q"),
    // Anything not in the current tag list is dropped rather than kept as a
    // filter that can never match.
    tags: list("tags").filter((v): v is FestivalTag =>
      (FESTIVAL_TAGS as string[]).includes(v),
    ),
    festivalNames: list("navn"),
    artists: list("artist"),
    ...(from || to ? { dateFrom: from, dateTo: to } : {}),
    sizeMin: min,
    sizeMax: max,
  };
}

/** A multi-select row of chips, shared by the country and category sections. */
function ChipToggles<T extends string>({
  label,
  options,
  selected,
  onToggle,
  render,
}: {
  label: string;
  options: T[];
  selected: T[];
  onToggle: (value: T) => void;
  render: (value: T) => string;
}) {
  return (
    <div className="border-t border-black/5 pt-4">
      <span className="text-xs font-medium text-[#6B5E59]">{label}</span>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(option)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "border-[#FF2D78] bg-[#FF2D78] text-white"
                  : "border-black/10 bg-white text-[#6B5E59]"
              }`}
            >
              {render(option)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FilterDrawer({
  open,
  onClose,
  filters,
  onChange,
  suggestions,
  hiddenBySize,
}: {
  open: boolean;
  onClose: () => void;
  filters: FilterState;
  onChange: (next: FilterState) => void;
  suggestions: Suggestions;
  /** Counted by the map, which is the only place that holds the festivals. */
  hiddenBySize: number;
}) {
  const t = useTranslations("Filters");
  const tTags = useTranslations("Tags");
  const tCountries = useTranslations("Countries");
  const locale = useLocale();
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

  const toggleCountry = (value: string) =>
    set(
      "countries",
      filters.countries.includes(value)
        ? filters.countries.filter((v) => v !== value)
        : [...filters.countries, value],
    );

  const toggleTag = (value: FestivalTag) =>
    set(
      "tags",
      filters.tags.includes(value)
        ? filters.tags.filter((v) => v !== value)
        : [...filters.tags, value],
    );

  // The records store country names in Norwegian; the chips show the reader's
  // own language, so order them by what is actually on screen — and collate in
  // that language too, or Norwegian Ø sorts as O and lands mid-list instead of
  // at the end where a Norwegian reader looks for it.
  const countries = useMemo(() => {
    const collator = new Intl.Collator(BCP47_LOCALE[locale] ?? BCP47_LOCALE.nb);
    return [...suggestions.countries].sort((a, b) =>
      collator.compare(tCountries(a), tCountries(b)),
    );
  }, [suggestions.countries, tCountries, locale]);

  const count = activeFilterCount(filters);
  const year = new Date().getFullYear();
  // Derived, never stored: editing the dates by hand simply stops matching a
  // preset, which leaves both buttons unselected rather than lying about it.
  const activeScope = scopeOfRange(filters.dateFrom, filters.dateTo);

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
          <div>
            <span className="block text-xs font-medium text-[#6B5E59]">{t("whenLabel")}</span>
            <div
              role="radiogroup"
              aria-label={t("whenLabel")}
              className="mt-2 inline-flex rounded-full bg-[#F0E9DC] p-0.5"
            >
              {(["upcoming", "year"] as TimeScope[]).map((scope) => {
                const active = activeScope === scope;
                return (
                  <button
                    key={scope}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onChange({ ...filters, ...scopeRange(scope) })}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                      active ? "bg-[#FF2D78] text-white" : "text-[#8A7F72]"
                    }`}
                  >
                    {scope === "upcoming" ? t("scopeUpcoming") : t("scopeYear", { year })}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-1">
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

          <ChipField
            label={t("festivalLabel")}
            placeholder={t("festivalPlaceholder")}
            emptyHint={t("noMatch")}
            removeLabel={(value) => t("removeFilter", { value })}
            suggestions={suggestions.festivals}
            selected={filters.festivalNames}
            onChange={(v) => set("festivalNames", v)}
          />
          <ChipField
            label={t("artistLabel")}
            placeholder={t("artistPlaceholder")}
            emptyHint={t("noMatch")}
            removeLabel={(value) => t("removeFilter", { value })}
            suggestions={suggestions.artists}
            selected={filters.artists}
            onChange={(v) => set("artists", v)}
          />

          <SizeRange
            min={filters.sizeMin}
            max={filters.sizeMax}
            hiddenUnknown={hiddenBySize}
            onChange={(sizeMin, sizeMax) => onChange({ ...filters, sizeMin, sizeMax })}
          />

          <ChipToggles
            label={t("countryLabel")}
            options={countries}
            selected={filters.countries}
            onToggle={toggleCountry}
            render={(v) => tCountries(v)}
          />

          <ChipToggles
            label={t("tagsLabel")}
            options={FESTIVAL_TAGS}
            selected={filters.tags}
            onToggle={toggleTag}
            render={(v) => tTags(v)}
          />
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
