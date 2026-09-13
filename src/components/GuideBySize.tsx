import { TicketIcon } from "@heroicons/react/24/solid";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { guideLineup, type SizeGroup } from "@/lib/guideFestivals";
import { currentEdition, dateRangeLabel, type Festival } from "@/lib/festivals";

/**
 * A whole genre, grouped by how big the festivals are.
 *
 * Largest band first, because that is what a reader expects a "best festivals"
 * page to open with. The jump links above the sections carry the counts, so the
 * small end is one click away rather than a long scroll -- that end is the part
 * no competing list covers, and burying it would waste the only thing here that
 * is genuinely ours.
 */
export async function GuideBySize({
  groups,
  locale,
  year,
}: {
  groups: SizeGroup[];
  locale: Locale;
  year: number;
}) {
  const tg = await getTranslations({ locale, namespace: "Guides" });
  const ts = await getTranslations({ locale, namespace: "Sizes" });
  const tCountries = await getTranslations({ locale, namespace: "Countries" });

  const bandLabel = (band: SizeGroup["band"]) =>
    band === "unknown" ? tg("sizeUnknown") : ts(band);

  function row(f: Festival) {
    const edition = currentEdition(f);
    const lineup = guideLineup(f, 4);
    const dates = dateRangeLabel(f, locale, year);
    const place = [f.city, f.country ? tCountries(f.country) : null]
      .filter(Boolean)
      .join(", ");
    return (
      <li
        key={f.id}
        className="rounded-2xl bg-white p-3.5 shadow-[0_8px_30px_rgba(45,26,18,0.06)]"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 className="text-base">
            <Link
              href={{ pathname: "/festival/[slug]", params: { slug: f.slug } }}
              className="font-medium text-[#2D1A12] hover:text-[#FF2D78]"
            >
              {f.name}
            </Link>
          </h3>
          {edition?.ticket_url && (
            <a
              href={edition.ticket_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs font-semibold text-[#FF2D78] hover:underline"
            >
              <TicketIcon className="h-3 w-3" />
              {tg("ticketsLink")}
            </a>
          )}
        </div>

        <p className="mt-0.5 text-xs text-stone-500">
          {place}
          {dates ? ` · ${dates}` : ""}
        </p>

        {lineup.names.length > 0 && (
          <p className="mt-1.5 text-sm text-[#6B5E59]">
            <span className="font-medium text-[#2D1A12]">
              {lineup.isCurrent
                ? tg("headliners")
                : tg("headlinersFrom", { year: lineup.year ?? year })}
              :
            </span>{" "}
            {lineup.names.join(", ")}
            {lineup.count > lineup.names.length
              ? ` +${lineup.count - lineup.names.length}`
              : ""}
          </p>
        )}
      </li>
    );
  }

  return (
    <>
      <nav aria-label={tg("jumpTo")} className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          {tg("jumpTo")}
        </p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {groups.map((g) => (
            <li key={g.band}>
              <a
                href={`#storrelse-${g.band}`}
                className="inline-flex items-baseline gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs text-stone-700 shadow-sm hover:text-[#FF2D78]"
              >
                {bandLabel(g.band)}
                <span className="text-stone-400">{g.festivals.length}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {groups.map((group) =>
        /*
          The group we have no figure for is collapsed. It is currently larger
          than every sized band put together, and left open it buries the part
          of the page that answers "how big is this". It stays in the markup
          either way, so it is still indexed and still linkable -- this hides it
          from the eye, not from the page. It shrinks as figures get sourced,
          and disappears entirely once it is empty.
        */
        group.band === "unknown" ? (
          <section
            key={group.band}
            id={`storrelse-${group.band}`}
            className="mt-10 scroll-mt-4"
          >
            <details>
              <summary className="cursor-pointer">
                <span className="font-heading text-xl">{bandLabel(group.band)}</span>
                <span className="ml-2 text-xs text-stone-500">
                  {tg("festivalsInBand", { count: group.festivals.length })}
                </span>
              </summary>
              <p className="mt-2 text-sm text-[#6B5E59]">{tg("sizeUnknownNote")}</p>
              <ul className="mt-4 flex flex-col gap-2.5">{group.festivals.map(row)}</ul>
            </details>
          </section>
        ) : (
          <section
            key={group.band}
            id={`storrelse-${group.band}`}
            className="mt-10 scroll-mt-4"
          >
            <h2 className="text-xl">{bandLabel(group.band)}</h2>
            <p className="mt-1 text-xs text-stone-500">
              {tg("festivalsInBand", { count: group.festivals.length })}
            </p>
            <ul className="mt-4 flex flex-col gap-2.5">{group.festivals.map(row)}</ul>
          </section>
        ),
      )}
    </>
  );
}
