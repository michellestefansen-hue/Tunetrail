"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * The two top-level nav links, styled as minimal tabs on their own white row
 * beneath the logo bar. Active tab is derived from `pathname` rather than
 * passed in, so both `Header` and `SiteHeader` stay in sync automatically as
 * the user navigates.
 */
export function NavTabs({ pathname }: { pathname: string }) {
  const tg = useTranslations("Guides");
  const isMap = pathname === "/kart";

  return (
    <nav className="flex justify-center gap-7 border-t border-black/5 bg-white px-4 py-2">
      <Link
        href="/"
        className={`text-sm font-medium ${
          isMap ? "text-stone-400 hover:text-[#2D1A12]" : "text-[#FF2D78]"
        }`}
      >
        {tg("navExploreFestivals")}
      </Link>
      <span className="text-sm text-stone-300" aria-hidden="true">
        |
      </span>
      <Link
        href="/kart"
        className={`text-sm font-medium ${
          isMap ? "text-[#FF2D78]" : "text-stone-400 hover:text-[#2D1A12]"
        }`}
      >
        {tg("navExploreMap")}
      </Link>
    </nav>
  );
}
