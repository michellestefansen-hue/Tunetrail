"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { Flag } from "@/components/Flag";

export function LanguageSwitcher({
  className = "border-black/10 bg-white",
}: {
  className?: string;
}) {
  const t = useTranslations("LanguageSwitcher");
  const locale = useLocale();
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function switchTo(nextLocale: Locale) {
    setOpen(false);
    router.replace(
      // The pathname and params always match for the route we're currently on,
      // so the runtime pairing is safe even though TS can't prove it here.
      // @ts-expect-error -- see above
      { pathname, params },
      { locale: nextLocale },
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t(locale as Locale)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`flex h-8 w-8 items-center justify-center rounded-full border p-0.5 ${className}`}
      >
        <Flag locale={locale as Locale} className="h-full w-full rounded-full" />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full z-40 mt-2 flex flex-col gap-1 rounded-2xl border border-black/10 bg-white p-1.5 shadow-lg"
        >
          {routing.locales.map((l) => (
            <button
              key={l}
              type="button"
              role="option"
              aria-selected={l === locale}
              onClick={() => switchTo(l)}
              aria-label={t(l)}
              title={t(l)}
              className={`flex h-8 w-8 items-center justify-center rounded-full p-0.5 transition-shadow hover:ring-2 hover:ring-stone-200 ${
                l === locale ? "ring-2 ring-[#FF2D78]" : ""
              }`}
            >
              <Flag locale={l} className="h-full w-full rounded-full" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
