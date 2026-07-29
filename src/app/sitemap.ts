import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/static";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { GUIDE_KEYS, guidePath } from "@/lib/guides";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tune-trail.org";

type Href = Parameters<typeof getPathname>[0]["href"];

function url(locale: string, href: Href) {
  return `${SITE_URL}${getPathname({ locale: locale as never, href })}`;
}

function alternates(href: Href) {
  return Object.fromEntries(routing.locales.map((l) => [l, url(l, href)]));
}

/** One sitemap entry per locale, each carrying the full hreflang set. */
function entriesFor(href: Href, lastModified?: Date) {
  const languages = alternates(href);
  return routing.locales.map((locale) => ({
    url: url(locale, href),
    ...(lastModified ? { lastModified } : {}),
    alternates: { languages },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient();
  const { data } = await supabase
    .from("festivals")
    .select("slug, festival_editions(updated_at)");

  // "/" is the guides hub; "/kart" is the interactive map.
  const home = entriesFor("/");
  const map = entriesFor("/kart");
  const guides = GUIDE_KEYS.flatMap((key) => entriesFor(guidePath(key)));

  const festivals = (data ?? []).flatMap((f) => {
    const updates = (f.festival_editions as { updated_at: string }[] | null) ?? [];
    const lastModified = updates.map((e) => e.updated_at).sort().at(-1);
    return entriesFor(
      { pathname: "/festival/[slug]", params: { slug: f.slug as string } },
      lastModified ? new Date(lastModified) : undefined,
    );
  });

  return [...home, ...map, ...guides, ...festivals];
}
