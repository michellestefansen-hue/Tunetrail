"use server";

import { createClient } from "@/lib/supabase/server";
import { buildDiff, FIELD_NAMES, isValidTag, type Payload } from "@/lib/submissions";

export type SubmitResult = { ok: true } | { ok: false; error: string };

export async function submitEdit(
  slug: string,
  proposed: Payload,
  sourceUrl: string,
  note: string,
): Promise<SubmitResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
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
  if (Array.isArray(clean.tags)) {
    clean.tags = clean.tags.filter(isValidTag);
  }

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
    source_url: sourceUrl.trim() || null,
    note: note.trim() || null,
    submitted_by: user.id,
    status: "pending",
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
