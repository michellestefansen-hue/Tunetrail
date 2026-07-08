import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const TM_BASE = "https://app.ticketmaster.com/discovery/v2/events.json";
const BATCH = 150; // festivals processed per run (rotates daily to cover all)

type FestivalRow = {
  id: string;
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
  city: string | null;
  image_url: string | null;
};

function normalize(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(festival|festivalen|fest|open air|openair|open-air)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function searchTm(f: FestivalRow, key: string) {
  const core = normalize(f.name) || f.name.toLowerCase();
  const url =
    `${TM_BASE}?apikey=${key}&classificationName=music&size=60&locale=*` +
    `&keyword=${encodeURIComponent(core)}` +
    `&latlong=${f.latitude},${f.longitude}&radius=60&unit=km`;
  const res = await fetch(url);
  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 2000));
    return searchTm(f, key);
  }
  if (!res.ok) return [];
  const data = await res.json();
  return data?._embedded?.events ?? [];
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const tmKey = process.env.TM_API_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!tmKey || !serviceKey || !url) {
    return NextResponse.json({ error: "missing env" }, { status: 500 });
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  // Rotating window so each run stays well under the time limit.
  const { count } = await supabase
    .from("festivals")
    .select("id", { count: "exact", head: true })
    .eq("source", "wikidata");
  const total = count ?? 0;
  const day = Math.floor(Date.now() / 86_400_000);
  const offset = total ? (day * BATCH) % total : 0;

  const { data: batch, error } = await supabase
    .from("festivals")
    .select("id, slug, name, latitude, longitude, city, image_url")
    .eq("source", "wikidata")
    .order("id")
    .range(offset, offset + BATCH - 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const festivals = (batch ?? []) as FestivalRow[];

  // 1. Query Ticketmaster and collect matches.
  const matches: {
    festival: FestivalRow;
    dates: Map<string, Set<string>>;
    ticketUrl: string | null;
    city: string | null;
    image: string | null;
  }[] = [];

  for (const f of festivals) {
    const core = normalize(f.name);
    if (!core) continue;
    let events: unknown[] = [];
    try {
      events = await searchTm(f, tmKey);
    } catch {
      /* skip */
    }
    await new Promise((r) => setTimeout(r, 200));

    const dates = new Map<string, Set<string>>();
    let ticketUrl: string | null = null;
    let city: string | null = null;
    let image: string | null = null;

    for (const ev of events as Record<string, unknown>[]) {
      const evNorm = normalize(ev.name as string);
      const isMatch =
        evNorm === core ||
        (core.length >= 5 && (evNorm.includes(core) || core.includes(evNorm)));
      if (!isMatch) continue;

      const embedded = ev._embedded as Record<string, unknown> | undefined;
      const venue = (embedded?.venues as Record<string, unknown>[] | undefined)?.[0];
      const date = (ev.dates as { start?: { localDate?: string } })?.start?.localDate;
      if (!date) continue;

      if (!dates.has(date)) dates.set(date, new Set());
      const attractions = (embedded?.attractions as { name?: string }[] | undefined) ?? [];
      for (const a of attractions) {
        if (a.name && normalize(a.name) !== core) dates.get(date)!.add(a.name);
      }

      if (!ticketUrl && ev.url) ticketUrl = ev.url as string;
      const venueCity = (venue?.city as { name?: string } | undefined)?.name;
      if (!city && venueCity) city = venueCity.trim();
      if (!image) {
        const imgs = (ev.images as { url: string; width: number }[] | undefined) ?? [];
        image = imgs.filter((im) => im.width >= 640).sort((a, b) => b.width - a.width)[0]?.url ?? null;
      }
    }

    if (dates.size === 0) continue;
    matches.push({
      festival: f,
      dates,
      ticketUrl,
      city: f.city ? null : city,
      image: f.image_url ? null : image,
    });
  }

  if (matches.length === 0) {
    return NextResponse.json({ processed: festivals.length, matched: 0, offset });
  }

  const festivalIds = matches.map((m) => m.festival.id);

  // Build one edition per festival per year from the matched TM data.
  type Edition = {
    festival_id: string;
    year: number;
    date_from: string;
    date_to: string;
    ticket_url: string | null;
    program: { date: string; day_label: null; artists: { name: string; stage: null; time: null }[] }[];
    count: number;
  };
  const editions: Edition[] = [];
  for (const m of matches) {
    const byYear = new Map<number, Map<string, Set<string>>>();
    for (const [date, set] of m.dates) {
      const year = Number(date.slice(0, 4));
      if (!byYear.has(year)) byYear.set(year, new Map());
      byYear.get(year)!.set(date, set);
    }
    for (const [year, days] of byYear) {
      const sortedDays = [...days.keys()].sort();
      const program = sortedDays.map((d) => ({
        date: d,
        day_label: null as null,
        artists: [...days.get(d)!].map((name) => ({ name, stage: null as null, time: null as null })),
      }));
      editions.push({
        festival_id: m.festival.id,
        year,
        date_from: sortedDays[0],
        date_to: sortedDays[sortedDays.length - 1],
        ticket_url: m.ticketUrl,
        program,
        count: program.reduce((n, d) => n + d.artists.length, 0),
      });
    }
  }

  // Don't clobber a richer existing edition (e.g. a manually curated program);
  // only upsert when we have at least as many artists as what's already stored.
  const { data: existingEds } = await supabase
    .from("festival_editions")
    .select("festival_id, year, program")
    .in("festival_id", festivalIds);
  const existingCount = new Map(
    (existingEds ?? []).map((e) => {
      const prog = (e.program as { artists?: unknown[] }[] | null) ?? [];
      return [`${e.festival_id}|${e.year}`, prog.reduce((n, d) => n + (d.artists?.length ?? 0), 0)];
    }),
  );

  const toUpsert = editions
    .filter((e) => e.count >= (existingCount.get(`${e.festival_id}|${e.year}`) ?? 0))
    .map((e) => ({
      festival_id: e.festival_id,
      year: e.year,
      date_from: e.date_from,
      date_to: e.date_to,
      ticket_url: e.ticket_url,
      program: e.program,
      source: "ticketmaster",
    }));
  if (toUpsert.length) {
    await supabase.from("festival_editions").upsert(toUpsert, { onConflict: "festival_id,year" });
  }

  // Backfill city / image where missing.
  for (const m of matches) {
    if (!m.city && !m.image) continue;
    const patch: { city?: string; image_url?: string } = {};
    if (m.city) patch.city = m.city;
    if (m.image) patch.image_url = m.image;
    await supabase.from("festivals").update(patch).eq("id", m.festival.id);
  }

  return NextResponse.json({
    processed: festivals.length,
    matched: matches.length,
    editions: toUpsert.length,
    offset,
  });
}
