import { createClient } from "@/lib/supabase/client";

export type ProgramArtist = { name: string; stage: string | null; time: string | null };
export type ProgramDay = {
  date: string; // 'YYYY-MM-DD'
  day_label: string | null;
  artists: ProgramArtist[];
};

export type FestivalEdition = {
  id: string;
  year: number;
  date_from: string | null;
  date_to: string | null;
  ticket_url: string | null;
  program: ProgramDay[];
};

/**
 * A festival can carry several of these at once (Wacken is both Rock and
 * Metal; a punk fest is often Punk & Hardcore and Rock together). There is
 * deliberately no catch-all "mixed genre" tag — no tags means "not
 * classified yet", not a genre in itself.
 */
export type FestivalTag =
  | "Rock"
  | "Metal"
  | "Punk & Hardcore"
  | "Alternativ & Indie"
  | "Pop & Mainstream"
  | "Elektronisk & Dans"
  | "Techno & House"
  | "Hip-Hop & R&B"
  | "Jazz"
  | "Blues"
  | "Soul & Funk"
  | "Klassisk"
  | "Folk & Americana"
  | "Verden & Reggae";

export const FESTIVAL_TAGS: FestivalTag[] = [
  "Rock",
  "Metal",
  "Punk & Hardcore",
  "Alternativ & Indie",
  "Pop & Mainstream",
  "Elektronisk & Dans",
  "Techno & House",
  "Hip-Hop & R&B",
  "Jazz",
  "Blues",
  "Soul & Funk",
  "Klassisk",
  "Folk & Americana",
  "Verden & Reggae",
];

/**
 * Stand-in artwork for the ~31% of festivals we have no photograph of.
 *
 * Keyed to the genre rather than to the festival, so the card still says
 * something true about the event instead of picking a colour at random. It
 * also sidesteps the trap of stock photography: a borrowed crowd shot can be
 * of the wrong festival, but a colour never claims to be a place.
 *
 * Ordered most-distinctive first, so a festival tagged both Metal and Pop
 * reads as Metal. Tailwind needs these as literal strings to emit the classes.
 */
const TAG_GRADIENTS: [FestivalTag, string][] = [
  ["Metal", "from-zinc-800 to-red-900"],
  ["Punk & Hardcore", "from-neutral-900 to-rose-700"],
  ["Klassisk", "from-stone-600 to-amber-800"],
  ["Jazz", "from-amber-700 to-yellow-600"],
  ["Blues", "from-blue-900 to-indigo-700"],
  ["Techno & House", "from-slate-800 to-violet-700"],
  ["Folk & Americana", "from-lime-700 to-amber-600"],
  ["Verden & Reggae", "from-emerald-600 to-yellow-500"],
  ["Soul & Funk", "from-orange-500 to-fuchsia-600"],
  ["Hip-Hop & R&B", "from-amber-500 to-purple-700"],
  ["Elektronisk & Dans", "from-fuchsia-600 to-cyan-500"],
  ["Alternativ & Indie", "from-teal-600 to-indigo-700"],
  ["Rock", "from-orange-600 to-red-800"],
  ["Pop & Mainstream", "from-pink-500 to-orange-400"],
];

/** Untagged festivals still get a stable colour rather than a grey box. */
const UNTAGGED_GRADIENTS = [
  "from-orange-500 to-pink-600",
  "from-purple-600 to-indigo-500",
  "from-rose-500 to-purple-700",
];

export function fallbackGradient(festival: {
  id: string;
  tags: FestivalTag[] | null;
}): string {
  const tags = festival.tags ?? [];
  for (const [tag, gradient] of TAG_GRADIENTS) {
    if (tags.includes(tag)) return gradient;
  }
  const sum = [...festival.id].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return UNTAGGED_GRADIENTS[sum % UNTAGGED_GRADIENTS.length];
}

/**
 * Audience size, in bands rather than a number.
 *
 * A festival's attendance is never one figure anyway -- organisers quote
 * capacity, tickets sold, or total admissions across a week, and the three
 * differ wildly. A band is the honest precision, and it is also what a
 * contributor can answer without looking anything up.
 *
 * Ordered smallest to largest. This array is the single definition of that
 * order: the database stores these keys, the filter treats their positions as
 * a scale, and the display labels live in messages/*.json under "Sizes".
 */
export const SIZE_BANDS = [
  "under_200",
  "200_2000",
  "2000_10000",
  "10000_50000",
  "50000_100000",
  "over_100000",
] as const;

export type SizeBand = (typeof SIZE_BANDS)[number];

/**
 * The attendance figures the bands divide on, including both open ends. Used to
 * phrase a selected range as "2 000 – 50 000" rather than stringing two band
 * labels together, which reads badly in every language.
 */
