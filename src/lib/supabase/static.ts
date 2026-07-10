import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cookie-free client for build-time/static contexts (generateStaticParams,
 * generateMetadata for statically generated pages, sitemap.ts) where
 * next/headers' cookies() isn't available. All data read here is public.
 */
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
