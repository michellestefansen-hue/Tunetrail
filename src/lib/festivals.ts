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

export type FestivalCategory =
  | "Pop & Mainstream"
  | "Rock & Alternativ"
  | "Metal"
  | "Punk & Hardcore"
  | "Indie"
  | "Elektronisk & Dans"
  | "Techno & House"
  | "Hip-Hop & R&B"
  | "Jazz & Soul"
  | "Klassisk"
  | "Folk & Americana"
  | "Reggae & World"
  | "Blandet/Flersjanger";

export const FESTIVAL_CATEGORIES: FestivalCategory[] = [
  "Pop & Mainstream",
  "Rock & Alternativ",
  "Metal",
  "Punk & Hardcore",
  "Indie",
  "Elektronisk & Dans",
  "Techno & House",
  "Hip-Hop & R&B",
  "Jazz & Soul",
  "Klassisk",
  "Folk & Americana",
  "Reggae & World",
  "Blandet/Flersjanger",
];

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
  category: FestivalCategory | null;
  festival_editions: FestivalEdition[];
};

export const FESTIVAL_SELECT =
  "id, name, slug, website_url, city, region, venue_name, country, latitude, longitude, description, image_url, category, festival_editions(id, year, date_from, date_to, ticket_url, program)";

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

/** Which slice of the calendar the map is showing. */
export type TimeScope = "upcoming" | "year";

const todayISO = () => new Date().toISOString().slice(0, 10);

export type FestivalFilters = {
  /**
   * "upcoming" keeps anything not yet finished, with no upper bound so next
   * year's festivals stay reachable; "year" is the current calendar year.
   * Festivals with no date at all are kept either way — an unknown date is
   * not evidence the festival is over.
   */
  timeScope?: TimeScope;
  /** Exact festival names. Several are OR-ed together. */
  festivalNames?: string[];
  /** Exact country values, as stored on the record. OR-ed together. */
  countries?: string[];
  /** Exact artist names from the surfaced edition. OR-ed together. */
  artists?: string[];
  dateFrom?: string | null; // 'YYYY-MM-DD'
  dateTo?: string | null;
  categories?: FestivalCategory[] | null;
};

/** Names billed in the edition that the UI surfaces for this festival. */
export function festivalArtistNames(festival: Festival): string[] {
  const edition = currentEdition(festival);
  return (edition?.program ?? []).flatMap((day) => day.artists.map((a) => a.name));
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

    if (artists.length > 0) {
      const billed = festivalArtistNames(festival);
      if (!artists.some((a) => billed.includes(a))) return false;
    }

    if (filters.categories && filters.categories.length > 0) {
      if (!festival.category || !filters.categories.includes(festival.category)) return false;
    }

    const range = editionRange(currentEdition(festival));

    // A festival with no date at all stays visible under every time filter:
    // we don't know when it is, which is not the same as knowing it is over.
    if (range) {
      const [start, end] = range;

      if (filters.timeScope === "upcoming") {
        if (end < todayISO()) return false;
      } else if (filters.timeScope === "year") {
        const year = String(new Date().getFullYear());
        if (end < `${year}-01-01` || start > `${year}-12-31`) return false;
      }

      if (filters.dateFrom && end < filters.dateFrom) return false;
      if (filters.dateTo && start > filters.dateTo) return false;
    }

    return true;
  });
}
