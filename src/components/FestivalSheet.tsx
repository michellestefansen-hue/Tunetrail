"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useDragControls,
  animate,
  type PanInfo,
} from "framer-motion";
import { ChevronLeftIcon, TicketIcon, GlobeAltIcon } from "@heroicons/react/24/solid";
import {
  dateRangeLabel,
  primaryTicketLink,
  sortedDates,
  type Festival,
} from "@/lib/festivals";

const PEEK_PX = 140;
const DEFAULT_VH = 0.46;
const EXPANDED_VH = 0.86;

type SnapKey = "peek" | "default" | "expanded";

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
  const [heightsPx, setHeightsPx] = useState({ expanded: 700, default: 380 });
  const y = useMotionValue(heightsPx.expanded - heightsPx.default);
  const dragControls = useDragControls();
  const initialized = useRef(false);

  useEffect(() => {
    function update() {
      const vh = window.innerHeight;
      setHeightsPx({ expanded: vh * EXPANDED_VH, default: vh * DEFAULT_VH });
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    y.set(heightsPx.expanded - heightsPx.default);
  }, [heightsPx, y]);

  const snapY: Record<SnapKey, number> = {
    expanded: 0,
    default: heightsPx.expanded - heightsPx.default,
    peek: heightsPx.expanded - PEEK_PX,
  };

  const snapToward = (key: SnapKey) => {
    animate(y, snapY[key], { type: "spring", stiffness: 420, damping: 42 });
  };

  useEffect(() => {
    if (selected && y.get() >= snapY.peek - 1) {
      snapToward("default");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    const currentY = y.get();
    const velocity = info.velocity.y;
    const points: [SnapKey, number][] = [
      ["expanded", snapY.expanded],
      ["default", snapY.default],
      ["peek", snapY.peek],
    ];

    let target: SnapKey;
    if (velocity < -600) {
      target = points.filter(([, v]) => v <= currentY + 1).sort((a, b) => a[1] - b[1])[0]?.[0] ?? "expanded";
    } else if (velocity > 600) {
      target = points.filter(([, v]) => v >= currentY - 1).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "peek";
    } else {
      target = points.reduce((a, b) =>
        Math.abs(b[1] - currentY) < Math.abs(a[1] - currentY) ? b : a,
      )[0];
    }

    snapToward(target);
  };

  return (
    <motion.div
      drag="y"
      dragListener={false}
      dragControls={dragControls}
      dragConstraints={{ top: 0, bottom: snapY.peek }}
      dragElastic={0.06}
      onDragEnd={handleDragEnd}
      style={{ y, height: heightsPx.expanded }}
      className="absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-3xl border-t border-white/10 bg-[#FFF9F0] shadow-2xl"
    >
      <div
        onPointerDown={(e) => dragControls.start(e)}
        className="flex shrink-0 cursor-grab touch-none justify-center py-3 active:cursor-grabbing"
      >
        <div className="h-1.5 w-12 rounded-full bg-black/15" />
      </div>

      <div className="min-h-0 flex-1">
        {selected ? (
          <FestivalDetail festival={selected} onBack={onBack} />
        ) : (
          <FestivalList festivals={festivals} onSelect={onSelect} />
        )}
      </div>
    </motion.div>
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
    <div className="flex h-full flex-col overflow-y-auto px-5 pb-6 pt-3">
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
                {festival.category && (
                  <p className="mt-1 truncate text-[11px] font-medium text-[#FF4E50]">
                    {festival.category}
                  </p>
                )}
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
    <div className="flex h-full flex-col overflow-y-auto px-5 pb-6 pt-3">
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
