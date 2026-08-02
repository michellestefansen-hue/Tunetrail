"use client";

import { FESTIVAL_TAGS } from "@/lib/festivals";
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
              {field.label}
            </label>
            <p className="text-sm text-[#2D1A12]/60">{field.help}</p>

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
                      {tag}
                    </button>
                  );
                })}
              </div>
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
