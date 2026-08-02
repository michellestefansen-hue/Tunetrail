"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ neste }: { neste: string }) {
  const t = useTranslations("Login");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

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
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-[#2D1A12]">{t("heading")}</h1>
        <p className="text-[#2D1A12]/70">{t("intro")}</p>
      </div>

      <input
        type="email"
        required
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("emailPlaceholder")}
        className="w-full rounded-full border border-black/10 bg-white px-4 py-3 text-[#2D1A12] outline-none focus:border-black/30"
      />

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
