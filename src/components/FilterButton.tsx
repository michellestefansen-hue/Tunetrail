"use client";

import { useTranslations } from "next-intl";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/solid";

/**
 * The map's only filter affordance — a floating pill over the top-left of the
 * map that opens `FilterDrawer`. Replaces the old always-visible search field.
 */
export function FilterButton({
  count,
  onClick,
  open,
}: {
  count: number;
  onClick: () => void;
  open: boolean;
}) {
  const t = useTranslations("Filters");

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex px-4 pt-[calc(env(safe-area-inset-top)+96px)]">
      <button
        type="button"
        onClick={onClick}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="pointer-events-auto flex items-center gap-2 rounded-full border border-black/10 bg-[#FFF9F0] py-2.5 pl-4 pr-4 text-sm font-medium text-[#2D1A12] shadow-lg"
      >
        <AdjustmentsHorizontalIcon className="h-5 w-5 text-[#FF2D78]" />
        {t("title")}
        {count > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF2D78] px-1.5 text-xs font-semibold text-white">
            {count}
          </span>
        )}
      </button>
    </div>
  );
}
