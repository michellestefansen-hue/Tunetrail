import { FESTIVAL_TAGS, type FestivalTag } from "@/lib/festivals";

/**
 * The fields a contributor may propose a change to, and how each is presented.
 *
 * Deliberately narrow. Coordinates, dates and slug are missing on purpose:
 * a wrong coordinate puts the festival in the wrong country, a wrong date
 * hides it from the app entirely, and the slug is the URL. Those come later,
 * with their own warnings in the queue.
 */
export type EditableField = {
  name: "venue_name" | "website_url" | "image_url" | "description" | "tags";
  label: string;
  help: string;
  input: "text" | "url" | "textarea" | "tags";
};

export const EDITABLE_FIELDS: EditableField[] = [
  {
    name: "venue_name",
    label: "Arena",
    help: "Stedet festivalen holder til. Vises på kortet og på festivalsiden.",
    input: "text",
  },
  {
    name: "website_url",
    label: "Nettsted",
    help: "Festivalens offisielle side. Helst forsiden, ikke en underside.",
    input: "url",
  },
  {
    name: "image_url",
    label: "Bildelenke",
    help: "Direkte lenke til et bilde. Helst av området eller publikum, ikke en enkelt artist.",
    input: "url",
  },
  {
    name: "description",
    label: "Beskrivelse",
    help: "Et par setninger om hva slags festival dette er.",
    input: "textarea",
  },
  {
    name: "tags",
    label: "Sjangre",
    help: "Velg dem som faktisk preger programmet, ikke alt som forekommer.",
    input: "tags",
  },
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
