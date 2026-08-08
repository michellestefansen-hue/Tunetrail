import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  normalise,
  canonicalise,
  fingerprint,
  MIN_TEXT_LENGTH,
} from "@/lib/watchFingerprint";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Endringsvakt for festivalenes egne nettsteder.
 *
 * Svarer bare på ett spørsmål: har teksten på siden endret seg siden sist?
 * Den leser aldri hva som står der, og den skriver aldri til festivals eller
 * festival_editions -- kun til sin egen tabell. Det er hele poenget: den
 * forrige nattjobben skrev rett i basen og ødela data, denne kan ikke.
 *
 * Radene som flagges plukkes opp av Claude Code lokalt, som er den eneste
 * delen som koster noe, og som sender forslag inn i innsendingskøen.
 */

// 25 i døgnet dekker alle 669 nettstedene på under en måned, og holder kjøringen
// godt innenfor tidsgrensen. Vercel kjører cron én gang i døgnet på Hobby.
const BATCH = 25;
const CONCURRENCY = 5;
const FETCH_TIMEOUT_MS = 8000;

// Nok til å kjenne igjen siden ved feilsøking, lite nok til at tabellen ikke
// blir et arkiv over 669 nettsteder.
const EXCERPT_LENGTH = 400;

// Etter fem strake feil er nettstedet enten borte eller stenger oss ute.
// Da faller festivalen ut av køen i stedet for å blokkere den.
const MAX_FAILURES = 5;

type WatchRow = { festival_id: string; url: string; fingerprint: string | null; failures: number };

async function fetchPage(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // Ærlig om hvem vi er, med en adresse den som lurer kan skrive til.
        // 669 nettsteder én gang i måneden er svært lite trafikk, men de skal
        // kunne se hvem det er i loggene sine.
        "user-agent":
          "TunetrailWatch/1.0 (+https://tune-trail.org; kontakt: michellestefansen@gmail.com)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("html")) throw new Error(`uventet innholdstype: ${type}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !url) {
    return NextResponse.json({ error: "missing env" }, { status: 500 });
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Den som ble sjekket for lengst siden står først, aldri sjekkede aller først.
  // Det gir en jevn runde gjennom hele listen uten at noe teller må lagres.
  const { data, error } = await supabase
    .from("festival_watch")
    .select("festival_id, url, fingerprint, failures")
    .lt("failures", MAX_FAILURES)
    .order("checked_at", { ascending: true, nullsFirst: true })
    .limit(BATCH);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as WatchRow[];
  const now = new Date().toISOString();
  let changed = 0;
  let failed = 0;

  // Noen få om gangen: 669 nettsteder er ikke mye, men vi er gjest hos hver
  // enkelt av dem, og de skal ikke merke oss.
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const slice = rows.slice(i, i + CONCURRENCY);
    await Promise.all(
      slice.map(async (row) => {
        try {
          const html = await fetchPage(row.url);
          const text = normalise(html);

          // En side som gir nesten ingen tekst er som regel et JavaScript-skall
          // vi ikke kan lese. Da er et fingeravtrykk verdiløst, og å late som
          // noe annet ville gitt et falskt «uendret» i all framtid.
          if (text.length < MIN_TEXT_LENGTH) {
            throw new Error(`for lite tekst (${text.length} tegn) -- trolig JavaScript-side`);
          }

          // Avtrykket tas av ordsettet, utdraget av den lesbare teksten:
          // det ene skal være stabilt, det andre skal kunne leses av et
          // menneske som lurer på hva vakten faktisk så.
          const hash = await fingerprint(canonicalise(text));
          const isChanged = row.fingerprint !== null && row.fingerprint !== hash;
          if (isChanged) changed++;

          await supabase
            .from("festival_watch")
            .update({
              fingerprint: hash,
              excerpt: text.slice(0, EXCERPT_LENGTH),
              checked_at: now,
              failures: 0,
              last_error: null,
              // Første gang vi ser en side er alt «nytt», men ingenting har
              // endret seg. Da lagres avtrykket uten å flagge.
              ...(isChanged ? { changed_at: now, pending: true } : {}),
            })
            .eq("festival_id", row.festival_id);
        } catch (err) {
          failed++;
          await supabase
            .from("festival_watch")
            .update({
              checked_at: now,
              failures: row.failures + 1,
              last_error: err instanceof Error ? err.message : String(err),
            })
            .eq("festival_id", row.festival_id);
        }
      }),
    );
  }

  return NextResponse.json({ checked: rows.length, changed, failed });
}
