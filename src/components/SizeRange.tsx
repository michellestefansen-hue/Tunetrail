"use client";

import { Slider } from "radix-ui";
import { useLocale, useTranslations } from "next-intl";
import { BCP47_LOCALE, SIZE_BANDS, SIZE_EDGES } from "@/lib/festivals";

/**
 * Audience size as a two-handled range over the six bands.
 *
 * Six checkboxes would say the same thing and take five times the room, and
 * they would also hide the shape of the thing: size is a scale, so the useful
 * selections are ranges. "Only the small ones", "everything but the giants",
 * "mid-size and up" are each one drag here.
 */
export function SizeRange({
  min,
  max,
  hiddenUnknown,
  onChange,
}: {
  min: number;
  max: number;
  /**
   * How many festivals the other filters would have shown, but this one drops
   * because nobody has recorded their size. Said out loud rather than left for
   * the visitor to notice: a narrowed range excludes them silently, and a
   * control whose result quietly disagrees with it reads as broken.
   */
  hiddenUnknown: number;
  onChange: (min: number, max: number) => void;
}) {
  const t = useTranslations("Filters");
  const locale = useLocale();
  const last = SIZE_BANDS.length - 1;

  const format = (n: number) =>
    new Intl.NumberFormat(BCP47_LOCALE[locale] ?? BCP47_LOCALE.nb).format(n);

  // Phrased from the outer edges of the chosen bands, not by joining their
  // labels: "2 000 – 50 000" instead of "2 000–10 000 to 10 000–50 000".
  const lower = SIZE_EDGES[min];
  const upper = SIZE_EDGES[max + 1];
  const summary =
    min === 0 && max === last
      ? t("sizeAll")
      : min === 0
        ? t("sizeUnder", { n: format(upper) })
        : upper === Infinity
          ? t("sizeOver", { n: format(lower) })
          : t("sizeBetween", { from: format(lower), to: format(upper) });

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-medium text-[#2D1A12]">{t("size")}</span>
        <span className="text-sm text-[#2D1A12]/60">{summary}</span>
      </div>

      <Slider.Root
        // step={1} over six positions: the handles snap to bands, so the
        // control can never express a boundary the data has no name for.
        min={0}
        max={last}
        step={1}
        value={[min, max]}
        onValueChange={([a, b]) => onChange(Math.min(a, b), Math.max(a, b))}
        minStepsBetweenThumbs={0}
        aria-label={t("size")}
        className="relative flex h-6 w-full touch-none select-none items-center"
      >
        <Slider.Track className="relative h-1.5 w-full grow rounded-full bg-black/10">
          <Slider.Range className="absolute h-full rounded-full bg-gradient-to-r from-[#FFB347] to-[#FF4E50]" />
        </Slider.Track>
        {/* Two thumbs, each separately labelled: dragging with a screen reader
            or the arrow keys has to say which end is moving. */}
        <Slider.Thumb
          aria-label={t("sizeFrom")}
          className="block h-5 w-5 rounded-full border-2 border-white bg-[#2D1A12] shadow-md outline-none focus-visible:ring-2 focus-visible:ring-[#FF4E50]"
        />
        <Slider.Thumb
          aria-label={t("sizeTo")}
          className="block h-5 w-5 rounded-full border-2 border-white bg-[#2D1A12] shadow-md outline-none focus-visible:ring-2 focus-visible:ring-[#FF4E50]"
        />
      </Slider.Root>

      {/* The two extremes, so the scale reads as attendance and not as an
          abstract 1-to-6. The bands in between are named by the summary as the
          handles move. */}
      <div className="flex justify-between text-xs text-[#2D1A12]/40">
        <span>{format(SIZE_EDGES[1])}</span>
        <span>{t("sizeMaxEdge", { n: format(SIZE_EDGES[last]) })}</span>
      </div>

      {/* Shows itself only when it applies, and shrinks away for good as the
          field gets filled in -- which a permanent toggle never would. */}
      {hiddenUnknown > 0 && (
        <p className="text-xs leading-relaxed text-[#2D1A12]/50">
          {t("sizeHiddenUnknown", { count: hiddenUnknown })}
        </p>
      )}
    </div>
  );
}
