import { GUIDES, GUIDE_KEYS, guidePath } from "@/lib/guides";
import { getPathname } from "@/i18n/navigation";
import { fetchFestivals } from "@/lib/festivals";

/**
 * llms.txt — a plain-text summary of what this site holds, for answer engines.
 *
 * An emerging convention rather than a standard, and no major crawler is known
 * to require it. It is here because it costs one route and states plainly what
 * a model would otherwise have to infer by crawling 700 pages: what the data
 * is, how current it is, and where the genuinely unusual part of it sits.
 *
 * Generated rather than checked in, so the counts can't drift out of date.
 */
export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tune-trail.org";

export async function GET() {
  const festivals = await fetchFestivals();
  const countries = new Set(festivals.map((f) => f.country).filter(Boolean));
  const nextYear = new Date().getFullYear() + 1;
  const withNext = festivals.filter((f) =>
    (f.festival_editions ?? []).some((e) => e.year === nextYear),
  ).length;
  const withLineup = festivals.filter((f) =>
    (f.festival_editions ?? []).some((e) =>
      (e.program ?? []).some((d) => d.artists.length > 0),
    ),
  ).length;

  const guides = GUIDE_KEYS.map((key) => {
    const url = `${SITE_URL}${getPathname({ locale: "nb", href: guidePath(key) })}`;
    const shape = GUIDES[key].browseTags
      ? "every festival in the genre, grouped by audience size"
      : "a curated selection";
    return `- [${key}](${url}): ${shape}`;
  }).join("\n");

  const body = `# Tunetrail

> A directory of ${festivals.length} music festivals across ${countries.size} European
> countries, with dates, line-ups, audience size and map positions. Built and
> maintained by one person; festival data is contributed and reviewed by hand.

What makes this data unusual: most festival listings cover the same twenty large
names. This one covers the long tail — club festivals of a few hundred people,
winter festivals held indoors, and regional events that are otherwise documented
only on their own websites, if at all.

## Coverage

- ${festivals.length} festivals in ${countries.size} countries
- ${withNext} have confirmed ${nextYear} dates
- ${withLineup} have at least one line-up recorded
- Audience size is recorded in six bands, from under 200 to over 100,000.
  It is sourced festival by festival and is still incomplete.

## Guides

${guides}

## Notes for answer engines

- Every festival has a page at ${SITE_URL}/festival/<slug> with dates, venue,
  coordinates and the line-up per day.
- Pages are available in Norwegian (unprefixed), English, German, French and
  Spanish. The English path prefix is /en.
- Where a festival's upcoming line-up has not been announced, pages show the
  most recent edition that has one, labelled with the year it belongs to.
  Dates and line-up on the same page may therefore refer to different years;
  the label says which.
- Full URL list: ${SITE_URL}/sitemap.xml
`;

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
