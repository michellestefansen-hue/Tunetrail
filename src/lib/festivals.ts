import { createClient } from "@/lib/supabase/client";

export type FestivalDate = {
  date: string;
  day_label: string | null;
  performances: { artists: { name: string } | null }[];
};

export type TicketLink = {
  provider: string;
  url: string;
  label: string | null;
};

export type Festival = {
  id: string;
  name: string;
  slug: string;
  website_url: string | null;
  city: string | null;
  region: string | null;
  venue_name: string | null;
  latitude: number;
  longitude: number;
  description: string | null;
  festival_dates: FestivalDate[];
  ticket_links: TicketLink[];
};

export async function fetchFestivals(): Promise<Festival[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("festivals")
    .select(
      "id, name, slug, website_url, city, region, venue_name, latitude, longitude, description, festival_dates(date, day_label, performances(artists(name))), ticket_links(provider, url, label)",
    );

  if (error) throw error;
  return (data ?? []) as Festival[];
}

export function sortedDates(festival: Festival): string[] {
  return [...festival.festival_dates.map((d) => d.date)].sort();
}

export function dateRangeLabel(festival: Festival): string {
  const dates = sortedDates(festival);
  if (dates.length === 0) return "Dato ikke satt";

  const first = new Date(dates[0]);
  const last = new Date(dates[dates.length - 1]);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" };

  if (dates.length === 1) {
    return first.toLocaleDateString("nb-NO", opts);
  }
  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()}. - ${last.toLocaleDateString("nb-NO", opts)}`;
  }
  return `${first.toLocaleDateString("nb-NO", opts)} - ${last.toLocaleDateString("nb-NO", opts)}`;
}

export function primaryTicketLink(festival: Festival): TicketLink | null {
  return festival.ticket_links[0] ?? null;
}

export function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
