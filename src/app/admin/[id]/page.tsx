import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EDITABLE_FIELDS, type ProgramOps } from "@/lib/submissions";
import { ProgramReview } from "./ProgramReview";
import { ReviewForm, type FieldDiff } from "./ReviewForm";

export const dynamic = "force-dynamic";

const LABEL = Object.fromEntries(EDITABLE_FIELDS.map((f) => [f.name, f.label]));

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("submissions")
    .select(
      "id, kind, group_id, edition_year, status, payload, base_snapshot, source_url, note, created_at, festival_id, festivals(name, slug), profiles!submissions_submitted_by_fkey(display_name)",
    )
    .eq("id", id)
    .single();

  if (!data) notFound();

  const s = data as unknown as {
    id: string;
    kind: string;
    group_id: string | null;
    edition_year: number | null;
    status: string;
    payload: Record<string, unknown>;
    base_snapshot: Record<string, unknown>;
    source_url: string | null;
    note: string | null;
    created_at: string;
    festival_id: string;
    festivals: { name: string; slug: string } | null;
    profiles: { display_name: string | null } | null;
  };

  // The other half of a contribution that touched both tabs. Approving one
  // does not touch the other, so say so -- otherwise it looks finished when it
  // is not.
  const { data: siblingRows } = s.group_id
    ? await supabase
        .from("submissions")
        .select("id, kind, edition_year, status")
        .eq("group_id", s.group_id)
        .neq("id", s.id)
    : { data: null };
  const siblings = (siblingRows ?? []) as {
    id: string;
    kind: string;
    edition_year: number | null;
    status: string;
  }[];

  const isProgram = s.kind === "program_edit";
  const fields = isProgram ? [] : Object.keys(s.payload ?? {});

  // Read today's values so the queue compares against reality, not against
  // whatever was true when the proposal was written.
  const { data: current } = fields.length
    ? await supabase
        .from("festivals")
        .select(fields.join(", "))
        .eq("id", s.festival_id)
        .single()
    : { data: null };
  const now = (current ?? {}) as Record<string, unknown>;

  const diffs: FieldDiff[] = fields.map((field) => ({
    field,
    label: LABEL[field] ?? field,
    proposed: s.payload[field],
    currentValue: now[field] ?? null,
    snapshot: s.base_snapshot?.[field] ?? null,
    conflict:
      field in (s.base_snapshot ?? {}) &&
      !sameJson(s.base_snapshot[field], now[field] ?? null),
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm text-[#2D1A12]/60 underline">
          ← Til køen
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[#2D1A12]">
          {s.festivals?.name ?? "Ukjent festival"}
        </h1>
        <p className="mt-1 text-sm text-[#2D1A12]/60">
          Sendt {new Date(s.created_at).toLocaleString("nb-NO")}
          {s.profiles?.display_name && ` av ${s.profiles.display_name}`}
          {s.festivals?.slug && (
            <>
              {" · "}
              <a
                href={`/festival/${s.festivals.slug}`}
                className="underline"
                target="_blank"
                rel="noreferrer"
              >
                se siden
              </a>
            </>
          )}
        </p>
      </div>

      {siblings.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Dette bidraget har flere deler. Godkjenning her gjelder bare denne.
          <ul className="mt-1.5 space-y-0.5">
            {siblings.map((sib) => (
              <li key={sib.id}>
                <Link href={`/admin/${sib.id}`} className="underline">
                  {sib.kind === "program_edit"
                    ? `Program ${sib.edition_year ?? ""}`
                    : "Detaljer"}
                </Link>
                {sib.status !== "pending" && (
                  <span className="text-amber-900/60"> — allerede behandlet</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(s.source_url || s.note) && (
        <div className="space-y-1 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm">
          {s.source_url && (
            <p>
              <span className="text-[#2D1A12]/50">Kilde: </span>
              <a
                href={s.source_url}
                target="_blank"
                rel="noreferrer noopener"
                className="break-all text-[#FF4E50] underline"
              >
                {s.source_url}
              </a>
            </p>
          )}
          {s.note && (
            <p>
              <span className="text-[#2D1A12]/50">Merknad: </span>
              <span className="text-[#2D1A12]/80">{s.note}</span>
            </p>
          )}
        </div>
      )}

      {s.status !== "pending" ? (
        <p className="rounded-xl border border-black/10 bg-white px-4 py-6 text-center text-[#2D1A12]/60">
          Dette forslaget er allerede behandlet ({s.status}).
        </p>
      ) : (
        isProgram ? (
          <ProgramReview
            id={s.id}
            year={s.edition_year ?? 0}
            ops={s.payload as unknown as ProgramOps}
          />
        ) : (
          <ReviewForm id={s.id} diffs={diffs} />
        )
      )}
    </div>
  );
}
