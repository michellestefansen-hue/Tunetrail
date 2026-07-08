"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useMotionValue, animate } from "framer-motion";
import { ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/solid";
import { dateRangeLabel, primaryTicketLink, type Festival } from "@/lib/festivals";

const PEEK_PX = 140;
const OPEN_VH = 0.46;

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

export function FestivalSheet({ festivals }: { festivals: Festival[] }) {
  const [openPx, setOpenPx] = useState(380);
  const [isOpen, setIsOpen] = useState(true);
  const y = useMotionValue(0);

  useEffect(() => {
    function update() {
      setOpenPx(window.innerHeight * OPEN_VH);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    animate(y, isOpen ? 0 : openPx - PEEK_PX, {
      type: "spring",
      stiffness: 420,
      damping: 42,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, openPx]);

  return (
    <motion.div
      style={{ y, height: openPx }}
      className="absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-3xl border-t border-white/10 bg-[#FFF9F0] shadow-2xl"
    >
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? "Skjul festivaler" : "Vis festivaler"}
        className="flex shrink-0 items-center justify-center py-3"
      >
        {isOpen ? (
          <ChevronDownIcon className="h-4 w-4 text-stone-400" />
        ) : (
          <ChevronUpIcon className="h-4 w-4 text-stone-400" />
        )}
      </button>

      <div className="min-h-0 flex-1">
        <FestivalList festivals={festivals} />
      </div>
    </motion.div>
  );
}

function FestivalList({ festivals }: { festivals: Festival[] }) {
  return (
    <div className="flex h-full flex-col overflow-y-auto px-5 pb-6 pt-1">
      <h2 className="text-2xl">Utforsk festivaler</h2>
      <p className="mt-1 text-sm text-stone-500">
        Opplev musikkfestivaler over hele Europa
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {festivals.map((festival) => {
          const ticket = primaryTicketLink(festival);
          return (
            <Link
              key={festival.id}
              href={`/festival/${festival.slug}`}
              className="flex items-center gap-3 rounded-2xl bg-white p-2.5 text-left shadow-[0_8px_30px_rgba(45,26,18,0.18)] transition-transform active:scale-[0.98]"
            >
              <FestivalThumbnail
                festival={festival}
                className="h-16 w-16 shrink-0 rounded-xl"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-heading text-[#2D1A12]">{festival.name}</p>
                <p className="truncate text-xs text-stone-500">
                  {dateRangeLabel(festival)} •{" "}
                  {[festival.city, festival.country].filter(Boolean).join(", ")}
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
            </Link>
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
