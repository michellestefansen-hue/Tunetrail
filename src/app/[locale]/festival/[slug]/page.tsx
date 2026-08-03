import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  ArrowLeftIcon,
  GlobeAltIcon,
  TicketIcon,
  MapPinIcon,
  CalendarDateRangeIcon,
  UserGroupIcon,
} from "@heroicons/react/24/solid";
import { createClient } from "@/lib/supabase/static";
import { FestivalProgramTabs } from "@/components/FestivalProgramTabs";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Link, getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { guidesForFestival, guidePath } from "@/lib/guides";
import {
  FESTIVAL_SELECT,
  currentEdition,
  dateRangeLabel,
  fallbackGradient,
  BCP47_LOCALE,
  type Festival,
} from "@/lib/festivals";

// Kept short because data changes by hand-run SQL right after a spreadsheet
// edit — a long window here means "why isn't my update showing up?".
export const revalidate = 900;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tune-trail.org";

export async function generateStaticParams() {
  const supabase = createClient();
  const { data } = await supabase.from("festivals").select("slug");
  const slugs = (data ?? []).map((f) => f.slug as string);
  return routing.locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

async function getFestival(slug: string): Promise<Festival | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("festivals")
    .select(FESTIVAL_SELECT)
    .eq("slug", slug)
    .single();

  if (error || !data) return null;
  return data as unknown as Festival;
}

async function metaDescription(
  festival: Festival,
  locale: Locale,
  edition: ReturnType<typeof currentEdition>,
): Promise<string> {
  const t = await getTranslations({ locale, namespace: "FestivalPage" });
  const tCountries = await getTranslations({ locale, namespace: "Countries" });
  const place = [
    festival.venue_name ?? festival.city,
    festival.country ? tCountries(festival.country) : null,
  ]
    .filter(Boolean)
    .join(", ");
  const range = edition?.date_from ? dateRangeLabel(festival, locale) : null;
  const when = range ? t("metaWhen", { range }) : "";
  const where = place ? t("metaWhere", { place }) : "";
  return t("metaDescription", { name: festival.name, when, where });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = hasLocale(routing.locales, rawLocale) ? rawLocale : routing.defaultLocale;
  const festival = await getFestival(slug);
  if (!festival) return {};

  const edition = currentEdition(festival);
  const t = await getTranslations({ locale, namespace: "FestivalPage" });
  const title = edition
    ? t("metaTitle", { name: festival.name, year: edition.year })
    : t("metaTitleNoEdition", { name: festival.name });
  const description = await metaDescription(festival, locale, edition);
  const href = { pathname: "/festival/[slug]" as const, params: { slug } };
  const url = `${SITE_URL}${getPathname({ locale, href })}`;
  const images = festival.image_url ? [festival.image_url] : undefined;

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `${SITE_URL}${getPathname({ locale: l, href })}`]),
      ),
    },
    openGraph: { title, description, url, images },
    twitter: { title, description, images },
  };
}

function eventJsonLd(
  festival: Festival,
  edition: ReturnType<typeof currentEdition>,
  locale: Locale,
  countryName: string | null,
) {
  if (!edition?.date_from) return null;

  const performers = Array.from(
    new Set(edition.program.flatMap((d) => d.artists.map((a) => a.name))),
  );

  return {
    "@context": "https://schema.org",
    "@type": "MusicEvent",
    name: festival.name,
    startDate: edition.date_from,
    endDate: edition.date_to ?? edition.date_from,
    url: `${SITE_URL}${getPathname({
      locale,
      href: { pathname: "/festival/[slug]", params: { slug: festival.slug } },
    })}`,
    ...(festival.image_url ? { image: [festival.image_url] } : {}),
    location: {
      "@type": "Place",
      name: festival.venue_name ?? festival.city ?? festival.name,
      address: [festival.venue_name ?? festival.city, countryName]
        .filter(Boolean)
        .join(", "),
      geo: {
        "@type": "GeoCoordinates",
        latitude: festival.latitude,
        longitude: festival.longitude,
      },
    },
    ...(performers.length > 0
      ? { performer: performers.map((name) => ({ "@type": "MusicGroup", name })) }
      : {}),
    ...(edition.ticket_url
      ? { offers: { "@type": "Offer", url: edition.ticket_url } }
      : {}),
  };
}

