import { FESTIVAL_TAGS, type FestivalTag } from "@/lib/festivals";

/**
 * The fields a contributor may propose a change to, and how each is presented.
 *
 * Deliberately narrow. Coordinates, dates and slug are missing on purpose:
 * a wrong coordinate puts the festival in the wrong country, a wrong date
 * hides it from the app entirely, and the slug is the URL. Those come later,
 * with their own warnings in the queue.
 */
/**
 * No label/help text here on purpose: the contributor-facing form renders in
 * the visitor's own language via messages/*.json ("Propose.fields.<name>"),
 * while the admin queue always shows Norwegian regardless — it has its own
 * fixed label map (see src/app/admin/[id]/page.tsx). One set of literal
 * strings would have had to serve both audiences at once.
 */
export type EditableField = {
  name: "venue_name" | "website_url" | "image_url" | "description" | "tags";
  input: "text" | "url" | "textarea" | "tags";
};

export const EDITABLE_FIELDS: EditableField[] = [
  { name: "venue_name", input: "text" },
  { name: "website_url", input: "url" },
  { name: "image_url", input: "url" },
  { name: "description", input: "textarea" },
  { name: "tags", input: "tags" },
];

export type FieldName = EditableField["name"];
export const FIELD_NAMES = EDITABLE_FIELDS.map((f) => f.name);

export type FieldValue = string | string[] | null;
export type Payload = Partial<Record<FieldName, FieldValue>>;

/** Empty string and empty list both mean "cleared", never the string "". */
export function normalise(value: FieldValue): FieldValue {
  if (Array.isArray(value)) return value.length ? value : null;
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

export function sameValue(a: FieldValue, b: FieldValue): boolean {
  const x = normalise(a);
  const y = normalise(b);
  if (Array.isArray(x) && Array.isArray(y)) {
    return x.length === y.length && x.every((v, i) => v === y[i]);
  }
  return x === y;
}

/**
 * Only the fields that actually differ, plus what they looked like at the
 * time. The snapshot is what lets the queue notice that the underlying row
 * moved on while the proposal sat waiting.
 */
export function buildDiff(
  current: Record<string, unknown>,
  proposed: Payload,
): { payload: Payload; base: Payload } {
  const payload: Payload = {};
  const base: Payload = {};
  for (const field of FIELD_NAMES) {
    if (!(field in proposed)) continue;
    const now = (current[field] ?? null) as FieldValue;
    const next = normalise(proposed[field] ?? null);
    if (sameValue(now, next)) continue;
    payload[field] = next;
    base[field] = normalise(now);
  }
  return { payload, base };
}

export function isValidTag(value: string): value is FestivalTag {
  return (FESTIVAL_TAGS as string[]).includes(value);
}

/* ---------------------------------------------------------------- program */

export type ProgramDay = { date: string; artists: string[] };

export type ProgramOps = {
  add: { date: string; name: string }[];
  remove: { date: string; name: string }[];
  move: { from: string; to: string; name: string }[];
};

const artistKey = (n: string) =>
  n
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

/**
 * Turns an edited day-by-day list into add/remove/move operations.
 *
 * The editor lets people arrange days directly, because that is how a line-up
 * is read. What gets stored is operations, because that is what survives two
 * people contributing the same evening -- replacing the whole programme is how
 * Time in Jazz lost 32 artists on 2 August 2026.
 */
export function diffProgram(before: ProgramDay[], after: ProgramDay[]): ProgramOps {
  const dayOf = new Map<string, string>(); // artist key -> date, as it was
  const nameOf = new Map<string, string>();
  for (const d of before) {
    for (const a of d.artists) {
      dayOf.set(artistKey(a), d.date);
      nameOf.set(artistKey(a), a);
    }
  }

  const seen = new Set<string>();
  const ops: ProgramOps = { add: [], remove: [], move: [] };

  for (const d of after) {
    for (const a of d.artists) {
      const k = artistKey(a);
      if (!k) continue;
      seen.add(k);
      const was = dayOf.get(k);
      if (was === undefined) ops.add.push({ date: d.date, name: a.trim() });
      else if (was !== d.date) ops.move.push({ from: was, to: d.date, name: nameOf.get(k)! });
    }
  }

  for (const [k, date] of dayOf) {
    if (!seen.has(k)) ops.remove.push({ date, name: nameOf.get(k)! });
  }

  return ops;
}

export function opsCount(ops: ProgramOps): number {
  return ops.add.length + ops.remove.length + ops.move.length;
}

export type ArtistNameErrorCode = "empty" | "hasTime" | "tooLong";

/**
 * Rejects what the cleanup on 2 August 2026 had to undo afterwards.
 *
 * Returns a code, not text: this runs both in the client-side search box and
 * on the server, and the caller in each place knows how to translate it —
 * "Propose.artistName.<code>" in messages/*.json. A literal string here could
 * only ever be one language.
 */
export function checkArtistName(raw: string): { name: string; errorCode?: ArtistNameErrorCode } {
  const name = raw.trim().replace(/\s+/g, " ");
  if (!name) return { name, errorCode: "empty" };
  if (/^\s*\d{1,2}[:.]\d{2}/.test(name)) return { name, errorCode: "hasTime" };
  if (name.length > 120) return { name, errorCode: "tooLong" };
  return { name };
}
