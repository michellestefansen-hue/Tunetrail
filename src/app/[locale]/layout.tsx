import type { Metadata } from "next";
import { Archivo_Black, Schibsted_Grotesk } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import "../globals.css";

const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
  weight: "400",
  subsets: ["latin"],
});

const schibstedGrotesk = Schibsted_Grotesk({
  variable: "--font-schibsted-grotesk",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tune-trail.org";

const OG_LOCALE: Record<Locale, string> = {
  nb: "nb_NO",
  en: "en_US",
  de: "de_DE",
  fr: "fr_FR",
  es: "es_ES",
};

const DESCRIPTION: Record<Locale, string> = {
  nb: "Utforsk musikkfestivaler i Europa",
  en: "Explore music festivals across Europe",
  de: "Entdecke Musikfestivals in ganz Europa",
  fr: "Découvrez des festivals de musique en Europe",
  es: "Descubre festivales de música por toda Europa",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const l = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;

  return {
    metadataBase: new URL(SITE_URL),
    title: "Tunetrail",
    description: DESCRIPTION[l],
    icons: { icon: "/logo.svg" },
    robots: { index: true, follow: true },
    openGraph: {
      siteName: "Tunetrail",
      locale: OG_LOCALE[l],
      type: "website",
      images: ["/logo.svg"],
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      className={`${archivoBlack.variable} ${schibstedGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
