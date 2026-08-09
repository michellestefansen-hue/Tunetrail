"use server";

import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import {
  buildDiff,
  checkArtistName,
  FIELD_NAMES,
  isValidTag,
  opsCount,
  type ArtistNameErrorCode,
  type Payload,
  type ProgramOps,
} from "@/lib/submissions";

/**
 * Codes, not text: this runs on the server and the UI can be in any of five
 * languages. The client translates via "Propose.errors.<code>" — see
 * describeSubmitError in ProposeTabs.tsx.
 */
export type SubmitError =
  | { code: "notAuthenticated" | "festivalNotFound" | "editionNotFound" | "nothingChanged" }
  | { code: "dateOutOfRange"; date: string }
  | { code: "nameError"; name: string; reason: ArtistNameErrorCode }
  | { code: "badTicketUrl" }
  | { code: "badDates" | "datesWrongYear" | "datesTooLong" }
  | { code: "unknown"; message: string };

/** A festival that runs longer than this is a typo, not a festival. */
const MAX_EDITION_DAYS = 60;

export type SubmitResult =
  | { ok: true; parts: { fields: boolean; program: boolean } }
  | { ok: false; error: SubmitError };

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
  if (!user) return { ok: false, error: { code: "notAuthenticated" } };

  const { data: festival } = await supabase
    .from("festivals")
    .select(
      `id, ${FIELD_NAMES.join(", ")}, festival_editions(year, date_from, date_to)`,
    )
    .eq("slug", slug)
    .single();
  if (!festival) return { ok: false, error: { code: "festivalNotFound" } };

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
  const hasProgram =
    programYear !== null && (opsCount(ops) > 0 || !!ops.ticket_url || !!ops.dates);
  const cleanOps: ProgramOps = { add: [], remove: [], move: [] };

  if (hasProgram) {
    const edition = f.festival_editions.find((e) => e.year === programYear);

    // A missing edition is no longer fatal -- it is how a new year arrives.
    // But it can only be created with dates to create it from: an edition
    // without dates never appears anywhere in the app.
    if (!edition && !ops.dates) return { ok: false, error: { code: "editionNotFound" } };

    if (ops.dates) {
      const { from, to } = ops.dates;
      if (!from || !to || to < from) return { ok: false, error: { code: "badDates" } };
      // The year is what decides which row gets written, so a range that
      // belongs to a different year would file the dates under the wrong one.
      if (from.slice(0, 4) !== String(programYear)) {
        return { ok: false, error: { code: "datesWrongYear" } };
      }
      const span = (Date.parse(to) - Date.parse(from)) / 86_400_000 + 1;
      if (span > MAX_EDITION_DAYS) return { ok: false, error: { code: "datesTooLong" } };
    }

    // Re-checked here even though the editor already enforces it: a date
    // outside the festival's own range simply never renders, and 16 such days
    // were sitting invisible in the database before this existed.
    //
    // The proposed range wins when the contributor is setting the dates --
    // otherwise adding a line-up to a brand new year would fail every artist
    // against a range that does not exist yet.
    const range = ops.dates ?? { from: edition!.date_from, to: edition!.date_to };
    const inRange = (d: string) => d >= range.from && d <= range.to;

    for (const o of ops.add) {
      const { name, errorCode } = checkArtistName(o.name);
      if (errorCode) return { ok: false, error: { code: "nameError", name: o.name, reason: errorCode } };
      if (!inRange(o.date)) return { ok: false, error: { code: "dateOutOfRange", date: o.date } };
      cleanOps.add.push({ date: o.date, name });
    }
    for (const o of ops.remove) cleanOps.remove.push({ date: o.date, name: o.name.trim() });
    for (const o of ops.move) {
      if (!inRange(o.to)) return { ok: false, error: { code: "dateOutOfRange", date: o.to } };
      cleanOps.move.push({ from: o.from, to: o.to, name: o.name.trim() });
    }
  }

  // A blank link is a valid choice (clearing it); anything non-blank has to at
  // least look like a URL, since this goes straight into an <a href> on the
  // festival page with no further check.
  if (ops.ticket_url) {
    const v = ops.ticket_url.value;
    if (v !== null && !/^https?:\/\//i.test(v)) {
      return { ok: false, error: { code: "badTicketUrl" } };
    }
    cleanOps.ticket_url = { value: v, base: ops.ticket_url.base };
  }

  if (ops.dates) {
    cleanOps.dates = {
      from: ops.dates.from,
      to: ops.dates.to,
      // Taken from what the server sees now, not from what the client claims:
      // the base is the whole point of the conflict check, so the client must
      // not be the one deciding what it was.
      base: (() => {
        const e = f.festival_editions.find((x) => x.year === programYear);
        return e ? { from: e.date_from, to: e.date_to } : null;
      })(),
    };
  }

  if (!hasFields && !hasProgram) return { ok: false, error: { code: "nothingChanged" } };

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
  if (error) return { ok: false, error: { code: "unknown", message: error.message } };

  return { ok: true, parts: { fields: hasFields, program: hasProgram } };
}
