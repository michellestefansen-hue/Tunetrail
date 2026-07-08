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

export function dateRangeLabel(festival: Festival): string {
  const edition = currentEdition(festival);
  const from = edition?.date_from;
  const to = edition?.date_to;
  if (!from) return "Dato ikke satt";

  const first = new Date(from);
  const last = new Date(to ?? from);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" };

  if (!to || from === to) {
    return first.toLocaleDateString("nb-NO", opts);
  }
  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()}. - ${last.toLocaleDateString("nb-NO", opts)}`;
  }
  return `${first.toLocaleDateString("nb-NO", opts)} - ${last.toLocaleDateString("nb-NO", opts)}`;
}

export function ticketUrl(festival: Festival): string | null {
  return currentEdition(festival)?.ticket_url ?? null;
}

export type FestivalFilters = {
  query?: string;
  dateFrom?: string | null; // 'YYYY-MM-DD'
  dateTo?: string | null;
  categories?: FestivalCategory[] | null;
};

export function filterFestivals(festivals: Festival[], filters: FestivalFilters): Festival[] {
  const query = filters.query?.trim().toLowerCase() ?? "";

  return festivals.filter((festival) => {
    if (query) {
      const haystack = [
        festival.name,
        festival.city,
        festival.region,
        festival.country,
        festival.venue_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    if (filters.categories && filters.categories.length > 0) {
      if (!festival.category || !filters.categories.includes(festival.category)) return false;
    }

    if (filters.dateFrom || filters.dateTo) {
      const dates = editionDates(currentEdition(festival));
      const overlaps = dates.some((date) => {
        if (filters.dateFrom && date < filters.dateFrom) return false;
        if (filters.dateTo && date > filters.dateTo) return false;
        return true;
      });
      if (!overlaps) return false;
    }

    return true;
  });
}
