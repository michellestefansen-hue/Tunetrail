"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NavTabs } from "@/components/NavTabs";

/**
 * Static (in-flow) top bar for content pages — the guides hub and guide
 * detail pages. Distinct from `Header`, which is an absolutely-positioned
 * overlay designed to float over the full-bleed map on /kart.
 */
export function SiteHeader() {
  const t = useTranslations("Header");
  const pathname = usePathname();

  return (
    <div className="bg-[#FFF9F0] pt-[env(safe-area-inset-top)]">
      <div className="flex items-center gap-3 px-4 py-2 sm:px-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="" className="h-7 w-7 shrink-0" />
        <span className="font-heading text-lg text-[#2D1A12]">{t("title")}</span>
        <div className="ml-auto">
          <LanguageSwitcher />
        </div>
      </div>
      <NavTabs pathname={pathname} />
    </div>
  );
}
