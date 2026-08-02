"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { ProgramDay } from "@/lib/festivals";

type YearProgram = { year: number; program: ProgramDay[] };

/**
 * One tab per year that has an edition on record, not one per year with a
 * lineup -- an empty year is still worth switching to, if only to confirm
 * nothing is announced yet rather than looking like the year doesn't exist.
 */
export function FestivalProgramTabs({
  years,
  defaultYear,
  bcp47,
}: {
  years: YearProgram[];
  defaultYear: number;
  bcp47: string;
}) {
  const t = useTranslations("FestivalPage");
  const [year, setYear] = useState(
    years.some((y) => y.year === defaultYear) ? defaultYear : years[0]?.year,
  );

  const active = years.find((y) => y.year === year);
  const program = active?.program ?? [];

  return (
    <div>
      {years.length > 1 && (
        <div role="tablist" className="flex gap-1.5">
          {years.map((y) => (
            <button
              key={y.year}
              type="button"
              role="tab"
              aria-selected={y.year === year}
              onClick={() => setYear(y.year)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                y.year === year
                  ? "bg-[#FF2D78] text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {y.year}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-5">
        {program.length === 0 && (
          <p className="text-sm text-stone-400">{t("programNotAnnouncedYet")}</p>
        )}
        {program.map((day, i) => (
          <div
            key={day.date}
            className="rounded-2xl bg-white p-4 shadow-[0_8px_30px_rgba(45,26,18,0.08)]"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[#FF2D78]">
              {t("day", { number: i + 1 })}
              {day.day_label ? ` · ${day.day_label}` : ""}
            </p>
            <p className="mt-0.5 font-heading text-lg text-[#2D1A12]">
              {new Date(day.date).toLocaleDateString(bcp47, {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {day.artists.length > 0 ? (
                day.artists.map((a, idx) => (
                  <span
                    key={`${a.name}-${idx}`}
                    className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-700"
                    title={[a.stage, a.time].filter(Boolean).join(" · ")}
                  >
                    {a.name}
                  </span>
                ))
              ) : (
                <span className="text-xs text-stone-400">{t("programNotAnnounced")}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
