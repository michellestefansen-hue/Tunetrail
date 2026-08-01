import type { FestivalTag } from "@/lib/festivals";

/**
 * Editorial landing pages ("guider"). The festival order is curated by hand —
 * the database has no popularity/capacity data, so even now that festivals
 * carry real, human-assigned tags, a tag query alone still can't produce a
 * defensible ranking. Everything *inside* each entry (dates, line-up,
 * tickets, images) is read live from the database at build time, so the
 * pages stay current without the ranking drifting.
 */
export type GuideKey = "rock-metal" | "elektronisk" | "jazz" | "frankrike" | "norden";

export type Guide = {
  key: GuideKey;
  /** Curated, ranked slugs. Verified to exist and to carry a 2026 edition. */
  festivalSlugs: string[];
  /**
   * Seeds the map's place filter. Comma-separated for regions spanning
   * several countries. Each value must exist in the festival data, since the
   * map only accepts filters it can actually match.
   */
  mapQuery?: string;
  /** Seeds the map's tag filter — a festival matching ANY of these shows. */
  mapTags?: FestivalTag[];
};

export const GUIDE_KEYS: GuideKey[] = [
  "rock-metal",
  "elektronisk",
  "jazz",
  "frankrike",
  "norden",
];

export const GUIDES: Record<GuideKey, Guide> = {
  "rock-metal": {
    key: "rock-metal",
    mapTags: ["Rock", "Metal"],
    festivalSlugs: [
      "wacken-open-air",
      "hellfest",
      "download-festival",
      "graspop-metal-meeting",
      "copenhell",
      "nova-rock-festival",
      "bloodstock-open-air",
      "resurrection-fest",
      "summer-breeze-open-air",
      "alcatraz-metal-festival",
      "brutal-assault",
      "rock-am-ring",
      "sweden-rock-festival",
      "rock-for-people",
      "motocultor-festival",
      "vagos-metal-fest",
      "hills-of-rock",
    ],
  },
  elektronisk: {
    key: "elektronisk",
    mapTags: ["Elektronisk & Dans", "Techno & House"],
    festivalSlugs: [
      "tomorrowland",
      "defqon-1-festival",
      "dekmantel-festival",
      "parookaville",
      "awakenings-festival",
      "time-warp-germany",
      "creamfields",
      "kappa-futurfestival",
      "nature-one",
      "ultra-europe",
      "untold-festival",
      "sonar-barcelona",
      "dgtl-festival-amsterdam",
      "love-family-park",
      "junction-2-festival",
      "hive-festival",
      "neopop",
    ],
  },
  jazz: {
    key: "jazz",
    mapTags: ["Jazz", "Blues", "Soul & Funk"],
    festivalSlugs: [
      "montreux-jazz-festival",
      "north-sea-jazz",
      "umbria-jazz-festival",
      "jazz-in-marciac",
      "san-sebastian-jazz-festival",
      "jazz-a-vienne",
      "copenhagen-jazz-festival",
      "gent-jazz-festival",
      "efg-london-jazz-festival",
      "love-supreme-jazz-festival",
      "cully-jazz-festival",
      "molde-international-jazz-festival",
      "jazzfest-berlin",
      "cheltenham-jazz-festival",
      "pori-jazz",
      "ascona-jazz-festival",
      "jazz-middelheim",
      "jazzfestival-saalfelden",
      "nattjazz",
      "oslo-jazzfestival",
      "kongsberg-jazzfestival",
      "edinburgh-jazz-and-blues-festival",
      "istanbul-jazz-festival",
      "jazz-festival-ljubljana",
      "jazzkaar",
      "jazz-baltica",
      "glasgow-international-jazz-festival",
      "jazz-sous-les-pommiers",
      "casa-del-jazz-summer-festival",
      "jazz-a-liege",
      "pescara-jazz",
      // Not pure jazz festivals, but central to the current jazz audience —
      // both are programmed around the UK scene that Gilles Peterson's
      // generation of players came out of.
      "we-out-here-festival",
      "cross-the-tracks",
    ],
  },
  frankrike: {
    key: "frankrike",
    mapQuery: "Frankrike",
    festivalSlugs: [
      "hellfest",
      "vieilles-charrues-festival",
      "solidays",
      "we-love-green",
      "les-eurockeennes",
      "rock-en-seine",
      "main-square-festival",
      "musilac",
      "le-cabaret-vert",
      "garorock-festival",
      "festival-beauregard",
    ],
  },
  norden: {
    key: "norden",
    // The map filters on values the festival records actually hold, and no
    // record says "Scandinavia" — name the countries instead.
    mapQuery: "Norge,Sverige,Danmark,Finland,Island",
    festivalSlugs: [
      "roskilde-festival",
      "smukfest",
      "flow-festival",
      "copenhell",
      "oyafestivalen",
      "sweden-rock-festival",
      "provinssi",
      "ruisrock",
      "tinderbox-festival",
      "way-out-west",
      "northside-festival",
      "ilosaarirock",
    ],
  },
};

/** The internal route for a guide — a literal type the router accepts directly. */
export type GuidePath = `/guider/${GuideKey}`;

export function guidePath(key: GuideKey): GuidePath {
  return `/guider/${key}`;
}

/** Query for the map link that a guide's "explore on the map" CTA points at. */
export function guideMapQuery(guide: Guide): Record<string, string> {
  const query: Record<string, string> = {};
  if (guide.mapQuery) query.q = guide.mapQuery;
  if (guide.mapTags?.length) query.tags = guide.mapTags.join(",");
  return query;
}

/**
 * Guides worth linking to from a given festival page ("see also"), so the
 * guides collect internal links from the festival pages that feed them.
 */
export function guidesForFestival(slug: string): GuideKey[] {
  return GUIDE_KEYS.filter((key) => GUIDES[key].festivalSlugs.includes(slug));
}
