import type { BrowseRule } from "@/lib/guides";
import { createClient } from "@/lib/supabase/static";
import {
  FESTIVAL_SELECT,
  SIZE_BANDS,
  currentEdition,
  programmeEdition,
  BCP47_LOCALE,
  type Festival,
  type FestivalTag,
  type SizeBand,
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

/**
 * The year the guide is about — derived from the data so titles don't go stale.
 *
 * Only editions that haven't happened yet get a vote. `currentEdition` falls
 * back to the most recent past edition when a festival has announced nothing
 * new, and letting those vote titled the page after a season that was already
 * over: in September the rock guide called itself 2026, because twelve of its
 * seventeen festivals had no 2027 date and were still pointing at last summer.
 * A guide is read by someone planning ahead.
 *
 * If nothing at all is upcoming, every edition votes — better a stale year than
 * no page.
 */
export function guideYear(festivals: Festival[]): number {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = festivals
    .flatMap((f) => f.festival_editions ?? [])
    .filter((e) => (e.date_to ?? e.date_from ?? "") >= today)
    .map((e) => e.year);

  const years = upcoming.length > 0
    ? upcoming
    : festivals
        .map((f) => currentEdition(f)?.year)
        .filter((y): y is number => typeof y === "number");

  if (years.length === 0) return new Date().getFullYear();
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

/**
 * Every festival carrying any of these tags, for a guide that lists a whole
 * genre rather than a curated few.
 *
 * The curated slug list exists because the database had no capacity data, so a
 * tag query could not produce a defensible order -- it would have been an
 * arbitrary pile. `size_band` removes that objection: the order is a fact about
 * the festival, not an opinion we have to defend every year.
 *
 * Festivals with no edition at all are dropped. A row with a name and nothing
 * else tells a reader nothing and pads the page.
 */
export async function fetchFestivalsByTags(
  tags: FestivalTag[],
  rule?: BrowseRule,
): Promise<Festival[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("festivals")
    .select(FESTIVAL_SELECT)
    .overlaps("tags", tags);

  const core = new Set<string>(rule?.core ?? tags);
  const mainstream = new Set<string>(rule?.mainstream ?? []);
  const anchor = new Set<string>(rule?.anchor ?? []);

  const excluded = new Set(rule?.exclude ?? []);

  const belongs = (f: Festival) => {
    if (excluded.has(f.slug)) return false;
    const t = f.tags ?? [];
    if (t.length === 0) return false;
    if (t.filter((tag) => core.has(tag)).length / t.length <= 0.5) return false;
    const leansMainstream = t.some((tag) => mainstream.has(tag));
    return !leansMainstream || t.some((tag) => anchor.has(tag));
  };

  return ((data ?? []) as unknown as Festival[])
    .filter((f) => (f.festival_editions ?? []).length > 0)
    .filter(belongs);
}

export type SizeGroup = {
  band: SizeBand | "unknown";
  festivals: Festival[];
};

/**
 * Groups festivals by audience size, largest band first, with the ones we have
 * no figure for in their own group at the end.
 *
 * Within a band, festivals with a date still ahead of them come first and in
 * date order -- someone reading in September wants the next thing they can
 * actually go to, not an alphabetical roll call. The rest follow by name.
 *
 * The unknown group is shown rather than hidden. It shrinks as figures are
 * sourced, and hiding it would quietly drop more than half the genre off a page
 * that claims to cover it.
 */
export function groupBySize(festivals: Festival[]): SizeGroup[] {
  const today = new Date().toISOString().slice(0, 10);
  const buckets = new Map<SizeBand | "unknown", Festival[]>();

  for (const f of festivals) {
    const key = f.size_band ?? "unknown";
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(f);
  }

  const upcoming = (f: Festival) => {
    const e = currentEdition(f);
    const end = e?.date_to ?? e?.date_from ?? "";
    return end >= today ? end : null;
  };

  for (const list of buckets.values()) {
    list.sort((a, b) => {
      const ua = upcoming(a);
      const ub = upcoming(b);
      if (ua && ub) return ua.localeCompare(ub);
      if (ua) return -1;
      if (ub) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  const order: (SizeBand | "unknown")[] = [...SIZE_BANDS].reverse();
  order.push("unknown");
  return order
    .filter((band) => buckets.has(band))
    .map((band) => ({ band, festivals: buckets.get(band)! }));
}

/**
 * The year the guides hub is about.
 *
 * Was `new Date().getFullYear()`, which titled the site's most important page
 * after the season that was ending rather than the one being planned: in
 * September the hub read 2026 while every guide card beneath it read 2027.
 * Same rule as `guideYear`, across all the guides at once.
 */
export function hubYear(perGuide: Festival[][]): number {
  return guideYear(perGuide.flat());
}
