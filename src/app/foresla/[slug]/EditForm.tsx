"use client";

import { useState } from "react";
import { FESTIVAL_TAGS } from "@/lib/festivals";
import { EDITABLE_FIELDS, type FieldValue, type Payload } from "@/lib/submissions";
import { submitEdit } from "./actions";

type Current = Record<string, FieldValue>;

export function EditForm({
  slug,
  name,
  current,
}: {
  slug: string;
  name: string;
  current: Current;
}) {
  const [values, setValues] = useState<Current>(current);
  const [sourceUrl, setSourceUrl] = useState("");
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  function set(field: string, value: FieldValue) {
    setValues((v) => ({ ...v, [field]: value }));
  }

  function toggleTag(tag: string) {
    const list = Array.isArray(values.tags) ? values.tags : [];
    set("tags", list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError("");
    const res = await submitEdit(slug, values as Payload, sourceUrl, note);
    if (res.ok) {
      setState("sent");
    } else {
      setState("idle");
      setError(res.error);
    }
  }

  if (state === "sent") {
    return (
      <div className="space-y-3 rounded-2xl border border-black/10 bg-white p-6">
        <h2 className="text-xl font-bold text-[#2D1A12]">Takk — forslaget er sendt</h2>
        <p className="text-[#2D1A12]/70">
          Det blir lest gjennom før det havner på siden. Endringene dine vises altså
          ikke med én gang.
        </p>
        <a href={`/festival/${slug}`} className="inline-block text-[#FF4E50] underline">
          Tilbake til {name}
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
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

      <div className="space-y-1.5 border-t border-black/10 pt-6">
        <label htmlFor="kilde" className="block font-medium text-[#2D1A12]">
          Hvor har du dette fra?
        </label>
        <p className="text-sm text-[#2D1A12]/60">
          En lenke gjør det mye raskere å godkjenne forslaget ditt.
        </p>
        <input
          id="kilde"
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="https://…"
          className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-[#2D1A12] outline-none focus:border-black/30"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="merknad" className="block font-medium text-[#2D1A12]">
          Merknad <span className="font-normal text-[#2D1A12]/50">(valgfritt)</span>
        </label>
        <textarea
          id="merknad"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-[#2D1A12] outline-none focus:border-black/30"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={state === "sending"}
        className="rounded-full bg-gradient-to-r from-amber-500 to-[#FF4E50] px-6 py-3 font-medium text-white disabled:opacity-50"
      >
        {state === "sending" ? "Sender …" : "Send forslag"}
      </button>
    </form>
  );
}
