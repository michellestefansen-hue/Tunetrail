"use server";

import { createClient } from "@/lib/supabase/server";
import {
  buildDiff,
  checkArtistName,
  FIELD_NAMES,
  isValidTag,
  opsCount,
  type Payload,
  type ProgramOps,
} from "@/lib/submissions";

export type SubmitResult = { ok: true } | { ok: false; error: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function submitEdit(
  slug: string,
  proposed: Payload,
  note: string,
): Promise<SubmitResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Du må være logget inn." };

  const { data: festival } = await supabase
    .from("festivals")
    .select(`id, ${FIELD_NAMES.join(", ")}`)
    .eq("slug", slug)
    .single();
  if (!festival) return { ok: false, error: "Fant ikke festivalen." };

  // Tags arrive from a form and are not to be trusted; anything outside the
  // fourteen allowed values would quietly break the filter and the guides.
  const clean: Payload = { ...proposed };
  if (Array.isArray(clean.tags)) clean.tags = clean.tags.filter(isValidTag);

  const { payload, base } = buildDiff(
    festival as unknown as Record<string, unknown>,
    clean,
  );
  if (Object.keys(payload).length === 0) {
    return { ok: false, error: "Ingenting er endret." };
  }

  const { error } = await supabase.from("submissions").insert({
    kind: "festival_edit",
    festival_id: (festival as unknown as { id: string }).id,
    payload,
    base_snapshot: base,
    note: note.trim() || null,
    submitted_by: user.id,
    status: "pending",
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function submitProgram(
  slug: string,
  year: number,
  ops: ProgramOps,
  note: string,
): Promise<SubmitResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Du må være logget inn." };

  if (opsCount(ops) === 0) return { ok: false, error: "Ingenting er endret." };

  const { data: festival } = await supabase
    .from("festivals")
    .select("id, festival_editions(year, date_from, date_to)")
    .eq("slug", slug)
    .single();
  if (!festival) return { ok: false, error: "Fant ikke festivalen." };

  const f = festival as unknown as {
    id: string;
    festival_editions: { year: number; date_from: string; date_to: string }[];
  };
  const edition = f.festival_editions.find((e) => e.year === year);
  if (!edition) return { ok: false, error: "Fant ikke utgaven." };

  // Re-check on the server what the editor already enforces. A date outside
  // the festival's own range simply never renders -- 16 such days were sitting
  // invisible in the database before this existed.
  const inRange = (d: string) => d >= edition.date_from && d <= edition.date_to;
  const clean: ProgramOps = { add: [], remove: [], move: [] };

  for (const o of ops.add) {
    const { name, error } = checkArtistName(o.name);
    if (error) return { ok: false, error: `${o.name}: ${error}` };
    if (!inRange(o.date)) return { ok: false, error: `${o.date} er utenfor festivalen.` };
    clean.add.push({ date: o.date, name });
  }
  for (const o of ops.remove) {
    clean.remove.push({ date: o.date, name: o.name.trim() });
  }
  for (const o of ops.move) {
    if (!inRange(o.to)) return { ok: false, error: `${o.to} er utenfor festivalen.` };
    clean.move.push({ from: o.from, to: o.to, name: o.name.trim() });
  }

  const { error } = await supabase.from("submissions").insert({
    kind: "program_edit",
    festival_id: f.id,
    edition_year: year,
    payload: clean,
    // Operations carry their own before-state: adding a name that is already
    // there, or removing one that has gone, is harmless rather than a clash.
    base_snapshot: {},
    note: note.trim() || null,
    submitted_by: user.id,
    status: "pending",
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
