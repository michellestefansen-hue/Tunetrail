import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BareShell } from "@/components/BareShell";
import { BCP47_LOCALE } from "@/lib/festivals";
import { routing, type Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { FIELD_NAMES, type FieldValue, type ProgramDay } from "@/lib/submissions";
import type { Edition } from "@/components/LineupFields";
import { ProposeTabs } from "./ProposeTabs";

export const dynamic = "force-dynamic";

/** Every calendar day the edition runs, whether or not anyone plays yet. */
function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const d = new Date(from + "T12:00:00");
  const end = new Date(to + "T12:00:00");
  while (d <= end && out.length < 60) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = hasLocale(routing.locales, rawLocale) ? rawLocale : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "Propose" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default async function ProposePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale: Locale = rawLocale;
  setRequestLocale(locale);

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/logg-inn?neste=${encodeURIComponent(`/foresla/${locale}/${slug}`)}`);

  const { data: festival } = await supabase
    .from("festivals")
    .select(
      `name, ${FIELD_NAMES.join(", ")}, festival_editions(year, date_from, date_to, program)`,
    )
    .eq("slug", slug)
    .single();
  if (!festival) notFound();

  const row = festival as unknown as Record<string, FieldValue> & {
    name: string;
    festival_editions: {
      year: number;
      date_from: string | null;
      date_to: string | null;
      program: { date: string; artists: { name: string }[] }[] | null;
    }[];
  };

  const current = Object.fromEntries(
    FIELD_NAMES.map((f) => [f, row[f] ?? null]),
  ) as Record<string, FieldValue>;

  const today = new Date().toISOString().slice(0, 10);
  const editions: Edition[] = row.festival_editions
    .filter((e) => e.date_from && e.date_to)
    .map((e) => {
      const byDate = new Map<string, string[]>(
        (e.program ?? []).map((d) => [d.date, d.artists.map((a) => a.name)]),
      );
      const days: ProgramDay[] = daysBetween(e.date_from!, e.date_to!).map((date) => ({
        date,
        artists: byDate.get(date) ?? [],
      }));
      return { year: e.year, date_from: e.date_from!, date_to: e.date_to!, days };
    })
    // Whatever is coming up next, first -- that is what people want to fix.
    .sort((a, b) => {
      const aUp = a.date_to >= today;
      const bUp = b.date_to >= today;
      if (aUp !== bUp) return aUp ? -1 : 1;
      return aUp ? a.date_from.localeCompare(b.date_from) : b.date_from.localeCompare(a.date_from);
    });

  const t = await getTranslations({ locale, namespace: "Propose" });
  const bcp47 = BCP47_LOCALE[locale] ?? BCP47_LOCALE.nb;

  return (
    <BareShell lang={locale}>
      <main className="mx-auto max-w-2xl px-6 py-10">
        <a href={`/festival/${slug}`} className="text-sm text-[#2D1A12]/60 underline">
          {t("backTo", { name: row.name })}
        </a>

        <h1 className="mt-3 text-3xl font-bold text-[#2D1A12]">{t("heading")}</h1>
        <p className="mt-2 text-[#2D1A12]/70">{t("intro")}</p>

        <div className="mt-8">
          <NextIntlClientProvider>
            <ProposeTabs
              slug={slug}
              name={row.name}
              current={current}
              editions={editions}
              bcp47={bcp47}
            />
          </NextIntlClientProvider>
        </div>
      </main>
    </BareShell>
  );
}
