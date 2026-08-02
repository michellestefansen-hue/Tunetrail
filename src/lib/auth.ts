import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  display_name: string | null;
  is_admin: boolean;
  trust_level: number;
};

/**
 * The signed-in user's profile, or null.
 *
 * Uses getUser() rather than getSession(): getSession only decodes the cookie,
 * which the browser controls, while getUser verifies the token against
 * Supabase. For anything that decides what someone is allowed to do, the
 * cookie alone is not evidence.
 */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, is_admin, trust_level")
    .eq("id", user.id)
    .single();

  return (data as Profile) ?? null;
}

export async function isAdmin(): Promise<boolean> {
  return (await getProfile())?.is_admin === true;
}
