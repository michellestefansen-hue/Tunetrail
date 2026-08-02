import Script from "next/script";

const GA_ID = "G-WB9FQF0J2R";

/**
 * Google Analytics, loaded through next/script rather than raw <script> tags.
 *
 * `afterInteractive` keeps it off the critical path: the page renders and
 * becomes usable first, and the tag loads after. Dropping the snippet straight
 * into the markup would block the first paint on a third-party request.
 *
 * Production only. In development every reload is a page view, and local
 * traffic is indistinguishable from real visitors once it is in the reports.
 */
export function Analytics() {
  if (process.env.NODE_ENV !== "production") return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}
