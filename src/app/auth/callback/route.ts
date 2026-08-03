import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Where the emailed link lands, in either of two shapes.
 *
 * `?token_hash=&type=` is the one the email template uses now, and the reason
 * it does is deliverability: the link is on tune-trail.org, the same domain the
 * mail is sent from. Supabase's default link points at the project's
 * *.supabase.co host instead, and a familiar sender carrying a link to an
 * unfamiliar domain is the exact shape spam filters treat as phishing --
 * Microsoft 365 was quarantining these outright.
 *
 * `?code=` is Supabase's older exchange flow. Kept because links already sitting
 * in inboxes when this shipped still use it, and they should not break.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("neste") ?? "/";

  // Carry `neste` back to the sign-in page on failure, so a second attempt
  // still ends up where the visitor was originally heading -- and so the page
  // can render the message in the right language.
  const back = (reason: string) =>
    NextResponse.redirect(
      `${origin}/logg-inn?feil=${reason}&neste=${encodeURIComponent(next)}`,
    );

  if (!code && !tokenHash) return back("mangler-kode");

  const supabase = await createClient();
  const { error } = tokenHash
    ? await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type ?? "magiclink",
      })
    : await supabase.auth.exchangeCodeForSession(code!);
  if (error) return back("ugyldig-lenke");

  // Only ever redirect to a path on this site: an absolute URL here would let
  // a crafted sign-in link bounce a freshly authenticated visitor elsewhere.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return NextResponse.redirect(`${origin}${safeNext}`);
}
