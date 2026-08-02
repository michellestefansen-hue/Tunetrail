const YEAR = new Date().getFullYear();

/**
 * Deliberately left off the map page: that one is a full-viewport
 * `h-dvh overflow-hidden` canvas, and anything below it would force a
 * scrollbar onto a screen that is meant to have none.
 */
export function SiteFooter() {
  return (
    // min-h-8, not h-8: exactly 32px whenever the line fits on one row, which
    // is every screen down to about tablet. On a phone the line has to wrap,
    // and a hard height would clip it rather than let it breathe.
    <footer className="mt-auto flex min-h-8 items-center bg-[#1a1512] px-5 py-1 text-[10px] text-white/45">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center">
        <span>© {YEAR} Tunetrail. All rights reserved.</span>
        <span aria-hidden className="text-white/20">
          ·
        </span>
        <span>Made by Michelle Stefansen</span>
        <span aria-hidden className="text-white/20">
          ·
        </span>
        <span>
          Contact:{" "}
          <a
            href="mailto:michellestefansen@gmail.com"
            className="text-white/60 underline underline-offset-2 transition hover:text-white/90"
          >
            michellestefansen@gmail.com
          </a>
        </span>
      </div>
    </footer>
  );
}
