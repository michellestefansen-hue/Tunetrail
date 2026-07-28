"use client";

import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

export function LanguageSwitcher({
  className = "border-black/10 bg-transparent text-[#2D1A12]",
}: {
  className?: string;
}) {
  const t = useTranslations("LanguageSwitcher");
  const locale = useLocale();
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();

  function switchTo(nextLocale: Locale) {
    router.replace(
      // The pathname and params always match for the route we're currently on,
      // so the runtime pairing is safe even though TS can't prove it here.
      // @ts-expect-error -- see above
      { pathname, params },
      { locale: nextLocale },
    );
  }

  return (
    <select
      value={locale}
      onChange={(e) => switchTo(e.target.value as Locale)}
      aria-label={t(locale as Locale)}
      className={`rounded-full border px-2.5 py-1 text-sm ${className}`}
    >
      {routing.locales.map((l) => (
        <option key={l} value={l}>
          {t(l)}
        </option>
      ))}
    </select>
  );
}
