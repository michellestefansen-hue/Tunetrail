import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Where the emailed link lands. Supabase appends a one-time code; this route
 * trades it for a session cookie and sends the visitor on.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("neste") ?? "/";

  // Carry `neste` back to the sign-in page on failure, so a second attempt
  // still ends up where the visitor was originally heading -- and so the page
  // can render the message in the right language.
  const back = (reason: string) =>
    NextResponse.redirect(
      `${origin}/logg-inn?feil=${reason}&neste=${encodeURIComponent(next)}`,
    );

  if (!code) return back("mangler-kode");

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return back("ugyldig-lenke");

  // Only ever redirect to a path on this site: an absolute URL here would let
  // a crafted sign-in link bounce a freshly authenticated visitor elsewhere.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return NextResponse.redirect(`${origin}${safeNext}`);
}
