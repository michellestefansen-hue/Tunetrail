import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BareShell } from "@/components/BareShell";
import { getProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Moderering · Tunetrail",
  robots: { index: false, follow: false },
};

/**
 * The gate. Middleware already turned anonymous visitors away; this is where
 * "signed in" becomes "allowed in".
 *
 * notFound() rather than a 403 on purpose: a signed-in stranger should not
 * learn that a moderation area exists at all.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile?.is_admin) notFound();

  return (
    <BareShell>
      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="font-bold text-[#2D1A12]">Tunetrail · moderering</span>
          <span className="text-sm text-[#2D1A12]/60">
            {profile.display_name ?? "innlogget"}
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </BareShell>
  );
}
