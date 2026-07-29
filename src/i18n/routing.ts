import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["nb", "en", "de", "fr", "es"],
  defaultLocale: "nb",
  localePrefix: "as-needed",
  localeDetection: false,
  // Localised URL segments, so the keywords sit in the URL in the reader's own
  // language. Norwegian stays unprefixed, which keeps already-indexed URLs and
  // canonicals byte-identical to what is already deployed.
  pathnames: {
    "/": "/",
    "/festival/[slug]": "/festival/[slug]",
    "/kart": {
      nb: "/kart",
      en: "/map",
      de: "/karte",
      fr: "/carte",
      es: "/mapa",
    },
    "/guider/rock-metal": {
      nb: "/guider/beste-rock-og-metalfestivaler-i-europa",
      en: "/guides/best-rock-and-metal-festivals-in-europe",
      de: "/guides/beste-rock-und-metal-festivals-in-europa",
      fr: "/guides/meilleurs-festivals-rock-et-metal-en-europe",
      es: "/guias/mejores-festivales-rock-y-metal-en-europa",
    },
    "/guider/elektronisk": {
      nb: "/guider/beste-techno-og-elektronikafestivaler-i-europa",
      en: "/guides/best-electronic-and-techno-festivals-in-europe",
      de: "/guides/beste-elektro-und-techno-festivals-in-europa",
      fr: "/guides/meilleurs-festivals-electro-et-techno-en-europe",
      es: "/guias/mejores-festivales-electronica-y-techno-en-europa",
    },
    "/guider/jazz": {
      nb: "/guider/beste-jazzfestivaler-i-europa",
      en: "/guides/best-jazz-festivals-in-europe",
      de: "/guides/beste-jazz-festivals-in-europa",
      fr: "/guides/meilleurs-festivals-de-jazz-en-europe",
      es: "/guias/mejores-festivales-de-jazz-en-europa",
    },
    "/guider/frankrike": {
      nb: "/guider/beste-festivaler-i-frankrike",
      en: "/guides/best-music-festivals-in-france",
      de: "/guides/beste-musikfestivals-in-frankreich",
      fr: "/guides/meilleurs-festivals-de-musique-en-france",
      es: "/guias/mejores-festivales-de-musica-en-francia",
    },
    "/guider/norden": {
      nb: "/guider/beste-festivaler-i-norden",
      en: "/guides/best-music-festivals-in-scandinavia",
      de: "/guides/beste-musikfestivals-in-skandinavien",
      fr: "/guides/meilleurs-festivals-en-scandinavie",
      es: "/guias/mejores-festivales-en-escandinavia",
    },
  },
});

export type Locale = (typeof routing.locales)[number];
export type AppPathname = keyof typeof routing.pathnames;
