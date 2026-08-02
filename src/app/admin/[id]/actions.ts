"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ProgramOps } from "@/lib/submissions";

export type ReviewResult =
  | { ok: true; applied: string[]; conflicted: string[]; skipped: string[] }
  | { ok: false; error: string };

/**
 * Both of these go through Postgres functions rather than writing here.
 * The functions run as owner, so no signed-in user ever needs write access to
 * festivals -- and they run as one transaction, so the change, the audit trail
 * and the status move together or not at all.
 */
export async function approveFields(
  id: string,
  fields: string[],
  reviewNote: string,
): Promise<ReviewResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("apply_submission", {
    p_submission_id: id,
    p_fields: fields,
    p_review_note: reviewNote.trim() || null,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin");
  const r = (data ?? {}) as { applied?: string[]; conflicted?: string[]; skipped?: string[] };
  return {
    ok: true,
    applied: r.applied ?? [],
    conflicted: r.conflicted ?? [],
    skipped: r.skipped ?? [],
  };
}

export async function approveProgram(
  id: string,
  ops: ProgramOps,
  reviewNote: string,
): Promise<ReviewResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("apply_program_submission", {
    p_submission_id: id,
    p_ops: ops,
    p_review_note: reviewNote.trim() || null,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin");
  const r = (data ?? {}) as { added?: number; removed?: number; moved?: number };
  return {
    ok: true,
    applied: [
      `${r.added ?? 0} lagt til`,
      `${r.removed ?? 0} fjernet`,
      `${r.moved ?? 0} flyttet`,
    ],
    conflicted: [],
    skipped: [],
  };
}

export async function approveNewFestival(
  id: string,
  reviewNote: string,
): Promise<ReviewResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("apply_new_festival", {
    p_submission_id: id,
    p_review_note: reviewNote.trim() || null,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin");
  const r = (data ?? {}) as { slug?: string };
  return {
    ok: true,
    applied: r.slug ? [r.slug] : [],
    conflicted: [],
    skipped: [],
  };
}

export async function rejectSubmission(
  id: string,
  reviewNote: string,
): Promise<ReviewResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_submission", {
    p_submission_id: id,
    p_review_note: reviewNote.trim() || null,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin");
  return { ok: true, applied: [], conflicted: [], skipped: [] };
}
