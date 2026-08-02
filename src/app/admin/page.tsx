import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  kind: string;
  group_id: string | null;
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
      "id, kind, group_id, edition_year, created_at, payload, source_url, festivals(name, slug), profiles!submissions_submitted_by_fkey(display_name)",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const rows = (data ?? []) as unknown as Row[];

  // A contributor who edited both tabs produced two rows on purpose -- details
  // and programme are judged differently -- but it was one press of Send, so
  // the queue shows it as one entry.
  const seen = new Set<string>();
  const entries: { lead: Row; rows: Row[] }[] = [];
  for (const r of rows) {
    if (r.group_id) {
      if (seen.has(r.group_id)) continue;
      seen.add(r.group_id);
      entries.push({ lead: r, rows: rows.filter((x) => x.group_id === r.group_id) });
    } else {
      entries.push({ lead: r, rows: [r] });
    }
  }

  function describe(r: Row): string {
    if (r.kind === "festival_new") {
      const p = r.payload as { country?: string; city?: string; tags?: string[] };
      return [p.city, p.country].filter(Boolean).join(", ") || "ny festival";
    }
    if (r.kind !== "program_edit") {
      const f = Object.keys(r.payload ?? {});
      return `${f.length} felt: ${f.join(", ")}`;
    }
    const p = r.payload as { add?: unknown[]; remove?: unknown[]; move?: unknown[] };
    return (
      [
        p.add?.length ? `+${p.add.length}` : null,
        p.remove?.length ? `−${p.remove.length}` : null,
        p.move?.length ? `${p.move.length} flyttet` : null,
      ]
        .filter(Boolean)
        .join(" · ") || "ingen endringer"
    );
  }

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
          {entries.map(({ lead, rows: group }) => (
            <li key={lead.group_id ?? lead.id}>
              <Link
                href={`/admin/${lead.id}`}
                className="block rounded-xl border border-black/10 bg-white px-4 py-3 transition hover:border-black/25"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-[#2D1A12]">
                    {lead.festivals?.name ??
                      (lead.payload as { name?: string })?.name ??
                      "Ukjent festival"}
                  </span>
                  <span className="text-sm text-[#2D1A12]/50">
                    {new Date(lead.created_at).toLocaleDateString("nb-NO", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <div className="mt-1.5 space-y-1">
                  {group.map((r) => (
                    <div
                      key={r.id}
                      className="flex flex-wrap items-center gap-x-1.5 text-sm text-[#2D1A12]/60"
                    >
                      <span className="rounded bg-black/[0.06] px-1.5 py-0.5 text-xs">
                        {r.kind === "program_edit"
                          ? `Program ${r.edition_year ?? ""}`
                          : r.kind === "festival_new"
                            ? "Ny festival"
                            : "Detaljer"}
                      </span>
                      <span>{describe(r)}</span>
                    </div>
                  ))}
                </div>

                {lead.profiles?.display_name && (
                  <div className="mt-1 text-xs text-[#2D1A12]/45">
                    fra {lead.profiles.display_name}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
