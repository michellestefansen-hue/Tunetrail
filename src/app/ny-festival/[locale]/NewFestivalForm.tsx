"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LineupFields } from "@/components/LineupFields";
import { LocationPicker } from "@/components/LocationPicker";
import { FESTIVAL_TAGS } from "@/lib/festivals";
import type { ProgramDay } from "@/lib/submissions";
import type { Match } from "@/lib/duplicates";
import { checkDuplicates, submitNewFestival, type NewError } from "./actions";

const EMPTY = {
  name: "",
  country: "",
  city: "",
  venue_name: "",
  website_url: "",
  ticket_url: "",
  description: "",
  image_url: "",
  tags: [] as string[],
  latitude: null as number | null,
  longitude: null as number | null,
  date_from: "",
  date_to: "",
};

function Field({
  label,
  help,
  required,
  children,
}: {
  label: string;
  help?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block font-medium text-[#2D1A12]">
        {label}
        {required && <span className="ml-0.5 text-[#FF4E50]">*</span>}
      </label>
      {help && <p className="text-sm text-[#2D1A12]/60">{help}</p>}
      {children}
    </div>
  );
}

const input =
  "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-[#2D1A12] outline-none focus:border-black/30";

/** Every calendar day the festival runs, so an empty day can still be filled. */
function daysBetween(from: string, to: string): string[] {
  if (!from || !to || to < from) return [];
  const out: string[] = [];
  const d = new Date(from + "T12:00:00");
  const end = new Date(to + "T12:00:00");
  while (d <= end && out.length < 60) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export function NewFestivalForm({
  countries,
  mapHref,
  bcp47,
}: {
  countries: string[];
  /** Resolved on the server: the map sits at a translated path. */
  mapHref: string;
  bcp47: string;
}) {
  const t = useTranslations("NewFestival");
  const tTags = useTranslations("Tags");
  const tCountries = useTranslations("Countries");

  const [step, setStep] = useState<1 | 2>(1);
  const [f, setF] = useState(EMPTY);
  // Artists are stored per date, and the day list is derived from the dates.
  // Keeping the list in state instead would need an effect to resync it every
  // time the range changes -- and cascading renders for no gain.
  const [artistsByDate, setArtistsByDate] = useState<Record<string, string[]>>({});
  const [dupes, setDupes] = useState<Match[]>([]);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  function set<K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  // Checked while typing, not on submit -- a warning that arrives after the
  // work is done is a warning nobody acts on.
  useEffect(() => {
    const name = f.name.trim();
    if (name.length < 3 || !f.country) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const coords: [number, number] | null =
        f.latitude != null && f.longitude != null ? [f.latitude, f.longitude] : null;
      const hits = await checkDuplicates(name, f.city, f.country, coords);
      if (!cancelled) setDupes(hits);
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [f.name, f.city, f.country, f.latitude, f.longitude]);

  const visibleDupes = f.name.trim().length < 3 || !f.country ? [] : dupes;

  // Narrowing the range simply stops rendering the days that fall outside it.
  // Anything placed there is no longer submitted, which is the honest outcome:
  // those days are not part of the festival any more.
  const days: ProgramDay[] = useMemo(
    () =>
      daysBetween(f.date_from, f.date_to).map((date) => ({
        date,
        artists: artistsByDate[date] ?? [],
      })),
    [f.date_from, f.date_to, artistsByDate],
  );

  const setDays = useCallback((next: ProgramDay[]) => {
    setArtistsByDate((prev) => ({
      ...prev,
      ...Object.fromEntries(next.map((d) => [d.date, d.artists])),
    }));
  }, []);

  const artistCount = days.reduce((n, d) => n + d.artists.length, 0);

  function describe(e: NewError): string {
    switch (e.code) {
      case "missing":
        return t("errMissing", { field: e.field });
      case "badDates":
        return t("errBadDates");
      case "tooManyPending":
        return t("errTooManyPending");
      case "notAuthenticated":
        return t("errNotAuthenticated");
      case "badArtist":
        return t("errBadArtist", { name: e.name });
      default:
        return e.message;
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError("");
    const res = await submitNewFestival({ ...f, program: days });
    if (res.ok) {
      setState("sent");
    } else {
      setState("idle");
      setError(describe(res.error));
    }
  }

  if (state === "sent") {
    return (
      <div className="space-y-3 rounded-2xl border border-black/10 bg-white p-6">
        <h2 className="text-xl font-bold text-[#2D1A12]">{t("sentHeading")}</h2>
        <p className="text-[#2D1A12]/70">{t("sentBody")}</p>
        <a href={mapHref} className="inline-block text-[#FF4E50] underline">
          {t("backToMap")}
        </a>
      </div>
    );
  }

  const geoQuery = [f.venue_name, f.city, f.country].filter(Boolean).join(", ");

  const steps = [t("step1"), t("step2")];

  return (
    <form onSubmit={submit} className="space-y-6">
      <ol className="flex gap-2 text-sm">
        {steps.map((label, i) => (
          <li
            key={label}
            className={`rounded-full px-3 py-1 ${
              step === i + 1
                ? "bg-[#2D1A12] font-medium text-white"
                : "bg-black/[0.06] text-[#2D1A12]/50"
            }`}
          >
            {label}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <>
      <Field label={t("name")} help={t("nameHelp")} required>
        <input
          className={input}
          value={f.name}
          onChange={(e) => set("name", e.target.value)}
          required
        />
      </Field>

      {visibleDupes.length > 0 && (
        <div className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="font-medium text-amber-900">{t("duplicateHeading")}</p>
          <p className="text-sm text-amber-900/80">{t("duplicateBody")}</p>
          <ul className="space-y-1 pt-1">
            {visibleDupes.map((d) => (
              <li key={d.slug} className="text-sm">
                <a
                  href={`/festival/${d.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-amber-900 underline"
                >
                  {d.name}
                </a>
                <span className="text-amber-900/70">
                  {d.city ? ` — ${d.city}` : ""}
                  {d.reason === "nearby" ? ` (${t("duplicateNearby")})` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Field label={t("country")} required>
        <select
          className={input}
          value={f.country}
          onChange={(e) => set("country", e.target.value)}
          required
        >
          <option value="">{t("countryPick")}</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {tCountries(c)}
            </option>
          ))}
        </select>
      </Field>

      <Field label={t("city")} help={t("cityHelp")}>
        <input
          className={input}
          value={f.city}
          onChange={(e) => set("city", e.target.value)}
        />
      </Field>

      <Field label={t("venue")} help={t("venueHelp")}>
        <input
          className={input}
          value={f.venue_name}
          onChange={(e) => set("venue_name", e.target.value)}
        />
      </Field>

      <Field label={t("location")} help={t("locationHelp")} required>
        <LocationPicker
          query={geoQuery}
          value={f.latitude != null && f.longitude != null ? [f.latitude, f.longitude] : null}
          onChange={([lat, lon]) =>
            setF((prev) => ({ ...prev, latitude: lat, longitude: lon }))
          }
        />
      </Field>

      <Field label={t("dates")} help={t("datesHelp")} required>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm text-[#2D1A12]/70">
            {t("dateFrom")}
            <input
              type="date"
              className={input}
              value={f.date_from}
              onChange={(e) => set("date_from", e.target.value)}
              required
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-[#2D1A12]/70">
            {t("dateTo")}
            <input
              type="date"
              className={input}
              value={f.date_to}
              min={f.date_from || undefined}
              onChange={(e) => set("date_to", e.target.value)}
              required
            />
          </label>
        </div>
      </Field>

      <Field label={t("website")} help={t("websiteHelp")} required>
        <input
          type="url"
          className={input}
          placeholder="https://…"
          value={f.website_url}
          onChange={(e) => set("website_url", e.target.value)}
          required
        />
      </Field>

      <Field label={t("ticket")} help={t("ticketHelp")}>
        <input
          type="url"
          className={input}
          placeholder="https://…"
          value={f.ticket_url}
          onChange={(e) => set("ticket_url", e.target.value)}
        />
      </Field>

      <Field label={t("tags")} help={t("tagsHelp")} required>
        <div className="flex flex-wrap gap-2 pt-1">
          {FESTIVAL_TAGS.map((tag) => {
            const on = f.tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  set("tags", on ? f.tags.filter((x) => x !== tag) : [...f.tags, tag])
                }
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
      </Field>

      <Field label={t("description")} help={t("descriptionHelp")}>
        <textarea
          rows={4}
          className={input}
          value={f.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </Field>

      <Field label={t("image")} help={t("imageHelp")}>
        <input
          type="url"
          className={input}
          value={f.image_url}
          onChange={(e) => set("image_url", e.target.value)}
        />
      </Field>

      <button
        type="button"
        onClick={() => setStep(2)}
        className="rounded-full bg-gradient-to-r from-amber-500 to-[#FF4E50] px-6 py-3 font-medium text-white"
      >
        {t("stepNext")}
      </button>
        </>
      )}

      {step === 2 && (
        <>
          <p className="text-[#2D1A12]/70">{t("programIntro")}</p>

          {days.length === 0 ? (
            <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {t("programNeedsDates")}
            </p>
          ) : (
            <>
              <p className="text-sm text-[#2D1A12]/50">
                {t("programCount", { count: artistCount })}
              </p>
              {/* One synthetic edition: the festival has none yet, so the days
                  come from the dates just entered rather than from the database. */}
              <LineupFields
                editions={[
                  {
                    year: Number(f.date_from.slice(0, 4)) || new Date().getFullYear(),
                    date_from: f.date_from,
                    date_to: f.date_to,
                    days,
                  },
                ]}
                year={Number(f.date_from.slice(0, 4)) || new Date().getFullYear()}
                onYear={() => {}}
                days={days}
                onDays={setDays}
                bcp47={bcp47}
              />
            </>
          )}

          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-full border border-black/15 px-5 py-3 font-medium text-[#2D1A12]/70"
            >
              {t("stepBack")}
            </button>
            <button
              type="submit"
              disabled={state === "sending"}
              className="rounded-full bg-gradient-to-r from-amber-500 to-[#FF4E50] px-6 py-3 font-medium text-white disabled:opacity-50"
            >
              {state === "sending"
                ? t("submitting")
                : artistCount === 0
                  ? t("skipProgram")
                  : t("submit")}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
