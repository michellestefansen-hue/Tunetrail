"use server";

import { createClient } from "@/lib/supabase/server";
import { checkArtistName, isValidTag, type ProgramDay } from "@/lib/submissions";
import { findDuplicates, type Candidate, type Match } from "@/lib/duplicates";

export type NewFestival = {
  name: string;
  country: string;
  city: string;
  venue_name: string;
  website_url: string;
  ticket_url: string;
  description: string;
  image_url: string;
  tags: string[];
  latitude: number | null;
  longitude: number | null;
  date_from: string;
  date_to: string;
  /** Optional: a contributor may not know the lineup yet. */
  program: ProgramDay[];
};

export type NewError =
  | { code: "notAuthenticated" | "tooManyPending" }
  | { code: "missing"; field: string }
  | { code: "badDates" }
  | { code: "badArtist"; name: string }
  | { code: "unknown"; message: string };

export type NewResult = { ok: true } | { ok: false; error: NewError };

/** Everything the duplicate check needs, small enough to ship to the browser. */
export async function candidatesFor(country: string): Promise<Candidate[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("festivals")
    .select("slug, name, city, country, latitude, longitude")
    .eq("country", country);
  return (data ?? []) as Candidate[];
}

export async function checkDuplicates(
  name: string,
  city: string,
  country: string,
  coords: [number, number] | null,
): Promise<Match[]> {
  if (name.trim().length < 3 || !country) return [];
  const all = await candidatesFor(country);
  return findDuplicates({ name, city, country, coords }, all);
}

export async function submitNewFestival(f: NewFestival): Promise<NewResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: { code: "notAuthenticated" } };

  // Required, and re-checked here rather than trusted from the form. Each one
  // is required for a reason: without coordinates the festival never appears
  // on the map, without dates it never appears in the list (which only shows
  // what is coming up), without a genre it is in no filter and no guide, and
  // without a website there is nothing to verify it against.
  const required: [string, unknown][] = [
    ["name", f.name.trim()],
    ["country", f.country],
    ["website_url", f.website_url.trim()],
    ["latitude", f.latitude],
    ["date_from", f.date_from],
    ["date_to", f.date_to],
  ];
  for (const [field, value] of required) {
    if (value === null || value === undefined || value === "") {
      return { ok: false, error: { code: "missing", field } };
    }
  }
  const tags = f.tags.filter(isValidTag);
  if (tags.length === 0) return { ok: false, error: { code: "missing", field: "tags" } };
  if (f.date_to < f.date_from) return { ok: false, error: { code: "badDates" } };

  // The lineup is optional, but whatever arrives is cleaned here rather than
  // trusted from the form: no clock times inside artist names, no days outside
  // the festival, and stage/time always null -- all three were fixed by hand
  // across the database on 2 August 2026 and must not come back in this way.
  const program: { date: string; day_label: null; artists: { name: string; stage: null; time: null }[] }[] = [];
  for (const day of f.program ?? []) {
    if (day.date < f.date_from || day.date > f.date_to) continue;
    const artists: { name: string; stage: null; time: null }[] = [];
    for (const raw of day.artists) {
      const { name, errorCode } = checkArtistName(raw);
      if (errorCode) return { ok: false, error: { code: "badArtist", name: raw } };
      artists.push({ name, stage: null, time: null });
    }
    if (artists.length > 0) program.push({ date: day.date, day_label: null, artists });
  }

  // A queue is only a safeguard while someone can still read it. Everything is
  // moderated, so the worst case is wasted review time rather than bad data --
  // but a cap keeps that from becoming an evening's work.
  const { count } = await supabase
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("submitted_by", user.id)
    .eq("kind", "festival_new")
    .eq("status", "pending");
  if ((count ?? 0) >= 5) return { ok: false, error: { code: "tooManyPending" } };

  const { error } = await supabase.from("submissions").insert({
    kind: "festival_new",
    festival_id: null,
    // No slug: it is the URL, so it is generated at approval where collisions
    // can be resolved against what already exists.
    payload: {
      name: f.name.trim(),
      country: f.country,
      city: f.city.trim() || null,
      venue_name: f.venue_name.trim() || null,
      website_url: f.website_url.trim(),
      ticket_url: f.ticket_url.trim() || null,
      description: f.description.trim() || null,
      image_url: f.image_url.trim() || null,
      tags,
      latitude: f.latitude,
      longitude: f.longitude,
      date_from: f.date_from,
      date_to: f.date_to,
      program,
    },
    base_snapshot: {},
    submitted_by: user.id,
    status: "pending",
  });

  if (error) return { ok: false, error: { code: "unknown", message: error.message } };
  return { ok: true };
}
