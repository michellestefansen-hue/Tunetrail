"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import {
  buildDiff,
  diffProgram,
  opsCount,
  type FieldValue,
  type ProgramDay,
  type ProgramOps,
} from "@/lib/submissions";
import { submitAll, type SubmitError } from "./actions";
import { GeneralFields, type Values } from "./GeneralFields";
import { LineupFields, type Edition } from "@/components/LineupFields";

type EditionDates = { from: string; to: string };

/** Every calendar day an edition runs, so an empty day can still be filled. */
function daysInRange(from: string, to: string): string[] {
  const out: string[] = [];
  const d = new Date(from + "T12:00:00");
  const end = new Date(to + "T12:00:00");
  while (d <= end && out.length < 60) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export function ProposeTabs({
  slug,
  name,
  current,
  editions,
  bcp47,
}: {
  slug: string;
  name: string;
  current: Record<string, FieldValue>;
  editions: Edition[];
  bcp47: string;
}) {
  const t = useTranslations("Propose");
  const tFields = useTranslations("Propose.fields");
  const [tab, setTab] = useState<"generelt" | "program">("generelt");

  // Everything lives here, not in the tabs. Rendering one tab unmounts the
  // other, so state held inside them would be thrown away on every switch --
  // which is exactly what happened before.
  const [values, setValues] = useState<Values>(current);
  const [year, setYear] = useState(editions[0]?.year ?? 0);
  const [byYear, setByYear] = useState<Record<number, ProgramDay[]>>(() =>
    Object.fromEntries(
      editions.map((e) => [e.year, e.days.map((d) => ({ ...d, artists: [...d.artists] }))]),
    ),
  );
  const [ticketByYear, setTicketByYear] = useState<Record<number, string>>(() =>
    Object.fromEntries(editions.map((e) => [e.year, e.ticket_url ?? ""])),
  );

  // Years the contributor added in this sitting. They do not exist in the
  // database yet, so they live here until the submission is approved.
  const [addedYears, setAddedYears] = useState<number[]>([]);
  const [datesByYear, setDatesByYear] = useState<Record<number, EditionDates>>(() =>
    Object.fromEntries(editions.map((e) => [e.year, { from: e.date_from, to: e.date_to }])),
  );
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  const [sentParts, setSentParts] = useState({ fields: false, program: false });

  // The edition as the database has it. Absent for a year being added, which is
  // what makes every artist in it an addition and the dates a creation.
  const stored = editions.find((e) => e.year === year);
  const isNewYear = year > 0 && !stored;
  const dates = datesByYear[year] ?? { from: "", to: "" };

  // What the year tabs offer: the stored editions plus whatever is being added.
  const allEditions: Edition[] = useMemo(() => {
    const local = addedYears.map((y) => ({
      year: y,
      date_from: datesByYear[y]?.from ?? "",
      date_to: datesByYear[y]?.to ?? "",
      ticket_url: null,
      days: [],
    }));
    return [...editions, ...local].sort((a, b) => a.year - b.year);
  }, [editions, addedYears, datesByYear]);

  const days = useMemo(() => byYear[year] ?? [], [byYear, year]);
  const ticketUrl = ticketByYear[year] ?? "";
  const ticketChanged = ticketUrl.trim() !== (stored?.ticket_url ?? "").trim();
  const datesChanged = isNewYear
    ? Boolean(dates.from && dates.to)
    : Boolean(stored) && (dates.from !== stored!.date_from || dates.to !== stored!.date_to);

  const ops = useMemo(() => {
    // Rides along with the programme rather than getting its own submission
    // kind: ticket_url and the dates both live on festival_editions, the same
    // row the days do.
    const next: ProgramOps = diffProgram(stored?.days ?? [], days);
    if (ticketChanged) {
      next.ticket_url = { value: ticketUrl.trim() || null, base: stored?.ticket_url ?? null };
    }
    if (datesChanged) {
      next.dates = {
        from: dates.from,
        to: dates.to,
        base: stored ? { from: stored.date_from, to: stored.date_to } : null,
      };
    }
    return next;
  }, [stored, days, ticketChanged, ticketUrl, datesChanged, dates.from, dates.to]);

  /**
   * Dates and days have to move together. Stretch the range and the new day
   * should be there to fill; shorten it and the day beyond the end has to go,
   * or its artists end up on a date the festival no longer runs.
   *
   * Artists already placed on a date that survives are kept, so correcting a
   * typo in the end date doesn't cost the contributor their work.
   */
  function changeDates(next: EditionDates) {
    setDatesByYear((prev) => ({ ...prev, [year]: next }));
    if (!next.from || !next.to || next.to < next.from) return;
    setByYear((prev) => {
      const keep = new Map((prev[year] ?? []).map((d) => [d.date, d.artists]));
      return {
        ...prev,
        [year]: daysInRange(next.from, next.to).map((date) => ({
          date,
          artists: keep.get(date) ?? [],
        })),
      };
    });
  }

  function addYear(y: number) {
    setAddedYears((prev) => (prev.includes(y) ? prev : [...prev, y]));
    setDatesByYear((prev) => ({ ...prev, [y]: prev[y] ?? { from: "", to: "" } }));
    setByYear((prev) => ({ ...prev, [y]: prev[y] ?? [] }));
    setYear(y);
  }

  // The first year with no edition on record, which is nearly always the one
  // being added -- next year's dates get announced right after this year ends.
  const nextMissingYear = useMemo(() => {
    const taken = new Set(allEditions.map((e) => e.year));
    let y = new Date().getFullYear();
    while (taken.has(y)) y++;
    return y;
  }, [allEditions]);

  const fieldDiff = useMemo(
    () => buildDiff(current as Record<string, unknown>, values).payload,
    [current, values],
  );

  const changedFields = Object.keys(fieldDiff).length;
  const changedOps = opsCount(ops) + (ticketChanged ? 1 : 0) + (datesChanged ? 1 : 0);
  const total = changedFields + changedOps;

  function describeError(e: SubmitError): string {
    switch (e.code) {
      case "dateOutOfRange":
        return t("errors.dateOutOfRange", { date: e.date });
      case "nameError":
        return t("errors.nameError", { name: e.name, reason: t(`artistName.${e.reason}`) });
      case "badTicketUrl":
        return t("errors.badTicketUrl");
      case "unknown":
        return e.message;
      default:
        return t(`errors.${e.code}`);
    }
  }

  async function submit() {
    setState("sending");
    setError("");
    const res = await submitAll(slug, values, year > 0 ? year : null, ops, note);
    if (res.ok) {
      setSentParts(res.parts);
      setState("sent");
    } else {
      setState("idle");
      setError(describeError(res.error));
    }
  }

  // Tabs disappear once it is sent: there is nothing left to edit, and leaving
  // them would invite a second identical submission.
  if (state === "sent") {
    const sentKey =
      sentParts.fields && sentParts.program
        ? "sentBodyBoth"
        : sentParts.program
          ? "sentBodyProgram"
          : "sentBodyFields";
    return (
      <div className="space-y-3 rounded-2xl border border-black/10 bg-white p-6">
        <h2 className="text-xl font-bold text-[#2D1A12]">{t("sentHeading")}</h2>
        <p className="text-[#2D1A12]/70">{t(sentKey, { year })}</p>
        <a href={`/festival/${slug}`} className="inline-block text-[#FF4E50] underline">
          {t("backToFestival", { name })}
        </a>
      </div>
    );
  }

  const tabs = [
    { id: "generelt" as const, label: t("tabGeneral"), n: changedFields },
    { id: "program" as const, label: t("tabProgram"), n: changedOps },
  ];

  return (
    <div>
      <div role="tablist" className="flex gap-1 border-b border-black/10">
        {tabs.map((tabDef) => (
          <button
            key={tabDef.id}
            role="tab"
            aria-selected={tab === tabDef.id}
            onClick={() => setTab(tabDef.id)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              tab === tabDef.id
                ? "border-[#FF4E50] text-[#2D1A12]"
                : "border-transparent text-[#2D1A12]/50 hover:text-[#2D1A12]/80"
            }`}
          >
            {tabDef.label}
            {/* A count on the tab you are not looking at is the only sign that
                unsent work is waiting over there. */}
            {tabDef.n > 0 && (
              <span className="rounded-full bg-[#FF4E50] px-1.5 py-0.5 text-xs text-white">
                {tabDef.n}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="pt-6">
        {tab === "generelt" ? (
          <GeneralFields values={values} onChange={setValues} />
        ) : (
          <div className="space-y-6">
            {/* No longer a dead end when the festival has no editions at all:
                adding the first year is exactly what is needed then. */}
            {allEditions.length === 0 && (
              <p className="rounded-xl border border-black/10 bg-white px-4 py-4 text-[#2D1A12]/60">
                {t("noEditions")}
              </p>
            )}

            <button
              type="button"
              onClick={() => addYear(nextMissingYear)}
              disabled={addedYears.includes(nextMissingYear)}
              className="rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-medium text-[#2D1A12] transition hover:border-black/30 disabled:opacity-40"
            >
              {t("addYear", { year: nextMissingYear })}
            </button>

            {year > 0 && (
              <div className="space-y-1.5">
                <label className="block font-medium text-[#2D1A12]">
                  {t("datesLabel", { year })}
                </label>
                <p className="text-sm text-[#2D1A12]/60">
                  {isNewYear ? t("datesHelpNew") : t("datesHelp")}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    aria-label={t("dateFrom")}
                    value={dates.from}
                    onChange={(e) => changeDates({ ...dates, from: e.target.value })}
                    className="rounded-xl border border-black/10 bg-white px-3 py-2 text-[#2D1A12] outline-none focus:border-black/30"
                  />
                  <span className="text-[#2D1A12]/40">–</span>
                  <input
                    type="date"
                    aria-label={t("dateTo")}
                    value={dates.to}
                    onChange={(e) => changeDates({ ...dates, to: e.target.value })}
                    className="rounded-xl border border-black/10 bg-white px-3 py-2 text-[#2D1A12] outline-none focus:border-black/30"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="billettlenke" className="block font-medium text-[#2D1A12]">
                {t("ticketLabel")}
              </label>
              <p className="text-sm text-[#2D1A12]/60">{t("ticketHelp")}</p>
              <input
                id="billettlenke"
                type="url"
                placeholder="https://…"
                value={ticketUrl}
                onChange={(e) =>
                  setTicketByYear((prev) => ({ ...prev, [year]: e.target.value }))
                }
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-[#2D1A12] outline-none focus:border-black/30"
              />
            </div>

            {days.length > 0 ? (
              <LineupFields
                editions={allEditions}
                year={year}
                onYear={setYear}
                days={days}
                onDays={(next) => setByYear((prev) => ({ ...prev, [year]: next }))}
                bcp47={bcp47}
              />
            ) : (
              // A new year has no days to fill until it has dates. Saying so
              // beats rendering an empty line-up editor that looks broken.
              isNewYear && (
                <p className="text-sm text-[#2D1A12]/50">{t("datesFirst")}</p>
              )
            )}
          </div>
        )}
      </div>

      <div className="mt-8 space-y-6 border-t border-black/10 pt-6">
        {total > 0 && (
          <div className="rounded-xl border border-black/10 bg-white p-4">
            <h3 className="font-medium text-[#2D1A12]">{t("summaryHeading")}</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {changedFields > 0 && (
                <li className="text-[#2D1A12]/70">
                  {t("summaryDetails", {
                    fields: Object.keys(fieldDiff)
                      .map((f) => tFields(`${f}.label`))
                      .join(", "),
                  })}
                </li>
              )}
              {ops.add.length > 0 && (
                <li className="text-emerald-800">
                  {t("summaryAdded", { count: ops.add.length, names: ops.add.map((o) => o.name).join(", ") })}
                </li>
              )}
              {ops.remove.length > 0 && (
                <li className="text-red-800">
                  {t("summaryRemoved", { count: ops.remove.length, names: ops.remove.map((o) => o.name).join(", ") })}
                </li>
              )}
              {ops.move.length > 0 && (
                <li className="text-[#2D1A12]/70">
                  {t("summaryMoved", { count: ops.move.length, names: ops.move.map((o) => o.name).join(", ") })}
                </li>
              )}
              {ticketChanged && (
                <li className="text-[#2D1A12]/70">
                  {t("summaryTicket", { url: ticketUrl.trim() || "–" })}
                </li>
              )}
            </ul>
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="kommentar" className="block font-medium text-[#2D1A12]">
            {t("commentLabel")} <span className="font-normal text-[#2D1A12]/50">{t("commentOptional")}</span>
          </label>
          <p className="text-sm text-[#2D1A12]/60">{t("commentHelp")}</p>
          <textarea
            id="kommentar"
            rows={3}
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
          type="button"
          onClick={submit}
          disabled={state === "sending" || total === 0}
          className="rounded-full bg-gradient-to-r from-amber-500 to-[#FF4E50] px-6 py-3 font-medium text-white disabled:opacity-40"
        >
          {state === "sending" ? t("submitSending") : total === 0 ? t("submitNone") : t("submitCount", { count: total })}
        </button>
      </div>
    </div>
  );
}
