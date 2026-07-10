import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  ArrowLeftIcon,
  GlobeAltIcon,
  TicketIcon,
  MapPinIcon,
} from "@heroicons/react/24/solid";
import { createClient } from "@/lib/supabase/static";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Link, getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import {
  FESTIVAL_SELECT,
  currentEdition,
  dateRangeLabel,
  BCP47_LOCALE,
  type Festival,
} from "@/lib/festivals";

export const revalidate = 3600; // refresh each page in the background at most once an hour

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
  const place = [festival.venue_name ?? festival.city, festival.country]
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
  const href = `/festival/${slug}`;
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
    url: `${SITE_URL}${getPathname({ locale, href: `/festival/${festival.slug}` })}`,
    ...(festival.image_url ? { image: [festival.image_url] } : {}),
    location: {
      "@type": "Place",
      name: festival.venue_name ?? festival.city ?? festival.name,
      address: [festival.venue_name ?? festival.city, festival.country]
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
  const tCategories = await getTranslations({ locale, namespace: "Categories" });
  const edition = currentEdition(festival);
  const program = edition?.program ?? [];
  const jsonLd = eventJsonLd(festival, edition, locale);
  const bcp = BCP47_LOCALE[locale] ?? BCP47_LOCALE.nb;

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
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-[#FF4E50]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#FFF9F0] to-transparent" />

        <Link
          href="/"
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
        {festival.category && (
          <p className="text-xs font-semibold uppercase tracking-wide text-[#FF4E50]">
            {tCategories(festival.category)}
          </p>
        )}
        <h1 className="mt-1 text-3xl">{festival.name}</h1>

        <p className="mt-3 flex items-center gap-1.5 text-sm text-stone-500">
          <MapPinIcon className="h-4 w-4 text-[#FF2D78]" />
          {[festival.venue_name ?? festival.city, festival.country]
            .filter(Boolean)
            .join(", ")}
        </p>

        {festival.description && (
          <p className="mt-4 text-sm leading-relaxed text-[#6B5E59]">
            {festival.description}
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

        <h2 className="mt-8 text-xl">{t("program")}</h2>
        <div className="mt-4 flex flex-col gap-5">
          {program.length === 0 && (
            <p className="text-sm text-stone-400">{t("programNotAnnouncedYet")}</p>
          )}
          {program.map((day, i) => (
            <div key={day.date} className="rounded-2xl bg-white p-4 shadow-[0_8px_30px_rgba(45,26,18,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#FF2D78]">
                {t("day", { number: i + 1 })}
                {day.day_label ? ` · ${day.day_label}` : ""}
              </p>
              <p className="mt-0.5 font-heading text-lg text-[#2D1A12]">
                {new Date(day.date).toLocaleDateString(bcp, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {day.artists.length > 0 ? (
                  day.artists.map((a, idx) => (
                    <span
                      key={`${a.name}-${idx}`}
                      className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-700"
                      title={[a.stage, a.time].filter(Boolean).join(" · ")}
                    >
                      {a.name}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-stone-400">{t("programNotAnnounced")}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
