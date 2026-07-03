"use client";

import { ChevronLeftIcon, TicketIcon, GlobeAltIcon } from "@heroicons/react/24/solid";
import {
  dateRangeLabel,
  primaryTicketLink,
  sortedDates,
  type Festival,
} from "@/lib/festivals";

const GRADIENTS = [
  "from-orange-500 to-pink-600",
  "from-purple-600 to-indigo-500",
  "from-amber-500 to-red-600",
  "from-fuchsia-600 to-orange-500",
  "from-rose-500 to-purple-700",
];

function gradientFor(id: string) {
  const sum = [...id].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return GRADIENTS[sum % GRADIENTS.length];
}

function FestivalThumbnail({
  festival,
  className,
}: {
  festival: Festival;
  className: string;
}) {
  if (festival.image_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={festival.image_url}
        alt={festival.name}
        className={`${className} object-cover`}
      />
    );
  }
  return <div className={`${className} bg-gradient-to-br ${gradientFor(festival.id)}`} />;
}

export function FestivalSheet({
  festivals,
  selected,
  onSelect,
  onBack,
}: {
  festivals: Festival[];
  selected: Festival | null;
  onSelect: (festival: Festival) => void;
  onBack: () => void;
}) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 max-h-[46%] rounded-t-3xl border-t border-white/10 bg-[#FFF9F0] shadow-2xl">
      <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-black/15" />

      {selected ? (
        <FestivalDetail festival={selected} onBack={onBack} />
      ) : (
        <FestivalList festivals={festivals} onSelect={onSelect} />
      )}
    </div>
  );
}

function FestivalList({
  festivals,
  onSelect,
}: {
  festivals: Festival[];
  onSelect: (festival: Festival) => void;
}) {
  return (
    <div className="flex max-h-[calc(46vh-24px)] flex-col overflow-y-auto px-5 pb-6 pt-3">
      <h2 className="text-2xl">Utforsk festivaler</h2>
      <p className="mt-1 text-sm text-stone-500">
        Opplev magien fra den norske sommernatten
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {festivals.map((festival) => {
          const ticket = primaryTicketLink(festival);
          return (
            <button
              key={festival.id}
              type="button"
              onClick={() => onSelect(festival)}
              className="flex items-center gap-3 rounded-2xl bg-white p-2.5 text-left shadow-[0_8px_30px_rgba(45,26,18,0.18)] transition-transform active:scale-[0.98]"
            >
              <FestivalThumbnail
                festival={festival}
                className="h-16 w-16 shrink-0 rounded-xl"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-heading text-[#2D1A12]">{festival.name}</p>
                <p className="truncate text-xs text-stone-500">
                  {dateRangeLabel(festival)} • {festival.venue_name ?? festival.city}
                </p>
              </div>
              {ticket && (
                <span className="shrink-0 rounded-full bg-gradient-to-r from-[#FFB347] to-[#FF4E50] px-4 py-2 text-xs font-semibold text-white">
                  Program
                </span>
              )}
            </button>
          );
        })}
        {festivals.length === 0 && (
          <p className="py-8 text-center text-sm text-stone-400">
            Ingen festivaler matcher søket ditt.
          </p>
        )}
      </div>
    </div>
  );
}

function FestivalDetail({
  festival,
  onBack,
}: {
  festival: Festival;
  onBack: () => void;
}) {
  const dates = sortedDates(festival);
  const dateInfo = new Map(festival.festival_dates.map((d) => [d.date, d]));

  return (
    <div className="flex max-h-[calc(46vh-24px)] flex-col overflow-y-auto px-5 pb-6 pt-3">
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit items-center gap-1 text-sm font-medium text-stone-500"
      >
        <ChevronLeftIcon className="h-4 w-4 text-[#FF2D78]" />
        Tilbake
      </button>

      <FestivalThumbnail festival={festival} className="mt-3 h-24 w-full rounded-2xl" />

      <h2 className="mt-3 text-2xl">{festival.name}</h2>
      <p className="text-sm text-stone-500">
        {festival.venue_name ?? festival.city}, {festival.region}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {festival.website_url && (
          <a
            href={festival.website_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600"
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
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#FFB347] to-[#FF4E50] px-3 py-1.5 text-xs font-semibold text-white"
          >
            <TicketIcon className="h-4 w-4" />
            {t.provider}
          </a>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-4">
        {dates.map((date) => {
          const info = dateInfo.get(date);
          const artists = (info?.performances ?? []).flatMap((p) =>
            p.artists.map((a) => a.name),
          );

          return (
            <div key={date}>
              <p className="text-sm font-semibold text-stone-900">
                {new Date(date).toLocaleDateString("nb-NO", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
                {info?.day_label ? ` · ${info.day_label}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
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
                  <span className="text-xs text-stone-400">Program ikke annonsert</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