export default async function FestivalPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale = rawLocale;
  setRequestLocale(locale);

  const festival = await getFestival(slug);
  if (!festival) notFound();

  const t = await getTranslations({ locale, namespace: "FestivalPage" });
  const tTags = await getTranslations({ locale, namespace: "Tags" });
  const tCountries = await getTranslations({ locale, namespace: "Countries" });
  const tSizes = await getTranslations({ locale, namespace: "Sizes" });
  const tg = await getTranslations({ locale, namespace: "Guides" });
  const year = new Date().getFullYear();
  const relatedGuides = await Promise.all(
    guidesForFestival(slug).map(async (key) => {
      const tGuide = await getTranslations({ locale, namespace: `Guides.${key}` });
      return { key, title: tGuide("title", { year }) };
    }),
  );
  const countryName = festival.country ? tCountries(festival.country) : null;
  const edition = currentEdition(festival);
  const jsonLd = eventJsonLd(festival, edition, locale, countryName);
  const bcp = BCP47_LOCALE[locale] ?? BCP47_LOCALE.nb;

  // One tab per year on record, oldest first; defaults to whichever edition
  // the rest of the page (dates, ticket link, JSON-LD) is already built
  // around, so the tab that opens matches what's shown above it.
  const years = [...festival.festival_editions]
    .sort((a, b) => a.year - b.year)
    .map((e) => ({ year: e.year, program: e.program }));

  return (
    <div className="min-h-dvh bg-[#FFF9F0] pb-16">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <div className="relative h-64 w-full sm:h-80">
        {festival.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={festival.image_url}
            alt={festival.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            className={`absolute inset-0 bg-gradient-to-br ${fallbackGradient(festival)}`}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#FFF9F0] to-transparent" />

        <Link
          href="/kart"
          className="absolute left-4 top-[calc(env(safe-area-inset-top)+16px)] flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-2 text-sm font-medium text-white backdrop-blur-md"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          {t("backToMap")}
        </Link>

        <div className="absolute right-4 top-[calc(env(safe-area-inset-top)+16px)] rounded-full bg-black/40 backdrop-blur-md">
          <LanguageSwitcher className="border-white/20 bg-transparent text-white" />
        </div>
      </div>

      <div className="mx-auto max-w-2xl rounded-t-3xl bg-[#FFF9F0] px-5 pt-5">
        {festival.tags && festival.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {festival.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[#FBEAF0] px-2.5 py-1 text-xs font-semibold text-[#993556]"
              >
                {tTags(tag)}
              </span>
            ))}
          </div>
        )}
        <h1 className="mt-2 text-3xl">{festival.name}</h1>

        <p className="mt-3 flex items-center gap-1.5 text-sm text-stone-500">
          <MapPinIcon className="h-4 w-4 text-[#FF2D78]" />
          {[festival.venue_name ?? festival.city, countryName].filter(Boolean).join(", ")}
        </p>

        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-stone-500">
          <CalendarDateRangeIcon className="h-4 w-4 text-[#FF2D78]" />
          {dateRangeLabel(festival, locale) ?? t("noDateSet")}
        </p>

        {/* Only when known. 693 festivals predate the field, and an empty line
            reading "size: unknown" tells a visitor nothing they wanted. */}
        {festival.size_band && (
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-stone-500">
            <UserGroupIcon className="h-4 w-4 text-[#FF2D78]" />
            {tSizes(festival.size_band)}
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {festival.website_url && (
            <a
              href={festival.website_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600"
            >
              <GlobeAltIcon className="h-4 w-4 text-[#FF2D78]" />
              {t("website")}
            </a>
          )}
          {edition?.ticket_url && (
            <a
              href={edition.ticket_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#FFB347] to-[#FF4E50] px-4 py-2 text-sm font-semibold text-white"
            >
              <TicketIcon className="h-4 w-4" />
              {t("tickets")}
            </a>
          )}
        </div>

        {festival.description && (
          <p className="mt-4 text-sm leading-relaxed text-[#6B5E59]">
            {festival.description}
          </p>
        )}

        <h2 className="mt-8 text-xl">{t("program")}</h2>
        <div className="mt-4">
          <FestivalProgramTabs
            years={years}
            defaultYear={edition?.year ?? years[0]?.year ?? new Date().getFullYear()}
            bcp47={bcp}
          />
        </div>

        {relatedGuides.length > 0 && (
          <section className="mt-10 border-t border-stone-200 pt-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
              {tg("seeAlsoHeading")}
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              {relatedGuides.map(({ key, title }) => (
                <li key={key}>
                  <Link
                    href={guidePath(key)}
                    className="text-sm text-[#FF2D78] hover:underline"
                  >
                    → {title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Deliberately plain and last: correcting data is a side errand, not
            something to compete with the line-up for attention. */}
        <section className="mt-10 border-t border-stone-200 pt-5">
          <a
            href={`/foresla/${locale}/${slug}`}
            className="text-sm text-stone-500 hover:text-stone-800 hover:underline"
          >
            {t("proposeEdit")}
          </a>
        </section>
      </div>
    </div>
  );
}
