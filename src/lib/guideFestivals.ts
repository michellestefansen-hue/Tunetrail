import { createClient } from "@/lib/supabase/static";
import {
  FESTIVAL_SELECT,
  currentEdition,
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

/** A few confirmed names from the line-up, for the "line-up includes" line. */
export function headliners(festival: Festival, limit = 5): string[] {
  const edition = currentEdition(festival);
  const names = (edition?.program ?? []).flatMap((d) =>
    d.artists.map((a) => a.name),
  );
  return Array.from(new Set(names)).slice(0, limit);
}

export function artistCount(festival: Festival): number {
  const edition = currentEdition(festival);
  return (edition?.program ?? []).reduce((n, d) => n + d.artists.length, 0);
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

  for (const f of festivals) {
    const from = currentEdition(f)?.date_from;
    if (!from) continue;
    const key = from.slice(0, 7);
    const date = new Date(from);
    // Spell out the year for months outside the guide's own year, so two
    // buckets don't both read "July".
    const label =
      date.getFullYear() === guideYear
        ? date.toLocaleDateString(bcp, { month: "long" })
        : date.toLocaleDateString(bcp, { month: "long", year: "numeric" });
    if (!buckets.has(key)) buckets.set(key, { label, festivals: [] });
    buckets.get(key)!.festivals.push(f);
  }

  return [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, v]) => ({ key, month: v.label, festivals: v.festivals }));
}
