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

  // 2. Dates
  const dateRows = matches.flatMap((m) =>
    [...m.dates.keys()].map((date) => ({ festival_id: m.festival.id, date })),
  );
  await supabase
    .from("festival_dates")
    .upsert(dateRows, { onConflict: "festival_id,date", ignoreDuplicates: true });

  const festivalIds = matches.map((m) => m.festival.id);
  const { data: fdRows } = await supabase
    .from("festival_dates")
    .select("id, festival_id, date")
    .in("festival_id", festivalIds);
  const fdId = new Map(
    (fdRows ?? []).map((r) => [`${r.festival_id}|${r.date}`, r.id as string]),
  );

  // 3. Artists
  const artistNames = [
    ...new Set(matches.flatMap((m) => [...m.dates.values()].flatMap((s) => [...s]))),
  ];
  if (artistNames.length) {
    await supabase
      .from("artists")
      .upsert(artistNames.map((name) => ({ name })), { onConflict: "name", ignoreDuplicates: true });
  }
  const { data: aRows } = await supabase
    .from("artists")
    .select("id, name")
    .in("name", artistNames.length ? artistNames : ["__none__"]);
  const artistId = new Map((aRows ?? []).map((r) => [r.name as string, r.id as string]));

  // 4. Performances (only insert pairs that don't already exist)
  const fdIds = [...fdId.values()];
  const { data: existingPerf } = await supabase
    .from("performances")
    .select("festival_date_id, artist_id")
    .in("festival_date_id", fdIds.length ? fdIds : ["__none__"]);
  const existing = new Set(
    (existingPerf ?? []).map((p) => `${p.festival_date_id}|${p.artist_id}`),
  );
  const perfRows: { festival_date_id: string; artist_id: string }[] = [];
  for (const m of matches) {
    for (const [date, set] of m.dates) {
      const dateId = fdId.get(`${m.festival.id}|${date}`);
      if (!dateId) continue;
      for (const name of set) {
        const aid = artistId.get(name);
        if (!aid) continue;
        const key = `${dateId}|${aid}`;
        if (!existing.has(key)) {
          existing.add(key);
          perfRows.push({ festival_date_id: dateId, artist_id: aid });
        }
      }
    }
  }
  if (perfRows.length) await supabase.from("performances").insert(perfRows);

  // 5. Ticket links (add Ticketmaster link if the festival has none)
  const { data: existingTickets } = await supabase
    .from("ticket_links")
    .select("festival_id")
    .eq("provider", "Ticketmaster")
    .in("festival_id", festivalIds);
  const hasTicket = new Set((existingTickets ?? []).map((t) => t.festival_id as string));
  const ticketRows = matches
    .filter((m) => m.ticketUrl && !hasTicket.has(m.festival.id))
    .map((m) => ({ festival_id: m.festival.id, provider: "Ticketmaster", url: m.ticketUrl! }));
  if (ticketRows.length) await supabase.from("ticket_links").insert(ticketRows);

  // 6. Backfill city / image where missing
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
    dates: dateRows.length,
    artists: artistNames.length,
    offset,
  });
}
