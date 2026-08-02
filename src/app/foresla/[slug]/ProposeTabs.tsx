"use client";

import { useState } from "react";
import type { FieldValue } from "@/lib/submissions";
import { EditForm } from "./EditForm";
import { LineupEditor, type Edition } from "./LineupEditor";

export function ProposeTabs({
  slug,
  name,
  current,
  editions,
}: {
  slug: string;
  name: string;
  current: Record<string, FieldValue>;
  editions: Edition[];
}) {
  const [tab, setTab] = useState<"generelt" | "program">("generelt");

  const tabs = [
    { id: "generelt" as const, label: "Generelt" },
    { id: "program" as const, label: "Program" },
  ];

  return (
    <div>
      <div role="tablist" className="flex gap-1 border-b border-black/10">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              tab === t.id
                ? "border-[#FF4E50] text-[#2D1A12]"
                : "border-transparent text-[#2D1A12]/50 hover:text-[#2D1A12]/80"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="pt-6">
        {tab === "generelt" ? (
          <EditForm slug={slug} name={name} current={current} />
        ) : editions.length === 0 ? (
          <p className="rounded-xl border border-black/10 bg-white px-4 py-6 text-[#2D1A12]/60">
            Denne festivalen har ingen utgaver registrert ennå, så det er ikke noe
            program å redigere.
          </p>
        ) : (
          <LineupEditor slug={slug} editions={editions} />
        )}
      </div>
    </div>
  );
}