export const SIZE_EDGES = [0, 200, 2000, 10000, 50000, 100000, Infinity];

export function isSizeBand(value: unknown): value is SizeBand {
  return typeof value === "string" && (SIZE_BANDS as readonly string[]).includes(value);
}

/** Position on the scale, or -1 when the festival's size is unknown. */
export function sizeBandIndex(band: string | null | undefined): number {
  return band ? (SIZE_BANDS as readonly string[]).indexOf(band) : -1;
}

export type Festival = {
  id: string;
  name: string;
  slug: string;
  website_url: string | null;
  city: string | null;
  region: string | null;
  venue_name: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  description: string | null;
  image_url: string | null;
  tags: FestivalTag[] | null;
  size_band: SizeBand | null;
  festival_editions: FestivalEdition[];
};

export const FESTIVAL_SELECT =
  "id, name, slug, website_url, city, region, venue_name, country, latitude, longitude, description, image_url, tags, size_band, festival_editions(id, year, date_from, date_to, ticket_url, program)";

export async function fetchFestivals(): Promise<Festival[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("festivals").select(FESTIVAL_SELECT);

  if (error) throw error;
  return (data ?? []) as unknown as Festival[];
}

/** The edition to surface — the upcoming one, else the most recent. */
export function currentEdition(festival: Festival): FestivalEdition | null {
  const editions = festival.festival_editions;
  if (!editions || editions.length === 0) return null;
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = editions
    .filter((e) => (e.date_to ?? e.date_from ?? "") >= today)
    .sort((a, b) => (a.date_from ?? "").localeCompare(b.date_from ?? ""));
  if (upcoming.length > 0) return upcoming[0];
  return [...editions].sort((a, b) => b.year - a.year)[0];
}

export function editionDates(edition: FestivalEdition | null): string[] {
  if (!edition) return [];
  return edition.program.map((d) => d.date).sort();
}

export const BCP47_LOCALE: Record<string, string> = {
  nb: "nb-NO",
  en: "en-US",
  de: "de-DE",
  fr: "fr-FR",
  es: "es-ES",
};

