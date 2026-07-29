import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { TicketIcon, MapIcon } from "@heroicons/react/24/solid";
import { Link, getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { GUIDES, GUIDE_KEYS, guideMapQuery, guidePath, type GuideKey } from "@/lib/guides";
import { SiteHeader } from "@/components/SiteHeader";
import {
  fetchGuideFestivals,
  guideYear,
  headliners,
  artistCount,
  groupByMonth,
} from "@/lib/guideFestivals";
import {
  currentEdition,
  dateRangeLabel,
  BCP47_LOCALE,
  type Festival,
} from "@/lib/festivals";

export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tune-trail.org";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    GUIDE_KEYS.map((guide) => ({ locale, guide })),
  );
}

type FaqItem = { q: string; a: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; guide: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, guide } = await params;
  if (!GUIDE_KEYS.includes(guide as GuideKey)) return {};
  const key = guide as GuideKey;
  const locale = hasLocale(routing.locales, rawLocale) ? rawLocale : routing.defaultLocale;

  const festivals = await fetchGuideFestivals(GUIDES[key].festivalSlugs);
  const year = guideYear(festivals);
  const t = await getTranslations({ locale, namespace: `Guides.${key}` });
  const href = guidePath(key);

  const title = t("metaTitle", { year });
  const description = t("metaDescription", { year });

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}${getPathname({ locale, href })}`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `${SITE_URL}${getPathname({ locale: l, href })}`]),
      ),
    },
    openGraph: { title, description, url: `${SITE_URL}${getPathname({ locale, href })}` },
    twitter: { title, description },
  };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ locale: string; guide: string }>;
}) {
  const { locale: rawLocale, guide } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  if (!GUIDE_KEYS.includes(guide as GuideKey)) notFound();
  const locale = rawLocale as Locale;
  const key = guide as GuideKey;
  setRequestLocale(locale);

  const festivals = await fetchGuideFestivals(GUIDES[key].festivalSlugs);
  if (festivals.length === 0) notFound();

  const year = guideYear(festivals);
  const t = await getTranslations({ locale, namespace: `Guides.${key}` });
  const tg = await getTranslations({ locale, namespace: "Guides" });
  const tc = await getTranslations({ locale, namespace: "Categories" });
  const tCountries = await getTranslations({ locale, namespace: "Countries" });
  const bcp = BCP47_LOCALE[locale] ?? BCP47_LOCALE.nb;
  const countryName = (country: string | null) => (country ? tCountries(country) : null);

  const faq = t.raw("faq") as FaqItem[];
  const months = groupByMonth(festivals, locale, year);
  const guideUrl = `${SITE_URL}${getPathname({ locale, href: guidePath(key) })}`;
  const updated = new Date().toISOString();

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: t("title", { year }),
      url: guideUrl,
      numberOfItems: festivals.length,
      itemListElement: festivals.map((f, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: f.name,
        url: `${SITE_URL}${getPathname({
          locale,
          href: { pathname: "/festival/[slug]", params: { slug: f.slug } },
        })}`,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: tg("navExploreFestivals"),
          item: `${SITE_URL}${getPathname({ locale, href: "/" })}`,
        },
        { "@type": "ListItem", position: 2, name: t("title", { year }), item: guideUrl },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      url: guideUrl,
      name: t("title", { year }),
      dateModified: updated,
    },
  ];

  function festivalHref(f: Festival) {
    return { pathname: "/festival/[slug]" as const, params: { slug: f.slug } };
  }

  /**
   * Date range, with the year spelled out when this festival's next edition
   * isn't the guide's year — a few festivals have already announced the
   * following year, and a bare "9 – 11 June" under a 2026 heading would read
   * as 2026.
   */
  function dateLabel(f: Festival): string {
    const range = dateRangeLabel(f, locale);
    if (!range) return "—";
    const edYear = currentEdition(f)?.year;
    return edYear && edYear !== year ? `${range} ${edYear}` : range;
  }

  return (
    <div className="min-h-dvh bg-[#FFF9F0] pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <SiteHeader />

      <div className="mx-auto max-w-3xl px-5 pt-6">
        <h1 className="text-3xl sm:text-4xl">{t("title", { year })}</h1>

        <p className="mt-4 text-base leading-relaxed text-[#2D1A12]">
          {t("answer", { year })}
        </p>

        <p className="mt-3 text-xs text-stone-500">
          {tg("updatedAt", {
            date: new Date(updated).toLocaleDateString(bcp, {
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
          })}
          {" · "}
          {tg("festivalsInGuide", { count: festivals.length })}
        </p>

        <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-[0_8px_30px_rgba(45,26,18,0.08)]">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
                <th className="px-4 py-3 font-semibold">{tg("tableFestival")}</th>
                <th className="px-4 py-3 font-semibold">{tg("tableCountry")}</th>
                <th className="px-4 py-3 font-semibold">{tg("tableDates")}</th>
                <th className="px-4 py-3 font-semibold">{tg("tableGenre")}</th>
                <th className="px-4 py-3 font-semibold">{tg("tableTickets")}</th>
              </tr>
            </thead>
            <tbody>
              {festivals.map((f) => {
                const edition = currentEdition(f);
                return (
                  <tr key={f.id} className="border-b border-stone-100 last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={festivalHref(f)}
                        className="font-medium text-[#2D1A12] hover:text-[#FF2D78]"
                      >
                        {f.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-stone-600">{countryName(f.country)}</td>
                    <td className="px-4 py-3 text-stone-600">{dateLabel(f)}</td>
                    <td className="px-4 py-3 text-stone-600">
                      {f.category ? tc(f.category) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {edition?.ticket_url ? (
                        <a
                          href={edition.ticket_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#FF2D78] hover:underline"
                        >
                          {tg("ticketsLink")}
                        </a>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {t("intro")
          .split("\n\n")
          .map((para, i) => (
            <p key={i} className="mt-4 text-sm leading-relaxed text-[#6B5E59]">
              {para}
            </p>
          ))}

        <ol className="mt-8 flex flex-col gap-4">
          {festivals.map((f, i) => {
            const edition = currentEdition(f);
            const names = headliners(f);
            const count = artistCount(f);
            return (
              <li
                key={f.id}
                className="rounded-2xl bg-white p-4 shadow-[0_8px_30px_rgba(45,26,18,0.08)]"
              >
                <div className="flex items-start gap-4">
                  <span className="mt-0.5 shrink-0 font-heading text-2xl text-[#FFB347]">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg">
                      <Link href={festivalHref(f)} className="hover:text-[#FF2D78]">
                        {f.name}
                      </Link>
                    </h2>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {[f.venue_name ?? f.city, countryName(f.country)]
                        .filter(Boolean)
                        .join(", ")}
                      {" · "}
                      {dateLabel(f)}
                    </p>
                    {names.length > 0 ? (
                      <p className="mt-2 text-sm text-[#6B5E59]">
                        <span className="font-medium text-[#2D1A12]">
                          {tg("headliners")}:
                        </span>{" "}
                        {names.join(", ")}
                        {count > names.length ? ` +${count - names.length}` : ""}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-stone-400">{tg("noProgram")}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={festivalHref(f)}
                        className="rounded-full border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:border-[#FF2D78] hover:text-[#FF2D78]"
                      >
                        {tg("readGuide")}
                      </Link>
                      {edition?.ticket_url && (
                        <a
                          href={edition.ticket_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#FFB347] to-[#FF4E50] px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          <TicketIcon className="h-3.5 w-3.5" />
                          {tg("ticketsLink")}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        {months.length > 1 && (
          <section className="mt-10">
            <h2 className="text-xl">{tg("byMonth")}</h2>
            <div className="mt-4 flex flex-col gap-4">
              {months.map((m) => (
                <div key={m.key}>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-[#FF2D78]">
                    {m.month}
                  </h3>
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {m.festivals.map((f) => (
                      <li key={f.id}>
                        <Link
                          href={festivalHref(f)}
                          className="inline-block rounded-full bg-white px-3 py-1.5 text-xs text-stone-700 shadow-sm hover:text-[#FF2D78]"
                        >
                          {f.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-10">
          <h2 className="text-xl">{tg("faqHeading")}</h2>
          <div className="mt-4 flex flex-col gap-3">
            {faq.map((item) => (
              <details
                key={item.q}
                className="rounded-2xl bg-white p-4 shadow-[0_8px_30px_rgba(45,26,18,0.06)]"
              >
                <summary className="cursor-pointer font-heading text-sm text-[#2D1A12]">
                  {item.q}
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-[#6B5E59]">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <p className="mt-8 text-sm leading-relaxed text-[#6B5E59]">{t("outro")}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={{ pathname: "/kart", query: guideMapQuery(GUIDES[key]) }}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#FFB347] to-[#FF4E50] px-5 py-3 text-sm font-semibold text-white"
          >
            <MapIcon className="h-4 w-4" />
            {t("ctaMap")}
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 rounded-full border border-stone-200 px-5 py-3 text-sm font-medium text-stone-600"
          >
            {tg("navExploreFestivals")}
          </Link>
        </div>
      </div>
    </div>
  );
}
