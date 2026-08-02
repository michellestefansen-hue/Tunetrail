"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { checkArtistName } from "@/lib/submissions";

/**
 * Type-ahead over the 12 000-odd names already used in a programme, with the
 * option to enter one that is not there yet.
 *
 * Searching first is the point: it is how "The Sonics", "the sonics" and
 * "THE SONICS" stop becoming three different acts.
 */
export function ArtistSearch({
  onPick,
  exclude,
}: {
  onPick: (name: string) => void;
  exclude: Set<string>;
}) {
  const t = useTranslations("Propose.artistSearch");
  const tName = useTranslations("Propose.artistName");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<{ name: string; uses: number }[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    let cancelled = false;
    // Debounced: a keystroke per request would be 12 000 rows of pointless work.
    const timer = setTimeout(async () => {
      const supabase = createClient();
      const key = term
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const { data } = await supabase
        .from("artist_names")
        .select("name, uses")
        .ilike("name_key", `%${key}%`)
        .order("uses", { ascending: false })
        .limit(8);
      if (!cancelled) setHits((data as { name: string; uses: number }[]) ?? []);
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q]);

  useEffect(() => {
    function away(e: MouseEvent) {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);

  function pick(name: string) {
    const { name: clean, errorCode } = checkArtistName(name);
    if (errorCode) {
      setError(tName(errorCode));
      return;
    }
    if (exclude.has(clean.toLowerCase())) {
      setError(t("alreadyOnDay"));
      return;
    }
    onPick(clean);
    setQ("");
    setHits([]);
    setError("");
    setOpen(false);
  }

  const typed = q.trim();
  // Derived, not stored: below two characters there is nothing to show, and
  // clearing state from inside the effect would cascade renders.
  const visible = typed.length < 2 ? [] : hits;
  const exact = visible.some((h) => h.name.toLowerCase() === typed.toLowerCase());

  return (
    <div ref={box} className="relative">
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setError("");
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (typed) pick(exact ? visible[0].name : typed);
          }
        }}
        placeholder={t("placeholder")}
        className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-[#2D1A12] outline-none focus:border-black/30"
      />

      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}

      {open && typed.length >= 2 && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-black/10 bg-white py-1 shadow-lg">
          {visible.map((h) => (
            <li key={h.name}>
              <button
                type="button"
                onClick={() => pick(h.name)}
                className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-black/[0.04]"
              >
                <span className="text-[#2D1A12]">{h.name}</span>
                <span className="shrink-0 text-xs text-[#2D1A12]/40">
                  {t("uses", { count: h.uses })}
                </span>
              </button>
            </li>
          ))}

          {!exact && (
            <li className={visible.length ? "border-t border-black/5" : ""}>
              <button
                type="button"
                onClick={() => pick(typed)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-black/[0.04]"
              >
                <span className="text-[#2D1A12]/50">{t("addNew")} </span>
                <span className="font-medium text-[#2D1A12]">{typed}</span>
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