/** Returns null when the festival has no date set — caller renders its own localized fallback. */
export function dateRangeLabel(festival: Festival, locale: string): string | null {
  const edition = currentEdition(festival);
  const from = edition?.date_from;
  const to = edition?.date_to;
  if (!from) return null;

  const bcp = BCP47_LOCALE[locale] ?? BCP47_LOCALE.nb;
  const first = new Date(from);
  const last = new Date(to ?? from);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" };

  if (!to || from === to) {
    return first.toLocaleDateString(bcp, opts);
  }
  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()} – ${last.toLocaleDateString(bcp, opts)}`;
  }
  return `${first.toLocaleDateString(bcp, opts)} – ${last.toLocaleDateString(bcp, opts)}`;
}

export function ticketUrl(festival: Festival): string | null {
  return currentEdition(festival)?.ticket_url ?? null;
}

/**
 * The edition's own start/end dates, falling back to its programme days when
 * the record has none. Using only the programme dates — as this once did —
 * silently drops the 62 festivals that have real dates but no line-up yet.
 */
export function editionRange(edition: FestivalEdition | null): [string, string] | null {
  if (!edition) return null;
  if (edition.date_from) return [edition.date_from, edition.date_to ?? edition.date_from];
  const days = editionDates(edition);
  if (days.length === 0) return null;
  return [days[0], days[days.length - 1]];
}

export const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * The two date-range presets the map offers. They are shortcuts that fill in
 * `dateFrom`/`dateTo` rather than a filter of their own, so a preset and a
 * hand-picked range can never disagree about what is on screen.
 *
 * "upcoming" deliberately has no end: capping it at new year would empty out
 * through autumn and hide the editions already booked for next year.
 */
export type TimeScope = "upcoming" | "year";

export function scopeRange(scope: TimeScope): { dateFrom: string; dateTo: string | null } {
  if (scope === "upcoming") return { dateFrom: todayISO(), dateTo: null };
  const year = new Date().getFullYear();
  return { dateFrom: `${year}-01-01`, dateTo: `${year}-12-31` };
}

/** Which preset a range corresponds to, or null when it matches neither. */
export function scopeOfRange(dateFrom: string | null, dateTo: string | null): TimeScope | null {
  for (const scope of ["upcoming", "year"] as TimeScope[]) {
    const r = scopeRange(scope);
    if (r.dateFrom === dateFrom && r.dateTo === (dateTo ?? null)) return scope;
  }
  return null;
}

export type FestivalFilters = {
  /** Exact festival names. Several are OR-ed together. */
  festivalNames?: string[];
  /** Exact country values, as stored on the record. OR-ed together. */
  countries?: string[];
  /** Exact artist names from the surfaced edition. OR-ed together. */
  artists?: string[];
  dateFrom?: string | null; // 'YYYY-MM-DD'
  dateTo?: string | null;
  /** Matches if the festival carries ANY of these tags — an OR, not an AND. */
  tags?: FestivalTag[] | null;
  /**
   * Inclusive positions into SIZE_BANDS. A range rather than a set of ticked
   * boxes, because size is a scale: "only small", "only large", "everything but
   * the giants" are all one drag from each end.
   */
  sizeMin?: number | null;
  sizeMax?: number | null;
};

/** Names billed in one edition. */
export function editionArtistNames(edition: FestivalEdition | null): string[] {
  return (edition?.program ?? []).flatMap((day) => day.artists.map((a) => a.name));
}

/**
 * Every name this festival has ever billed, across all editions on record.
 *
 * Searching only the surfaced edition -- as this once did -- made line-ups
 * vanish the moment an edition ended. Roskilde 2026 billed 186 artists; the day
 * it finished, the 2027 record took over as "current" with an empty programme,
 * and every one of those names became unsearchable. The same went for the 41
 * festivals given 2027 dates ahead of their line-up announcements.
 */
export function festivalArtistNames(festival: Festival): string[] {
  return (festival.festival_editions ?? []).flatMap(editionArtistNames);
}

export type Suggestions = { festivals: string[]; countries: string[]; artists: string[] };

/**
 * The values the filter offers, derived from the loaded festivals so a chip
 * can never describe something the data has no way of matching.
 *
 * Country is the only location field worth filtering on: every record has one,
 * whereas a quarter have no city, and venue strings are often addresses or
 * several venues joined together, which read badly as a filter chip.
 */
export function buildSuggestions(festivals: Festival[]): Suggestions {
  const names = new Set<string>();
  const countries = new Set<string>();
  const artists = new Set<string>();

  for (const festival of festivals) {
    if (festival.name) names.add(festival.name);
    if (festival.country) countries.add(festival.country);
    for (const a of festivalArtistNames(festival)) artists.add(a);
  }

  const sort = (set: Set<string>) => [...set].sort((a, b) => a.localeCompare(b));
  return { festivals: sort(names), countries: sort(countries), artists: sort(artists) };
}

export function filterFestivals(festivals: Festival[], filters: FestivalFilters): Festival[] {
  const names = filters.festivalNames ?? [];
  const countries = filters.countries ?? [];
  const artists = filters.artists ?? [];

  return festivals.filter((festival) => {
    if (names.length > 0 && !names.includes(festival.name)) return false;

    if (countries.length > 0) {
      if (!festival.country || !countries.includes(festival.country)) return false;
    }

    if (filters.tags && filters.tags.length > 0) {
      if (!festival.tags || !filters.tags.some((t) => festival.tags!.includes(t))) return false;
    }

    // Size is only consulted once the range has actually been narrowed, so the
    // untouched filter shows everything -- including the festivals whose size
    // nobody has filled in yet.
    //
    // Once narrowed, though, an unknown size is excluded rather than kept. The
    // date filter makes the opposite call, and deliberately: nearly every
    // festival has dates, so keeping the undated few costs nothing. Size starts
    // out unknown on all of them, and letting those ride along would make "only
    // the big ones" return the whole database -- an answer to no question.
    const min = filters.sizeMin ?? 0;
    const max = filters.sizeMax ?? SIZE_BANDS.length - 1;
    if (min > 0 || max < SIZE_BANDS.length - 1) {
      const size = sizeBandIndex(festival.size_band);
      if (size < min || size > max) return false;
    }

    // Dates and line-up both belong to an edition, so they have to be judged on
    // the same one. Testing them against different editions would let "Zara
    // Larsson, summer 2027" match on a 2026 line-up and a 2027 date -- a
    // festival that answers the question in two halves and not at all as asked.
    //
    // Which is also why the date range decides where the artist search looks
    // rather than the other way round: widen the range back to June 2026 and
    // Roskilde's 186 names come into scope, narrow it to next summer and only
    // what is actually announced for next summer does.
    const editions = festival.festival_editions ?? [];
    if (editions.length === 0) return artists.length === 0;

    return editions.some((edition) => {
      const range = editionRange(edition);

      // An edition with no date at all stays eligible under every date filter:
      // we don't know when it is, which is not the same as knowing it is over.
      if (range) {
        const [start, end] = range;
        if (filters.dateFrom && end < filters.dateFrom) return false;
        if (filters.dateTo && start > filters.dateTo) return false;
      }

      if (artists.length > 0) {
        const billed = editionArtistNames(edition);
        if (!artists.some((a) => billed.includes(a))) return false;
      }

      return true;
    });
  });
}
