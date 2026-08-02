"use client";

import { useTranslations } from "next-intl";
import { ArtistSearch } from "@/components/ArtistSearch";
import type { ProgramDay } from "@/lib/submissions";

export type Edition = {
  year: number;
  date_from: string;
  date_to: string;
  days: ProgramDay[];
  /** Absent for a festival that doesn't exist yet -- there is nothing to link to. */
  ticket_url?: string | null;
};

export function dayLabel(date: string, bcp47: string) {
  return new Date(date + "T12:00:00").toLocaleDateString(bcp47, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/**
 * Controlled, like the details tab: the shell owns the edited days so nothing
 * is lost when the contributor tabs away.
 */
export function LineupFields({
  editions,
  year,
  onYear,
  days,
  onDays,
  bcp47,
}: {
  editions: Edition[];
  year: number;
  onYear: (year: number) => void;
  days: ProgramDay[];
  onDays: (next: ProgramDay[]) => void;
  bcp47: string;
}) {
  const t = useTranslations("Propose.lineup");

  function addArtist(date: string, name: string) {
    onDays(days.map((d) => (d.date === date ? { ...d, artists: [...d.artists, name] } : d)));
  }

  function removeArtist(date: string, name: string) {
    onDays(
      days.map((d) =>
        d.date === date ? { ...d, artists: d.artists.filter((a) => a !== name) } : d,
      ),
    );
  }

  function moveArtist(from: string, to: string, name: string) {
    onDays(
      days.map((d) => {
        if (d.date === from) return { ...d, artists: d.artists.filter((a) => a !== name) };
        if (d.date === to) return { ...d, artists: [...d.artists, name] };
        return d;
      }),
    );
  }

  return (
    <div className="space-y-4">
      {editions.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {editions.map((e) => (
            <button
              key={e.year}
              type="button"
              onClick={() => onYear(e.year)}
              className={`rounded-full border px-4 py-1.5 text-sm ${
                e.year === year
                  ? "border-transparent bg-[#2D1A12] text-white"
                  : "border-black/15 bg-white text-[#2D1A12]/70"
              }`}
            >
              {e.year}
            </button>
          ))}
        </div>
      )}

      {days.length === 0 ? (
        <p className="rounded-xl border border-black/10 bg-white px-4 py-6 text-[#2D1A12]/60">
          {t("noDates")}
        </p>
      ) : (
        days.map((day) => (
          <section key={day.date} className="rounded-xl border border-black/10 bg-white p-4">
            <h3 className="font-medium text-[#2D1A12]">{dayLabel(day.date, bcp47)}</h3>
            <p className="text-xs text-[#2D1A12]/45">
              {t("artistsCount", { count: day.artists.length })}
            </p>

            {day.artists.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {day.artists.map((a) => (
                  <li
                    key={a}
                    className="flex items-center gap-1.5 rounded-full bg-black/[0.05] py-1 pl-3 pr-1 text-sm text-[#2D1A12]"
                  >
                    {a}
                    {days.length > 1 && (
                      <select
                        aria-label={t("moveTo", { name: a })}
                        value=""
                        onChange={(e) => e.target.value && moveArtist(day.date, e.target.value, a)}
                        className="cursor-pointer rounded bg-transparent text-xs text-[#2D1A12]/45"
                      >
                        <option value="">{t("movePlaceholder")}</option>
                        {days
                          .filter((d) => d.date !== day.date)
                          .map((d) => (
                            <option key={d.date} value={d.date}>
                              {dayLabel(d.date, bcp47)}
                            </option>
                          ))}
                      </select>
                    )}
                    <button
                      type="button"
                      onClick={() => removeArtist(day.date, a)}
                      aria-label={t("remove", { name: a })}
                      className="grid size-5 place-items-center rounded-full text-[#2D1A12]/40 hover:bg-black/10 hover:text-[#2D1A12]"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3">
              <ArtistSearch
                exclude={new Set(day.artists.map((a) => a.toLowerCase()))}
                onPick={(name) => addArtist(day.date, name)}
              />
            </div>
          </section>
        ))
      )}
    </div>
  );
}
