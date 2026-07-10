"use client";

import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function Header() {
  const t = useTranslations("Header");
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center pt-[env(safe-area-inset-top)]">
      <div className="pointer-events-auto flex w-full items-center gap-2 border-b border-black/5 bg-[#FFF9F0] px-4 py-3 shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="" className="h-7 w-7" />
        <span className="font-heading text-lg text-[#2D1A12]">{t("title")}</span>
        <div className="ml-auto">
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
}
