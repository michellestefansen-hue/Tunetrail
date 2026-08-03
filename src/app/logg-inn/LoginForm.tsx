"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Domains where the address belongs to the person, not to their employer.
 *
 * Corporate Microsoft 365 tenants quarantine sign-in links from a young sending
 * domain outright -- Resend reports them delivered and the recipient never sees
 * them, not even in the junk folder. Gmail takes the same message fine. There is
 * nothing to fix on our side, so the honest move is to warn people up front.
 *
 * A list of consumer providers rather than a list of corporate ones: the latter
 * is unbounded, and a company address is precisely the one that isn't on this
 * list. Plenty of small custom domains deliver perfectly well, so the wording it
 * drives is a heads-up, never a refusal.
 */
const PERSONAL_MAIL_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "mail.com",
  "aol.com",
  "web.de",
  "t-online.de",
  "online.no",
  "laposte.net",
];

// Providers with a country-code domain per market -- hotmail.no, yahoo.fr,
// gmx.at -- where matching the first label is what makes the list finite.
const PERSONAL_MAIL_PREFIXES = [
  "hotmail.",
  "live.",
  "yahoo.",
  "gmx.",
  "orange.",
  "free.",
  "sfr.",
  "wanadoo.",
];

function looksLikeWorkAddress(email: string) {
  const domain = email.trim().toLowerCase().split("@")[1];
  if (!domain) return false;
  return (
    !PERSONAL_MAIL_DOMAINS.includes(domain) &&
    !PERSONAL_MAIL_PREFIXES.some((prefix) => domain.startsWith(prefix))
  );
}

export function LoginForm({ neste, feil }: { neste: string; feil?: string }) {
  const t = useTranslations("Login");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  // The callback route redirects here with ?feil= when a link fails. Without
  // showing it, a failed sign-in looks like the form simply bounced you back
  // for no reason -- which is exactly how it looked before this was added.
  const linkError =
    feil === "mangler-kode"
      ? t("errMissingCode")
      : feil === "ugyldig-lenke"
        ? t("errInvalidLink")
        : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?neste=${encodeURIComponent(neste)}`,
      },
    });
    if (error) {
      setState("error");
      setMessage(error.message);
      return;
    }
    setState("sent");
  }

  if (state === "sent") {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-[#2D1A12]">{t("sentHeading")}</h1>
        <p className="text-[#2D1A12]/70">
          {t.rich("sentBody", { email, b: (chunks) => <strong>{chunks}</strong> })}
        </p>
        <p className="text-sm text-[#2D1A12]/50">{t("sentHint")}</p>
        {looksLikeWorkAddress(email) && (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900/80">
            {t("sentHintWork")}
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-[#2D1A12]">{t("heading")}</h1>
        <p className="text-[#2D1A12]/70">{t("intro")}</p>
      </div>

      {linkError && (
        <div
          role="alert"
          className="space-y-1 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3"
        >
          <p className="font-medium text-amber-900">{t("linkFailedHeading")}</p>
          <p className="text-sm text-amber-900/80">{linkError}</p>
        </div>
      )}

      <input
        type="email"
        required
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("emailPlaceholder")}
        className="w-full rounded-full border border-black/10 bg-white px-4 py-3 text-[#2D1A12] outline-none focus:border-black/30"
      />

      <p className="px-1 text-sm text-[#2D1A12]/50">{t("workHint")}</p>

      <button
        type="submit"
        disabled={state === "sending"}
        className="w-full rounded-full bg-gradient-to-r from-amber-500 to-[#FF4E50] py-3 font-medium text-white disabled:opacity-50"
      >
        {state === "sending" ? t("submitSending") : t("submit")}
      </button>

      {state === "error" && (
        <p role="alert" className="text-sm text-red-700">
          {message}
        </p>
      )}
    </form>
  );
}
