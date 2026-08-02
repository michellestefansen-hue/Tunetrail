import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  kind: string;
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
      "id, kind, created_at, payload, source_url, festivals(name, slug), profiles!submissions_submitted_by_fkey(display_name)",
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
            const fields = Object.keys(r.payload ?? {});
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
                  <div className="mt-1 text-sm text-[#2D1A12]/60">
                    {fields.length} felt: {fields.join(", ")}
                    {r.profiles?.display_name && ` · fra ${r.profiles.display_name}`}
                    {r.source_url && " · med kilde"}
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
