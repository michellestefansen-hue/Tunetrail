/**
 * Finding the festival someone is about to add for the second time.
 *
 * This is the whole reason new festivals are riskier than edits. Five
 * duplicates were found in the database on 2 August 2026, and four of them
 * came from matching that required names to be identical -- "Pstereo" slid
 * straight past the stored "Pstereo Festival". So the comparison strips
 * everything that varies between two people naming the same event.
 */

const NOISE = new Set([
  "festival",
  "festivalen",
  "fest",
  "open",
  "air",
  "openair",
  "music",
  "musikk",
  "musik",
  "the",
  "de",
  "det",
  "la",
  "le",
  "el",
  "los",
  "les",
  "international",
  "internasjonal",
]);

/**
 * Letters NFD leaves alone. Decomposition only strips combining marks, so
 * "\u00e9" folds to "e" but "\u00f8" survives and would never match a typed "o" --
 * which matters rather a lot in a Norwegian app.
 */
const LETTERS: Record<string, string> = {
  \u00f8: "o",
  \u00e6: "ae",
  \u00e5: "a",
  \u00f0: "d",
  \u00fe: "th",
  \u00df: "ss",
  \u0142: "l",
  \u0111: "d",
};

/** Lowercase, accent-free, noise words gone, sorted -- word order varies too. */
export function nameKey(raw: string, extraNoise: string[] = []): string {
  const drop = new Set([...NOISE, ...extraNoise.map((w) => w.toLowerCase())]);
  const words = raw
    .toLowerCase()
    .replace(/[\u00f8\u00e6\u00e5\u00f0\u00fe\u00df\u0142\u0111]/g, (c) => LETTERS[c] ?? c)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter((w) => w && !drop.has(w));
  // Fall back to the raw words when a name is nothing but noise ("The Festival").
  return (words.length ? words : raw.toLowerCase().split(/\s+/)).sort().join(" ");
}

/** Great-circle distance in km. */
export function distanceKm(
  a: [number, number] | null,
  b: [number, number] | null,
): number {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  const [lat1, lon1] = a;
  const [lat2, lon2] = b;
  const r = (d: number) => (d * Math.PI) / 180;
  const dLat = r(lat2 - lat1);
  const dLon = r(lon2 - lon1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export type Candidate = {
  slug: string;
  name: string;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type Match = Candidate & { reason: "name" | "nearby" };

/** Tokens shared by two names, once noise words are gone. */
function tokens(key: string): string[] {
  return key.split(" ").filter(Boolean);
}

/**
 * Two ways of being the same festival: it reads like the same name, or it is
 * a stone's throw away in the same country. The second catches a rename or a
 * translation the first would miss.
 *
 * Matches are ranked, not filtered: a false positive costs the contributor a
 * glance, a false negative costs the database a duplicate. Exact name matches
 * come first so the likely one is at the top.
 */
export function findDuplicates(
  input: { name: string; city?: string | null; country: string | null; coords: [number, number] | null },
  all: Candidate[],
): Match[] {
  // A place name inside a festival name is location, not identity. Without
  // this, "Cheltenham Jazz Festival" matches "Cheltenham Music Festival" --
  // two genuinely different festivals that happen to share a town.
  const places = [input.city, ...all.map((c) => c.city)].filter(Boolean) as string[];
  const placeWords = new Set(
    places.flatMap((p) => nameKey(p).split(" ")).filter((w) => w.length > 2),
  );

  const key = nameKey(input.name);
  const keyDistinct = tokens(nameKey(input.name, [...placeWords]));
  if (key.length < 3) return [];

  const exact: Match[] = [];
  const loose: Match[] = [];

  for (const c of all) {
    const ck = nameKey(c.name);
    const cDistinct = tokens(nameKey(c.name, [...placeWords]));

    if (ck === key) {
      exact.push({ ...c, reason: "name" });
      continue;
    }

    // Subset match, but only on what is left once the town name is removed --
    // and only when something distinctive actually remains on both sides.
    const shorter = keyDistinct.length <= cDistinct.length ? keyDistinct : cDistinct;
    const longer = shorter === keyDistinct ? cDistinct : keyDistinct;
    if (
      shorter.length > 0 &&
      longer.length > 0 &&
      shorter.every((w) => longer.includes(w))
    ) {
      loose.push({ ...c, reason: "name" });
      continue;
    }

    if (
      input.country &&
      c.country === input.country &&
      c.latitude != null &&
      distanceKm(input.coords, [c.latitude, c.longitude ?? 0]) < 10
    ) {
      loose.push({ ...c, reason: "nearby" });
    }
  }

  return [...exact, ...loose].slice(0, 5);
}
