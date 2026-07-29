import { useId } from "react";
import type { Locale } from "@/i18n/routing";

/**
 * Small circular flag icons, hand-drawn as SVG rather than relying on emoji
 * flag glyphs — rendering of those varies a lot across operating systems and
 * fonts, whereas these look the same everywhere and can be clipped to a
 * clean circle.
 */
export function Flag({ locale, className }: { locale: Locale; className?: string }) {
  const reactId = useId();
  const clipId = `flag-clip-${reactId}`;
  const common = { viewBox: "0 0 24 24", className, "aria-hidden": true } as const;
  const clip = (
    <clipPath id={clipId}>
      <circle cx="12" cy="12" r="12" />
    </clipPath>
  );

  switch (locale) {
    case "nb":
      return (
        <svg {...common}>
          {clip}
          <g clipPath={`url(#${clipId})`}>
            <rect width="24" height="24" fill="#EF2B2D" />
            <rect x="8" width="4" height="24" fill="#fff" />
            <rect y="8" width="24" height="4" fill="#fff" />
            <rect x="9" width="2" height="24" fill="#002868" />
            <rect y="9" width="24" height="2" fill="#002868" />
          </g>
        </svg>
      );
    case "en":
      return (
        <svg {...common}>
          {clip}
          <g clipPath={`url(#${clipId})`}>
            <rect width="24" height="24" fill="#00247D" />
            <path d="M0 0L24 24M24 0L0 24" stroke="#fff" strokeWidth="4.2" />
            <path d="M0 0L24 24M24 0L0 24" stroke="#CF142B" strokeWidth="1.6" />
            <rect x="10" width="4" height="24" fill="#fff" />
            <rect y="10" width="24" height="4" fill="#fff" />
            <rect x="11" width="2" height="24" fill="#CF142B" />
            <rect y="11" width="24" height="2" fill="#CF142B" />
          </g>
        </svg>
      );
    case "de":
      return (
        <svg {...common}>
          {clip}
          <g clipPath={`url(#${clipId})`}>
            <rect width="24" height="8" fill="#000" />
            <rect y="8" width="24" height="8" fill="#DD0000" />
            <rect y="16" width="24" height="8" fill="#FFCE00" />
          </g>
        </svg>
      );
    case "fr":
      return (
        <svg {...common}>
          {clip}
          <g clipPath={`url(#${clipId})`}>
            <rect width="8" height="24" fill="#0055A4" />
            <rect x="8" width="8" height="24" fill="#fff" />
            <rect x="16" width="8" height="24" fill="#EF4135" />
          </g>
        </svg>
      );
    case "es":
      return (
        <svg {...common}>
          {clip}
          <g clipPath={`url(#${clipId})`}>
            <rect width="24" height="24" fill="#AA151B" />
            <rect y="6" width="24" height="12" fill="#F1BF00" />
          </g>
        </svg>
      );
  }
}
