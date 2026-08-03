"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Match } from "@/lib/duplicates";
import { approveNewFestival, rejectSubmission } from "./actions";

export type NewFestivalPayload = {
  name: string;
  country: string | null;
  city: string | null;
  venue_name: string | null;
  website_url: string | null;
  ticket_url: string | null;
  description: string | null;
  image_url: string | null;
  tags: string[] | null;
  size_band: string | null;
  latitude: number | null;
  longitude: number | null;
  date_from: string;
  date_to: string;
  program?: { date: string; artists: { name: string }[] }[];
};

const SIZE_LABEL: Record<string, string> = {
  under_200: "under 200 deltagere",
  "200_2000": "200 – 2 000 deltagere",
  "2000_10000": "2 000 – 10 000 deltagere",
  "10000_50000": "10 000 – 50 000 deltagere",
  "50000_100000": "50 000 – 100 000 deltagere",
  over_100000: "over 100 000 deltagere",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-black/5 py-2 last:border-0 sm:grid-cols-[10rem_1fr]">
      <dt className="text-sm text-[#2D1A12]/50">{label}</dt>
      <dd className="text-sm break-words text-[#2D1A12]">{children}</dd>
    </div>
  );
}

/**
 * A new festival is judged whole, not field by field: there is nothing to
 * compare against, and half a festival is not something you can publish.
 * Approve or reject, no checkboxes.
 */
export function NewFestivalReview({
  id,
  payload,
  duplicates,
}: {
  id: string;
  payload: NewFestivalPayload;
  duplicates: Match[];
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const p = payload;
  const artistCount = (p.program ?? []).reduce((n, d) => n + d.artists.length, 0);

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    setError("");
    const res = await fn();
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Ukjent feil.");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Repeated here on purpose: the contributor saw this warning too, and
          may well have clicked past it. This is the last chance to catch it. */}
      {duplicates.length > 0 && (
        <div className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="font-medium text-amber-900">Ligner på noe som finnes fra før</p>
          <ul className="space-y-1">
            {duplicates.map((d) => (
              <li key={d.slug} className="text-sm">
                <a
                  href={`/festival/${d.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-amber-900 underline"
                >
                  {d.name}
                </a>
                <span className="text-amber-900/70">
                  {d.city ? ` — ${d.city}` : ""}
                  {d.reason === "nearby" ? " (i nærheten)" : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <dl className="rounded-xl border border-black/10 bg-white px-4 py-2">
        <Row label="Navn">{p.name}</Row>
        <Row label="Land">{p.country ?? "–"}</Row>
        <Row label="By">{p.city ?? "–"}</Row>
        <Row label="Arena">{p.venue_name ?? "–"}</Row>
        <Row label="Datoer">
          {p.date_from} – {p.date_to}
        </Row>
        <Row label="Nettsted">
          {p.website_url ? (
            <a
              href={p.website_url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-[#FF4E50] underline"
            >
              {p.website_url}
            </a>
          ) : (
            "–"
          )}
        </Row>
        <Row label="Billetter">
          {p.ticket_url ? (
            <a
              href={p.ticket_url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-[#FF4E50] underline"
            >
              {p.ticket_url}
            </a>
          ) : (
            "–"
          )}
        </Row>
        <Row label="Sjangre">{p.tags?.join(", ") || "–"}</Row>
        <Row label="Størrelse">{p.size_band ? SIZE_LABEL[p.size_band] ?? p.size_band : "–"}</Row>
        <Row label="Koordinater">
          {p.latitude != null ? (
            <a
              href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}
              target="_blank"
              rel="noreferrer noopener"
              className="text-[#FF4E50] underline"
            >
              {p.latitude.toFixed(4)}, {p.longitude?.toFixed(4)} — se i kart
            </a>
          ) : (
            "–"
          )}
        </Row>
        <Row label="Beskrivelse">{p.description ?? "–"}</Row>
        <Row label="Bilde">
          {p.image_url ? (
            <a
              href={p.image_url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-[#FF4E50] underline"
            >
              {p.image_url}
            </a>
          ) : (
            "–"
          )}
        </Row>
        <Row label="Program">
          {artistCount === 0
            ? "Ikke oppgitt"
            : `${p.program!.length} dager, ${artistCount} artister`}
        </Row>
      </dl>

      {artistCount > 0 && (
        <ul className="space-y-2">
          {p.program!.map((day) => (
            <li key={day.date} className="rounded-xl border border-black/10 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#FF2D78]">
                {day.date}
              </p>
              <p className="mt-1 text-sm text-[#2D1A12]/80">
                {day.artists.map((a) => a.name).join(", ")}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-1.5">
        <label htmlFor="nyfestnotat" className="block text-sm font-medium text-[#2D1A12]">
          Notat <span className="font-normal text-[#2D1A12]/50">(valgfritt)</span>
        </label>
        <textarea
          id="nyfestnotat"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-[#2D1A12] outline-none focus:border-black/30"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => run(() => approveNewFestival(id, note))}
          disabled={busy}
          className="rounded-full bg-gradient-to-r from-amber-500 to-[#FF4E50] px-6 py-3 font-medium text-white disabled:opacity-40"
        >
          {busy ? "Lagrer …" : "Opprett festivalen"}
        </button>
        <button
          onClick={() => run(() => rejectSubmission(id, note))}
          disabled={busy}
          className="rounded-full border border-black/15 px-6 py-3 font-medium text-[#2D1A12]/70 disabled:opacity-40"
        >
          Avvis
        </button>
      </div>
    </div>
  );
}
