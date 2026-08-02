"use server";

import { randomUUID } from "node:crypto";
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

export type SubmitResult =
  | { ok: true; parts: { fields: boolean; program: boolean } }
  | { ok: false; error: string };

/**
 * One press of Send, whatever the contributor touched.
 *
 * Details and programme are stored as separate rows because they are reviewed
 * in completely different ways -- field against old value, versus three lists
 * of operations. A shared group_id keeps them one contribution in the queue.
 */
export async function submitAll(
  slug: string,
  proposedFields: Payload,
  programYear: number | null,
  ops: ProgramOps,
  note: string,
): Promise<SubmitResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Du må være logget inn." };

  const { data: festival } = await supabase
    .from("festivals")
    .select(
      `id, ${FIELD_NAMES.join(", ")}, festival_editions(year, date_from, date_to)`,
    )
    .eq("slug", slug)
    .single();
  if (!festival) return { ok: false, error: "Fant ikke festivalen." };

  const f = festival as unknown as Record<string, unknown> & {
    id: string;
    festival_editions: { year: number; date_from: string; date_to: string }[];
  };

  // ---- details -----------------------------------------------------------
  const clean: Payload = { ...proposedFields };
  if (Array.isArray(clean.tags)) clean.tags = clean.tags.filter(isValidTag);
  const { payload, base } = buildDiff(f, clean);
  const hasFields = Object.keys(payload).length > 0;

  // ---- programme ---------------------------------------------------------
  const hasProgram = programYear !== null && opsCount(ops) > 0;
  let cleanOps: ProgramOps = { add: [], remove: [], move: [] };

  if (hasProgram) {
    const edition = f.festival_editions.find((e) => e.year === programYear);
    if (!edition) return { ok: false, error: "Fant ikke utgaven." };

    // Re-checked here even though the editor already enforces it: a date
    // outside the festival's own range simply never renders, and 16 such days
    // were sitting invisible in the database before this existed.
    const inRange = (d: string) => d >= edition.date_from && d <= edition.date_to;

    for (const o of ops.add) {
      const { name, error } = checkArtistName(o.name);
      if (error) return { ok: false, error: `${o.name}: ${error}` };
      if (!inRange(o.date)) return { ok: false, error: `${o.date} er utenfor festivalen.` };
      cleanOps.add.push({ date: o.date, name });
    }
    for (const o of ops.remove) cleanOps.remove.push({ date: o.date, name: o.name.trim() });
    for (const o of ops.move) {
      if (!inRange(o.to)) return { ok: false, error: `${o.to} er utenfor festivalen.` };
      cleanOps.move.push({ from: o.from, to: o.to, name: o.name.trim() });
    }
  } else {
    cleanOps = { add: [], remove: [], move: [] };
  }

  if (!hasFields && !hasProgram) return { ok: false, error: "Ingenting er endret." };

  // Only group when there really are two rows; a lone proposal keeps null.
  const groupId = hasFields && hasProgram ? randomUUID() : null;
  const rows = [];

  if (hasFields) {
    rows.push({
      kind: "festival_edit",
      festival_id: f.id,
      payload,
      base_snapshot: base,
      note: note.trim() || null,
      submitted_by: user.id,
      status: "pending",
      group_id: groupId,
    });
  }
  if (hasProgram) {
    rows.push({
      kind: "program_edit",
      festival_id: f.id,
      edition_year: programYear,
      payload: cleanOps,
      // Operations carry their own before-state: adding a name that is already
      // there, or removing one that has gone, is harmless rather than a clash.
      base_snapshot: {},
      note: note.trim() || null,
      submitted_by: user.id,
      status: "pending",
      group_id: groupId,
    });
  }

  const { error } = await supabase.from("submissions").insert(rows);
  if (error) return { ok: false, error: error.message };

  return { ok: true, parts: { fields: hasFields, program: hasProgram } };
}
