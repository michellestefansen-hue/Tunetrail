"use client";

import { useMemo, useState } from "react";
import {
  buildDiff,
  diffProgram,
  opsCount,
  type FieldValue,
  type ProgramDay,
} from "@/lib/submissions";
import { submitAll } from "./actions";
import { GeneralFields, type Values } from "./GeneralFields";
import { LineupFields, type Edition } from "./LineupFields";

export function ProposeTabs({
  slug,
  name,
  current,
  editions,
}: {
  slug: string;
  name: string;
  current: Record<string, FieldValue>;
  editions: Edition[];
}) {
  const [tab, setTab] = useState<"generelt" | "program">("generelt");

  // Everything lives here, not in the tabs. Rendering one tab unmounts the
  // other, so state held inside them would be thrown away on every switch --
  // which is exactly what happened before.
  const [values, setValues] = useState<Values>(current);
  const [year, setYear] = useState(editions[0]?.year ?? 0);
  const [byYear, setByYear] = useState<Record<number, ProgramDay[]>>(() =>
    Object.fromEntries(
      editions.map((e) => [e.year, e.days.map((d) => ({ ...d, artists: [...d.artists] }))]),
    ),
  );
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  const [sentParts, setSentParts] = useState({ fields: false, program: false });

  const edition = editions.find((e) => e.year === year) ?? editions[0];
  const days = useMemo(() => byYear[year] ?? [], [byYear, year]);
  const ops = useMemo(
    () => (edition ? diffProgram(edition.days, days) : { add: [], remove: [], move: [] }),
    [edition, days],
  );

  const fieldDiff = useMemo(
    () => buildDiff(current as Record<string, unknown>, values).payload,
    [current, values],
  );

  const changedFields = Object.keys(fieldDiff).length;
  const changedOps = opsCount(ops);
  const total = changedFields + changedOps;

  async function submit() {
    setState("sending");
    setError("");
    const res = await submitAll(slug, values, edition ? year : null, ops, note);
    if (res.ok) {
      setSentParts(res.parts);
      setState("sent");
    } else {
      setState("idle");
      setError(res.error);
    }
  }

  // Tabs disappear once it is sent: there is nothing left to edit, and leaving
  // them would invite a second identical submission.
  if (state === "sent") {
    const bits = [
      sentParts.fields && "detaljene",
      sentParts.program && `programmet for ${year}`,
    ].filter(Boolean);
    return (
      <div className="space-y-3 rounded-2xl border border-black/10 bg-white p-6">
        <h2 className="text-xl font-bold text-[#2D1A12]">Takk — forslaget er sendt</h2>
        <p className="text-[#2D1A12]/70">
          Du foreslo endringer i {bits.join(" og ")}. Det leses gjennom før det havner på
          siden, så endringene vises ikke med én gang.
        </p>
        <a href={`/festival/${slug}`} className="inline-block text-[#FF4E50] underline">
          Tilbake til {name}
        </a>
      </div>
    );
  }

  const tabs = [
    { id: "generelt" as const, label: "Generelt", n: changedFields },
    { id: "program" as const, label: "Program", n: changedOps },
  ];

  return (
    <div>
      <div role="tablist" className="flex gap-1 border-b border-black/10">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              tab === t.id
                ? "border-[#FF4E50] text-[#2D1A12]"
                : "border-transparent text-[#2D1A12]/50 hover:text-[#2D1A12]/80"
            }`}
          >
            {t.label}
            {/* A count on the tab you are not looking at is the only sign that
                unsent work is waiting over there. */}
            {t.n > 0 && (
              <span className="rounded-full bg-[#FF4E50] px-1.5 py-0.5 text-xs text-white">
                {t.n}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="pt-6">
        {tab === "generelt" ? (
          <GeneralFields values={values} onChange={setValues} />
        ) : editions.length === 0 ? (
          <p className="rounded-xl border border-black/10 bg-white px-4 py-6 text-[#2D1A12]/60">
            Denne festivalen har ingen utgaver registrert ennå, så det er ikke noe program
            å redigere.
          </p>
        ) : (
          <LineupFields
            editions={editions}
            year={year}
            onYear={setYear}
            days={days}
            onDays={(next) => setByYear((prev) => ({ ...prev, [year]: next }))}
          />
        )}
      </div>

      <div className="mt-8 space-y-6 border-t border-black/10 pt-6">
        {total > 0 && (
          <div className="rounded-xl border border-black/10 bg-white p-4">
            <h3 className="font-medium text-[#2D1A12]">Dette sender du inn</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {changedFields > 0 && (
                <li className="text-[#2D1A12]/70">
                  <strong>Detaljer:</strong> {Object.keys(fieldDiff).join(", ")}
                </li>
              )}
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
          <label htmlFor="kommentar" className="block font-medium text-[#2D1A12]">
            Kommentar <span className="font-normal text-[#2D1A12]/50">(valgfritt)</span>
          </label>
          <p className="text-sm text-[#2D1A12]/60">
            Har du en lenke eller en forklaring, hjelper det den som skal godkjenne.
          </p>
          <textarea
            id="kommentar"
            rows={3}
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

        <button
          type="button"
          onClick={submit}
          disabled={state === "sending" || total === 0}
          className="rounded-full bg-gradient-to-r from-amber-500 to-[#FF4E50] px-6 py-3 font-medium text-white disabled:opacity-40"
        >
          {state === "sending"
            ? "Sender …"
            : total === 0
              ? "Ingen endringer ennå"
              : `Send ${total} ${total === 1 ? "endring" : "endringer"}`}
        </button>
      </div>
    </div>
  );
}
