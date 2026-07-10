import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["nb", "en", "de", "fr", "es"],
  defaultLocale: "nb",
  localePrefix: "as-needed",
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
