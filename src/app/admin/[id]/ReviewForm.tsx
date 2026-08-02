"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { approveFields, rejectSubmission } from "./actions";

export type FieldDiff = {
  field: string;
  label: string;
  proposed: unknown;
  currentValue: unknown;
  snapshot: unknown;
  /** The row moved on after this was submitted. */
  conflict: boolean;
};

function show(v: unknown): string {
  if (v === null || v === undefined || v === "") return "— tomt —";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

export function ReviewForm({ id, diffs }: { id: string; diffs: FieldDiff[] }) {
  const router = useRouter();
  // Conflicting fields start unticked: they need a decision, not a default.
  const [checked, setChecked] = useState<Set<string>>(
    new Set(diffs.filter((d) => !d.conflict).map((d) => d.field)),
  );
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function toggle(field: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  }

  async function approve() {
    setBusy(true);
    setError("");
    const res = await approveFields(id, [...checked], note);
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

  return (
    <div className="space-y-6">
      <ul className="space-y-3">
        {diffs.map((d) => {
          const on = checked.has(d.field);
          return (
            <li
              key={d.field}
              className={`rounded-xl border bg-white p-4 ${
                d.conflict ? "border-amber-400" : "border-black/10"
              }`}
            >
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(d.field)}
                  className="mt-1 size-4 shrink-0"
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="font-medium text-[#2D1A12]">{d.label}</div>

                  {d.conflict && (
                    <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      Feltet er endret av noen andre etter at forslaget ble sendt.
                      Bidragsyteren så <em>{show(d.snapshot)}</em>. Godkjenner du,
                      overskriver du den nyere verdien.
                    </p>
                  )}

                  <div className="grid gap-2 text-sm sm:grid-cols-2">
                    <div className="rounded-lg bg-black/[0.03] px-3 py-2">
                      <div className="text-xs uppercase tracking-wide text-[#2D1A12]/45">
                        Nå
                      </div>
                      <div className="mt-0.5 break-words text-[#2D1A12]/70">
                        {show(d.currentValue)}
                      </div>
                    </div>
                    <div className="rounded-lg bg-emerald-50 px-3 py-2">
                      <div className="text-xs uppercase tracking-wide text-emerald-800/60">
                        Foreslått
                      </div>
                      <div className="mt-0.5 break-words text-emerald-900">
                        {show(d.proposed)}
                      </div>
                    </div>
                  </div>
                </div>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="space-y-1.5">
        <label htmlFor="notat" className="block text-sm font-medium text-[#2D1A12]">
          Notat <span className="font-normal text-[#2D1A12]/50">(valgfritt)</span>
        </label>
        <textarea
          id="notat"
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
          {busy ? "Lagrer …" : `Godkjenn ${checked.size} felt`}
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
