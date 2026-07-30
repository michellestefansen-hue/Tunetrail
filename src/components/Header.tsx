"use client";

import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { usePathname } from "@/i18n/navigation";
import { NavTabs } from "@/components/NavTabs";

export function Header() {
  const t = useTranslations("Header");
  const pathname = usePathname();
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center pt-[env(safe-area-inset-top)]">
      <div className="pointer-events-auto w-full bg-[#FFF9F0] shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" className="h-7 w-7" />
          <span className="font-heading text-lg text-[#2D1A12]">{t("title")}</span>
          <div className="ml-auto">
            <LanguageSwitcher />
          </div>
        </div>
        <NavTabs pathname={pathname} />
      </div>
    </div>
  );
}
