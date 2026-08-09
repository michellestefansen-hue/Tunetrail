"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ProgramOps } from "@/lib/submissions";
import { approveProgram, rejectSubmission } from "./actions";

function dayLabel(date: string) {
  return new Date(date + "T12:00:00").toLocaleDateString("nb-NO", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// Med årstall, i motsetning til dayLabel: denne seksjonen handler nettopp om
// hvilket år det gjelder, og «28. juni» alene svarer ikke på det.
function dateWithYear(date: string) {
  return new Date(date + "T12:00:00").toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type Key = string;
const keyOf = (kind: string, i: number): Key => `${kind}:${i}`;

const TICKET_KEY: Key = "ticket:0";
const DATES_KEY: Key = "dates:0";

export function ProgramReview({
  id,
  year,
  ops,
  currentTicketUrl,
  currentDates,
}: {
  id: string;
  year: number;
  ops: ProgramOps;
  /** Read fresh from festival_editions, for the same conflict check as ordinary fields. */
  currentTicketUrl: string | null;
  /** Null when the edition does not exist yet -- this proposal would create it. */
  currentDates: { from: string; to: string } | null;
}) {
  const router = useRouter();
  const ticketConflict =
    !!ops.ticket_url && ops.ticket_url.base !== currentTicketUrl;

  // The contributor submitted against an edition that did not exist. If it
  // exists now, someone else added the year first -- their dates stay and this
  // needs a decision, rather than quietly overwriting work done in between.
  const createsYear = !!ops.dates && ops.dates.base === null;
  const datesConflict =
    !!ops.dates &&
    (createsYear
      ? currentDates !== null
      : currentDates === null ||
        ops.dates.base!.from !== currentDates.from ||
        ops.dates.base!.to !== currentDates.to);

  // Additions start accepted, removals do not. Adding a name is nearly always
  // right; taking one away is the operation worth a second look, and it is the
  // one that loses work if it slips through. A ticket link change starts
  // accepted too, unless it conflicts with what is actually stored now.
  const [checked, setChecked] = useState<Set<Key>>(() => {
    const s = new Set([
      ...ops.add.map((_, i) => keyOf("add", i)),
      ...ops.move.map((_, i) => keyOf("move", i)),
    ]);
    if (ops.ticket_url && !ticketConflict) s.add(TICKET_KEY);
    if (ops.dates && !datesConflict) s.add(DATES_KEY);
    return s;
  });
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function toggle(k: Key) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  function setGroup(kind: "add" | "remove" | "move", on: boolean) {
    const list = ops[kind];
    setChecked((prev) => {
      const next = new Set(prev);
      list.forEach((_, i) => {
        const k = keyOf(kind, i);
        if (on) next.add(k);
        else next.delete(k);
      });
      return next;
    });
  }

  async function approve() {
    setBusy(true);
    setError("");
    const accepted: ProgramOps = {
      add: ops.add.filter((_, i) => checked.has(keyOf("add", i))),
      remove: ops.remove.filter((_, i) => checked.has(keyOf("remove", i))),
      move: ops.move.filter((_, i) => checked.has(keyOf("move", i))),
      ...(ops.ticket_url && checked.has(TICKET_KEY) ? { ticket_url: ops.ticket_url } : {}),
      ...(ops.dates && checked.has(DATES_KEY) ? { dates: ops.dates } : {}),
    };
    const res = await approveProgram(id, accepted, note);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  async function reject() {
    setBusy(true);
    setError("");
    const res = await rejectSubmission(id, note);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  const groups = [
    {
      kind: "add" as const,
      title: "Legges til",
      tone: "text-emerald-900 bg-emerald-50",
      items: ops.add.map((o) => ({ text: o.name, when: dayLabel(o.date) })),
    },
    {
      kind: "remove" as const,
      title: "Fjernes",
      tone: "text-red-900 bg-red-50",
      items: ops.remove.map((o) => ({ text: o.name, when: dayLabel(o.date) })),
    },
    {
      kind: "move" as const,
      title: "Flyttes",
      tone: "text-[#2D1A12] bg-black/[0.04]",
      items: ops.move.map((o) => ({
        text: o.name,
        when: `${dayLabel(o.from)} → ${dayLabel(o.to)}`,
      })),
    },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <p className="text-sm text-[#2D1A12]/60">
        Programforslag for {year}. Tilføyelser er huket av på forhånd; fjerninger er det
        ikke, fordi det er de som kan slette andres arbeid.
      </p>

      {ops.dates && (
        <section
          className={`rounded-xl border bg-white ${
            datesConflict ? "border-amber-400" : "border-black/10"
          }`}
        >
          <label className="flex cursor-pointer items-start gap-3 px-4 py-3">
            <input
              type="checkbox"
              checked={checked.has(DATES_KEY)}
              onChange={() => toggle(DATES_KEY)}
              className="mt-1 size-4 shrink-0"
            />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="font-medium text-[#2D1A12]">
                {createsYear ? `Oppretter utgaven ${year}` : `Datoer for ${year}`}
              </div>

              {createsYear && !datesConflict && (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                  Året finnes ikke i basen ennå. Godkjenner du dette, opprettes
                  utgaven med disse datoene.
                </p>
              )}

              {datesConflict && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {createsYear
                    ? "Noen andre har lagt inn dette året etter at forslaget ble sendt. Datoene deres står nå i basen, og godkjenner du dette, byttes de ut."
                    : "Datoene er endret av noen andre etter at forslaget ble sendt. Bidragsyteren så noe annet som utgangspunkt enn det som står der nå."}
                </p>
              )}

              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div className="rounded-lg bg-black/[0.03] px-3 py-2">
                  <div className="text-xs uppercase tracking-wide text-[#2D1A12]/45">Nå</div>
                  <div className="mt-0.5 text-[#2D1A12]/70">
                    {currentDates
                      ? `${dateWithYear(currentDates.from)} – ${dateWithYear(currentDates.to)}`
                      : "— utgaven finnes ikke —"}
                  </div>
                </div>
                <div className="rounded-lg bg-emerald-50 px-3 py-2">
                  <div className="text-xs uppercase tracking-wide text-emerald-800/60">
                    Foreslått
                  </div>
                  <div className="mt-0.5 text-emerald-900">
                    {dateWithYear(ops.dates.from)} – {dateWithYear(ops.dates.to)}
                  </div>
                </div>
              </div>
            </div>
          </label>
        </section>
      )}

      {ops.ticket_url && (
        <section
          className={`rounded-xl border bg-white ${
            ticketConflict ? "border-amber-400" : "border-black/10"
          }`}
        >
          <label className="flex cursor-pointer items-start gap-3 px-4 py-3">
            <input
              type="checkbox"
              checked={checked.has(TICKET_KEY)}
              onChange={() => toggle(TICKET_KEY)}
              className="mt-1 size-4 shrink-0"
            />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="font-medium text-[#2D1A12]">Billettlenke</div>
              {ticketConflict && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Feltet er endret av noen andre etter at forslaget ble sendt.
                  Bidragsyteren så <em>{currentTicketUrl ?? "— tomt —"}</em> som utgangspunkt,
                  men databasen har nå noe annet.
                </p>
              )}
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div className="rounded-lg bg-black/[0.03] px-3 py-2">
                  <div className="text-xs uppercase tracking-wide text-[#2D1A12]/45">Nå</div>
                  <div className="mt-0.5 break-words text-[#2D1A12]/70">
                    {currentTicketUrl ?? "— tomt —"}
                  </div>
                </div>
                <div className="rounded-lg bg-emerald-50 px-3 py-2">
                  <div className="text-xs uppercase tracking-wide text-emerald-800/60">
                    Foreslått
                  </div>
                  <div className="mt-0.5 break-words text-emerald-900">
                    {ops.ticket_url.value ?? "— tomt —"}
                  </div>
                </div>
              </div>
            </div>
          </label>
        </section>
      )}

      {groups.map((g) => {
        const all = g.items.every((_, i) => checked.has(keyOf(g.kind, i)));
        return (
          <section key={g.kind} className="rounded-xl border border-black/10 bg-white">
            <header className="flex items-center justify-between border-b border-black/5 px-4 py-2.5">
              <h3 className="font-medium text-[#2D1A12]">
                {g.title} <span className="text-[#2D1A12]/40">({g.items.length})</span>
              </h3>
              <button
                type="button"
                onClick={() => setGroup(g.kind, !all)}
                className="text-sm text-[#2D1A12]/50 underline"
              >
                {all ? "Fjern alle haker" : "Huk av alle"}
              </button>
            </header>
            <ul className="divide-y divide-black/5">
              {g.items.map((it, i) => {
                const k = keyOf(g.kind, i);
                return (
                  <li key={k}>
                    <label className="flex cursor-pointer items-center gap-3 px-4 py-2">
                      <input
                        type="checkbox"
                        checked={checked.has(k)}
                        onChange={() => toggle(k)}
                        className="size-4 shrink-0"
                      />
                      <span className={`rounded px-1.5 py-0.5 text-sm ${g.tone}`}>
                        {it.text}
                      </span>
                      <span className="ml-auto shrink-0 text-xs text-[#2D1A12]/45">
                        {it.when}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <div className="space-y-1.5">
        <label htmlFor="prognotat" className="block text-sm font-medium text-[#2D1A12]">
          Notat <span className="font-normal text-[#2D1A12]/50">(valgfritt)</span>
        </label>
        <textarea
          id="prognotat"
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
          onClick={approve}
          disabled={busy || checked.size === 0}
          className="rounded-full bg-gradient-to-r from-amber-500 to-[#FF4E50] px-6 py-3 font-medium text-white disabled:opacity-40"
        >
          {busy ? "Lagrer …" : `Godkjenn ${checked.size}`}
        </button>
        <button
          onClick={reject}
          disabled={busy}
          className="rounded-full border border-black/15 px-6 py-3 font-medium text-[#2D1A12]/70 disabled:opacity-40"
        >
          Avvis alt
        </button>
      </div>
    </div>
  );
}
