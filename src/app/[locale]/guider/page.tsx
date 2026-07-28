import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeftIcon, MapIcon } from "@heroicons/react/24/solid";
import { Link, getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { GUIDES, GUIDE_KEYS, guidePath } from "@/lib/guides";
import { createClient } from "@/lib/supabase/static";
import { fetchGuideFestivals, guideYear } from "@/lib/guideFestivals";

export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tune-trail.org";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = hasLocale(routing.locales, rawLocale) ? rawLocale : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "Guides" });
  const year = new Date().getFullYear();

  const title = t("hubMetaTitle", { year });
  const description = t("hubMetaDescription", { year });

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}${getPathname({ locale, href: "/guider" })}`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [
          l,
          `${SITE_URL}${getPathname({ locale: l, href: "/guider" })}`,
        ]),
      ),
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}${getPathname({ locale, href: "/guider" })}`,
    },
    twitter: { title, description },
  };
}

export default async function GuidesHubPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const tg = await getTranslations({ locale, namespace: "Guides" });

  const supabase = createClient();
  const { count } = await supabase
    .from("festivals")
    .select("id", { count: "exact", head: true });

  // One representative year per guide, derived from the curated editions.
  const entries = await Promise.all(
    GUIDE_KEYS.map(async (key) => {
      const festivals = await fetchGuideFestivals(GUIDES[key].festivalSlugs);
      const t = await getTranslations({ locale, namespace: `Guides.${key}` });
      return {
        key,
        title: t("title", { year: guideYear(festivals) }),
        answer: t("answer", { year: guideYear(festivals) }),
        count: festivals.length,
      };
    }),
  );

  const hubYear = new Date().getFullYear();
  const hubUrl = `${SITE_URL}${getPathname({ locale, href: "/guider" })}`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: tg("hubTitle", { year: hubYear }),
      url: hubUrl,
      dateModified: new Date().toISOString(),
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      numberOfItems: entries.length,
      itemListElement: entries.map((e, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: e.title,
        url: `${SITE_URL}${getPathname({ locale, href: guidePath(e.key) })}`,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: tg("breadcrumbGuides"),
          item: hubUrl,
        },
      ],
    },
  ];

  return (
    <div className="min-h-dvh bg-[#FFF9F0] pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-3xl px-5 pt-[calc(env(safe-area-inset-top)+24px)]">
        <nav aria-label="Breadcrumb" className="text-xs text-stone-500">
          <Link href="/" className="hover:text-[#FF2D78]">
            {tg("breadcrumbHome")}
          </Link>
        </nav>

        <h1 className="mt-4 text-3xl sm:text-4xl">
          {tg("hubTitle", { year: hubYear })}
        </h1>

        <p className="mt-4 text-base leading-relaxed text-[#2D1A12]">
          {tg("hubAnswer")}
        </p>

        <p className="mt-3 text-sm leading-relaxed text-[#6B5E59]">
          {tg("hubIntro", { total: count ?? 0 })}
        </p>

        <div className="mt-8 flex flex-col gap-3">
          {entries.map((e) => (
            <Link
              key={e.key}
              href={guidePath(e.key)}
              className="rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgba(45,26,18,0.08)] transition-transform active:scale-[0.99]"
            >
              <h2 className="text-lg">{e.title}</h2>
              <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-[#6B5E59]">
                {e.answer}
              </p>
              <p className="mt-2 text-xs font-medium text-[#FF4E50]">
                {tg("festivalsInGuide", { count: e.count })}
              </p>
            </Link>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#FFB347] to-[#FF4E50] px-5 py-3 text-sm font-semibold text-white"
          >
            <MapIcon className="h-4 w-4" />
            {tg("exploreAll")}
          </Link>
        </div>
      </div>
    </div>
  );
}
