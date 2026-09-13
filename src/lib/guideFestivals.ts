import { createClient } from "@/lib/supabase/static";
import {
  FESTIVAL_SELECT,
  currentEdition,
  programmeEdition,
  BCP47_LOCALE,
  type Festival,
} from "@/lib/festivals";

/**
 * Fetches the festivals in a guide and restores the curated order — Supabase
 * returns rows in its own order, and the ranking is editorial.
 */
export async function fetchGuideFestivals(slugs: string[]): Promise<Festival[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("festivals")
    .select(FESTIVAL_SELECT)
    .in("slug", slugs);

  const bySlug = new Map(
    ((data ?? []) as unknown as Festival[]).map((f) => [f.slug, f]),
  );
  return slugs
    .map((slug) => bySlug.get(slug))
    .filter((f): f is Festival => Boolean(f));
}

/** The year the guide is about — derived from the data so titles don't go stale. */
export function guideYear(festivals: Festival[]): number {
  const years = festivals
    .map((f) => currentEdition(f)?.year)
    .filter((y): y is number => typeof y === "number");
  if (years.length === 0) return new Date().getFullYear();
  // The year most of the curated editions fall in.
  const counts = new Map<number, number>();
  for (const y of years) counts.set(y, (counts.get(y) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
}

export type GuideLineup = {
  /** A few confirmed names, for the "line-up includes" line. */
  names: string[];
  /** Distinct artists in that line-up -- an act playing two days counts once. */
  count: number;
  /** The year the line-up belongs to, which is not always the year of the dates. */
  year: number | null;
  /** True when the line-up and the dates come from the same edition. */
  isCurrent: boolean;
};

/**
 * The line-up a guide row can actually show.
 *
 * Deliberately `programmeEdition` and not `currentEdition`: a festival that has
 * announced next year's dates but not next year's line-up would otherwise go
 * blank, and in early autumn that is nearly every festival in a guide. Falling
 * back to the most recent edition that has a line-up keeps the page useful --
 * but the caller must label it, hence `year` and `isCurrent`. Showing last
 * year's names as though they were this year's would be worse than showing
 * nothing.
 */
export function guideLineup(festival: Festival, limit = 5): GuideLineup {
  const edition = programmeEdition(festival);
  const names = (edition?.program ?? []).flatMap((d) =>
    d.artists.map((a) => a.name),
  );
  const unique = Array.from(new Set(names));
  return {
    names: unique.slice(0, limit),
    count: unique.length,
    year: edition?.year ?? null,
    isCurrent: Boolean(edition) && edition?.year === currentEdition(festival)?.year,
  };
}

/**
 * Groups festivals by the month their edition starts, in calendar order. The
 * key stays year-scoped (YYYY-MM) so the same month in two different years
 * doesn't collapse into one bucket.
 */
export function groupByMonth(
  festivals: Festival[],
  locale: string,
  guideYear: number,
): { key: string; month: string; festivals: Festival[] }[] {
  const bcp = BCP47_LOCALE[locale] ?? BCP47_LOCALE.nb;
  const buckets = new Map<string, { label: string; festivals: Festival[] }>();
  const thisMonth = new Date().toISOString().slice(0, 7);

  for (const f of festivals) {
    const from = currentEdition(f)?.date_from;
    if (!from) continue;
    const key = from.slice(0, 7);
    const date = new Date(from);
    // Spell out the year for months outside the guide's own year, so two
    // buckets don't both read "July" -- and for months that have already been
    // and gone, since a bare "July" in September reads as next summer. The
    // bucket key is a whole month, so it is past only when the month is.
    const label =
      key.slice(0, 4) === String(guideYear) && key >= thisMonth
        ? date.toLocaleDateString(bcp, { month: "long" })
        : date.toLocaleDateString(bcp, { month: "long", year: "numeric" });
    if (!buckets.has(key)) buckets.set(key, { label, festivals: [] });
    buckets.get(key)!.festivals.push(f);
  }

  return [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, v]) => ({ key, month: v.label, festivals: v.festivals }));
}
