"use client";

import { useTranslations } from "next-intl";
import { FESTIVAL_TAGS, SIZE_BANDS } from "@/lib/festivals";
import { EDITABLE_FIELDS, type FieldValue } from "@/lib/submissions";

export type Values = Record<string, FieldValue>;

/**
 * Controlled on purpose: the tab shell owns the values so switching to the
 * programme tab and back does not throw the edits away.
 */
export function GeneralFields({
  values,
  onChange,
}: {
  values: Values;
  onChange: (next: Values) => void;
}) {
  const t = useTranslations("Propose.fields");
  const tTags = useTranslations("Tags");
  const tSizes = useTranslations("Sizes");

  function set(field: string, value: FieldValue) {
    onChange({ ...values, [field]: value });
  }

  function toggleTag(tag: string) {
    const list = Array.isArray(values.tags) ? values.tags : [];
    set("tags", list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]);
  }

  return (
    <div className="space-y-6">
      {EDITABLE_FIELDS.map((field) => {
        const value = values[field.name];
        return (
          <div key={field.name} className="space-y-1.5">
            <label htmlFor={field.name} className="block font-medium text-[#2D1A12]">
              {t(`${field.name}.label`)}
            </label>
            <p className="text-sm text-[#2D1A12]/60">{t(`${field.name}.help`)}</p>

            {field.input === "tags" ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {FESTIVAL_TAGS.map((tag) => {
                  const on = Array.isArray(value) && value.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      aria-pressed={on}
                      className={`rounded-full border px-3 py-1.5 text-sm transition ${
                        on
                          ? "border-transparent bg-[#2D1A12] text-white"
                          : "border-black/15 bg-white text-[#2D1A12]/70"
                      }`}
                    >
                      {tTags(tag)}
                    </button>
                  );
                })}
              </div>
            ) : field.input === "size" ? (
              // A select rather than the filter's slider: here it is one value
              // being stated, not a range being narrowed. The empty option has
              // to stay reachable so a wrong guess can be taken back.
              <select
                id={field.name}
                value={(value as string) ?? ""}
                onChange={(e) => set(field.name, e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-[#2D1A12] outline-none focus:border-black/30"
              >
                <option value="">{t("size_band.unset")}</option>
                {SIZE_BANDS.map((band) => (
                  <option key={band} value={band}>
                    {tSizes(band)}
                  </option>
                ))}
              </select>
            ) : field.input === "textarea" ? (
              <textarea
                id={field.name}
                rows={4}
                value={(value as string) ?? ""}
                onChange={(e) => set(field.name, e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-[#2D1A12] outline-none focus:border-black/30"
              />
            ) : (
              <input
                id={field.name}
                type={field.input === "url" ? "url" : "text"}
                value={(value as string) ?? ""}
                onChange={(e) => set(field.name, e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-[#2D1A12] outline-none focus:border-black/30"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
