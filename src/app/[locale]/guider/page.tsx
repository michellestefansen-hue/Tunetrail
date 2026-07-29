import { hasLocale } from "next-intl";
import { permanentRedirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/**
 * The guides hub now lives at "/" (see src/app/[locale]/page.tsx). This route
 * is kept only so the URL we briefly had indexed/shared doesn't 404.
 */
export default async function GuidesHubRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = hasLocale(routing.locales, rawLocale) ? rawLocale : routing.defaultLocale;
  permanentRedirect({ href: "/", locale });
}
