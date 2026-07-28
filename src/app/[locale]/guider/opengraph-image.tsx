import { ImageResponse } from "next/og";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { GUIDE_KEYS } from "@/lib/guides";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = hasLocale(routing.locales, rawLocale) ? rawLocale : routing.defaultLocale;
  const tg = await getTranslations({ locale, namespace: "Guides" });
  const year = new Date().getFullYear();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#FFF9F0",
          padding: 72,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              background: "linear-gradient(135deg, #FFB347, #FF2D78)",
            }}
          />
          <div style={{ fontSize: 34, fontWeight: 700, color: "#2D1A12" }}>
            Tunetrail
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 74,
            fontWeight: 700,
            lineHeight: 1.05,
            color: "#2D1A12",
            letterSpacing: -1.5,
          }}
        >
          {tg("hubTitle", { year })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              fontWeight: 600,
              color: "#FFFFFF",
              backgroundColor: "#FF4E50",
              padding: "12px 26px",
              borderRadius: 999,
            }}
          >
            {tg("guideCount", { count: GUIDE_KEYS.length })}
          </div>
          <div style={{ display: "flex", fontSize: 26, color: "#6B5E59" }}>
            tune-trail.org
          </div>
        </div>
      </div>
    ),
    size,
  );
}
