import { createServerClient } from "@supabase/ssr";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

/** Sign-in, contributing and moderation live outside the translated URL tree. */
const UNLOCALISED = ["/logg-inn", "/auth", "/admin", "/foresla"];

export default async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const unlocalised = UNLOCALISED.some((p) => path.startsWith(p));

  // next-intl builds the response for translated routes; the Supabase client
  // then writes refreshed auth cookies onto that same response. Two separate
  // responses would mean one silently dropping the other's cookies.
  const response = unlocalised ? NextResponse.next({ request }) : intlMiddleware(request);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) =>
          cookies.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          ),
      },
    },
  );

  // Refreshes an expiring token as a side effect. Without this call on every
  // request, sessions quietly expire mid-visit.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware only asks "signed in at all?". Whether you are an admin is a
  // database question, answered in the /admin layout rather than on every
  // request to every page.
  if (path.startsWith("/admin") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/logg-inn";
    url.searchParams.set("neste", path);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
