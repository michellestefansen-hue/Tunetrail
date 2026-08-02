import { getProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const profile = await getProfile();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2D1A12]">Innlogging virker</h1>
        <p className="mt-1 text-[#2D1A12]/70">
          Køen for forslag kommer i neste steg. Foreløpig bekrefter denne siden bare at
          du er gjenkjent som administrator.
        </p>
      </div>

      <dl className="grid gap-px overflow-hidden rounded-xl border border-black/10 bg-black/10 sm:grid-cols-3">
        {[
          ["Visningsnavn", profile?.display_name ?? "–"],
          ["Administrator", profile?.is_admin ? "ja" : "nei"],
          ["Tillitsnivå", String(profile?.trust_level ?? 0)],
        ].map(([label, value]) => (
          <div key={label} className="bg-white px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-[#2D1A12]/50">{label}</dt>
            <dd className="mt-0.5 font-medium text-[#2D1A12]">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
