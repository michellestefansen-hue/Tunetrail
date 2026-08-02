import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BareShell } from "@/components/BareShell";
import { BCP47_LOCALE } from "@/lib/festivals";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { NewFestivalForm } from "./NewFestivalForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = hasLocale(routing.locales, rawLocale) ? rawLocale : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "NewFestival" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default async function NewFestivalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale: Locale = rawLocale;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/logg-inn?neste=${encodeURIComponent(`/ny-festival/${locale}`)}`);

  // The countries already in use, rather than a world list -- it keeps the
  // values consistent with what `country` holds elsewhere, which is what the
  // Countries translations and the map filter both key off.
  const { data } = await supabase.from("festivals").select("country");
  const countries = [
    ...new Set(((data ?? []) as { country: string | null }[]).map((r) => r.country).filter(Boolean)),
  ].sort() as string[];

  const t = await getTranslations({ locale, namespace: "NewFestival" });
  // The map lives at a translated path (/kart, /en/map, /es/mapa). These pages
  // sit outside the locale tree, so the right one is resolved here rather than
  // hardcoded -- an English visitor should not be dropped on the Norwegian URL.
  const mapHref = getPathname({ locale, href: "/kart" });
  const bcp47 = BCP47_LOCALE[locale] ?? BCP47_LOCALE.nb;

  return (
    <BareShell lang={locale}>
      <main className="mx-auto max-w-2xl px-6 py-10">
        <a href={mapHref} className="text-sm text-[#2D1A12]/60 underline">
          ← {t("backToMap")}
        </a>
        <h1 className="mt-3 text-3xl font-bold text-[#2D1A12]">{t("heading")}</h1>
        <p className="mt-2 text-[#2D1A12]/70">{t("intro")}</p>

        <div className="mt-8">
          <NextIntlClientProvider>
            <NewFestivalForm countries={countries} mapHref={mapHref} bcp47={bcp47} />
          </NextIntlClientProvider>
        </div>
      </main>
    </BareShell>
  );
}
