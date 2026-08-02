import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  kind: string;
  edition_year: number | null;
  created_at: string;
  payload: Record<string, unknown>;
  source_url: string | null;
  festivals: { name: string; slug: string } | null;
  profiles: { display_name: string | null } | null;
};

export default async function AdminQueue() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("submissions")
    .select(
      "id, kind, edition_year, created_at, payload, source_url, festivals(name, slug), profiles!submissions_submitted_by_fkey(display_name)",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2D1A12]">
          Til gjennomgang{rows.length > 0 && ` (${rows.length})`}
        </h1>
        <p className="mt-1 text-[#2D1A12]/70">
          Ingenting her er synlig i appen ennå. Det skjer først når du godkjenner det.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-black/10 bg-white px-4 py-8 text-center text-[#2D1A12]/50">
          Køen er tom.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            // A programme proposal is counted in operations, a detail edit in
            // fields -- "+12 lagt til" says more at a glance than "3 felt".
            const p = r.payload as {
              add?: unknown[];
              remove?: unknown[];
              move?: unknown[];
            };
            const summary =
              r.kind === "program_edit"
                ? [
                    p.add?.length ? `+${p.add.length}` : null,
                    p.remove?.length ? `−${p.remove.length}` : null,
                    p.move?.length ? `${p.move.length} flyttet` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "ingen endringer"
                : `${Object.keys(r.payload ?? {}).length} felt: ${Object.keys(
                    r.payload ?? {},
                  ).join(", ")}`;
            return (
              <li key={r.id}>
                <Link
                  href={`/admin/${r.id}`}
                  className="block rounded-xl border border-black/10 bg-white px-4 py-3 transition hover:border-black/25"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium text-[#2D1A12]">
                      {r.festivals?.name ?? "Ukjent festival"}
                    </span>
                    <span className="text-sm text-[#2D1A12]/50">
                      {new Date(r.created_at).toLocaleDateString("nb-NO", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-[#2D1A12]/60">
                    <span className="rounded bg-black/[0.06] px-1.5 py-0.5 text-xs">
                      {r.kind === "program_edit" ? `Program ${r.edition_year ?? ""}` : "Detaljer"}
                    </span>
                    <span>{summary}</span>
                    {r.profiles?.display_name && <span>· fra {r.profiles.display_name}</span>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
