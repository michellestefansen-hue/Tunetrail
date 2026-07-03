import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeftIcon,
  GlobeAltIcon,
  TicketIcon,
  MapPinIcon,
} from "@heroicons/react/24/solid";
import { createClient } from "@/lib/supabase/server";
import {
  FESTIVAL_SELECT,
  artistNamesForDate,
  sortedDates,
  type Festival,
} from "@/lib/festivals";

export const dynamic = "force-dynamic";

async function getFestival(slug: string): Promise<Festival | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("festivals")
    .select(FESTIVAL_SELECT)
    .eq("slug", slug)
    .single();

  if (error || !data) return null;
  return data as unknown as Festival;
}

export default async function FestivalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const festival = await getFestival(slug);

  if (!festival) notFound();

  const dates = sortedDates(festival);
  const dateInfo = new Map(festival.festival_dates.map((d) => [d.date, d]));

  return (
    <div className="min-h-dvh bg-[#FFF9F0] pb-16">
      <div className="relative h-64 w-full sm:h-80">
        {festival.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={festival.image_url}
            alt={festival.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-purple-600 to-[#FF4E50]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#FFF9F0] via-black/10 to-black/30" />

        <Link
          href="/"
          className="absolute left-4 top-[calc(env(safe-area-inset-top)+16px)] flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-2 text-sm font-medium text-white backdrop-blur-md"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Kart
        </Link>
      </div>

      <div className="mx-auto -mt-8 max-w-2xl rounded-t-3xl bg-[#FFF9F0] px-5 pt-6">
        {festival.category && (
          <p className="text-xs font-semibold uppercase tracking-wide text-[#FF4E50]">
            {festival.category}
          </p>
        )}
        <h1 className="mt-1 text-3xl">{festival.name}</h1>

        <p className="mt-2 flex items-center gap-1.5 text-sm text-stone-500">
          <MapPinIcon className="h-4 w-4 text-[#FF2D78]" />
          {festival.venue_name ?? festival.city}
          {festival.region ? `, ${festival.region}` : ""}
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
              Nettside
            </a>
          )}
          {festival.ticket_links.map((t) => (
            <a
              key={t.url}
              href={t.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#FFB347] to-[#FF4E50] px-4 py-2 text-sm font-semibold text-white"
            >
              <TicketIcon className="h-4 w-4" />
              {t.label ?? t.provider}
            </a>
          ))}
        </div>

        <h2 className="mt-8 text-xl">Program</h2>
        <div className="mt-4 flex flex-col gap-5">
          {dates.length === 0 && (
            <p className="text-sm text-stone-400">Program ikke annonsert ennå.</p>
          )}
          {dates.map((date, i) => {
            const info = dateInfo.get(date);
            const artists = artistNamesForDate(info);

            return (
              <div key={date} className="rounded-2xl bg-white p-4 shadow-[0_8px_30px_rgba(45,26,18,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#FF2D78]">
                  Dag {i + 1}
                  {info?.day_label ? ` · ${info.day_label}` : ""}
                </p>
                <p className="mt-0.5 font-heading text-lg text-[#2D1A12]">
                  {new Date(date).toLocaleDateString("nb-NO", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {artists.length > 0 ? (
                    artists.map((name) => (
                      <span
                        key={name}
                        className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-700"
                      >
                        {name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-stone-400">
                      Program ikke annonsert
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
