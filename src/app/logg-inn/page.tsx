import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { BareShell } from "@/components/BareShell";
import { localeFromNeste } from "@/lib/locale-from-path";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ neste?: string }>;
}): Promise<Metadata> {
  const { neste } = await searchParams;
  const locale = localeFromNeste(neste);
  const t = await getTranslations({ locale, namespace: "Login" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ neste?: string }>;
}) {
  const { neste } = await searchParams;
  // /admin's own redirect has no locale to read -- it's Norwegian-only by
  // design, and localeFromNeste falls back to Norwegian for exactly that case.
  const locale = localeFromNeste(neste);
  setRequestLocale(locale);

  return (
    <BareShell lang={locale}>
      <main className="mx-auto flex min-h-dvh max-w-md items-center px-6">
        <div className="w-full">
          <NextIntlClientProvider>
            <LoginForm neste={neste ?? "/"} />
          </NextIntlClientProvider>
        </div>
      </main>
    </BareShell>
  );
}
