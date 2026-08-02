import { fontVariables } from "@/lib/fonts";
import "@/app/globals.css";

/**
 * The <html>/<body> wrapper for pages that sit outside the translated tree.
 *
 * The app's root layout only passes children through -- [locale]/layout.tsx is
 * what supplies <html> and <body> for the public site. Sign-in and moderation
 * live outside that tree, so they need their own shell or Next reports a
 * missing root layout.
 *
 * Always Norwegian: these pages are for contributors and for the moderator,
 * not part of the multilingual public site.
 */
export function BareShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nb" className={`${fontVariables} h-full antialiased`}>
      <body className="min-h-full bg-[#FFF9F0]">{children}</body>
    </html>
  );
}
