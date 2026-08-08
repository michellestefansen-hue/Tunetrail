"use client";

import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import { useRouter } from "@/i18n/navigation";
import { MAP_FILTER_KEY } from "@/components/FilterDrawer";

/**
 * Returns to the map you actually left, filters and all.
 *
 * This is a button rather than a link on purpose. The destination depends on
 * what the visitor had selected, which is known only in the browser, so there
 * is no single href to render on the server. Someone arriving here straight
 * from a search engine has nothing stored and gets the plain map, which is the
 * right answer for them.
 *
 * No state and no effect: reading sessionStorage inside the handler avoids both
 * a hydration mismatch and a setState-in-effect that the lint rules would
 * rightly complain about.
 */
export function BackToMap({ label, className }: { label: string; className?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        const saved = sessionStorage.getItem(MAP_FILTER_KEY);
        router.push({
          pathname: "/kart",
          query: saved ? Object.fromEntries(new URLSearchParams(saved)) : {},
        });
      }}
    >
      <ArrowLeftIcon className="h-4 w-4" />
      {label}
    </button>
  );
}
