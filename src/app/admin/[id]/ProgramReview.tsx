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

type Key = string;
const keyOf = (kind: string, i: number): Key => `${kind}:${i}`;

export function ProgramReview({
  id,
  year,
  ops,
}: {
  id: string;
  year: number;
  ops: ProgramOps;
}) {
  const router = useRouter();

  // Additions start accepted, removals do not. Adding a name is nearly always
  // right; taking one away is the operation worth a second look, and it is the
  // one that loses work if it slips through.
  const [checked, setChecked] = useState<Set<Key>>(
    () =>
      new Set([
        ...ops.add.map((_, i) => keyOf("add", i)),
        ...ops.move.map((_, i) => keyOf("move", i)),
      ]),
  );
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
