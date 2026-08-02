const YEAR = new Date().getFullYear();

/**
 * Home page only, and not sticky -- it sits at the end of the content rather
 * than pinned to the viewport. The map page in particular is a full-height
 * canvas with nothing below it.
 */
export function SiteFooter() {
  return (
    // min-h-8, not h-8: exactly 32px whenever the line fits on one row, which
    // is every screen down to about tablet. On a phone the line has to wrap,
    // and a hard height would clip it rather than let it breathe.
    <footer className="flex min-h-8 items-center bg-[#3a322e] px-5 py-1 text-[10px] text-white/55">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center">
        <span>© {YEAR} Tunetrail. All rights reserved.</span>
        <span aria-hidden className="text-white/25">
          ·
        </span>
        <span>Made by Michelle Stefansen</span>
        <span aria-hidden className="text-white/25">
          ·
        </span>
        <span>
          Contact:{" "}
          <a
            href="mailto:michellestefansen@gmail.com"
            className="text-white/75 underline underline-offset-2 transition hover:text-white"
          >
            michellestefansen@gmail.com
          </a>
        </span>
      </div>
    </footer>
  );
}
