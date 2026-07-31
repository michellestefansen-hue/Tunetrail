"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/solid";

const MAX_SUGGESTIONS = 8;

/**
 * A search input that only ever yields values present in `suggestions`.
 * Picking one turns it into a dismissable chip below the field; free text
 * cannot be committed, so a filter can never describe something the data
 * has no way of matching.
 */
export function ChipField({
  label,
  placeholder,
  emptyHint,
  removeLabel,
  suggestions,
  selected,
  onChange,
}: {
  label: string;
  placeholder: string;
  /** Shown when the typed text matches nothing — the "you can't add this" case. */
  emptyHint: string;
  /** aria-label for a chip's remove button, with a {value} placeholder. */
  removeLabel: (value: string) => string;
  suggestions: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const matches = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q) return [];
    const out: string[] = [];
    for (const s of suggestions) {
      if (selected.includes(s)) continue;
      if (s.toLowerCase().includes(q)) {
        out.push(s);
        if (out.length >= MAX_SUGGESTIONS) break;
      }
    }
    return out;
  }, [text, suggestions, selected]);

  useEffect(() => setHighlight(0), [text]);

  useEffect(() => {
    if (!focused) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setFocused(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [focused]);

  const add = (value: string) => {
    if (!suggestions.includes(value) || selected.includes(value)) return;
    onChange([...selected, value]);
    setText("");
  };

  const showDropdown = focused && text.trim().length > 0;

  return (
    <div ref={rootRef} className="relative">
      <span className="text-xs font-medium text-[#6B5E59]">{label}</span>

      <div className="mt-1.5 flex items-center gap-2 rounded-full border border-black/10 bg-white px-3.5 py-2.5">
        <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-[#FF2D78]" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listId}
          aria-autocomplete="list"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => Math.min(h + 1, matches.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter") {
              // Only ever commits an existing suggestion, never the raw text.
              e.preventDefault();
              if (matches[highlight]) add(matches[highlight]);
            } else if (e.key === "Backspace" && !text && selected.length > 0) {
              onChange(selected.slice(0, -1));
            }
          }}
          className="w-full bg-transparent text-sm text-[#2D1A12] placeholder:text-[#B5A9A2] focus:outline-none"
        />
      </div>

      {showDropdown && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-2xl border border-black/10 bg-white py-1 shadow-lg"
        >
          {matches.length === 0 ? (
            <li className="px-3.5 py-2 text-xs text-[#B5A9A2]">{emptyHint}</li>
          ) : (
            matches.map((s, i) => (
              <li key={s}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === highlight}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => add(s)}
                  onMouseEnter={() => setHighlight(i)}
                  className={`block w-full px-3.5 py-2 text-left text-sm text-[#2D1A12] ${
                    i === highlight ? "bg-[#FBEAF0]" : ""
                  }`}
                >
                  {s}
                </button>
              </li>
            ))
          )}
        </ul>
      )}

      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((value) => (
            <span
              key={value}
              className="flex items-center gap-1 rounded-full bg-[#FBEAF0] py-1 pl-3 pr-1.5 text-xs font-medium text-[#993556]"
            >
              {value}
              <button
                type="button"
                aria-label={removeLabel(value)}
                onClick={() => onChange(selected.filter((v) => v !== value))}
                className="flex h-4 w-4 items-center justify-center rounded-full text-[#993556] hover:bg-[#ED93B1]/40"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
