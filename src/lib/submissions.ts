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
  name: "venue_name" | "website_url" | "image_url" | "description" | "tags" | "size_band";
  input: "text" | "url" | "textarea" | "tags" | "size";
};

export const EDITABLE_FIELDS: EditableField[] = [
  { name: "venue_name", input: "text" },
  { name: "website_url", input: "url" },
  { name: "image_url", input: "url" },
  { name: "description", input: "textarea" },
  { name: "tags", input: "tags" },
  // Optional here, unlike on the creation form: 693 festivals predate the
  // field, and filling them in is exactly what this form is for.
  { name: "size_band", input: "size" },
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
  /**
   * Present only when the contributor actually changed it. `base` is what
   * they saw at submission time, for the same conflict check the ordinary
   * fields get -- ticket_url lives on festival_editions, so it rides along
   * with the programme rather than getting a submission kind of its own.
   */
  ticket_url?: { value: string | null; base: string | null };
  /**
   * The edition's own dates, present only when the contributor set or changed
   * them. Rides along for the same reason `ticket_url` does: these live on
   * festival_editions, the same row the days belong to.
   *
   * `base: null` carries a second meaning that `ticket_url` has no need for --
   * the edition did not exist at submission time, so approving it creates the
   * row. If someone else adds that year first, the mismatch shows up as a
   * conflict in the queue instead of silently overwriting their dates.
   */
  dates?: {
    from: string;
    to: string;
    base: { from: string; to: string } | null;
  };
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
  // An artist maps to the SET of days it is billed on, not to one day.
  //
  // Keying by artist alone was wrong, and wrong in a way that invented work
  // nobody asked for. Playing more than one day is ordinary at a festival --
  // 122 of 736 editions have at least one such artist, 682 in total -- and with
  // a single-date map the last day overwrote the earlier ones. The earlier day
  // then read as a move, so simply opening the form and submitting a
  // description produced phantom "move Fatboy Slim to 30 July" operations.
  // Bestival 2026 generated 64 of them from a completely untouched programme.
  const daysBefore = new Map<string, Set<string>>();
  const daysAfter = new Map<string, Set<string>>();

  // First spelling wins, and `before` is collected first, so an existing artist
  // keeps the spelling already in the database and a new one arrives as typed.
  const nameOf = new Map<string, string>();

  const collect = (days: ProgramDay[], into: Map<string, Set<string>>) => {
    for (const d of days) {
      for (const a of d.artists) {
        const k = artistKey(a);
        if (!k) continue;
        if (!into.has(k)) into.set(k, new Set());
        into.get(k)!.add(d.date);
        if (!nameOf.has(k)) nameOf.set(k, a.trim());
      }
    }
  };
  collect(before, daysBefore);
  collect(after, daysAfter);

  const ops: ProgramOps = { add: [], remove: [], move: [] };

  for (const k of new Set([...daysBefore.keys(), ...daysAfter.keys()])) {
    const was = daysBefore.get(k) ?? new Set<string>();
    const now = daysAfter.get(k) ?? new Set<string>();
    const lost = [...was].filter((d) => !now.has(d)).sort();
    const gained = [...now].filter((d) => !was.has(d)).sort();
    if (lost.length === 0 && gained.length === 0) continue;

    const name = nameOf.get(k)!;

    // A day lost paired with a day gained is what a contributor means by
    // "moved", and saying it that way keeps the queue readable: one line to
    // approve instead of a remove and an add the reviewer has to connect.
    // Whatever is left over genuinely is an added or a dropped appearance.
    const moved = Math.min(lost.length, gained.length);
    for (let i = 0; i < moved; i++) ops.move.push({ from: lost[i], to: gained[i], name });
    for (const date of lost.slice(moved)) ops.remove.push({ date, name });
    for (const date of gained.slice(moved)) ops.add.push({ date, name });
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
