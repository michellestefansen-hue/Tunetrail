"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const params = useSearchParams();
  // Forsiden, ikke /admin: de aller fleste som logger inn er bidragsytere, og
  // for dem er /admin en 404. Middleware sender med ?neste=/admin selv når det
  // faktisk er moderering du var på vei til.
  const next = params.get("neste") ?? "/";
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?neste=${encodeURIComponent(next)}` },
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
        <h1 className="text-2xl font-bold text-[#2D1A12]">Sjekk e-posten din</h1>
        <p className="text-[#2D1A12]/70">
          Vi har sendt en lenke til <strong>{email}</strong>. Klikk på den, så er du logget inn.
        </p>
        <p className="text-sm text-[#2D1A12]/50">
          Finner du den ikke, se i søppelposten. Lenken varer i én time.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-[#2D1A12]">Logg inn</h1>
        <p className="text-[#2D1A12]/70">
          Skriv e-postadressen din, så sender vi deg en lenke. Ingen passord.
        </p>
      </div>

      <input
        type="email"
        required
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="din@epost.no"
        className="w-full rounded-full border border-black/10 bg-white px-4 py-3 text-[#2D1A12] outline-none focus:border-black/30"
      />

      <button
        type="submit"
        disabled={state === "sending"}
        className="w-full rounded-full bg-gradient-to-r from-amber-500 to-[#FF4E50] py-3 font-medium text-white disabled:opacity-50"
      >
        {state === "sending" ? "Sender …" : "Send meg en lenke"}
      </button>

      {state === "error" && (
        <p role="alert" className="text-sm text-red-700">
          {message}
        </p>
      )}
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md items-center px-6">
      <div className="w-full">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
