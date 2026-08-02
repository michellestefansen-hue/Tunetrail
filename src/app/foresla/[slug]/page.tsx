import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BareShell } from "@/components/BareShell";
import { createClient } from "@/lib/supabase/server";
import { FIELD_NAMES, type FieldValue } from "@/lib/submissions";
import { EditForm } from "./EditForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Foreslå endring · Tunetrail",
  robots: { index: false, follow: false },
};

export default async function ProposePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/logg-inn?neste=${encodeURIComponent(`/foresla/${slug}`)}`);

  const { data: festival } = await supabase
    .from("festivals")
    .select(`name, ${FIELD_NAMES.join(", ")}`)
    .eq("slug", slug)
    .single();
  if (!festival) notFound();

  const row = festival as unknown as Record<string, FieldValue> & { name: string };
  const current = Object.fromEntries(
    FIELD_NAMES.map((f) => [f, row[f] ?? null]),
  ) as Record<string, FieldValue>;

  return (
    <BareShell>
      <main className="mx-auto max-w-2xl px-6 py-10">
        <a href={`/festival/${slug}`} className="text-sm text-[#2D1A12]/60 underline">
          ← {row.name}
        </a>

        <h1 className="mt-3 text-3xl font-bold text-[#2D1A12]">Foreslå endring</h1>
        <p className="mt-2 text-[#2D1A12]/70">
          Feltene under viser hva som står nå. Rett det som er feil, og la resten være.
          Forslaget leses gjennom før det havner på siden.
        </p>

        <div className="mt-8">
          <EditForm slug={slug} name={row.name} current={current} />
        </div>
      </main>
    </BareShell>
  );
}
