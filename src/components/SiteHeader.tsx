"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

/**
 * Static (in-flow) top bar for content pages — the guides hub and guide
 * detail pages. Distinct from `Header`, which is an absolutely-positioned
 * overlay designed to float over the full-bleed map on /kart.
 */
export function SiteHeader() {
  const t = useTranslations("Header");
  const tg = useTranslations("Guides");

  return (
    <div className="border-b border-black/5 bg-[#FFF9F0] pt-[env(safe-area-inset-top)]">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="" className="h-7 w-7 shrink-0" />
        <span className="font-heading text-lg text-[#2D1A12]">{t("title")}</span>
        <nav className="ml-2 flex items-center gap-4 text-sm font-medium text-stone-600">
          <Link href="/" className="hover:text-[#FF2D78]">
            {tg("navExploreFestivals")}
          </Link>
          <Link href="/kart" className="hover:text-[#FF2D78]">
            {tg("navExploreMap")}
          </Link>
        </nav>
        <div className="ml-auto">
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
}
