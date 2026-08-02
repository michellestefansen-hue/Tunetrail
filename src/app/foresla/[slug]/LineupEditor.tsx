"use client";

import { useMemo, useState } from "react";
import { ArtistSearch } from "@/components/ArtistSearch";
import { diffProgram, opsCount, type ProgramDay } from "@/lib/submissions";
import { submitProgram } from "./actions";

export type Edition = { year: number; date_from: string; date_to: string; days: ProgramDay[] };

function dayLabel(date: string) {
  return new Date(date + "T12:00:00").toLocaleDateString("nb-NO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function LineupEditor({
  slug,
  editions,
}: {
  slug: string;
  editions: Edition[];
}) {
  const [year, setYear] = useState(editions[0]?.year);
  const edition = editions.find((e) => e.year === year) ?? editions[0];

  const [byYear, setByYear] = useState<Record<number, ProgramDay[]>>(() =>
    Object.fromEntries(editions.map((e) => [e.year, e.days.map((d) => ({ ...d, artists: [...d.artists] }))])),
  );
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  const days = byYear[edition.year] ?? [];
  const original = edition.days;
  const ops = useMemo(() => diffProgram(original, days), [original, days]);
  const changes = opsCount(ops);

  function update(next: ProgramDay[]) {
    setByYear((prev) => ({ ...prev, [edition.year]: next }));
  }

  function addArtist(date: string, name: string) {
    update(days.map((d) => (d.date === date ? { ...d, artists: [...d.artists, name] } : d)));
  }

  function removeArtist(date: string, name: string) {
    update(
      days.map((d) =>
        d.date === date ? { ...d, artists: d.artists.filter((a) => a !== name) } : d,
      ),
    );
  }

  function moveArtist(from: string, to: string, name: string) {
    update(
      days.map((d) => {
        if (d.date === from) return { ...d, artists: d.artists.filter((a) => a !== name) };
        if (d.date === to) return { ...d, artists: [...d.artists, name] };
        return d;
      }),
    );
  }

  async function submit() {
    setState("sending");
    setError("");
    const res = await submitProgram(slug, edition.year, ops, note);
    if (res.ok) setState("sent");
    else {
      setState("idle");
      setError(res.error);
    }
  }

  if (state === "sent") {
    return (
      <div className="space-y-3 rounded-2xl border border-black/10 bg-white p-6">
        <h2 className="text-xl font-bold text-[#2D1A12]">Takk — programforslaget er sendt</h2>
        <p className="text-[#2D1A12]/70">
          Det leses gjennom før det havner på siden.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {editions.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {editions.map((e) => (
            <button
              key={e.year}
              type="button"
              onClick={() => setYear(e.year)}
              className={`rounded-full border px-4 py-1.5 text-sm ${
                e.year === edition.year
                  ? "border-transparent bg-[#2D1A12] text-white"
                  : "border-black/15 bg-white text-[#2D1A12]/70"
              }`}
            >
              {e.year}
            </button>
          ))}
        </div>
      )}

      {days.length === 0 ? (
        <p className="rounded-xl border border-black/10 bg-white px-4 py-6 text-[#2D1A12]/60">
          Denne utgaven har ingen datoer registrert ennå, så det er ikke noe å fordele
          artister på.
        </p>
      ) : (
        <div className="space-y-4">
          {days.map((day) => (
            <section key={day.date} className="rounded-xl border border-black/10 bg-white p-4">
              <h3 className="font-medium text-[#2D1A12]">{dayLabel(day.date)}</h3>
              <p className="text-xs text-[#2D1A12]/45">
                {day.artists.length} {day.artists.length === 1 ? "artist" : "artister"}
              </p>

              {day.artists.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {day.artists.map((a) => (
                    <li
                      key={a}
                      className="group flex items-center gap-1.5 rounded-full bg-black/[0.05] py-1 pl-3 pr-1 text-sm text-[#2D1A12]"
                    >
                      {a}
                      {days.length > 1 && (
                        <select
                          aria-label={`Flytt ${a} til en annen dag`}
                          value=""
                          onChange={(e) => e.target.value && moveArtist(day.date, e.target.value, a)}
                          className="cursor-pointer rounded bg-transparent text-xs text-[#2D1A12]/45"
                        >
                          <option value="">flytt…</option>
                          {days
                            .filter((d) => d.date !== day.date)
                            .map((d) => (
                              <option key={d.date} value={d.date}>
                                {dayLabel(d.date)}
                              </option>
                            ))}
                        </select>
                      )}
                      <button
                        type="button"
                        onClick={() => removeArtist(day.date, a)}
                        aria-label={`Fjern ${a}`}
                        className="grid size-5 place-items-center rounded-full text-[#2D1A12]/40 hover:bg-black/10 hover:text-[#2D1A12]"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-3">
                <ArtistSearch
                  exclude={new Set(day.artists.map((a) => a.toLowerCase()))}
                  onPick={(name) => addArtist(day.date, name)}
                />
              </div>
            </section>
          ))}
        </div>
      )}

      {changes > 0 && (
        <div className="rounded-xl border border-black/10 bg-white p-4">
          <h3 className="font-medium text-[#2D1A12]">Dette sender du inn</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {ops.add.length > 0 && (
              <li className="text-emerald-800">
                <strong>+{ops.add.length}</strong> lagt til:{" "}
                {ops.add.map((o) => o.name).join(", ")}
              </li>
            )}
            {ops.remove.length > 0 && (
              <li className="text-red-800">
                <strong>−{ops.remove.length}</strong> fjernet:{" "}
                {ops.remove.map((o) => o.name).join(", ")}
              </li>
            )}
            {ops.move.length > 0 && (
              <li className="text-[#2D1A12]/70">
                <strong>{ops.move.length}</strong> flyttet:{" "}
                {ops.move.map((o) => o.name).join(", ")}
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="prog-kommentar" className="block font-medium text-[#2D1A12]">
          Kommentar <span className="font-normal text-[#2D1A12]/50">(valgfritt)</span>
        </label>
        <textarea
          id="prog-kommentar"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Har du en lenke til programmet, hjelper det den som skal godkjenne."
          className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-[#2D1A12] outline-none focus:border-black/30"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={state === "sending" || changes === 0}
        className="rounded-full bg-gradient-to-r from-amber-500 to-[#FF4E50] px-6 py-3 font-medium text-white disabled:opacity-40"
      >
        {state === "sending"
          ? "Sender …"
          : changes === 0
            ? "Ingen endringer ennå"
            : `Send ${changes} ${changes === 1 ? "endring" : "endringer"}`}
      </button>
    </div>
  );
}
