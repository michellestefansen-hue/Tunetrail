import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/static";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tune-trail.org";

function alternates(href: string) {
  return Object.fromEntries(
    routing.locales.map((l) => [l, `${SITE_URL}${getPathname({ locale: l, href })}`]),
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient();
  const { data } = await supabase
    .from("festivals")
    .select("slug, festival_editions(updated_at)");

  const homeEntries = routing.locales.map((locale) => ({
    url: `${SITE_URL}${getPathname({ locale, href: "/" })}`,
    alternates: { languages: alternates("/") },
  }));

  const festivalEntries = (data ?? []).flatMap((f) => {
    const updates = (f.festival_editions as { updated_at: string }[] | null) ?? [];
    const lastModified = updates.map((e) => e.updated_at).sort().at(-1);
    const href = `/festival/${f.slug}`;
    return routing.locales.map((locale) => ({
      url: `${SITE_URL}${getPathname({ locale, href })}`,
      ...(lastModified ? { lastModified: new Date(lastModified) } : {}),
      alternates: { languages: alternates(href) },
    }));
  });

  return [...homeEntries, ...festivalEntries];
}
