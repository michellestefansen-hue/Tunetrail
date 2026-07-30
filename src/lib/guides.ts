import type { FestivalCategory } from "@/lib/festivals";

/**
 * Editorial landing pages ("guider"). The festival order is curated by hand —
 * the database has no popularity/capacity data, and `festivals.category` is
 * keyword-derived and unreliable (Copenhell and Brutal Assault land in the
 * catch-all, Sziget is mislabelled Metal), so a category query can't produce a
 * defensible ranking. Everything *inside* each entry (dates, line-up, tickets,
 * images) is read live from the database at build time, so the pages stay
 * current without the ranking drifting.
 */
export type GuideKey = "rock-metal" | "elektronisk" | "jazz" | "frankrike" | "norden";

export type Guide = {
  key: GuideKey;
  /** Curated, ranked slugs. Verified to exist and to carry a 2026 edition. */
  festivalSlugs: string[];
  /** Seeds the map's search box — geocoded, so the map also flies there. */
  mapQuery?: string;
  /** Seeds the map's category filter. */
  mapCategory?: FestivalCategory;
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
    mapCategory: "Metal",
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
    mapCategory: "Elektronisk & Dans",
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
    mapCategory: "Jazz & Soul",
    festivalSlugs: [
      "montreux-jazz-festival",
      "north-sea-jazz",
      "umbria-jazz-festival",
      "gent-jazz-festival",
      "cully-jazz-festival",
      "san-sebastian-jazz-festival",
      "pori-jazz",
      "ascona-jazz-festival",
      "jazz-a-liege",
      "pescara-jazz",
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
    mapQuery: "Scandinavia",
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
  if (guide.mapCategory) query.category = guide.mapCategory;
  return query;
}

/**
 * Guides worth linking to from a given festival page ("see also"), so the
 * guides collect internal links from the festival pages that feed them.
 */
export function guidesForFestival(slug: string): GuideKey[] {
  return GUIDE_KEYS.filter((key) => GUIDES[key].festivalSlugs.includes(slug));
}
