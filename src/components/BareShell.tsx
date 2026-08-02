import { fontVariables } from "@/lib/fonts";
import "@/app/globals.css";

/**
 * The <html>/<body> wrapper for pages that sit outside the translated tree.
 *
 * The app's root layout only passes children through -- [locale]/layout.tsx is
 * what supplies <html> and <body> for the public site. Sign-in, proposing an
 * edit, and moderation live outside that tree, so they need their own shell
 * or Next reports a missing root layout.
 *
 * `lang` defaults to Norwegian, which is correct for /admin: that area is for
 * the site's one moderator, not part of the multilingual public site. Pages a
 * visitor reaches directly -- signing in, proposing an edit -- pass their
 * resolved locale instead.
 */
export function BareShell({
  children,
  lang = "nb",
}: {
  children: React.ReactNode;
  lang?: string;
}) {
  return (
    <html lang={lang} className={`${fontVariables} h-full antialiased`}>
      <body className="min-h-full bg-[#FFF9F0]">{children}</body>
    </html>
  );
}
